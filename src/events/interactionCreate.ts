import {
  type Interaction,
  TextChannel,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { auctionService } from "../services/auctionService.js";
import { startAuctionTimer, finishAuctionWorkflow } from "../jobs/auctionTimer.js";
import { createLobbyEmbed, createPlayerEmbed } from "../ui/embeds/auctionEmbeds.js";
import {
  createLobbyButtons,
  createAuctionActionButtons,
  createPenaltyShooterButtons,
  createPenaltyKeeperButtons,
  createPaginationButtons,
  createPackActionButtons,
} from "../ui/components/buttons.js";
import { BID_TIMER_SECONDS } from "../config/constants.js";
import { economyService } from "../services/economyService.js";
import { tournamentService } from "../services/tournamentService.js";
import { matchService } from "../services/matchService.js";
import { marketService } from "../services/marketService.js";
import { tradeService } from "../services/tradeService.js";
import { penaltyService } from "../services/penaltyService.js";
import { divisionService } from "../services/divisionService.js";
import { profileService } from "../services/profileService.js";
import { sbcService } from "../services/sbcService.js";
import { seasonService, SEASON_TIERS } from "../services/seasonService.js";
import { dailyShopService } from "../services/dailyShopService.js";
import { createMatchResultEmbed } from "../ui/embeds/matchEmbeds.js";
import { createTradeSuccessEmbed } from "../ui/embeds/tradeEmbeds.js";
import { createTournamentLobbyEmbed } from "../ui/embeds/tournamentEmbeds.js";
import { createInventoryEmbed, createMarketEmbed, createPackOpenedEmbed } from "../ui/embeds/marketEmbeds.js";
import { createClubEmbed } from "../ui/embeds/clubEmbeds.js";
import { createDivisionProfileEmbed } from "../ui/embeds/divisionEmbeds.js";
import { createPenaltyEmbed } from "../ui/embeds/penaltyEmbeds.js";
import { createSpinEmbed } from "../ui/embeds/spinEmbeds.js";
import { createSbcCatalogEmbed } from "../ui/embeds/sbcEmbeds.js";
import { createSeasonPassEmbed } from "../ui/embeds/seasonEmbeds.js";
import { TACTICS_CATALOG, getTacticInfo } from "../models/tactics.js";
import type { StrikerDirection, KeeperDirection } from "../models/penalty.js";
import { prisma } from "../database/client.js";

export async function onInteractionCreate(interaction: Interaction): Promise<void> {
  // 1. Slash Command Routing
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      const msg = "❌ There was an error while executing this command!";
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
      } catch (replyErr) {
        console.warn(`Could not dispatch error response to interaction ${interaction.id}:`, replyErr);
      }
    }
    return;
  }

  // 2. Autocomplete Routing
  if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`Error in autocomplete for ${interaction.commandName}:`, error);
    }
    return;
  }

  // 3. Button Interactions
  if (interaction.isButton()) {
    try {
      const customId = interaction.customId;
      const guildId = interaction.guildId;

    // Auction Lobby Buttons
    if (customId === "auction_lobby_join" && guildId) {
      const auction = auctionService.getAuction(guildId);
      if (!auction || auction.started) {
        await interaction.reply({ content: "❌ This auction has already started or expired.", flags: MessageFlags.Ephemeral });
        return;
      }
      const res = auction.addPlayer(interaction.user.id, interaction.user.displayName);
      if (!res.success) {
        await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
        return;
      }
      const embed = createLobbyEmbed(auction);
      const buttons = createLobbyButtons(auction.canStart);
      await interaction.update({ embeds: [embed], components: [buttons] });
      return;
    }

    if (customId === "auction_lobby_start" && guildId) {
      const auction = auctionService.getAuction(guildId);
      if (!auction || auction.started) {
        await interaction.reply({ content: "❌ This auction has already started.", flags: MessageFlags.Ephemeral });
        return;
      }
      if (auction.creatorId !== interaction.user.id) {
        await interaction.reply({
          content: `❌ Only the host (<@${auction.creatorId}>) can start the auction.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (!auction.canStart) {
        await interaction.reply({
          content: `❌ Need at least ${auction.minPlayers} players to start (currently ${auction.players.length}).`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const success = auctionService.startAuction(guildId);
      if (!success || !auction.currentPlayer) {
        await interaction.reply({ content: "❌ Failed to start auction: empty player pool.", flags: MessageFlags.Ephemeral });
        return;
      }

      const potCount = auction.playerPool.length + 1;
      const embed = createPlayerEmbed(auction.currentPlayer, auction.currentPlayer.startingPrice);
      const buttons = createAuctionActionButtons(auction.currentPlayer.startingPrice, true);

      await interaction.update({
        content:
          `🎉 **Auction Started with ${auction.players.length} managers!**\n` +
          `Tournament Pot: **${potCount} players**.\n` +
          `First footballer up for bidding:`,
        embeds: [embed],
        components: [buttons],
      });

      if (interaction.channel instanceof TextChannel) {
        startAuctionTimer(guildId, interaction.channel);
      }
      return;
    }

    if (customId === "auction_lobby_leave" && guildId) {
      const auction = auctionService.getAuction(guildId);
      if (!auction || auction.started) {
        await interaction.reply({ content: "❌ Cannot leave after auction starts.", flags: MessageFlags.Ephemeral });
        return;
      }
      auction.removePlayer(interaction.user.id);
      const embed = createLobbyEmbed(auction);
      const buttons = createLobbyButtons(auction.canStart);
      await interaction.update({ embeds: [embed], components: [buttons] });
      return;
    }

    // Auction In-Game Bidding Buttons
    if (customId.startsWith("auction_bid_") && guildId) {
      const auction = auctionService.getAuction(guildId);
      if (!auction || !auction.started || !auction.currentPlayer) {
        await interaction.reply({ content: "❌ No active footballer on auction.", flags: MessageFlags.Ephemeral });
        return;
      }

      const prevBidderId = auction.currentBidder;
      const { getRemainingTimerSeconds } = await import("../jobs/auctionTimer.js");
      const remaining = getRemainingTimerSeconds(guildId);
      const isAntiSnipe = remaining > 0 && remaining <= 5;
      const timerDuration = isAntiSnipe ? BID_TIMER_SECONDS + 10 : BID_TIMER_SECONDS;

      const amount = parseInt(customId.replace("auction_bid_", ""), 10);
      const res = auction.placeBid(interaction.user.id, amount);

      if (!res.success) {
        await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
        return;
      }

      auction.setPlayerName(interaction.user.id, interaction.user.displayName);
      const embed = createPlayerEmbed(
        auction.currentPlayer,
        res.newBid,
        interaction.user.displayName
      );
      const buttons = createAuctionActionButtons(res.newBid, true);

      let content = `💰 **${interaction.user.displayName}** placed a bid of **$${res.newBid}**! Timer reset to **${timerDuration}s**!`;
      if (isAntiSnipe) {
        content += `\n⚡ **ANTI-SNIPE ACTIVATED!** +10s extension added to prevent sniping!`;
      }
      if (prevBidderId && prevBidderId !== interaction.user.id) {
        content += `\n⚠️ <@${prevBidderId}>, you have been outbid on **${auction.currentPlayer.name}**!`;
      }

      await interaction.update({
        content,
        embeds: [embed],
        components: [buttons],
      });

      if (interaction.channel instanceof TextChannel) {
        startAuctionTimer(guildId, interaction.channel, timerDuration);
      }
      return;
    }

    if (customId === "auction_pass" && guildId) {
      const auction = auctionService.getAuction(guildId);
      if (!auction || !auction.started || !auction.currentPlayer) {
        await interaction.reply({ content: "❌ No active footballer on auction.", flags: MessageFlags.Ephemeral });
        return;
      }

      auction.passedPlayers.add(interaction.user.id);
      const needed = auction.players.length;
      const current = auction.passedPlayers.size;

      if (current >= needed) {
        const skipped = auction.skipCurrentPlayer();
        const isFinished = auction.isFinished();
        const hasNext = !isFinished && auction.nextPlayer();

        if (isFinished || !hasNext) {
          await interaction.update({
            content: `⏭️ Unanimous pass! **${skipped?.name}** skipped.`,
            components: [],
          });
          if (interaction.channel instanceof TextChannel) {
            await finishAuctionWorkflow(guildId, interaction.channel);
          }
          return;
        }

        if (auction.currentPlayer) {
          const embed = createPlayerEmbed(auction.currentPlayer, auction.currentPlayer.startingPrice);
          const buttons = createAuctionActionButtons(auction.currentPlayer.startingPrice, true);

          await interaction.update({
            content: `⏭️ Unanimous pass! **${skipped?.name}** skipped.\nNext footballer up for bidding:`,
            embeds: [embed],
            components: [buttons],
          });

          if (interaction.channel instanceof TextChannel) {
            startAuctionTimer(guildId, interaction.channel);
          }
        }
      } else {
        await interaction.reply({
          content: `🗳️ **${interaction.user.displayName}** passed (${current}/${needed} passes).`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    // Stadium Collect & Upgrade
    if (customId === "stadium_collect") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await economyService.claimStadiumRevenue(interaction.user.id);
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }
      await interaction.editReply({ content: `✅ ${res.message}\n💳 New Balance: **${res.newBalance?.toLocaleString()} Coins**` });
      return;
    }

    if (customId === "stadium_upgrade") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await economyService.upgradeStadium(interaction.user.id);
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }
      await interaction.editReply({ content: `✅ ${res.message}\n💳 New Balance: **${res.newBalance?.toLocaleString()} Coins**` });
      return;
    }

    // Match Challenge Accept / Decline
    if (customId.startsWith("match_") && customId.includes("_accept")) {
      const parts = customId.split("_");
      const challengerId = parts[1];
      const opponentId = parts[2];

      if (interaction.user.id !== opponentId) {
        await interaction.reply({ content: "❌ Only the challenged manager can accept.", flags: MessageFlags.Ephemeral });
        return;
      }

      const challengeKey = `match_${challengerId}_${opponentId}`;
      matchService.resolveChallenge(challengeKey);

      await interaction.deferUpdate();
      const homeSide = await matchService.buildClubMatchSide(challengerId);
      const awaySide = await matchService.buildClubMatchSide(opponentId, interaction.user.displayName);

      const { runLiveMatchSimulation } = await import("../commands/game/match.js");
      await runLiveMatchSimulation(interaction, homeSide, awaySide);
      return;
    }

    if (customId.startsWith("match_") && customId.includes("_decline")) {
      const parts = customId.split("_");
      const challengerId = parts[1];
      const opponentId = parts[2];
      if (interaction.user.id !== opponentId) {
        await interaction.reply({ content: "❌ Only the challenged manager can decline.", flags: MessageFlags.Ephemeral });
        return;
      }
      const challengeKey = `match_${challengerId}_${opponentId}`;
      matchService.resolveChallenge(challengeKey);
      await interaction.update({ content: "❌ Match challenge was declined.", embeds: [], components: [] });
      return;
    }

    // Trade Accept / Decline (Short ID via tradeService)
    if (customId.startsWith("trade_") && (customId.endsWith("_accept") || customId.endsWith("_decline"))) {
      const isAccept = customId.endsWith("_accept");
      const tradeId = customId.replace("trade_", "").replace("_accept", "").replace("_decline", "");
      const proposal = tradeService.getProposal(tradeId);

      if (!proposal) {
        await interaction.reply({ content: "❌ This trade proposal has expired or is no longer valid.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (interaction.user.id !== proposal.receiverId) {
        await interaction.reply({ content: "❌ Only the trade recipient can respond to this offer.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (!isAccept) {
        tradeService.deleteProposal(tradeId);
        await interaction.update({ content: "❌ Trade proposal was declined.", embeds: [], components: [] });
        return;
      }

      await interaction.deferUpdate();

      // Execute atomic trade
      try {
        const tradeRes = await prisma.$transaction(async (tx) => {
          const sCard = await tx.inventoryCard.findUnique({ where: { id: proposal.senderCardId } });
          const rCard = await tx.inventoryCard.findUnique({ where: { id: proposal.receiverCardId } });

          if (!sCard || !rCard || sCard.userId !== proposal.senderId || rCard.userId !== proposal.receiverId) {
            return { success: false, message: "❌ One of the cards is no longer available in inventory." };
          }

          await tx.inventoryCard.update({ where: { id: sCard.id }, data: { userId: proposal.receiverId } });
          await tx.inventoryCard.update({ where: { id: rCard.id }, data: { userId: proposal.senderId } });

          return { success: true, sCard, rCard };
        });

        if (!tradeRes.success || !tradeRes.sCard || !tradeRes.rCard) {
          await interaction.followUp({ content: tradeRes.message, flags: MessageFlags.Ephemeral });
          return;
        }

        tradeService.deleteProposal(tradeId);
        const embed = createTradeSuccessEmbed(
          `<@${proposal.senderId}>`,
          tradeRes.sCard.name,
          `<@${proposal.receiverId}>`,
          tradeRes.rCard.name
        );
        await interaction.editReply({ embeds: [embed], components: [] });
      } catch (err) {
        await interaction.followUp({ content: `❌ Trade failed: ${err}`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // Tournament Lobby Buttons
    if (customId === "tourney_join" && guildId) {
      await interaction.deferUpdate();
      const res = await tournamentService.joinTournament(guildId, interaction.user.id, interaction.user.displayName);
      if (!res.success || !res.tournament) {
        await interaction.followUp({ content: res.message, flags: MessageFlags.Ephemeral });
        return;
      }
      const embed = createTournamentLobbyEmbed(res.tournament);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (customId === "tourney_leave" && guildId) {
      await interaction.deferUpdate();
      const res = await tournamentService.leaveTournament(guildId, interaction.user.id);
      if (!res.success) {
        await interaction.followUp({ content: res.message, flags: MessageFlags.Ephemeral });
        return;
      }
      const tourney = tournamentService.getActiveTournament(guildId);
      if (tourney) {
        const embed = createTournamentLobbyEmbed(tourney);
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: "Tournament was cancelled.", embeds: [], components: [] });
      }
      return;
    }

    if (customId === "tourney_start" && guildId) {
      const res = tournamentService.startTournament(guildId, interaction.user.id);
      if (!res.success) {
        await interaction.reply({ content: res.message, flags: MessageFlags.Ephemeral });
        return;
      }

      const tourney = tournamentService.getActiveTournament(guildId);
      if (!tourney) return;

      await interaction.update({
        content: `⚔️ **${tourney.name} HAS COMMENCED!** Auto-simulating fixtures...`,
        embeds: [],
        components: [],
      });

      // Run tournament simulation loop
      if (interaction.channel instanceof TextChannel) {
        while (tourney.status === "IN_PROGRESS") {
          const { fixture, result } = tournamentService.playNextFixture(tourney);
          if (!fixture || !result) break;

          const resEmbed = createMatchResultEmbed(result);
          await interaction.channel.send({
            content: `⚔️ **${fixture.roundName} FT:** ${fixture.home?.clubName} **${result.homeScore} - ${result.awayScore}** ${fixture.away?.clubName}`,
            embeds: [resEmbed],
          });
        }

        if (tourney.status === "COMPLETED") {
          const prize = await tournamentService.awardTournamentPrize(tourney);
          const winName = tourney.winner ? tourney.winner.clubSide.clubName : "Champion";
          await interaction.channel.send({
            content: `👑 **${tourney.name} CONCLUDED!**\n🎉 **${winName}** wins the tournament and takes home **${prize.toLocaleString()} Coins**!`,
          });
        }
      }
      return;
    }

    // Inventory Pagination & Profile Quick View
    if (customId.startsWith("inv_")) {
      const parts = customId.split("_");
      const targetUserId = parts[1];
      const targetPage = parts.length > 3 ? parseInt(parts[3], 10) : parseInt(parts[2] || "1", 10) || 1;
      const isFromProfileOrQuick = !customId.includes("_prev_") && !customId.includes("_next_");

      if (isFromProfileOrQuick) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      } else {
        await interaction.deferUpdate();
      }

      const cards = await economyService.getInventory(targetUserId);
      const totalPages = Math.max(1, Math.ceil(cards.length / 10));
      const safePage = Math.min(Math.max(1, targetPage), totalPages);
      const user = await economyService.ensureUser(targetUserId);
      const embed = createInventoryEmbed(cards, user.name, safePage, 10);
      const buttons = createPaginationButtons(safePage, totalPages, `inv_${targetUserId}`);
      await interaction.editReply({ embeds: [embed], components: totalPages > 1 ? [buttons] : [] });
      return;
    }

    // Market Pagination
    if (customId.startsWith("mkt_") && (customId.includes("_prev_") || customId.includes("_next_"))) {
      await interaction.deferUpdate();
      const parts = customId.split("_");
      const targetPage = parseInt(parts[2], 10);
      const { listings, total, totalPages } = await marketService.getListings(targetPage, 5);
      const safePage = Math.min(Math.max(1, targetPage), Math.max(1, totalPages));
      const embed = createMarketEmbed(listings, safePage, totalPages, total);
      
      const components: any[] = [];
      if (listings.length > 0) {
        const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("market_buy_select")
            .setPlaceholder("🛒 Select a footballer to Buy Now...")
            .addOptions(
              listings.map((l) => ({
                label: `${l.card.name.slice(0, 25)} (${l.card.rating} ${l.card.position})`,
                description: `Price: ${l.price.toLocaleString()} Coins • Seller: ${(l.sellerName || "Market").slice(0, 20)}`,
                value: l.id,
                emoji: "⚡",
              }))
            )
        );
        components.push(selectMenu);
      }
      if (totalPages > 1) {
        components.push(createPaginationButtons(safePage, totalPages, "mkt"));
      }
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("market_my_listings")
            .setLabel("Manage My Listings / Cancel")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("📦")
        )
      );
      await interaction.editReply({ embeds: [embed], components });
      return;
    }

    // Market My Listings & Direct Cancel Menu
    if (customId === "market_my_listings") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const myListings = await marketService.getUserListings(interaction.user.id);

      if (myListings.length === 0) {
        await interaction.editReply({
          content: "ℹ️ You currently have no active footballer listings on the Transfer Market.\nList cards using `/sell`!",
        });
        return;
      }

      const options = myListings.slice(0, 25).map((l) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${l.card.name.slice(0, 25)} (${l.card.rating} ${l.card.position})`)
          .setDescription(`Price: ${l.price.toLocaleString()} Coins • ID: ${l.id.slice(0, 15)}`)
          .setValue(l.id)
          .setEmoji("❌")
      );

      const cancelMenu = new StringSelectMenuBuilder()
        .setCustomId("market_cancel_select")
        .setPlaceholder("❌ Select a listing to cancel and retrieve card...")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(cancelMenu);

      const lines = myListings.map(
        (l, i) =>
          `**${i + 1}.** **${l.card.name}** (\`${l.card.rating} ${l.card.position}\`) — 💰 **${l.price.toLocaleString()} Coins** | ID: \`${l.id}\``
      );

      await interaction.editReply({
        content:
          `📦 **Your Active Transfer Market Listings (${myListings.length}):**\n\n` +
          lines.join("\n") +
          `\n\n*Select a player from the dropdown below to cancel the listing and return the card to your inventory:*`,
        components: [row],
      });
      return;
    }



    // Season Pass Claim Buttons
    if (customId.startsWith("season_claim_")) {
      await interaction.deferUpdate();
      const level = parseInt(customId.replace("season_claim_", ""), 10);
      const res = await seasonService.claimTier(interaction.user.id, level, interaction.user.displayName);

      const profile = await seasonService.getProfile(interaction.user.id);
      const embed = createSeasonPassEmbed(
        interaction.user.displayName,
        profile.sxp,
        profile.currentLevel,
        profile.claimedLevels,
        profile.nextTier
      );

      const unclaimedTier = SEASON_TIERS.find(
        (t) => profile.sxp >= t.sxpRequired && !profile.claimedLevels.includes(t.level)
      );

      const buttons = new ActionRowBuilder<ButtonBuilder>();
      if (unclaimedTier) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`season_claim_${unclaimedTier.level}`)
            .setLabel(`Claim Tier ${unclaimedTier.level}`)
            .setStyle(ButtonStyle.Success)
            .setEmoji("🎁")
        );
      }
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId("season_claim_all")
          .setLabel("Claim All Available")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("✨")
          .setDisabled(!unclaimedTier)
      );

      await interaction.editReply({
        content: res.message,
        embeds: [embed],
        components: [buttons],
      });
      return;
    }

    if (customId === "season_claim_all") {
      await interaction.deferUpdate();
      const profile = await seasonService.getProfile(interaction.user.id);
      const claimable = SEASON_TIERS.filter(
        (t) => profile.sxp >= t.sxpRequired && !profile.claimedLevels.includes(t.level)
      );

      for (const tier of claimable) {
        await seasonService.claimTier(interaction.user.id, tier.level, interaction.user.displayName);
      }

      const updatedProfile = await seasonService.getProfile(interaction.user.id);
      const embed = createSeasonPassEmbed(
        interaction.user.displayName,
        updatedProfile.sxp,
        updatedProfile.currentLevel,
        updatedProfile.claimedLevels,
        updatedProfile.nextTier
      );

      await interaction.editReply({
        content: `🎉 Claimed all **${claimable.length}** unlocked milestone rewards!`,
        embeds: [embed],
        components: [],
      });
      return;
    }

    // Daily Shop 1-Click Buy Buttons
    if (customId.startsWith("dailyshop_buy_")) {
      const idx = parseInt(customId.replace("dailyshop_buy_", ""), 10);
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await dailyShopService.buyOffer(
        interaction.user.id,
        idx,
        interaction.user.displayName
      );
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }
      await interaction.editReply({
        content: `${res.message}\n💳 **New Treasury Balance:** **${res.newBalance?.toLocaleString()} Coins**\nView in your club with \`/inventory\` or \`/club\`!`,
      });
      return;
    }

    // Quicksell All Button
    if (customId === "quicksell_all_btn") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await economyService.quicksellAllCards(interaction.user.id);
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }
      await interaction.editReply({
        content: `💰 ${res.message}\n💳 **New Treasury Balance:** **${res.newBalance?.toLocaleString()} Coins**`,
      });
      return;
    }

    // Pack Action: Open Again
    if (customId === "pack_again_standard" || customId === "pack_again_premium") {
      const packType = customId === "pack_again_premium" ? "premium" : "standard";
      await interaction.deferUpdate();
      const res = await economyService.openPack(
        interaction.user.id,
        packType,
        interaction.user.displayName
      );

      if (!res.success || !res.result) {
        await interaction.followUp({ content: res.message, flags: MessageFlags.Ephemeral });
        return;
      }

      const avatar = interaction.user.displayAvatarURL();
      const embed = createPackOpenedEmbed(res.result, interaction.user.displayName, avatar);
      const canAffordAgain = res.result.newBalance >= res.result.cost;
      const tradableCount = res.result.cards.filter((c) => !c.untradeable).length;
      const buttons = createPackActionButtons(packType, canAffordAgain, tradableCount, res.result.cost);

      await interaction.editReply({
        content: "",
        embeds: [embed],
        components: [buttons],
      });
      return;
    }

    // Pack Action: Quick Sell Recent Pack
    if (customId === "pack_quicksell_recent") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await economyService.quicksellRecentPack(interaction.user.id);
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }
      await interaction.editReply({
        content: `💰 **Pack Liquidated!** Sold **${res.count} cards** for **+${res.totalCoins.toLocaleString()} Coins**.\n💳 **New Treasury Balance:** **${res.newBalance?.toLocaleString()} Coins**`,
      });
      return;
    }

    // Quick View Inventory
    if (customId === "inventory_view_user") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const cards = await economyService.getInventory(interaction.user.id);
      const avatar = interaction.user.displayAvatarURL();
      const embed = createInventoryEmbed(cards, interaction.user.displayName, 1, 10, avatar);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Profile Action: View Club
    if (customId.startsWith("profile_club_")) {
      const targetUserId = customId.replace("profile_club_", "");
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const user = await economyService.ensureUser(targetUserId);
      const captain = await economyService.getCaptain(targetUserId);
      const managerCard = await economyService.getAssignedManager(targetUserId);
      const squad = await economyService.buildMatchSquad(targetUserId);
      const clubValue = await economyService.getClubValuation(targetUserId);
      const inventory = await economyService.getInventory(targetUserId);

      const embed = createClubEmbed({
        userName: user.name,
        clubName: user.clubName,
        kitEmoji: user.kitEmoji,
        motto: user.motto,
        bannerUrl: user.bannerUrl,
        tacticName: user.tactic,
        captain,
        managerCard,
        squad,
        coins: user.coins,
        clubValue,
        cardCount: inventory.length,
      });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Profile Action: View Division Rivals
    if (customId.startsWith("profile_rivals_")) {
      const targetUserId = customId.replace("profile_rivals_", "");
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const profile = await divisionService.getDivisionProfile(targetUserId);
      const embed = createDivisionProfileEmbed(profile);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Club Interactive Buttons: Edit Lineup, Auto Lineup, Tactics
    if (customId.startsWith("club_edit_lineup")) {
      const parts = customId.split("_");
      const targetUserId = parts[3] || interaction.user.id;
      if (interaction.user.id !== targetUserId) {
        await interaction.reply({
          content: "❌ You can only edit your own club's lineup!",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const inventory = await economyService.getInventory(interaction.user.id);
      const footballers = inventory.filter((c) => c.position !== "MGR");
      const managers = inventory.filter((c) => c.position === "MGR");
      const activeManager = await economyService.getAssignedManager(interaction.user.id);

      if (footballers.length < 5) {
        await interaction.editReply({
          content: `❌ You need at least 5 footballer cards in your inventory to configure a starting lineup (You have **${footballers.length} footballers**).\nCollect cards with \`/daily\`, \`/dailyshop\`, \`/pack\`, or \`/market\`.`,
        });
        return;
      }

      const components: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

      const playerOptions = footballers.slice(0, 25).map((c) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${c.name.slice(0, 25)} (${c.rating} ${c.position})`)
          .setDescription(`${c.club.slice(0, 20)} • ${c.nation.slice(0, 20)}`)
          .setValue(c.id)
      );

      const playerMenu = new StringSelectMenuBuilder()
        .setCustomId("lineup_select_5")
        .setPlaceholder("⚽ Select exactly 5 footballers for Starting Lineup")
        .setMinValues(5)
        .setMaxValues(5)
        .addOptions(playerOptions);

      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(playerMenu));

      if (managers.length > 0) {
        const managerOptions = managers.slice(0, 25).map((m) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${m.name.slice(0, 25)} (${m.rating} MGR)`)
            .setDescription(`${m.club.slice(0, 20)} • ${m.nation.slice(0, 20)}`)
            .setValue(m.id)
            .setDefault(activeManager?.id === m.id)
        );

        const managerMenu = new StringSelectMenuBuilder()
          .setCustomId("lineup_select_manager")
          .setPlaceholder(
            activeManager
              ? `👔 Current Coach: ${activeManager.name} (${activeManager.rating} MGR)`
              : "👔 Appoint a Head Coach / Manager"
          )
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(managerOptions);

        components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(managerMenu));
      }

      const coachStatus = activeManager
        ? `👔 **Active Head Coach:** **${activeManager.name}** (\`${activeManager.rating} MGR\` — *${activeManager.club}*)`
        : `👔 **Active Head Coach:** *None (Sign a manager in \`/dailyshop\` or \`/pack\`!)*`;

      await interaction.editReply({
        content:
          `📋 **Club Roster & Starting 5 Lineup Editor**\n` +
          `${coachStatus}\n\n` +
          `• **Starting 5:** Select exactly 5 footballers below.\n` +
          `• **Head Coach:** ${managers.length > 0 ? "Select your tactical manager below." : "*Acquire managers from `/dailyshop` or `/pack` to appoint.*"}\n` +
          `*Formation Rules: Exactly 1 GK, and 1-2 DEF, 1-2 MID, 1-2 FW.*`,
        components,
      });
      return;
    }

    if (customId.startsWith("club_auto_lineup")) {
      const parts = customId.split("_");
      const targetUserId = parts[3] || interaction.user.id;
      if (interaction.user.id !== targetUserId) {
        await interaction.reply({
          content: "❌ You can only auto-configure your own club's lineup!",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await economyService.autoSetLineup(interaction.user.id);
      if (!res.success || !res.players) {
        await interaction.editReply({ content: res.message });
        return;
      }

      const playerList = res.players
        .map((p) => `• **${p.name}** (\`${p.rating} ${p.position}\` — *${p.club}*)`)
        .join("\n");
      const coachText = res.manager
        ? `👔 **Head Coach:** **${res.manager.name}** (\`${res.manager.rating} MGR\` — *${res.manager.club}*)`
        : `👔 **Head Coach:** *None (Sign a manager from \`/dailyshop\` or \`/pack\`)*`;

      const embed = new EmbedBuilder()
        .setTitle("⚡ Auto-Lineup Configured!")
        .setDescription(
          `Your highest-rated Starting 5 and Head Coach have been automatically selected and saved:\n\n` +
            `**Starting 5 Squad:**\n${playerList}\n\n` +
            `${coachText}\n\n` +
            `*Run \`/club\` to view your updated tactical pitch formation!*`
        )
        .setColor(0x22c55e);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (customId.startsWith("club_edit_tactic")) {
      const parts = customId.split("_");
      const targetUserId = parts[3] || interaction.user.id;
      if (interaction.user.id !== targetUserId) {
        await interaction.reply({
          content: "❌ You can only change your own club's tactic!",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const user = await economyService.ensureUser(interaction.user.id);

      const tacticOptions = Object.values(TACTICS_CATALOG).map((t) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${t.emoji} ${t.name}`)
          .setDescription(`${t.strengthDesc.slice(0, 50)}`)
          .setValue(t.tacticType)
          .setDefault(user.tactic === t.tacticType)
      );

      const tacticMenu = new StringSelectMenuBuilder()
        .setCustomId("club_tactic_select")
        .setPlaceholder(`🧠 Current: ${getTacticInfo(user.tactic).name} — Choose a new playstyle`)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(tacticOptions);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(tacticMenu);

      await interaction.editReply({
        content:
          `🧠 **Club Tactical Playstyle Selector**\n` +
          `Select your club's tactical identity below. Playstyles directly counter specific opponents in \`/match\`:\n\n` +
          `• 🪄 **Tiki-Taka** ➔ Counters 🧱 Park the Bus\n` +
          `• ⚡ **Gegenpress** ➔ Counters 🪄 Tiki-Taka\n` +
          `• 🎯 **Counter-Attack** ➔ Counters ⚡ Gegenpress\n` +
          `• 🚀 **All-Out Attack** ➔ Counters 🎯 Counter-Attack\n` +
          `• 🧱 **Park the Bus** ➔ Counters 🚀 All-Out Attack\n` +
          `• ⚖️ **Balanced** ➔ Versatile all-round play`,
        components: [row],
      });
      return;
    }
  } catch (buttonErr) {
    console.error(`Error handling button interaction ${interaction.customId}:`, buttonErr);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ There was an error processing this action.", flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: "❌ There was an error processing this action.", flags: MessageFlags.Ephemeral });
      }
    } catch {
      // Ignored if interaction already closed
    }
  }
}

  // 4. String Select Menu Interactions
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "market_buy_select") {
      const listingId = interaction.values[0];
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await marketService.buyCard(interaction.user.id, listingId, interaction.user.displayName);
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }
      await interaction.editReply({
        content: `🎉 ${res.message}\n💳 New Balance: **${res.newBalance?.toLocaleString()} Coins**`,
      });
      return;
    }

    if (interaction.customId === "market_cancel_select") {
      const listingId = interaction.values[0];
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await marketService.cancelListing(interaction.user.id, listingId);
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }
      await interaction.editReply({
        content: `✅ ${res.message}\nCheck your updated squad and locker with \`/inventory\` or \`/club\`!`,
      });
      return;
    }

    if (interaction.customId === "lineup_select_5") {
      const selectedIds = interaction.values;
      await prisma.user.update({
        where: { id: interaction.user.id },
        data: { startingLineup: JSON.stringify(selectedIds) },
      });

      await interaction.reply({
        content: `✅ Successfully saved your Starting 5 lineup! Check your club with \`/club\`.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.customId === "lineup_select_manager") {
      const managerCardId = interaction.values[0];
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await economyService.setAssignedManager(interaction.user.id, managerCardId);
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }

      await interaction.editReply({
        content: `👔 **Head Coach Appointed!** **${res.managerCard?.name}** (\`${res.managerCard?.rating} MGR\`) is now directing your club! Check your club with \`/club\`.`,
      });
      return;
    }

    if (interaction.customId.startsWith("quicksell_multi_select")) {
      const cardIds = interaction.values;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await economyService.quicksellMultipleCards(interaction.user.id, cardIds);
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }

      await interaction.editReply({
        content: `💰 ${res.message}\n💳 **New Treasury Balance:** **${res.newBalance?.toLocaleString()} Coins**`,
      });
      return;
    }

    if (interaction.customId === "club_tactic_select") {
      const selectedTactic = interaction.values[0];
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await profileService.setClubTactic(interaction.user.id, selectedTactic);

      const tInfo = getTacticInfo(selectedTactic);
      const countersStr = tInfo.counters ? getTacticInfo(tInfo.counters).name : "None";
      const vulnStr = tInfo.vulnerableTo ? getTacticInfo(tInfo.vulnerableTo).name : "None";

      const embed = new EmbedBuilder()
        .setTitle(`${tInfo.emoji} Tactical Identity Set: ${tInfo.name}`)
        .setDescription(
          `**${interaction.user.displayName}**, your club is now drilling **${tInfo.name}**.\n\n` +
            `• **Philosophy:** ${tInfo.description}\n` +
            `• **Tactical Strength:** ${tInfo.strengthDesc}\n` +
            `• **Tactical Weakness:** ${tInfo.weaknessDesc}\n` +
            `• **Counters:** ${countersStr}   •   **Vulnerable To:** ${vulnStr}\n`
        )
        .setColor(0x22c55e)
        .setFooter({ text: "Your tactical choice directly impacts /match calculations." });

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  }
}

