import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../types.js";
import { partyService } from "../../party/services/partyService.js";
import {
  createPartyCategorySelectEmbed,
  createPartyLobbyEmbed,
  createPartyAuctionItemEmbed,
  createPartySquadEmbed,
  createPartyResultsEmbed,
} from "../../party/ui/partyEmbeds.js";
import {
  createPartyCategorySelectMenu,
  createPartyLobbyButtons,
  createPartyAuctionButtons,
  createPartyRematchButtons,
} from "../../party/ui/partyButtons.js";
import {
  startPartyAuctionTimer,
  getRemainingPartyTimerSeconds,
  finishPartyAuctionWorkflow,
  PARTY_BID_TIMER_SECONDS,
  PARTY_AUCTION_TIMER_SECONDS,
} from "../../party/jobs/partyTimer.js";
import { partyStatsService } from "../../party/services/partyStatsService.js";
import { getAllCategories } from "../../party/categories/index.js";

export const partyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("party")
    .setDescription("🎉 Party Auction — Fast, social, and hilarious multiplayer bidding game!")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new Party Auction lobby in this channel")
        .addStringOption((opt) =>
          opt
            .setName("category")
            .setDescription("The category topic to auction")
            .setRequired(false)
            .addChoices(
              ...getAllCategories().map((c) => ({
                name: `${c.emoji} ${c.name}`,
                value: c.id,
              }))
            )
        )
    )
    .addSubcommand((sub) =>
      sub.setName("join").setDescription("Join the active Party Auction lobby in this channel")
    )
    .addSubcommand((sub) =>
      sub.setName("start").setDescription("Host only: Start the Party Auction")
    )
    .addSubcommand((sub) =>
      sub
        .setName("bid")
        .setDescription("Place a bid on the current item on the block")
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Bid amount in virtual BB (Bidding Bucks)")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("pass").setDescription("Pass on the current item on the block")
    )
    .addSubcommand((sub) =>
      sub.setName("squad").setDescription("View your current 5-item party squad and purse")
    )
    .addSubcommand((sub) =>
      sub
        .setName("vote")
        .setDescription("Cast your community vote for Who Cooked!")
        .addUserOption((opt) =>
          opt.setName("player").setDescription("The player whose squad cooked the best").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("results").setDescription("View your Party Auction stats or latest game results")
    )
    .addSubcommand((sub) =>
      sub.setName("rematch").setDescription("Initiate a rematch with the current party group")
    )
    .addSubcommand((sub) =>
      sub.setName("cancel").setDescription("Host only: Cancel the active party auction in this channel")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    if (!guildId || !channelId) {
      await interaction.reply({
        content: "❌ Party Auction must be played inside a server channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const gameKey = partyService.getGameKey(guildId, channelId);
    let game = partyService.getGame(guildId, channelId);

    // 1. /party create
    if (subcommand === "create") {
      if (game && game.status === "AUCTION") {
        await interaction.reply({
          content: "❌ A party auction is already actively bidding in this channel! Use `/party bid` or `/party pass`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const chosenCategory = interaction.options.getString("category");

      // Initialize or replace lobby
      game = partyService.createGame(
        guildId,
        channelId,
        interaction.user.id,
        interaction.user.displayName,
        chosenCategory ? { category: chosenCategory } : undefined
      );

      if (chosenCategory) {
        const embed = createPartyLobbyEmbed(game);
        const buttons = createPartyLobbyButtons(game.canStart);
        await interaction.reply({
          embeds: [embed],
          components: [buttons],
        });
      } else {
        const embed = createPartyCategorySelectEmbed();
        const menu = createPartyCategorySelectMenu();
        await interaction.reply({
          embeds: [embed],
          components: [menu],
        });
      }
      return;
    }

    // Guard for commands requiring an active game
    if (!game) {
      if (subcommand === "results") {
        // Show personal player stats if no active game
        const stats = await partyStatsService.getPartyStats(interaction.user.id);
        const achList =
          stats.unlockedAchievements.length > 0
            ? stats.unlockedAchievements.map((a) => `• ${a}`).join("\n")
            : "*No party achievements unlocked yet.*";

        const statsEmbed = new EmbedBuilder()
          .setTitle(`🎉 ${interaction.user.displayName}'s Party Auction Career`)
          .setDescription(
            `**Career Record:**\n` +
              `• 🎮 **Games Played:** ${stats.partyGames}\n` +
              `• 🏆 **Wins:** ${stats.partyWins}  |  💀 **Losses:** ${stats.partyLosses}\n` +
              `• 🛍️ **Items Won:** ${stats.partyItemsWon}\n` +
              `• 💰 **Total Spent:** ${stats.partyMoneySpent} BB\n` +
              `• 🗳️ **Votes Received:** ${stats.partyVotesReceived}\n\n` +
              `**Special Honors:**\n` +
              `• 👨‍🍳 **The Cook Awards:** ${stats.partyCookAwards}\n` +
              `• 🐍 **Snake Awards:** ${stats.partySnakeAwards}\n` +
              `• 💀 **Fraud Awards:** ${stats.partyFraudAwards}\n\n` +
              `**Achievements:**\n${achList}`
          )
          .setColor(0x8b5cf6)
          .setFooter({ text: "Play more party auctions with /party create!" });

        await interaction.reply({ embeds: [statsEmbed] });
        return;
      }

      await interaction.reply({
        content: "❌ No active Party Auction in this channel. Create one with `/party create`!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 2. /party join
    if (subcommand === "join") {
      const res = game.addPlayer(interaction.user.id, interaction.user.displayName);
      if (!res.success) {
        await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
        return;
      }
      const embed = createPartyLobbyEmbed(game);
      const buttons = createPartyLobbyButtons(game.canStart);
      await interaction.reply({
        content: `🎉 **${interaction.user.displayName}** joined the party!`,
        embeds: [embed],
        components: [buttons],
      });
      return;
    }

    // 3. /party start
    if (subcommand === "start") {
      if (game.hostId !== interaction.user.id) {
        await interaction.reply({
          content: `❌ Only the host (<@${game.hostId}>) can start the party auction.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (!game.canStart) {
        await interaction.reply({
          content: `❌ Need at least ${game.minPlayers} players to start (Currently ${game.players.length}/${game.maxPlayers}).`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const started = game.start();
      if (!started || !game.currentItem) {
        await interaction.reply({
          content: "❌ Failed to start party auction: unable to assemble item pool.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const embed = createPartyAuctionItemEmbed(
        game.currentItem,
        game.currentBid,
        game.currentBidderName,
        game.category,
        game.scenario,
        game.itemPool.length + 1
      );
      const buttons = createPartyAuctionButtons(game.currentBid, true);

      let msg =
        `🎉 **Party Auction Started with ${game.players.length} players!**\n` +
        `🎯 Scenario: **${game.scenario.title}**\n` +
        `🕵️ **Secret Objectives assigned!** Check your squad in secret with \`/party squad\`.\n\n` +
        `First item on the block:`;
      if (game.currentChaosAnnouncement) {
        msg += `\n${game.currentChaosAnnouncement}`;
      }

      await interaction.reply({
        content: msg,
        embeds: [embed],
        components: [buttons],
      });

      if (interaction.channel instanceof TextChannel) {
        startPartyAuctionTimer(gameKey, interaction.channel, PARTY_AUCTION_TIMER_SECONDS);
      }
      return;
    }

    // 4. /party bid
    if (subcommand === "bid") {
      const amount = interaction.options.getInteger("amount", true);
      const remaining = getRemainingPartyTimerSeconds(gameKey);
      const isAntiSnipe = remaining > 0 && remaining <= 5;
      const timerDuration = isAntiSnipe
        ? PARTY_BID_TIMER_SECONDS + 10
        : PARTY_BID_TIMER_SECONDS;

      const res = game.placeBid(interaction.user.id, interaction.user.displayName, amount);
      if (!res.success) {
        await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
        return;
      }

      const embed = createPartyAuctionItemEmbed(
        game.currentItem!,
        res.newBid,
        interaction.user.displayName,
        game.category,
        game.scenario,
        game.itemPool.length + 1
      );
      const buttons = createPartyAuctionButtons(res.newBid, true);

      let content = `💰 **${interaction.user.displayName}** bid **${res.newBid} BB**! Timer reset to **${timerDuration}s**!`;
      if (isAntiSnipe) {
        content += `\n⚡ **ANTI-SNIPE ACTIVATED!** +10s extension added!`;
      }
      if (res.roast) {
        content += `\n${res.roast}`;
      }

      await interaction.reply({
        content,
        embeds: [embed],
        components: [buttons],
      });

      if (interaction.channel instanceof TextChannel) {
        startPartyAuctionTimer(gameKey, interaction.channel, timerDuration);
      }
      return;
    }

    // 5. /party pass
    if (subcommand === "pass") {
      if (game.status !== "AUCTION" || !game.currentItem) {
        await interaction.reply({
          content: "❌ No item currently on auction to pass on.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const { allPassed, passCount, needed } = game.pass(interaction.user.id);
      if (allPassed) {
        const skipped = game.skipCurrentItem();
        const isFinished = game.isAuctionFinished();
        const hasNext = !isFinished && game.nextItem();

        if (isFinished || !hasNext) {
          await interaction.reply({
            content: `⏭️ Unanimous pass! **${skipped?.name}** skipped. Concluding auction...`,
          });
          if (interaction.channel instanceof TextChannel) {
            await finishPartyAuctionWorkflow(gameKey, interaction.channel);
          }
          return;
        }

        if (game.currentItem) {
          const embed = createPartyAuctionItemEmbed(
            game.currentItem,
            game.currentBid,
            game.currentBidderName,
            game.category,
            game.scenario,
            game.itemPool.length + 1
          );
          const buttons = createPartyAuctionButtons(game.currentBid, true);

          await interaction.reply({
            content: `⏭️ Unanimous pass! **${skipped?.name}** skipped.\nNext item on the block:`,
            embeds: [embed],
            components: [buttons],
          });

          if (interaction.channel instanceof TextChannel) {
            startPartyAuctionTimer(gameKey, interaction.channel, PARTY_AUCTION_TIMER_SECONDS);
          }
        }
      } else {
        await interaction.reply({
          content: `🗳️ **${interaction.user.displayName}** passed (${passCount}/${needed} passes).`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    // 6. /party squad
    if (subcommand === "squad") {
      const pState = game.playerStates[interaction.user.id];
      const squad = game.squads[interaction.user.id];
      if (!pState || !squad) {
        await interaction.reply({
          content: "❌ You are not registered in this party auction.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const embed = createPartySquadEmbed(pState, squad, game.scenario);
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 7. /party vote
    if (subcommand === "vote") {
      const candidateUser = interaction.options.getUser("player", true);
      const res = game.castVote(interaction.user.id, candidateUser.id);
      if (!res.success) {
        await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({ content: `✅ ${res.message}`, flags: MessageFlags.Ephemeral });
      return;
    }

    // 8. /party results
    if (subcommand === "results") {
      if (game.status === "RESULTS" || game.status === "COMPLETED") {
        const awards = game.awards.length > 0 ? game.awards : game.calculateAwards();
        const shareable = game.generateShareableResult();
        const embed = createPartyResultsEmbed(game, awards, shareable.totalSpending);
        const rematch = createPartyRematchButtons(gameKey);
        await interaction.reply({ embeds: [embed], components: [rematch] });
        return;
      }

      // Show ongoing game status
      await interaction.reply({
        content: `ℹ️ Game is currently in **${game.status}** state. Final results will be generated after Community Voting concludes!`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 9. /party rematch
    if (subcommand === "rematch") {
      game.resetForRematch();
      const embed = createPartyLobbyEmbed(game);
      const buttons = createPartyLobbyButtons(game.canStart);
      await interaction.reply({
        content: `🔥 **REMATCH INITIALIZED!** Same players, fresh 50 BB purses, new draft!\nHost can choose a new category or scenario below:`,
        embeds: [embed],
        components: [buttons],
      });
      return;
    }

    // 10. /party cancel
    if (subcommand === "cancel") {
      if (game.hostId !== interaction.user.id) {
        await interaction.reply({
          content: `❌ Only the host (<@${game.hostId}>) can cancel the party auction.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      partyService.removeGame(guildId, channelId);
      await interaction.reply({
        content: "🛑 Party Auction has been cancelled. Run `/party create` to start a new one!",
      });
      return;
    }
  },
};
