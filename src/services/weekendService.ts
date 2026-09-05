import { prisma } from "../database/client.js";
import { matchService } from "./matchService.js";
import { economyService } from "./economyService.js";
import { seasonService } from "./seasonService.js";
import type { MatchResult } from "../models/match.js";

export interface WeekendRun {
  userId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  activeMatchIdx: number;
  isFinished: boolean;
  history: {
    opponentName: string;
    opponentRating: number;
    result: MatchResult;
  }[];
}

const OPPONENT_LADDER = [
  { name: "Scout XI", rating: 82, tactic: "BALANCED" as const },
  { name: "Continental Athletic", rating: 85, tactic: "TIKI_TAKA" as const },
  { name: "Iron Fortress FC", rating: 87, tactic: "PARK_THE_BUS" as const },
  { name: "Galácticos Elite", rating: 89, tactic: "GEGENPRESS" as const },
  { name: "World XI Legends 👑", rating: 92, tactic: "ALL_OUT_ATTACK" as const },
];

export class WeekendService {
  private async getRun(userId: string): Promise<WeekendRun> {
    const record = await prisma.gameRecord.findUnique({
      where: { key: `weekend_league_${userId}` },
    });

    if (!record) {
      return {
        userId,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        activeMatchIdx: 0,
        isFinished: false,
        history: [],
      };
    }

    try {
      return JSON.parse(record.value) as WeekendRun;
    } catch {
      return {
        userId,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        activeMatchIdx: 0,
        isFinished: false,
        history: [],
      };
    }
  }

  private async saveRun(run: WeekendRun): Promise<void> {
    await prisma.gameRecord.upsert({
      where: { key: `weekend_league_${run.userId}` },
      update: { value: JSON.stringify(run) },
      create: { key: `weekend_league_${run.userId}`, value: JSON.stringify(run) },
    });
  }

  async getCurrentRun(userId: string): Promise<WeekendRun> {
    return this.getRun(userId);
  }

  async resetRun(userId: string): Promise<WeekendRun> {
    const fresh: WeekendRun = {
      userId,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      activeMatchIdx: 0,
      isFinished: false,
      history: [],
    };
    await this.saveRun(fresh);
    return fresh;
  }

  async playNextMatch(userId: string, userName: string): Promise<{
    success: boolean;
    message: string;
    result?: MatchResult;
    run?: WeekendRun;
    rewardDesc?: string;
  }> {
    const run = await this.getRun(userId);

    if (run.isFinished) {
      return {
        success: false,
        message: "❌ You have completed your 5-match Weekend League Gauntlet! Use `/weekend reset` to start a new run.",
      };
    }

    const matchIdx = run.activeMatchIdx;
    const opponentDef = OPPONENT_LADDER[matchIdx];

    const homeSide = await matchService.buildClubMatchSide(userId, userName);
    const awaySide = matchService.createBotSide(opponentDef.name, opponentDef.rating, opponentDef.tactic);

    const result = matchService.simulate(homeSide, awaySide, false);
    const isWin = result.homeScore > result.awayScore;

    run.matchesPlayed += 1;
    if (isWin) {
      run.wins += 1;
    } else {
      run.losses += 1;
    }

    run.history.push({
      opponentName: opponentDef.name,
      opponentRating: opponentDef.rating,
      result,
    });

    run.activeMatchIdx += 1;

    let rewardDesc: string | undefined;

    if (run.activeMatchIdx >= 5) {
      run.isFinished = true;
      // Calculate final tournament rewards
      if (run.wins === 5) {
        await economyService.addCoins(userId, 8000, userName);
        await economyService.openPack(userId, "premium", userName);
        await economyService.openPack(userId, "premium", userName);
        await seasonService.addSxp(userId, 500);
        rewardDesc = "🏆 **Rank 1 Champion (5-0)**: 💰 8,000 Coins + 🔥 2x Premium Packs + 🌟 500 SXP!";
      } else if (run.wins === 4) {
        await economyService.addCoins(userId, 5000, userName);
        await economyService.openPack(userId, "premium", userName);
        await seasonService.addSxp(userId, 350);
        rewardDesc = "🥇 **Rank 2 Elite (4-1)**: 💰 5,000 Coins + 🔥 1x Premium Pack + 🌟 350 SXP!";
      } else if (run.wins === 3) {
        await economyService.addCoins(userId, 3000, userName);
        await economyService.openPack(userId, "standard", userName);
        await seasonService.addSxp(userId, 200);
        rewardDesc = "🥈 **Rank 3 Challenger (3-2)**: 💰 3,000 Coins + 📦 1x Standard Pack + 🌟 200 SXP!";
      } else if (run.wins === 2) {
        await economyService.addCoins(userId, 1500, userName);
        await seasonService.addSxp(userId, 100);
        rewardDesc = "🥉 **Rank 4 Contender (2-3)**: 💰 1,500 Coins + 🌟 100 SXP!";
      } else {
        await economyService.addCoins(userId, 500, userName);
        await seasonService.addSxp(userId, 50);
        rewardDesc = "🔰 **Rank 5 (1-4)**: 💰 500 Coins + 🌟 50 SXP!";
      }
    } else {
      // Small per-match win reward
      if (isWin) {
        await economyService.addCoins(userId, 250, userName);
        await seasonService.addSxp(userId, 40);
      }
    }

    await this.saveRun(run);

    return {
      success: true,
      message: isWin ? `✅ Victory vs **${opponentDef.name}**!` : `❌ Defeat vs **${opponentDef.name}**.`,
      result,
      run,
      rewardDesc,
    };
  }
}

export const weekendService = new WeekendService();
