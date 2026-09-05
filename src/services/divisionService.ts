import { prisma } from "../database/client.js";
import {
  DIVISIONS,
  getDivisionByRp,
  getNextDivision,
  getCurrentSeasonId,
  getTimeUntilSeasonReset,
  type DivisionTier,
} from "../models/divisions.js";
import { economyService } from "./economyService.js";
import type { User } from "@prisma/client";

export interface DivisionProfileData {
  user: User;
  currentTier: DivisionTier;
  nextTier: DivisionTier | null;
  seasonId: string;
  seasonReset: { hours: number; minutes: number; totalMs: number };
  rpNeeded: number;
}

export class DivisionService {
  async getDivisionProfile(userId: string, userName?: string): Promise<DivisionProfileData> {
    const user = await economyService.ensureUser(userId, userName);
    const currentTier = getDivisionByRp(user.rp);
    const nextTier = getNextDivision(currentTier);
    const seasonId = getCurrentSeasonId();
    const seasonReset = getTimeUntilSeasonReset();

    const rpNeeded = nextTier ? Math.max(0, nextTier.minRp - user.rp) : 0;

    return {
      user,
      currentTier,
      nextTier,
      seasonId,
      seasonReset,
      rpNeeded,
    };
  }

  async getLeaderboard(limit = 10): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: [{ rp: "desc" }, { wins: "desc" }],
      take: limit,
    });
  }

  async getTopEarners(limit = 10): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: [{ coins: "desc" }],
      take: limit,
    });
  }
}

export const divisionService = new DivisionService();
