import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

export function createLobbyButtons(canStart: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("auction_lobby_join")
      .setLabel("Join Lobby")
      .setStyle(ButtonStyle.Success)
      .setEmoji("➕"),
    new ButtonBuilder()
      .setCustomId("auction_lobby_start")
      .setLabel("Start Auction")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("▶️")
      .setDisabled(!canStart),
    new ButtonBuilder()
      .setCustomId("auction_lobby_leave")
      .setLabel("Leave")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🚪")
  );
}

export function createAuctionActionButtons(
  currentBid: number,
  canBid: boolean
): ActionRowBuilder<ButtonBuilder> {
  const nextMin = currentBid + 1;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`auction_bid_${nextMin}`)
      .setLabel(`Bid +$1 ($${nextMin})`)
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰")
      .setDisabled(!canBid),
    new ButtonBuilder()
      .setCustomId(`auction_bid_${currentBid + 5}`)
      .setLabel(`Bid +$5 ($${currentBid + 5})`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔥")
      .setDisabled(!canBid),
    new ButtonBuilder()
      .setCustomId("auction_pass")
      .setLabel("Pass / Skip")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏭️")
  );
}

export function createPaginationButtons(
  currentPage: number,
  totalPages: number,
  prefix = "page"
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_prev_${currentPage - 1}`)
      .setLabel("◀ Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(`${prefix}_indicator`)
      .setLabel(`${currentPage} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${prefix}_next_${currentPage + 1}`)
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages)
  );
}

export function createAcceptDeclineButtons(prefix: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_accept`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`${prefix}_decline`)
      .setLabel("Decline")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );
}

export function createPenaltyShooterButtons(gameId?: string): ActionRowBuilder<ButtonBuilder> {
  const prefix = gameId ? `penalty_shot_${gameId}_` : "penalty_shot_";
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}TOP_LEFT`).setLabel("Top Left ↖").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${prefix}BOTTOM_LEFT`).setLabel("Bottom Left ↙").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${prefix}CENTER`).setLabel("Chip Center ⬆").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`${prefix}BOTTOM_RIGHT`).setLabel("Bottom Right ↘").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${prefix}TOP_RIGHT`).setLabel("Top Right ↗").setStyle(ButtonStyle.Primary)
  );
}

export function createPenaltyKeeperButtons(gameId?: string): ActionRowBuilder<ButtonBuilder> {
  const prefix = gameId ? `penalty_dive_${gameId}_` : "penalty_dive_";
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}LEFT`).setLabel("Dive Left ⬅️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${prefix}CENTER`).setLabel("Stay Center 🧍").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${prefix}RIGHT`).setLabel("Dive Right ➡️").setStyle(ButtonStyle.Primary)
  );
}
