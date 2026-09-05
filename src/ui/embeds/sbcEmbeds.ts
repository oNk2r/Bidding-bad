import { EmbedBuilder } from "discord.js";
import { type SBCChallenge } from "../../models/sbc.js";

export function createSbcCatalogEmbed(
  challenges: SBCChallenge[],
  completedIds: Set<string>,
  userName: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🧩 Squad Building Challenges (SBC) — ${userName}`)
    .setDescription(
      `Exchange player cards from your inventory to solve tactical puzzles and earn massive rewards!\n\n` +
        `*To submit, type \`/sbc challenge:<ID> cards:<card names or IDs>\`.*`
    )
    .setColor(0x8b5cf6);

  for (const sbc of challenges) {
    const isDone = completedIds.has(sbc.id);
    const statusTag = isDone ? " ✅ COMPLETED" : "";

    embed.addFields({
      name: `${sbc.badge} ${sbc.title} [${sbc.category}]${statusTag}`,
      value:
        `• **Requirements:** ${sbc.description}\n` +
        `• **Reward:** 🎁 **${sbc.reward.description}**\n` +
        `• **Challenge ID:** \`${sbc.id}\``,
      inline: false,
    });
  }

  return embed;
}

export function createSbcCompletionEmbed(challenge: SBCChallenge, userName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`🎉 SBC COMPLETED — ${challenge.title}`)
    .setDescription(
      `Congratulations **${userName}**! You successfully met all puzzle requirements and submitted the squad.\n\n` +
        `🎁 **Reward Unlocked:**\n` +
        `**${challenge.reward.description}**`
    )
    .setColor(0x22c55e)
    .setFooter({ text: "Rewards deposited into your treasury / inventory" });
}
