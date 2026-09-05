import { prisma } from "../database/client.js";
import { economyService } from "./economyService.js";
import { matchService } from "./matchService.js";
import { ClubMatchSide, MatchResult } from "../models/match.js";

export interface TournamentFixture {
  roundIdx: number;
  roundName: string;
  home: ClubMatchSide | null;
  away: ClubMatchSide | null;
  result: MatchResult | null;
  winner: ClubMatchSide | null;
}

export interface TournamentParticipant {
  userId: string;
  userName: string;
  clubSide: ClubMatchSide;
  points?: number;
  goalDiff?: number;
}

export interface SpectatorBet {
  userId: string;
  userName: string;
  amount: number;
  choice: "HOME" | "DRAW" | "AWAY";
}

export class TournamentState {
  id: string;
  guildId: string;
  channelId: string;
  hostId: string;
  hostName: string;
  name: string;
  size: number; // 3 (Round Robin), 4, 8 (Knockout)
  entryFee: number;
  status: "REGISTRATION" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  formatType: "ROUND_ROBIN" | "KNOCKOUT";
  participants: TournamentParticipant[];
  fixtures: TournamentFixture[];
  currentRoundIdx: number;
  roundNames: string[];
  winner: TournamentParticipant | null;
  bets: Record<string, SpectatorBet>;

  constructor(
    id: string,
    guildId: string,
    channelId: string,
    hostId: string,
    hostName: string,
    size: number,
    entryFee: number,
    name?: string
  ) {
    this.id = id;
    this.guildId = guildId;
    this.channelId = channelId;
    this.hostId = hostId;
    this.hostName = hostName;
    this.size = size;
    this.entryFee = entryFee;
    this.name = name || `${hostName}'s Championship Cup`;
    this.status = "REGISTRATION";
    this.formatType = size === 3 ? "ROUND_ROBIN" : "KNOCKOUT";
    this.participants = [];
    this.fixtures = [];
    this.currentRoundIdx = 0;
    this.winner = null;
    this.bets = {};

    if (size === 3) {
      this.roundNames = ["Matchday 1", "Matchday 2", "Matchday 3"];
    } else if (size === 4) {
      this.roundNames = ["Semi-Finals", "Grand Final"];
    } else {
      this.roundNames = ["Quarter-Finals", "Semi-Finals", "Grand Final"];
    }
  }
}

export class TournamentService {
  private activeTournaments: Map<string, TournamentState> = new Map();

  getActiveTournament(guildId: string): TournamentState | undefined {
    return this.activeTournaments.get(guildId);
  }

  async createTournament(
    guildId: string,
    channelId: string,
    hostId: string,
    hostName: string,
    size: number,
    entryFee = 100,
    name?: string
  ): Promise<{ success: boolean; message: string; tournament?: TournamentState }> {
    if (this.activeTournaments.has(guildId)) {
      return { success: false, message: "❌ An active tournament is already running in this server." };
    }

    if (![3, 4, 8].includes(size)) {
      return { success: false, message: "❌ Supported tournament sizes are 3 (Round Robin), 4, or 8 clubs." };
    }

    const hostCoins = await economyService.getCoins(hostId);
    if (hostCoins < entryFee) {
      return {
        success: false,
        message: `❌ Insufficient coins! Entry fee is **${entryFee.toLocaleString()} Coins** (You have: **${hostCoins.toLocaleString()} Coins**).`,
      };
    }

    const id = `tourney_${Date.now()}`;
    const tournament = new TournamentState(
      id,
      guildId,
      channelId,
      hostId,
      hostName,
      size,
      entryFee,
      name
    );

    // Deduct entry fee for host
    if (entryFee > 0) {
      await economyService.deductCoins(hostId, entryFee);
    }

    const hostClubSide = await matchService.buildClubMatchSide(hostId, hostName);
    tournament.participants.push({
      userId: hostId,
      userName: hostName,
      clubSide: hostClubSide,
      points: 0,
      goalDiff: 0,
    });

    this.activeTournaments.set(guildId, tournament);

    return {
      success: true,
      message: `Tournament **${tournament.name}** created!`,
      tournament,
    };
  }

  async joinTournament(
    guildId: string,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; message: string; tournament?: TournamentState }> {
    const tournament = this.getActiveTournament(guildId);
    if (!tournament || tournament.status !== "REGISTRATION") {
      return { success: false, message: "❌ No tournament is currently accepting registrations in this server." };
    }

    if (tournament.participants.some((p) => p.userId === userId)) {
      return { success: false, message: "❌ You have already joined this tournament lobby." };
    }

    if (tournament.participants.length >= tournament.size) {
      return { success: false, message: `❌ Tournament lobby is full (${tournament.size}/${tournament.size}).` };
    }

    const coins = await economyService.getCoins(userId);
    if (coins < tournament.entryFee) {
      return {
        success: false,
        message: `❌ Insufficient coins! Entry fee is **${tournament.entryFee.toLocaleString()} Coins** (You have: **${coins.toLocaleString()} Coins**).`,
      };
    }

    if (tournament.entryFee > 0) {
      await economyService.deductCoins(userId, tournament.entryFee);
    }

    const clubSide = await matchService.buildClubMatchSide(userId, userName);
    tournament.participants.push({
      userId,
      userName,
      clubSide,
      points: 0,
      goalDiff: 0,
    });

    return {
      success: true,
      message: `Joined **${tournament.name}**! (${tournament.participants.length}/${tournament.size} Managers)`,
      tournament,
    };
  }

  async leaveTournament(
    guildId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const tournament = this.getActiveTournament(guildId);
    if (!tournament || tournament.status !== "REGISTRATION") {
      return { success: false, message: "❌ Cannot leave: Tournament not in registration mode." };
    }

    const idx = tournament.participants.findIndex((p) => p.userId === userId);
    if (idx === -1) {
      return { success: false, message: "❌ You are not in this tournament." };
    }

    tournament.participants.splice(idx, 1);
    if (tournament.entryFee > 0) {
      await economyService.addCoins(userId, tournament.entryFee);
    }

    return { success: true, message: "Left tournament and refunded entry fee." };
  }

  async cancelTournament(
    guildId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const tournament = this.getActiveTournament(guildId);
    if (!tournament) {
      return { success: false, message: "❌ No active tournament in this server." };
    }

    if (tournament.hostId !== userId) {
      return { success: false, message: "❌ Only the tournament host can cancel the tournament." };
    }

    // Refund all participants
    for (const p of tournament.participants) {
      if (tournament.entryFee > 0) {
        await economyService.addCoins(p.userId, tournament.entryFee);
      }
    }

    this.activeTournaments.delete(guildId);
    return { success: true, message: `Tournament **${tournament.name}** cancelled and all entry fees refunded.` };
  }

  startTournament(guildId: string, userId: string): { success: boolean; message: string } {
    const tournament = this.getActiveTournament(guildId);
    if (!tournament || tournament.status !== "REGISTRATION") {
      return { success: false, message: "❌ Cannot start: tournament is not in registration mode." };
    }

    if (tournament.hostId !== userId) {
      return { success: false, message: "❌ Only the tournament host can start the tournament." };
    }

    if (tournament.participants.length < tournament.size) {
      // Auto-fill remaining spots with AI Bots
      let botCount = 1;
      while (tournament.participants.length < tournament.size) {
        const botSide = matchService.createBotSide(`Bot FC #${botCount}`, 84 + botCount);
        tournament.participants.push({
          userId: `bot_${botCount}`,
          userName: `AI Bot #${botCount}`,
          clubSide: botSide,
          points: 0,
          goalDiff: 0,
        });
        botCount++;
      }
    }

    tournament.status = "IN_PROGRESS";
    this.generateFixtures(tournament);

    return { success: true, message: `Tournament started with ${tournament.participants.length} clubs!` };
  }

  private generateFixtures(tournament: TournamentState): void {
    tournament.fixtures = [];

    if (tournament.formatType === "ROUND_ROBIN" && tournament.size === 3) {
      const p = tournament.participants;
      tournament.fixtures.push({
        roundIdx: 0,
        roundName: "Matchday 1",
        home: p[0].clubSide,
        away: p[1].clubSide,
        result: null,
        winner: null,
      });
      tournament.fixtures.push({
        roundIdx: 1,
        roundName: "Matchday 2",
        home: p[1].clubSide,
        away: p[2].clubSide,
        result: null,
        winner: null,
      });
      tournament.fixtures.push({
        roundIdx: 2,
        roundName: "Matchday 3",
        home: p[2].clubSide,
        away: p[0].clubSide,
        result: null,
        winner: null,
      });
    } else if (tournament.size === 4) {
      const p = tournament.participants;
      tournament.fixtures.push({
        roundIdx: 0,
        roundName: "Semi-Final 1",
        home: p[0].clubSide,
        away: p[1].clubSide,
        result: null,
        winner: null,
      });
      tournament.fixtures.push({
        roundIdx: 0,
        roundName: "Semi-Final 2",
        home: p[2].clubSide,
        away: p[3].clubSide,
        result: null,
        winner: null,
      });
      tournament.fixtures.push({
        roundIdx: 1,
        roundName: "Grand Final",
        home: null,
        away: null,
        result: null,
        winner: null,
      });
    }
  }

  playNextFixture(tournament: TournamentState): {
    fixture: TournamentFixture | null;
    result: MatchResult | null;
    roundCompleted: boolean;
  } {
    const unplayed = tournament.fixtures.find((f) => f.result === null && f.home && f.away);
    if (!unplayed || !unplayed.home || !unplayed.away) {
      return { fixture: null, result: null, roundCompleted: false };
    }

    const isKnockout = tournament.formatType === "KNOCKOUT";
    const result = matchService.simulate(unplayed.home, unplayed.away, isKnockout);

    unplayed.result = result;
    unplayed.winner = result.winner;

    // Update table if round robin
    if (tournament.formatType === "ROUND_ROBIN") {
      const homeP = tournament.participants.find((p) => p.clubSide.userId === unplayed.home?.userId);
      const awayP = tournament.participants.find((p) => p.clubSide.userId === unplayed.away?.userId);

      if (homeP && awayP) {
        if (result.homeScore > result.awayScore) {
          homeP.points = (homeP.points || 0) + 3;
        } else if (result.awayScore > result.homeScore) {
          awayP.points = (awayP.points || 0) + 3;
        } else {
          homeP.points = (homeP.points || 0) + 1;
          awayP.points = (awayP.points || 0) + 1;
        }
        homeP.goalDiff = (homeP.goalDiff || 0) + (result.homeScore - result.awayScore);
        awayP.goalDiff = (awayP.goalDiff || 0) + (result.awayScore - result.homeScore);
      }
    }

    // Check if tournament is finished
    const allFinished = tournament.fixtures.every((f) => f.result !== null);
    if (allFinished) {
      tournament.status = "COMPLETED";
      if (tournament.formatType === "ROUND_ROBIN") {
        const sorted = [...tournament.participants].sort(
          (a, b) => (b.points || 0) - (a.points || 0) || (b.goalDiff || 0) - (a.goalDiff || 0)
        );
        tournament.winner = sorted[0] || null;
      } else {
        const finalFix = tournament.fixtures[tournament.fixtures.length - 1];
        const winSide = finalFix.winner;
        tournament.winner =
          tournament.participants.find((p) => p.clubSide.userId === winSide?.userId) || null;
      }
    }

    return { fixture: unplayed, result, roundCompleted: true };
  }

  async awardTournamentPrize(tournament: TournamentState): Promise<number> {
    if (!tournament.winner || tournament.winner.userId.startsWith("bot_")) {
      return 0;
    }

    const prizePool = tournament.size * tournament.entryFee * 1.5;
    const finalPrize = Math.max(tournament.entryFee * 2, prizePool);

    await economyService.addCoins(tournament.winner.userId, finalPrize, tournament.winner.userName);
    await prisma.user.update({
      where: { id: tournament.winner.userId },
      data: { tournamentsWon: { increment: 1 } },
    });

    return finalPrize;
  }
}

export const tournamentService = new TournamentService();
