import { TextChannel, ActionRowBuilder, ButtonBuilder } from "discord.js";
import { partyService } from "../services/partyService.js";
import { safeSendMessage } from "../../utils/discord.js";
import {
  createPartyAuctionItemEmbed,
  createPartyRevealEmbed,
  createPartyVotingEmbed,
  createPartyResultsEmbed,
} from "../ui/partyEmbeds.js";
import {
  createPartyAuctionButtons,
  createPartyVotingButtons,
  createPartyRematchButtons,
} from "../ui/partyButtons.js";

const timerTimeouts: Map<string, NodeJS.Timeout> = new Map();
const timerExpiryMap: Map<string, number> = new Map();

export const PARTY_AUCTION_TIMER_SECONDS = 8;
export const PARTY_BID_TIMER_SECONDS = 5;
export const PARTY_VOTING_TIMER_SECONDS = 30;

export function getRemainingPartyTimerSeconds(gameKey: string): number {
  const expiresAt = timerExpiryMap.get(gameKey);
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

export function clearPartyTimer(gameKey: string): void {
  const timeout = timerTimeouts.get(gameKey);
  if (timeout) {
    clearTimeout(timeout);
    timerTimeouts.delete(gameKey);
  }
  timerExpiryMap.delete(gameKey);
}

export function startPartyAuctionTimer(
  gameKey: string,
  channel: TextChannel,
  duration = PARTY_AUCTION_TIMER_SECONDS
): void {
  clearPartyTimer(gameKey);

  timerExpiryMap.set(gameKey, Date.now() + duration * 1000);
  const token = partyService.generateTimerToken(gameKey);

  const timeout = setTimeout(async () => {
    try {
      if (!partyService.isCurrentToken(gameKey, token)) return;

      const game = partyService.getGameByKey(gameKey);
      if (!game || game.status !== "AUCTION") return;

      const item = game.currentItem;
      if (!item) return;

      // Case A: A bid was placed -> Sold!
      if (game.currentBidder !== null) {
        const soldResult = game.sellCurrentItem();
        if (!soldResult) return;

        let content = `${soldResult.roast}\n💰 **${soldResult.winnerName}** has **${soldResult.remainingPurse} BB** remaining.`;
        if (soldResult.squadFilled) {
          content += `\n🎉 **${soldResult.winnerName}** has completed their 5-item squad!`;
        }
        if (soldResult.bankruptcyAlert) {
          content += `\n\n${soldResult.bankruptcyAlert}`;
        }

        await safeSendMessage(channel, content);

        const isFinished = game.isAuctionFinished();
        const hasNext = !isFinished && game.nextItem();

        if (isFinished || !hasNext) {
          await finishPartyAuctionWorkflow(gameKey, channel);
          return;
        }

        // Announce next item on the block
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

          let nextMsg = `🔨 **NEXT ITEM ON THE BLOCK:**`;
          if (game.currentChaosAnnouncement) {
            nextMsg += `\n${game.currentChaosAnnouncement}`;
          }

          await safeSendMessage(channel, {
            content: nextMsg,
            embeds: [embed],
            components: [buttons],
          });
          startPartyAuctionTimer(gameKey, channel, PARTY_AUCTION_TIMER_SECONDS);
        }
      } else {
        // Case B: No bids placed -> Pass / Skip
        const skipped = game.skipCurrentItem();
        const iName = skipped ? skipped.name : item.name;

        await safeSendMessage(
          channel,
          `⏱️ **Time's Up — No Bids.**\n**${iName}** went unsold and returns to the multiverse void.`
        );

        const isFinished = game.isAuctionFinished();
        const hasNext = !isFinished && game.nextItem();

        if (isFinished || !hasNext) {
          await finishPartyAuctionWorkflow(gameKey, channel);
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

          let nextMsg = `🔨 **NEXT ITEM ON THE BLOCK:**`;
          if (game.currentChaosAnnouncement) {
            nextMsg += `\n${game.currentChaosAnnouncement}`;
          }

          await safeSendMessage(channel, {
            content: nextMsg,
            embeds: [embed],
            components: [buttons],
          });
          startPartyAuctionTimer(gameKey, channel, PARTY_AUCTION_TIMER_SECONDS);
        }
      }
    } catch (err) {
      console.error(`Error in Party Auction timer for ${gameKey}:`, err);
    }
  }, duration * 1000);

  timerTimeouts.set(gameKey, timeout);
}

/**
 * Transitions from Auction -> Team Reveal -> Community Voting -> Awards
 */
export async function finishPartyAuctionWorkflow(
  gameKey: string,
  channel: TextChannel
): Promise<void> {
  clearPartyTimer(gameKey);

  const game = partyService.getGameByKey(gameKey);
  if (!game) return;

  // Auto fill missing items if pool ran out
  game.autoFillMissingItems();

  // Phase 1: Reveal
  game.revealSecretObjectives();

  await safeSendMessage(
    channel,
    `🚨 **AUCTION CONCLUDED!**\nAll 5-item squads have been completed. Preparing the **Grand Reveal**...`
  );

  const revealEmbeds = createPartyRevealEmbed(game);
  for (const emb of revealEmbeds) {
    await safeSendMessage(channel, { embeds: [emb] });
  }

  // Phase 2: Community Voting
  game.startVoting();

  const votingEmbed = createPartyVotingEmbed(game, PARTY_VOTING_TIMER_SECONDS);
  const votingButtons = createPartyVotingButtons(game);

  await safeSendMessage(channel, {
    content: `🗳️ **COMMUNITY VOTING IS NOW OPEN!**\nVote for who built the best team for the scenario: **"${game.scenario.title}"**!`,
    embeds: [votingEmbed],
    components: votingButtons,
  });

  // Start voting countdown timer (30s)
  const token = partyService.generateTimerToken(gameKey);
  const votingTimeout = setTimeout(async () => {
    try {
      if (!partyService.isCurrentToken(gameKey, token)) return;
      await finishPartyVotingWorkflow(gameKey, channel);
    } catch (err) {
      console.error(`Error in Party Voting timer for ${gameKey}:`, err);
    }
  }, PARTY_VOTING_TIMER_SECONDS * 1000);

  timerTimeouts.set(gameKey, votingTimeout);
}

/**
 * Concludes Community Voting and presents funny awards, stats, and rematch buttons
 */
export async function finishPartyVotingWorkflow(
  gameKey: string,
  channel: TextChannel
): Promise<void> {
  clearPartyTimer(gameKey);

  const game = partyService.getGameByKey(gameKey);
  if (!game) return;

  // Calculate Awards
  const awards = game.calculateAwards();
  const shareable = game.generateShareableResult();

  // Persist game stats
  const { partyStatsService } = await import("../services/partyStatsService.js");
  await partyStatsService.recordGameResults(shareable);

  const resultsEmbed = createPartyResultsEmbed(game, awards, shareable.totalSpending);
  const rematchButtons = createPartyRematchButtons(gameKey);

  await safeSendMessage(channel, {
    content: `🎉 **THE JURY HAS DELIBERATED! OFFICIAL RESULTS & AWARDS:**`,
    embeds: [resultsEmbed],
    components: [rematchButtons],
  });
}
