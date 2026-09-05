import { EmbedBuilder } from "discord.js";
import { SEASON_TIERS, type SeasonTier } from "../../services/seasonService.js";
import type { WeekendRun } from "../../services/weekendService.js";
import type { MatchResult } from "../../models/match.js";

export function createSeasonPassEmbed(
  userName: string,
  sxp: number,
  currentLevel: number,
  claimedLevels: number[],
  nextTier?: SeasonTier
): EmbedBuilder {
  const nextTarget = nextTier ? nextTier.sxpRequired : 11000;
  const progressPercent = Math.min(100, Math.floor((sxp / nextTarget) * 100));

  // Progress Bar Graphic: [████████░░] 80%
  const totalBlocks = 10;
  const filledBlocks = Math.round((progressPercent / 100) * totalBlocks);
  const progressBar = "█".repeat(filledBlocks) + "░".repeat(totalBlocks - filledBlocks);

  const embed = new EmbedBuilder()
    .setTitle(`🌟 Season 1 Pass — Manager **${userName}**`)
    .setDescription(
      `**Level:** **${currentLevel} / 15**\n` +
        `**Season XP (SXP):** 🌟 **${sxp.toLocaleString()} SXP**\n` +
        `**Next Tier Progress:** \`[${progressBar}]\` **${progressPercent}%** (${sxp}/${nextTarget} SXP)\n\n` +
        `*Earn SXP from Matches (+100), Daily Claims (+50), SBCs (+150), and Weekend League!*`
    )
    .setColor(0x8b5cf6);

  // Group tiers into display fields
  const tierLines = SEASON_TIERS.map((t) => {
    const isUnlocked = sxp >= t.sxpRequired;
    const isClaimed = claimedLevels.includes(t.level);
    const status = isClaimed ? "✅ *Claimed*" : isUnlocked ? "🎁 **READY TO CLAIM**" : `🔒 *${t.sxpRequired} SXP*`;
    return `**Lv.${t.level}** ${t.title}: ${t.rewardDesc} — ${status}`;
  });

  embed.addFields(
    { name: "🏆 Milestone Tiers 1 — 7", value: tierLines.slice(0, 7).join("\n") },
    { name: "👑 Champions Tiers 8 — 15", value: tierLines.slice(7).join("\n") }
  );

  return embed;
}

export function createWeekendLeagueEmbed(userName: string, run: WeekendRun): EmbedBuilder {
  let desc = `**Manager:** **${userName}**\n` +
    `**Gauntlet Record:** ⚔️ **${run.wins}W - ${run.losses}L** (${run.matchesPlayed}/5 Matches)\n\n`;

  if (run.isFinished) {
    desc += `🎉 **Gauntlet Complete!** Use \`/weekend reset\` to start a new run.\n`;
  } else {
    desc += `⚽ **Next Fixture (Match ${run.activeMatchIdx + 1}/5)**: Escalating Challenge\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle("🏟️ Weekend League Gauntlet")
    .setDescription(desc)
    .setColor(run.wins >= 4 ? 0xffd700 : run.wins >= 2 ? 0x38bdf8 : 0x22c55e);

  if (run.history.length > 0) {
    const historyText = run.history
      .map(
        (h, i) =>
          `**Match ${i + 1}:** ${h.result.homeScore > h.result.awayScore ? "🟢 WIN" : "🔴 LOSS"} vs ${h.opponentName} (${h.opponentRating} OVR) — **${h.result.homeScore} - ${h.result.awayScore}**`
      )
      .join("\n");

    embed.addFields({ name: "📜 Gauntlet Match History", value: historyText });
  }

  return embed;
}
