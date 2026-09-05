import { prisma } from "../database/client.js";
import { ClubMatchSide, MatchResult, simulateMatch, createBotClub } from "../models/match.js";
import { calculateMatchRp, getDivisionByRp } from "../models/divisions.js";
import { economyService } from "./economyService.js";
import { getTacticInfo } from "../models/tactics.js";

export class MatchService {
  async recordMatchOutcome(result: MatchResult): Promise<{
    homeRpDelta?: number;
    awayRpDelta?: number;
    homeNewRp?: number;
    awayNewRp?: number;
    homeNote?: string;
    awayNote?: string;
  }> {
    const homeId = result.home.userId;
    const awayId = result.away.userId;
    const isBot = result.away.isBot;

    // Coins rewards
    if (homeId !== "0" && result.homeReward > 0) {
      await economyService.addCoins(homeId, result.homeReward, result.home.managerName);
      await economyService.recordMatchPlayed(homeId);
    }
    if (!isBot && awayId !== "0" && result.awayReward > 0) {
      await economyService.addCoins(awayId, result.awayReward, result.away.managerName);
      await economyService.recordMatchPlayed(awayId);
    }

    let homeOutcome: "WIN" | "DRAW" | "LOSS" = "DRAW";
    let awayOutcome: "WIN" | "DRAW" | "LOSS" = "DRAW";

    if (result.winner === result.home) {
      homeOutcome = "WIN";
      awayOutcome = "LOSS";
    } else if (result.winner === result.away) {
      homeOutcome = "LOSS";
      awayOutcome = "WIN";
    }

    let homeRpDelta = 0;
    let awayRpDelta = 0;
    let homeNewRp = 0;
    let awayNewRp = 0;
    let homeNote = "";
    let awayNote = "";

    // Update Home User
    if (homeId !== "0") {
      const user = await economyService.ensureUser(homeId, result.home.managerName);
      const rpRes = calculateMatchRp(user.rp, homeOutcome);
      homeRpDelta = rpRes.delta;
      homeNewRp = rpRes.newRp;
      homeNote = rpRes.commentary;

      const { seasonService } = await import("./seasonService.js");
      await seasonService.addSxp(homeId, homeOutcome === "WIN" ? 100 : homeOutcome === "DRAW" ? 50 : 30);

      await prisma.user.update({
        where: { id: homeId },
        data: {
          rp: rpRes.newRp,
          wins: homeOutcome === "WIN" ? { increment: 1 } : undefined,
          draws: homeOutcome === "DRAW" ? { increment: 1 } : undefined,
          losses: homeOutcome === "LOSS" ? { increment: 1 } : undefined,
        },
      });
    }

    // Update Away User if human
    if (!isBot && awayId !== "0") {
      const user = await economyService.ensureUser(awayId, result.away.managerName);
      const rpRes = calculateMatchRp(user.rp, awayOutcome);
      awayRpDelta = rpRes.delta;
      awayNewRp = rpRes.newRp;
      awayNote = rpRes.commentary;

      const { seasonService } = await import("./seasonService.js");
      await seasonService.addSxp(awayId, awayOutcome === "WIN" ? 100 : awayOutcome === "DRAW" ? 50 : 30);

      await prisma.user.update({
        where: { id: awayId },
        data: {
          rp: rpRes.newRp,
          wins: awayOutcome === "WIN" ? { increment: 1 } : undefined,
          draws: awayOutcome === "DRAW" ? { increment: 1 } : undefined,
          losses: awayOutcome === "LOSS" ? { increment: 1 } : undefined,
        },
      });
    }

    return {
      homeRpDelta,
      awayRpDelta,
      homeNewRp,
      awayNewRp,
      homeNote,
      awayNote,
    };
  }

  async buildClubMatchSide(userId: string, userName?: string): Promise<ClubMatchSide> {
    const user = await economyService.ensureUser(userId, userName);
    const squad = await economyService.buildMatchSquad(userId);
    const stadium = await economyService.getStadiumInfo(userId);

    return new ClubMatchSide(
      userId,
      user.name,
      user.clubName,
      user.kitEmoji,
      squad,
      stadium.tierInfo.homeMoraleBuff,
      getTacticInfo(user.tactic),
      false
    );
  }

  createBotSide(name = "Dynamo Bot FC", ratingTier = 86, tactic = "GEGENPRESS"): ClubMatchSide {
    return createBotClub(name, ratingTier, tactic);
  }

  simulate(home: ClubMatchSide, away: ClubMatchSide, isKnockout = false): MatchResult {
    return simulateMatch(home, away, undefined, isKnockout);
  }
}

export const matchService = new MatchService();
