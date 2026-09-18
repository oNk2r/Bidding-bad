import {
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  MessageFlags,
  TextChannel,
} from "discord.js";
import { partyService } from "../services/partyService.js";
import {
  createPartyLobbyEmbed,
  createPartyAuctionItemEmbed,
} from "../ui/partyEmbeds.js";
import {
  createPartyLobbyButtons,
  createPartyAuctionButtons,
  createPartyScenarioSelectMenu,
} from "../ui/partyButtons.js";
import {
  startPartyAuctionTimer,
  getRemainingPartyTimerSeconds,
  finishPartyAuctionWorkflow,
  PARTY_AUCTION_TIMER_SECONDS,
  PARTY_BID_TIMER_SECONDS,
} from "../jobs/partyTimer.js";

export async function handlePartyButton(
  interaction: ButtonInteraction
): Promise<boolean> {
  const customId = interaction.customId;
  if (!customId.startsWith("party_")) return false;

  const guildId = interaction.guildId;
  const channelId = interaction.channelId;
  if (!guildId || !channelId) return false;

  const gameKey = partyService.getGameKey(guildId, channelId);
  const game = partyService.getGame(guildId, channelId);

  // 1. Lobby Join
  if (customId === "party_lobby_join") {
    if (!game || game.status !== "LOBBY") {
      await interaction.reply({
        content: "❌ This party lobby has already started or expired.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    const res = game.addPlayer(interaction.user.id, interaction.user.displayName);
    if (!res.success) {
      await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
      return true;
    }
    const embed = createPartyLobbyEmbed(game);
    const buttons = createPartyLobbyButtons(game.canStart);
    await interaction.update({ embeds: [embed], components: [buttons] });
    return true;
  }

  // 2. Lobby Start
  if (customId === "party_lobby_start") {
    if (!game || game.status !== "LOBBY") {
      await interaction.reply({ content: "❌ This party auction has already started.", flags: MessageFlags.Ephemeral });
      return true;
    }
    if (game.hostId !== interaction.user.id) {
      await interaction.reply({
        content: `❌ Only the host (<@${game.hostId}>) can start the auction.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    if (!game.canStart) {
      await interaction.reply({
        content: `❌ Need at least ${game.minPlayers} players to start (Currently ${game.players.length}/${game.maxPlayers}).`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const started = game.start();
    if (!started || !game.currentItem) {
      await interaction.reply({
        content: "❌ Failed to start party auction: unable to prepare item pool.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
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

    await interaction.update({
      content: msg,
      embeds: [embed],
      components: [buttons],
    });

    if (interaction.channel instanceof TextChannel) {
      startPartyAuctionTimer(gameKey, interaction.channel, PARTY_AUCTION_TIMER_SECONDS);
    }
    return true;
  }

  // 3. Lobby Leave
  if (customId === "party_lobby_leave") {
    if (!game || game.status !== "LOBBY") {
      await interaction.reply({ content: "❌ Cannot leave after the auction begins.", flags: MessageFlags.Ephemeral });
      return true;
    }
    const res = game.removePlayer(interaction.user.id);
    if (!res.success) {
      await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
      return true;
    }
    const embed = createPartyLobbyEmbed(game);
    const buttons = createPartyLobbyButtons(game.canStart);
    await interaction.update({ embeds: [embed], components: [buttons] });
    return true;
  }

  // 4. Lobby Scenario Switch Menu
  if (customId === "party_lobby_scenario") {
    if (!game || game.status !== "LOBBY") {
      await interaction.reply({ content: "❌ Cannot change scenario after starting.", flags: MessageFlags.Ephemeral });
      return true;
    }
    const menuRow = createPartyScenarioSelectMenu(game.category.id);
    await interaction.reply({
      content: `🎯 **Select a new Scenario challenge for ${game.category.name}:**`,
      components: [menuRow],
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  // 5. In-Game Bidding Button
  if (customId.startsWith("party_bid_")) {
    if (!game || game.status !== "AUCTION" || !game.currentItem) {
      await interaction.reply({ content: "❌ No active item currently on auction.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const amount = parseInt(customId.replace("party_bid_", ""), 10);
    const remaining = getRemainingPartyTimerSeconds(gameKey);
    const isAntiSnipe = remaining > 0 && remaining <= 5;
    const timerDuration = isAntiSnipe
      ? PARTY_BID_TIMER_SECONDS + 10
      : PARTY_BID_TIMER_SECONDS;

    const res = game.placeBid(interaction.user.id, interaction.user.displayName, amount);
    if (!res.success) {
      await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
      return true;
    }

    const embed = createPartyAuctionItemEmbed(
      game.currentItem,
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

    await interaction.update({
      content,
      embeds: [embed],
      components: [buttons],
    });

    if (interaction.channel instanceof TextChannel) {
      startPartyAuctionTimer(gameKey, interaction.channel, timerDuration);
    }
    return true;
  }

  // 6. Pass Button
  if (customId === "party_pass") {
    if (!game || game.status !== "AUCTION" || !game.currentItem) {
      await interaction.reply({ content: "❌ No active item currently on auction.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const { allPassed, passCount, needed } = game.pass(interaction.user.id);
    if (allPassed) {
      const skipped = game.skipCurrentItem();
      const isFinished = game.isAuctionFinished();
      const hasNext = !isFinished && game.nextItem();

      if (isFinished || !hasNext) {
        await interaction.update({
          content: `⏭️ Unanimous pass! **${skipped?.name}** skipped. Concluding auction...`,
          components: [],
        });
        if (interaction.channel instanceof TextChannel) {
          await finishPartyAuctionWorkflow(gameKey, interaction.channel);
        }
        return true;
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

        await interaction.update({
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
    return true;
  }

  // 7. Community Voting Button
  if (customId.startsWith("party_vote_")) {
    if (!game || game.status !== "VOTING") {
      await interaction.reply({ content: "❌ Voting is not currently open.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const candidateId = customId.replace("party_vote_", "");
    const res = game.castVote(interaction.user.id, candidateId);
    if (!res.success) {
      await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
      return true;
    }
    await interaction.reply({ content: `🗳️ ${res.message}`, flags: MessageFlags.Ephemeral });
    return true;
  }

  // 8. Rematch Accept
  if (customId === "party_rematch_accept") {
    if (!game) {
      await interaction.reply({ content: "❌ No game session to rematch.", flags: MessageFlags.Ephemeral });
      return true;
    }
    game.resetForRematch();
    const embed = createPartyLobbyEmbed(game);
    const buttons = createPartyLobbyButtons(game.canStart);
    await interaction.update({
      content: `🔥 **REMATCH INITIALIZED!** Same players, fresh 50 BB purses!\nHost can change scenario or start when ready:`,
      embeds: [embed],
      components: [buttons],
    });
    return true;
  }

  // 9. Rematch Decline / End
  if (customId === "party_rematch_decline") {
    partyService.removeGame(guildId, channelId);
    await interaction.update({
      content: `🎉 **Party Auction Session Concluded!** Thanks for playing Bidding Bad! GG!`,
      components: [],
    });
    return true;
  }

  return false;
}

export async function handlePartySelectMenu(
  interaction: StringSelectMenuInteraction
): Promise<boolean> {
  const customId = interaction.customId;
  if (!customId.startsWith("party_")) return false;

  const guildId = interaction.guildId;
  const channelId = interaction.channelId;
  if (!guildId || !channelId) return false;

  let game = partyService.getGame(guildId, channelId);

  // 1. Category Selection
  if (customId === "party_category_select") {
    const categoryId = interaction.values[0];

    if (!game) {
      game = partyService.createGame(
        guildId,
        channelId,
        interaction.user.id,
        interaction.user.displayName,
        { category: categoryId }
      );
    } else {
      game.setCategory(categoryId);
    }

    const embed = createPartyLobbyEmbed(game);
    const buttons = createPartyLobbyButtons(game.canStart);

    await interaction.update({
      content: `✅ Category set to **${game.category.emoji} ${game.category.name}**!`,
      embeds: [embed],
      components: [buttons],
    });
    return true;
  }

  // 2. Scenario Selection
  if (customId === "party_scenario_select") {
    if (!game || game.status !== "LOBBY") {
      await interaction.reply({ content: "❌ No active party lobby to configure.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const scenarioId = interaction.values[0];
    game.setScenario(scenarioId);

    const embed = createPartyLobbyEmbed(game);
    const buttons = createPartyLobbyButtons(game.canStart);

    await interaction.update({
      content: `✅ Scenario updated to: **${game.scenario.title}**!`,
      embeds: [embed],
      components: [buttons],
    });
    return true;
  }

  return false;
}
