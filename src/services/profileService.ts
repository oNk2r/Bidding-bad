import { prisma } from "../database/client.js";
import { economyService } from "./economyService.js";
import { managerRoleService } from "./managerRoleService.js";
import {
  calculateManagerRating,
  determineArchetype,
  type ManagerProfile,
  type ManagerStatsData,
} from "../models/manager.js";

export class ProfileService {
  async getManagerProfile(userId: string, userName?: string): Promise<ManagerProfile> {
    const user = await economyService.ensureUser(userId, userName);
    const inventory = await economyService.getInventory(userId);
    const clubValue = await economyService.getClubValuation(userId);

    const matches = user.matchesPlayed || 0;
    const wins = user.wins || 0;
    const draws = user.draws || 0;
    const losses = user.losses || 0;
    const winRate = matches > 0 ? (wins / matches) * 100 : 0.0;

    let customRolesList: string[] = [];
    try {
      if (user.customRoles) {
        customRolesList = JSON.parse(user.customRoles);
      }
    } catch {
      customRolesList = [];
    }

    const statsData: ManagerStatsData = {
      matchesPlayed: matches,
      wins,
      draws,
      losses,
      tournamentsWon: user.tournamentsWon || 0,
      customRoles: customRolesList,
    };

    const roles = managerRoleService.getRolesForUser(statsData);
    const archetype = determineArchetype(statsData);
    const rating = calculateManagerRating(wins, draws, losses, 88.0, matches);

    return {
      displayName: user.name,
      userId: user.id,
      rank: user.rp > 0 ? `${user.rp} RP` : "—",
      rating,
      titles: user.tournamentsWon || 0,
      matchesPlayed: matches,
      wins,
      draws,
      losses,
      winRate: Math.round(winRate * 10) / 10,
      highestScore: 92.5,
      avgScore: 88.0,
      playersSigned: inventory.length,
      totalSpent: inventory.reduce((sum, c) => sum + c.value, 0),
      roles,
      archetypeTitle: archetype?.title || "THE TACTICIAN",
      archetypeDesc:
        archetype?.desc || "Values balanced squad composition and disciplined market timing.",
      coins: user.coins,
      cardsOwned: inventory.length,
      clubValue,
      clubName: user.clubName,
      kitEmoji: user.kitEmoji,
      motto: user.motto,
      tournamentsWon: user.tournamentsWon || 0,
      rp: user.rp,
    };
  }

  async setClubName(userId: string, clubName: string, userName?: string): Promise<string> {
    const clean = clubName.trim().slice(0, 32);
    await prisma.user.upsert({
      where: { id: userId },
      update: { clubName: clean, ...(userName ? { name: userName } : {}) },
      create: { id: userId, name: userName || `Manager ${userId}`, clubName: clean },
    });
    return clean;
  }

  async setClubKit(userId: string, kitEmoji: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { kitEmoji },
    });
  }

  async setClubMotto(userId: string, motto: string): Promise<string> {
    const clean = motto.trim().slice(0, 80);
    await prisma.user.update({
      where: { id: userId },
      data: { motto: clean },
    });
    return clean;
  }

  async setClubTactic(userId: string, tactic: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { tactic },
    });
  }
}

export const profileService = new ProfileService();
