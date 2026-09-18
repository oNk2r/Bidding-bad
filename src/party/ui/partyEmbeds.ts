import { EmbedBuilder } from "discord.js";
import { PartyGame } from "../models/partyGame.js";
import type { PartyItem, PartyCategory, PartyScenario, PartyAward } from "../types.js";
import type { PartyPlayerState } from "../types.js";
import { PartySquad } from "../models/partySquad.js";

export function createPartyCategorySelectEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("🔨 BIDDING BAD — PARTY AUCTION")
    .setDescription(
      `**Choose a Category to begin:**\n\n` +
        `⚽ **Football** — Global pitch icons, legends, and memes\n` +
        `🏏 **Cricket** — Power hitters, swing sultans, and clutch kings\n` +
        `🏀 **Basketball** — NBA royalty, dunk masters, and bucket getters\n` +
        `🎬 **Movies** — Hollywood heroes, villains, and action icons\n` +
        `📺 **TV Shows** — Prestige crime bosses, detectives, and sitcom stars\n` +
        `🎮 **Games** — God slayers, stealth operatives, and pixel legends\n` +
        `🦸 **Superheroes** — Marvel, DC, and comic titans\n` +
        `🧙 **Anime** — Shonen gods, ninja legends, and overpowered beings\n` +
        `🎤 **Music** — Rock gods, rap titans, and pop superstars\n` +
        `🎲 **Random** — Complete multiverse crossover chaos\n\n` +
        `*Select an option from the dropdown menu below:*`
    )
    .setColor(0x8b5cf6)
    .setFooter({ text: "Party Auction • 3-6 Players • 50 BB Virtual Purse • 5 Items" });
}

export function createPartyLobbyEmbed(game: PartyGame): EmbedBuilder {
  const playersList = game.players.map((id, index) => {
    const p = game.playerStates[id];
    const isHost = id === game.hostId ? " 👑 (Host)" : "";
    return `**${index + 1}.** ${p?.displayName || `Player ${id}`}${isHost}`;
  });

  return new EmbedBuilder()
    .setTitle(`🎉 Party Auction Lobby — ${game.category.emoji} ${game.category.name}`)
    .setDescription(
      `🎯 **Scenario:** **${game.scenario.title}**\n` +
        `*${game.scenario.description}*\n\n` +
        `👥 **Players Joined (${game.players.length}/${game.maxPlayers}):**\n` +
        (playersList.length > 0 ? playersList.join("\n") : "*No players yet*") +
        `\n\n${game.players.length < game.minPlayers ? `⚠️ Need at least **${game.minPlayers} players** to start.` : "✅ Ready to start!"}`
    )
    .setColor(0xec4899)
    .addFields(
      { name: "💰 Starting Purse", value: `**${game.startingPurse} BB** each`, inline: true },
      { name: "🎒 Squad Target", value: `**${game.squadSize} Items**`, inline: true },
      { name: "🕵️ Secret Objectives", value: `**Assigned at Start**`, inline: true }
    )
    .setFooter({ text: "Join the lobby with the buttons below • Host starts auction" });
}

export function createPartyAuctionItemEmbed(
  item: PartyItem,
  currentBid: number,
  currentBidderName: string | null,
  category: PartyCategory,
  scenario: PartyScenario,
  remainingPot: number
): EmbedBuilder {
  const tagsStr = item.tags.map((t) => `\`#${t}\``).join(" ");
  const embed = new EmbedBuilder()
    .setTitle(`🔨 ITEM ON THE BLOCK: ${item.name}`)
    .setDescription(
      `🎯 **Current Scenario:** *${scenario.title}*\n` +
        `🏷️ **Category:** ${category.emoji} ${category.name}\n` +
        `✨ **Tags:** ${tagsStr || "*None*"}`
    )
    .setColor(0xf59e0b)
    .addFields(
      {
        name: "Current Bid",
        value: currentBidderName
          ? `💰 **${currentBid} BB** by **${currentBidderName}**`
          : `💰 **${currentBid} BB** *(Starting Price)*`,
        inline: true,
      },
      {
        name: "Pot Remaining",
        value: `📦 **${remainingPot} items left**`,
        inline: true,
      }
    )
    .setFooter({
      text: "⚡ Fast 8s countdown • Anti-snipe enabled (+10s on late bids) • Virtual BB Only",
    });

  return embed;
}

export function createPartySquadEmbed(
  playerState: PartyPlayerState,
  squad: PartySquad,
  scenario: PartyScenario
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🎒 ${playerState.displayName}'s Party Squad`)
    .setDescription(`🎯 **Scenario:** *${scenario.title}*`)
    .setColor(0x3b82f6)
    .addFields(
      { name: "💰 Remaining Purse", value: `**${playerState.purse} BB**`, inline: true },
      { name: "👥 Squad Size", value: `**${squad.items.length}/${squad.maxSize}**`, inline: true },
      { name: "✨ Synergies", value: `**+${squad.getSynergyScore()} Synergy**`, inline: true }
    );

  if (squad.items.length > 0) {
    const list = squad.items.map(
      (item, idx) =>
        `**${idx + 1}.** **${item.name}** — 💰 *${playerState.itemPrices[item.id] || 0} BB* (${item.tags.slice(0, 2).map((t) => `#${t}`).join(" ")})`
    );
    embed.addFields({ name: "Drafted Items", value: list.join("\n"), inline: false });
  } else {
    embed.addFields({ name: "Drafted Items", value: "*No items won yet.*", inline: false });
  }

  embed.setFooter({ text: "Secret objectives remain hidden until the final reveal phase!" });
  return embed;
}

export function createPartyRevealEmbed(game: PartyGame): EmbedBuilder[] {
  const embeds: EmbedBuilder[] = [];

  const mainEmbed = new EmbedBuilder()
    .setTitle(`🏟️ GRAND FINAL SQUAD REVEAL`)
    .setDescription(
      `**Category:** ${game.category.emoji} ${game.category.name}\n` +
        `**Scenario:** 🎯 **${game.scenario.title}**\n` +
        `*${game.scenario.description}*\n\n` +
        `All squads have been finalized. Secret objectives are now unveiled below!`
    )
    .setColor(0x8b5cf6);

  embeds.push(mainEmbed);

  for (const pid of game.players) {
    const p = game.playerStates[pid];
    const squad = game.squads[pid];

    const itemsStr =
      p.items.length > 0
        ? p.items
            .map(
              (item, i) =>
                `• **${item.name}** — 💰 ${p.itemPrices[item.id] || 0} BB (${item.tags.slice(0, 2).map((t) => `#${t}`).join(" ")})`
            )
            .join("\n")
        : "*No items acquired*";

    const spent = game.startingPurse - p.purse;
    const objStatus = p.objectiveCompleted ? "✅ **COMPLETED!**" : "❌ *Failed*";
    const objText = p.secretObjective
      ? `${p.secretObjective.emoji} **${p.secretObjective.name}**: ${p.secretObjective.description} (${objStatus})`
      : "None";

    const playerEmb = new EmbedBuilder()
      .setTitle(`🔵 ${p.displayName}`)
      .setDescription(
        `${itemsStr}\n\n` +
          `💰 **Purse Remaining:** **${p.purse} BB** (Spent: ${spent} BB)\n` +
          `✨ **Tag Synergies:** +${squad?.getSynergyScore() ?? 0}\n` +
          `🕵️ **Secret Objective:**\n${objText}`
      )
      .setColor(p.objectiveCompleted ? 0x10b981 : 0x6366f1);

    embeds.push(playerEmb);
  }

  return embeds;
}

export function createPartyVotingEmbed(
  game: PartyGame,
  timeoutSeconds: number
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`🏆 WHO COOKED? — COMMUNITY VOTE`)
    .setDescription(
      `🎯 **The Scenario:**\n**"${game.scenario.title}"**\n*${game.scenario.description}*\n\n` +
        `Review the teams above and vote for the player who built the best roster!\n` +
        `⏱️ **Voting closes in ${timeoutSeconds} seconds.**\n\n` +
        `*Click the button below for your candidate! (1 vote per user)*`
    )
    .setColor(0xf59e0b)
    .setFooter({ text: "Every server member in this channel can cast 1 vote!" });
}

export function createPartyResultsEmbed(
  game: PartyGame,
  awards: PartyAward[],
  totalSpending: Record<string, number>
): EmbedBuilder {
  const awardsStr = awards
    .map(
      (a) =>
        `${a.emoji} **${a.title}** ➔ **${a.winnerName}**\n*${a.description}* (${a.reason})`
    )
    .join("\n\n");

  const spendingStr = Object.entries(totalSpending)
    .map(([name, spent]) => `• **${name}**: ${spent} BB spent`)
    .join("\n");

  return new EmbedBuilder()
    .setTitle(`🏆 PARTY AUCTION RESULTS & AWARDS`)
    .setDescription(
      `**Category:** ${game.category.emoji} ${game.category.name}\n` +
        `**Scenario:** 🎯 **${game.scenario.title}**\n\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `${awardsStr}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `💰 **TOTAL BB SPENT:**\n${spendingStr}`
    )
    .setColor(0x10b981)
    .setFooter({ text: "Bidding Bad Party Auction • GG! Run it back with Rematch!" });
}
