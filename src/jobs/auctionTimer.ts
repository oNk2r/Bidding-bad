import { TextChannel } from "discord.js";
import { auctionService } from "../services/auctionService.js";
import { safeSendMessage, resolveMemberMention } from "../utils/discord.js";
import { createPlayerEmbed, createSquadEmbed } from "../ui/embeds/auctionEmbeds.js";
import { createAuctionActionButtons } from "../ui/components/buttons.js";
import { AUCTION_TIMER_SECONDS } from "../config/constants.js";

const timerTimeouts: Map<string, NodeJS.Timeout> = new Map();
const timerExpiryMap: Map<string, number> = new Map();

export function getRemainingTimerSeconds(guildId: string): number {
  const expiresAt = timerExpiryMap.get(guildId);
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

export function startAuctionTimer(
  guildId: string,
  channel: TextChannel,
  duration = AUCTION_TIMER_SECONDS
): void {
  // Clear any existing timer for this guild
  clearAuctionTimer(guildId);

  timerExpiryMap.set(guildId, Date.now() + duration * 1000);
  const token = auctionService.generateTimerToken(guildId);

  const timeout = setTimeout(async () => {
    try {
      if (!auctionService.isCurrentToken(guildId, token)) {
        return;
      }

      const auction = auctionService.getAuction(guildId);
      if (!auction || !auction.started) {
        return;
      }

      const player = auction.currentPlayer;
      if (!player) return;

      // Case A: Bid was placed -> Sold!
      if (auction.currentBidder !== null) {
        const soldResult = auction.sellCurrentPlayer();
        if (!soldResult) return;

        const [soldP, winnerId, winningBid] = soldResult;
        const winnerMention = resolveMemberMention(winnerId);

        await safeSendMessage(
          channel,
          `🔨 **Time's Up — Sold!**\n\n` +
            `**${soldP.name}**\n` +
            `Sold for: **$${winningBid}**\n` +
            `Winner: ${winnerMention}`
        );

        const winnerSquad = auction.squads[winnerId];
        if (winnerSquad && winnerSquad.players.length >= auction.squadSize) {
          await safeSendMessage(
            channel,
            `🎉 ${winnerMention} has completed their squad (${auction.squadSize}/${auction.squadSize} players)!`
          );
        }

        const isFinished = auction.isFinished();
        const hasNext = !isFinished && auction.nextPlayer();

        if (isFinished || !hasNext) {
          await finishAuctionWorkflow(guildId, channel);
          return;
        }

        // Announce next player
        if (auction.currentPlayer) {
          const potCount = auction.playerPool.length + 1;
          const embed = createPlayerEmbed(auction.currentPlayer, auction.currentPlayer.startingPrice);
          const buttons = createAuctionActionButtons(auction.currentPlayer.startingPrice, true);

          await safeSendMessage(channel, {
            content: `⚽ **Next Footballer up for bidding (${potCount} remaining in pot):**`,
            embeds: [embed],
            components: [buttons],
          });
          startAuctionTimer(guildId, channel);
        }
      } else {
        // Case B: No bids placed -> Pass / Skip
        const skipped = auction.skipCurrentPlayer();
        const pName = skipped ? skipped.name : player.name;

        await safeSendMessage(
          channel,
          `⏱️ **Time's Up — No Bids.**\n**${pName}** went unsold and returns to the pool.`
        );

        const isFinished = auction.isFinished();
        const hasNext = !isFinished && auction.nextPlayer();

        if (isFinished || !hasNext) {
          await finishAuctionWorkflow(guildId, channel);
          return;
        }

        if (auction.currentPlayer) {
          const potCount = auction.playerPool.length + 1;
          const embed = createPlayerEmbed(auction.currentPlayer, auction.currentPlayer.startingPrice);
          const buttons = createAuctionActionButtons(auction.currentPlayer.startingPrice, true);

          await safeSendMessage(channel, {
            content: `⚽ **Next Footballer up for bidding (${potCount} remaining in pot):**`,
            embeds: [embed],
            components: [buttons],
          });
          startAuctionTimer(guildId, channel);
        }
      }
    } catch (err) {
      console.error(`Error in auction timer for guild ${guildId}:`, err);
    }
  }, duration * 1000);

  timerTimeouts.set(guildId, timeout);
}

export function clearAuctionTimer(guildId: string): void {
  const timeout = timerTimeouts.get(guildId);
  if (timeout) {
    clearTimeout(timeout);
    timerTimeouts.delete(guildId);
  }
  timerExpiryMap.delete(guildId);
}

export async function finishAuctionWorkflow(guildId: string, channel: TextChannel): Promise<void> {
  clearAuctionTimer(guildId);

  const auction = auctionService.getAuction(guildId);
  if (!auction) return;

  await auctionService.finishAuctionAndAwardSquads(guildId);

  await safeSendMessage(
    channel,
    `🏆 **AUCTION CONCLUDED!**\nAll squads have been finalized and awarded to your permanent club inventories.`
  );

  for (const pid of auction.players) {
    const squad = auction.squads[pid];
    if (squad) {
      const name = auction.playerNames[pid] || `Manager ${pid}`;
      const embed = createSquadEmbed(squad, name, auction.budgets[pid] ?? 0);
      await safeSendMessage(channel, { embeds: [embed] });
    }
  }

  auctionService.removeAuction(guildId);
}
