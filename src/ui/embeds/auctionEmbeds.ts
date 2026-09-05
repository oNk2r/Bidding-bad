import { EmbedBuilder } from "discord.js";
import { AUCTION_TIMER_SECONDS, BID_TIMER_SECONDS, POSITION_COLORS } from "../../config/constants.js";
import { Player } from "../../models/player.js";
import { Auction } from "../../models/auction.js";
import { Squad } from "../../models/squad.js";
import { calculateScore, getChemistryBreakdown } from "../../models/scoring.js";

export function createPlayerEmbed(
  player: Player,
  currentBid: number,
  currentBidderName?: string | null
): EmbedBuilder {
  const color = POSITION_COLORS[player.position] || 0x5865f2;
  const embed = new EmbedBuilder()
    .setTitle(`⚽ ${player.name}`)
    .setColor(color)
    .addFields(
      { name: "Position", value: `**${player.position}**`, inline: true },
      { name: "Rating", value: `**${player.rating} OVR**`, inline: true },
      {
        name: "Chemistry Links",
        value: `Club: *${player.club || "Free Agent"}*\nNation: *${player.nation || "International"}*`,
        inline: true,
      }
    );

  if (currentBidderName) {
    embed.addFields({
      name: "Current Bid",
      value: `**$${currentBid}** by **${currentBidderName}**`,
      inline: false,
    });
  } else {
    embed.addFields({
      name: "Starting Price",
      value: `**$${player.startingPrice}**`,
      inline: false,
    });
  }

  embed.setFooter({
    text: `${AUCTION_TIMER_SECONDS}s opening • ${BID_TIMER_SECONDS}s bid timer • Club (+3pts) / Nation (+2pts)`,
  });

  return embed;
}

export function createLobbyEmbed(auction: Auction): EmbedBuilder {
  const playersList = auction.players.map((id, index) => {
    const name = auction.playerNames[id] || `Player ${index + 1}`;
    const isHost = id === auction.creatorId ? " 👑" : "";
    return `**${index + 1}.** ${name}${isHost}`;
  });

  return new EmbedBuilder()
    .setTitle("🏆 Bidding Bad — Live Auction Lobby")
    .setDescription(
      `**Players Joined (${auction.players.length}/${auction.maxPlayers}):**\n` +
        (playersList.length > 0 ? playersList.join("\n") : "*No players yet*") +
        `\n\nNeed at least **${auction.minPlayers} players** to start.`
    )
    .setColor(0x5865f2)
    .addFields(
      { name: "Starting Budget", value: `**$${auction.budget} each**`, inline: true },
      { name: "Squad Size", value: `**${auction.squadSize} players**`, inline: true },
      { name: "Tournament Pot", value: `**14 Curated Players**`, inline: true }
    )
    .setFooter({ text: "Click Join to enter the lobby • Host clicks Start Auction" });
}

export function createSquadEmbed(
  squad: Squad,
  userName: string,
  budget: number,
  maxBid = 0
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`📋 ${userName}'s Squad`)
    .setColor(0x3b82f6)
    .addFields(
      { name: "Remaining Budget", value: `**$${budget}**`, inline: true },
      { name: "Max Legal Bid", value: `**$${maxBid}**`, inline: true },
      { name: "Squad Size", value: `**${squad.players.length}/5**`, inline: true }
    );

  if (squad.players.length > 0) {
    const lines = squad.players.map(
      (p) => `• **${p.name}** (${p.rating} ${p.position}) — *$${p.purchasePrice}*`
    );
    embed.addFields({ name: "Acquired Players", value: lines.join("\n"), inline: false });

    const { totalBonus, synergies } = getChemistryBreakdown(squad);
    const score = calculateScore(squad);
    embed.addFields(
      {
        name: `Chemistry Synergies (+${totalBonus.toFixed(1)} pts)`,
        value: synergies.length > 0 ? synergies.join("\n") : "*No active club/nation links yet*",
        inline: false,
      },
      { name: "Projected Squad Rating", value: `⭐ **${score.toFixed(1)} / 100**`, inline: false }
    );
  } else {
    embed.addFields({ name: "Acquired Players", value: "*No players signed yet.*", inline: false });
  }

  const missing = squad.getMissingPositions();
  if (missing.length > 0) {
    embed.addFields({
      name: "Required Positions Needed",
      value: missing.map((pos) => `\`${pos}\``).join(", "),
      inline: false,
    });
  }

  return embed;
}
