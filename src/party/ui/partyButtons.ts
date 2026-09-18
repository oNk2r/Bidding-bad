import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getAllCategories, getCategory } from "../categories/index.js";
import type { PartyGame } from "../models/partyGame.js";

export function createPartyCategorySelectMenu(): ActionRowBuilder<StringSelectMenuBuilder> {
  const categories = getAllCategories();
  const options = categories.map((cat) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${cat.emoji} ${cat.name}`)
      .setDescription(cat.description.slice(0, 50))
      .setValue(cat.id)
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId("party_category_select")
    .setPlaceholder("🎲 Choose a Party Category...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function createPartyScenarioSelectMenu(
  categoryId: string
): ActionRowBuilder<StringSelectMenuBuilder> {
  const cat = getCategory(categoryId);
  const scenarios = cat ? cat.scenarios : [];

  const options = scenarios.slice(0, 25).map((scen) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${scen.emoji || "🎯"} ${scen.title.slice(0, 50)}`)
      .setDescription(scen.description.slice(0, 50))
      .setValue(scen.id)
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId("party_scenario_select")
    .setPlaceholder("🎯 Choose a Scenario challenge...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function createPartyLobbyButtons(
  canStart: boolean
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("party_lobby_join")
      .setLabel("Join Party")
      .setStyle(ButtonStyle.Success)
      .setEmoji("➕"),
    new ButtonBuilder()
      .setCustomId("party_lobby_start")
      .setLabel("Start Auction")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("▶️")
      .setDisabled(!canStart),
    new ButtonBuilder()
      .setCustomId("party_lobby_leave")
      .setLabel("Leave")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🚪"),
    new ButtonBuilder()
      .setCustomId("party_lobby_scenario")
      .setLabel("Scenarios")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🎯")
  );
}

export function createPartyAuctionButtons(
  currentBid: number,
  canBid: boolean
): ActionRowBuilder<ButtonBuilder> {
  const nextMin = currentBid + 1;
  const nextFive = currentBid + 5;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`party_bid_${nextMin}`)
      .setLabel(`Bid +1 (${nextMin} BB)`)
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰")
      .setDisabled(!canBid),
    new ButtonBuilder()
      .setCustomId(`party_bid_${nextFive}`)
      .setLabel(`Bid +5 (${nextFive} BB)`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔥")
      .setDisabled(!canBid),
    new ButtonBuilder()
      .setCustomId("party_pass")
      .setLabel("Pass / Skip")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏭️")
  );
}

export function createPartyVotingButtons(
  game: PartyGame
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();

  for (let i = 0; i < game.players.length; i++) {
    const pid = game.players[i];
    const name = game.playerStates[pid]?.displayName || `Player ${i + 1}`;
    const btn = new ButtonBuilder()
      .setCustomId(`party_vote_${pid}`)
      .setLabel(name.slice(0, 20))
      .setStyle(ButtonStyle.Primary)
      .setEmoji("👑");

    currentRow.addComponents(btn);

    if (currentRow.components.length === 5 || i === game.players.length - 1) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }
  }

  return rows;
}

export function createPartyRematchButtons(
  gameKey: string
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`party_rematch_accept`)
      .setLabel("Run It Back!")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🔥"),
    new ButtonBuilder()
      .setCustomId(`party_rematch_decline`)
      .setLabel("End Session")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("❌")
  );
}
