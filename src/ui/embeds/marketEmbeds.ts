import { EmbedBuilder } from "discord.js";
import type { MarketListing, InventoryCard } from "@prisma/client";
import type { ListedCardData } from "../../services/marketService.js";
import type { PackOpenResult } from "../../services/economyService.js";

export function createPackSuspenseEmbed(
  packType: "standard" | "premium",
  stage: 1 | 2 | 3,
  topCard: {
    nation: string;
    position: string;
    club: string;
    rating: number;
    name: string;
    tierName: string;
    tierBadge: string;
  },
  userName: string,
  avatarUrl?: string
): EmbedBuilder {
  const isManager = topCard.position === "MGR";
  const posLabel = isManager ? "👔 MANAGER / HEAD COACH" : topCard.position;
  const isSpecial = topCard.rating >= 88 || isManager;
  const color = isSpecial ? 0x8b5cf6 : 0xf59e0b;

  const embed = new EmbedBuilder().setColor(color);
  if (avatarUrl) {
    embed.setAuthor({ name: `${userName} is opening a ${packType.toUpperCase()} Pack`, iconURL: avatarUrl });
  } else {
    embed.setAuthor({ name: `${userName} is opening a ${packType.toUpperCase()} Pack` });
  }

  if (stage === 1) {
    embed
      .setTitle("✨ WALKOUT SIGNATURE DETECTED ✨")
      .setDescription(
        `> **Analyzing radar signature...**\n` +
        `> A high-profile talent is walking out from the tunnel!`
      )
      .addFields(
        { name: "🌍 Nationality", value: `\`${topCard.nation.toUpperCase()}\``, inline: true },
        { name: "🛡️ Position / Role", value: "*Scanning position...*", inline: true },
        { name: "🏟️ Club", value: "*Scanning club crest...*", inline: true }
      )
      .setFooter({ text: "Stage 1/3 • Decrypting scout report..." });
  } else if (stage === 2) {
    embed
      .setTitle("⚡ SCOUT LOCK ENGAGED ⚡")
      .setDescription(
        `> **Locking onto tactical role...**\n` +
        `> Identity matches elite ${topCard.nation} national squad roster!`
      )
      .addFields(
        { name: "🌍 Nationality", value: `\`${topCard.nation.toUpperCase()}\``, inline: true },
        { name: "🛡️ Position / Role", value: `\`${posLabel}\``, inline: true },
        { name: "🏟️ Club", value: "*Analyzing club badge...*", inline: true }
      )
      .setFooter({ text: "Stage 2/3 • Final verification underway..." });
  } else {
    embed
      .setTitle("🔥 WALKOUT IMMINENT 🔥")
      .setDescription(
        `> **Club badge confirmed!**\n` +
        `> Fireworks ignite as the player emerges onto the pitch!`
      )
      .addFields(
        { name: "🌍 Nationality", value: `\`${topCard.nation.toUpperCase()}\``, inline: true },
        { name: "🛡️ Position / Role", value: `\`${posLabel}\``, inline: true },
        { name: "🏟️ Club", value: `\`${topCard.club.toUpperCase()}\``, inline: true }
      )
      .setFooter({ text: "Stage 3/3 • Stepping onto the stage..." });
  }

  return embed;
}

export function createPackOpenedEmbed(
  result: PackOpenResult,
  userName: string,
  avatarUrl?: string
): EmbedBuilder {
  const isPremium = result.packType === "premium";
  const topCard = [...result.cards].sort((a, b) => b.rating - a.rating)[0];
  const isWalkout = topCard && (topCard.rating >= 86 || topCard.position === "MGR");
  const isSuperWalkout = topCard && topCard.rating >= 90;

  const color = isSuperWalkout ? 0xa855f7 : isWalkout ? 0xf59e0b : isPremium ? 0x38bdf8 : 0x3b82f6;

  const embed = new EmbedBuilder()
    .setTitle(
      isSuperWalkout
        ? `👑 ICONIC MASTERCLASS REVEAL — ${result.packType.toUpperCase()} PACK`
        : isWalkout
        ? `🌟 WALKOUT REVEAL — ${result.packType.toUpperCase()} PACK`
        : `📦 PACK OPENED — ${result.packType.toUpperCase()} PACK`
    )
    .setColor(color)
    .setTimestamp();

  if (avatarUrl) {
    embed.setAuthor({ name: `${userName}'s Pack Opening`, iconURL: avatarUrl });
  }

  const cardLines = result.cards.map((c) => {
    return (
      `> ${c.tierBadge} **${c.name}** (\`${c.rating} ${c.position}\`)\n` +
      `> 🏟️ *${c.club}* • 🌍 *${c.nation}* • 💰 **${c.value.toLocaleString()} Coins**`
    );
  });

  embed.setDescription(
    `You signed **${result.cards.length} new ${result.cards.length === 1 ? "player" : "players"}** to your club roster:\n\n` +
      cardLines.join("\n\n")
  );

  embed.addFields(
    { name: "💳 Treasury Balance", value: `\`${result.newBalance.toLocaleString()} Coins\``, inline: true },
    { name: "📦 Pack Tier", value: `\`${result.packType.toUpperCase()}\``, inline: true },
    { name: "✨ Total Cards Pulled", value: `\`${result.cards.length}\``, inline: true }
  );

  embed.setFooter({ text: "Use the quick action buttons below to re-roll or manage inventory" });
  return embed;
}

export function createMarketEmbed(
  listings: (MarketListing & { card: ListedCardData })[],
  page: number,
  totalPages: number,
  totalItems: number
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("🏪 Transfer Market — Global Player Listings")
    .setDescription(
      `Browse active footballer listings offered by managers worldwide.\n` +
        `Total active listings: **${totalItems}** • Page **${page}/${totalPages}**\n\n` +
        `*• Purchase a player: select from menu below or \`/buy listing_id:<ID>\`*\n` +
        `*• Cancel your listing: click **Manage My Listings** below or \`/cancel_listing\`*`
    )
    .setColor(0xf59e0b)
    .setTimestamp();

  if (listings.length === 0) {
    embed.addFields({
      name: "No Listings",
      value: "*The transfer market is currently empty. List your cards with `/sell`!*",
    });
  } else {
    for (const l of listings) {
      embed.addFields({
        name: `⭐ ${l.card.name} (${l.card.rating} ${l.card.position}) — 💰 ${l.price.toLocaleString()} Coins`,
        value:
          `> • **Club:** *${l.card.club}* • **Nation:** *${l.card.nation}*\n` +
          `> • **Seller:** \`${l.sellerName}\` • **Listing ID:** \`${l.id}\``,
        inline: false,
      });
    }
  }

  embed.setFooter({ text: "Transfer Market • /buy • /sell • /cancel_listing" });
  return embed;
}

export function createInventoryEmbed(
  cards: InventoryCard[],
  userName: string,
  page = 1,
  pageSize = 10,
  avatarUrl?: string
): EmbedBuilder {
  const total = cards.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const skip = (page - 1) * pageSize;
  const currentCards = cards.slice(skip, skip + pageSize);
  const totalValuation = cards.reduce((sum, c) => sum + c.value, 0);

  const embed = new EmbedBuilder()
    .setTitle(`🃏 ${userName}'s Card Inventory`)
    .setDescription(
      `**Total Cards:** \`${total}/50\` • **Club Valuation:** 💎 **${totalValuation.toLocaleString()} Coins**\n` +
        `Page **${page}/${totalPages}**\n\n` +
        `*Use \`/quicksell\` to liquidate cards for coins or \`/sell\` to list on the market.*`
    )
    .setColor(0x3b82f6)
    .setTimestamp();

  if (avatarUrl) {
    embed.setAuthor({ name: `${userName}'s Club Locker`, iconURL: avatarUrl });
  }

  if (currentCards.length === 0) {
    embed.addFields({
      name: "Empty Inventory",
      value: "*You have no cards in your locker. Claim cards with `/daily`, `/pack`, or `/market`!*",
    });
  } else {
    const lines = currentCards.map(
      (c, idx) =>
        `**${skip + idx + 1}.** **${c.name}** (\`${c.rating} ${c.position}\`) — *${c.club}* | 💰 **${c.value.toLocaleString()}**` +
        (c.untradeable ? " 🔒" : "")
    );
    embed.addFields({ name: "Player Locker", value: lines.join("\n"), inline: false });
  }

  embed.setFooter({ text: "Manage lineup with /lineup • Trade with /trade" });
  return embed;
}

export function createDailyRewardEmbed(
  streak: number,
  coinsAwarded: number,
  newBalance: number,
  userName: string,
  avatarUrl?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🎁 Daily Login Reward — ${userName}`)
    .setDescription(
      `🔥 **Daily Login Streak:** **${streak} Days**\n\n` +
        `💰 **Reward Collected:** **+${coinsAwarded.toLocaleString()} Coins**\n` +
        `💳 **New Treasury Balance:** **${newBalance.toLocaleString()} Coins**\n\n` +
        `*Maintain your daily streak to earn higher coin bonuses every day (up to 7 days)!*`
    )
    .setColor(0x22c55e)
    .setTimestamp()
    .setFooter({ text: "Daily rewards reset every 20 hours • Use /daily to claim" });

  if (avatarUrl) {
    embed.setAuthor({ name: `${userName}'s Daily Bonus`, iconURL: avatarUrl });
  }

  return embed;
}

export function createBalanceEmbed(
  coins: number,
  clubValue: number,
  userName: string,
  avatarUrl?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`💰 Treasury & Finances — ${userName}`)
    .setColor(0xeab308)
    .addFields(
      { name: "Liquid Coins", value: `💵 **${coins.toLocaleString()} Coins**`, inline: true },
      { name: "Club Valuation", value: `💎 **${clubValue.toLocaleString()} Coins**`, inline: true },
      { name: "Net Worth", value: `👑 **${(coins + clubValue).toLocaleString()} Coins**`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: "Earn more coins through /daily, /drop, /match, and /stadium" });

  if (avatarUrl) {
    embed.setAuthor({ name: `${userName}'s Financial Portfolio`, iconURL: avatarUrl });
  }

  return embed;
}
