import { EmbedBuilder } from "discord.js";
import type { MarketListing, InventoryCard } from "@prisma/client";
import type { ListedCardData } from "../../services/marketService.js";
import type { PackOpenResult } from "../../services/economyService.js";

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
        `Total active listings: **${totalItems}** (Page **${page}/${totalPages}**)\n\n` +
        `*To purchase a player, type \`/buy listing_id:<ID>\` or click Buy.*`
    )
    .setColor(0xf59e0b);

  if (listings.length === 0) {
    embed.addFields({
      name: "No Listings",
      value: "*The transfer market is currently empty. List your cards with `/sell`!*",
    });
  } else {
    for (const l of listings) {
      embed.addFields({
        name: `⭐ ${l.card.name} (${l.card.rating} ${l.card.position}) — ${l.price.toLocaleString()} Coins`,
        value:
          `• **Club:** *${l.card.club}* • **Nation:** *${l.card.nation}*\n` +
          `• **Seller:** \`${l.sellerName}\`\n` +
          `• **Listing ID:** \`${l.id}\``,
        inline: false,
      });
    }
  }

  embed.setFooter({ text: "Market transactions are processed instantly via /buy and /sell" });
  return embed;
}

export function createInventoryEmbed(
  cards: InventoryCard[],
  userName: string,
  page = 1,
  pageSize = 10
): EmbedBuilder {
  const total = cards.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const skip = (page - 1) * pageSize;
  const currentCards = cards.slice(skip, skip + pageSize);
  const totalValuation = cards.reduce((sum, c) => sum + c.value, 0);

  const embed = new EmbedBuilder()
    .setTitle(`🃏 ${userName}'s Card Inventory`)
    .setDescription(
      `**Total Cards:** ${total} • **Club Valuation:** 💎 **${totalValuation.toLocaleString()} Coins**\n` +
        `Page **${page}/${totalPages}**\n\n` +
        `*Use \`/quicksell\` to liquidate cards for coins or \`/sell\` to list on market.*`
    )
    .setColor(0x3b82f6);

  if (currentCards.length === 0) {
    embed.addFields({
      name: "Empty Inventory",
      value: "*You have no cards. Claim cards with `/daily`, `/pack`, or `/market`!*",
    });
  } else {
    const lines = currentCards.map(
      (c, idx) =>
        `**${skip + idx + 1}.** **${c.name}** (\`${c.rating} ${c.position}\`) — *${c.club}* | 💰 **${c.value.toLocaleString()}**` +
        (c.untradeable ? " 🔒" : "")
    );
    embed.addFields({ name: "Player Cards", value: lines.join("\n"), inline: false });
  }

  return embed;
}

export function createPackOpenedEmbed(result: PackOpenResult, userName: string): EmbedBuilder {
  const isPremium = result.packType === "premium";
  const color = isPremium ? 0xf59e0b : 0x3b82f6;

  const lines = result.cards.map(
    (c) =>
      `• ${c.tierBadge} **${c.name}** — \`${c.rating} ${c.position}\` (*${c.club}* / *${c.nation}*) • 💰 **${c.value.toLocaleString()}**`
  );

  return new EmbedBuilder()
    .setTitle(`✨ ${result.packType.toUpperCase()} Pack Opened — ${userName}`)
    .setDescription(
      `🎉 **Walkout Reveal!** You unlocked **${result.cards.length} new player cards**!\n\n` +
        lines.join("\n\n") +
        `\n\n💳 **Remaining Balance:** **${result.newBalance.toLocaleString()} Coins**`
    )
    .setColor(color)
    .setFooter({ text: "Manage your cards with /inventory or build your lineup with /lineup" });
}

export function createDailyRewardEmbed(
  streak: number,
  coinsAwarded: number,
  newBalance: number,
  userName: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`🎁 Daily Login Reward — ${userName}`)
    .setDescription(
      `🔥 **Daily Login Streak:** **${streak} Days**\n\n` +
        `💰 **Reward Collected:** **+${coinsAwarded.toLocaleString()} Coins**\n` +
        `💳 **New Treasury Balance:** **${newBalance.toLocaleString()} Coins**\n\n` +
        `*Maintain your daily streak to earn higher coin bonuses every day (up to 7 days)!*`
    )
    .setColor(0x22c55e)
    .setFooter({ text: "Daily rewards reset every 20 hours • Use /daily to claim" });
}

export function createBalanceEmbed(coins: number, clubValue: number, userName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`💰 Treasury & Finances — ${userName}`)
    .setColor(0xeab308)
    .addFields(
      { name: "Liquid Coins", value: `💵 **${coins.toLocaleString()} Coins**`, inline: true },
      { name: "Club Valuation", value: `💎 **${clubValue.toLocaleString()} Coins**`, inline: true },
      { name: "Net Worth", value: `👑 **${(coins + clubValue).toLocaleString()} Coins**`, inline: true }
    )
    .setFooter({ text: "Earn more coins through /daily, /drop, /match, and /stadium" });
}
