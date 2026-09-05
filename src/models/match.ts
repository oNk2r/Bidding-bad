import { Player } from "./player.js";
import { calculateScore, getChemistryBreakdown } from "./scoring.js";
import { Squad } from "./squad.js";
import {
  calculateTacticalMatchup,
  getTacticInfo,
  type TacticInfo,
  TacticType,
} from "./tactics.js";

export interface MatchEvent {
  minute: number;
  eventType: "GOAL" | "SAVE" | "MISS" | "YELLOW_CARD" | "TACTICAL";
  team: "HOME" | "AWAY";
  playerName: string;
  commentary: string;
}

export class ClubMatchSide {
  userId: string;
  managerName: string;
  clubName: string;
  kitEmoji: string;
  squad: Squad;
  squadScore: number;
  chemistryBonus: number;
  stadiumBonus: number;
  tactic: TacticInfo;
  isBot: boolean;

  constructor(
    userId: string,
    managerName: string,
    clubName: string,
    kitEmoji: string,
    squad: Squad,
    stadiumBonus = 0.0,
    tactic?: TacticInfo,
    isBot = false
  ) {
    this.userId = userId;
    this.managerName = managerName;
    this.clubName = clubName;
    this.kitEmoji = kitEmoji;
    this.squad = squad;
    this.stadiumBonus = stadiumBonus;
    this.tactic = tactic || getTacticInfo(TacticType.BALANCED);
    this.isBot = isBot;

    this.squadScore = calculateScore(this.squad);
    const { totalBonus } = getChemistryBreakdown(this.squad);
    this.chemistryBonus = totalBonus;
  }
}

export interface TacticalShout {
  shoutType: "ALL_OUT_ATTACK" | "PARK_THE_BUS" | "HIGH_PRESS";
  team: "HOME" | "AWAY";
  managerName: string;
  minute: number;
}

export interface MatchResult {
  home: ClubMatchSide;
  away: ClubMatchSide;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  mvp: string;
  tacticalSummary: string;
  homeReward: number;
  awayReward: number;
  isKnockout: boolean;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  winner: ClubMatchSide | null;
  isDraw: boolean;
}

export function createBotClub(
  name = "Dynamo Bot FC",
  ratingTier = 86,
  tacticName = "GEGENPRESS"
): ClubMatchSide {
  const botPlayers = [
    new Player("AI Buffon", "GK", ratingTier, 1, 0, "Bot United", "Italy"),
    new Player("AI Maldini", "DEF", ratingTier + 1, 1, 0, "Bot United", "Italy"),
    new Player("AI Zidane", "MID", ratingTier + 2, 1, 0, "Bot United", "France"),
    new Player("AI Henry", "FW", ratingTier + 2, 1, 0, "Bot United", "France"),
    new Player("AI Kante", "MID", ratingTier, 1, 0, "Bot United", "France"),
  ];
  const squad = new Squad(botPlayers);

  return new ClubMatchSide(
    "0",
    "AI Tactician",
    name,
    "🤖⚪",
    squad,
    0.0,
    getTacticInfo(tacticName),
    true
  );
}

export function simulateMatch(
  home: ClubMatchSide,
  away: ClubMatchSide,
  seed?: number,
  isKnockout = false,
  shouts?: TacticalShout[]
): MatchResult {
  const { homeMod, awayMod, matchupNarrative } = calculateTacticalMatchup(
    home.tactic,
    away.tactic
  );

  // Effective power ratings
  const homePower = home.squadScore + home.stadiumBonus + homeMod;
  const awayPower = away.squadScore + awayMod;
  const diff = homePower - awayPower;

  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;

  // Key event intervals
  const keyMinutes = [12, 28, 41, 57, 73, 86];

  for (const min of keyMinutes) {
    const roll = Math.random() * 100;
    const isHomeAttack = Math.random() * 100 < 50 + diff * 1.5;

    const attackingSide = isHomeAttack ? home : away;
    const defendingSide = isHomeAttack ? away : home;
    const teamKey: "HOME" | "AWAY" = isHomeAttack ? "HOME" : "AWAY";

    const forwards = attackingSide.squad.players.filter((p) => p.position === "FW");
    const mids = attackingSide.squad.players.filter((p) => p.position === "MID");
    const defs = defendingSide.squad.players.filter((p) => p.position === "DEF");
    const gks = defendingSide.squad.players.filter((p) => p.position === "GK");

    const attacker =
      forwards.length > 0 && Math.random() < 0.6
        ? forwards[Math.floor(Math.random() * forwards.length)]
        : mids.length > 0
          ? mids[Math.floor(Math.random() * mids.length)]
          : attackingSide.squad.players[0] || new Player("Striker", "FW", 85, 1);

    const defender =
      defs.length > 0
        ? defs[Math.floor(Math.random() * defs.length)]
        : gks[0] || new Player("Defender", "DEF", 85, 1);

    const gk = gks[0] || new Player("Goalkeeper", "GK", 85, 1);

    // Goal threshold
    const baseGoalChance = isHomeAttack ? 32 + diff * 0.8 : 32 - diff * 0.8;

    if (roll < baseGoalChance) {
      // GOAL
      if (isHomeAttack) homeGoals++;
      else awayGoals++;

      events.push({
        minute: min,
        eventType: "GOAL",
        team: teamKey,
        playerName: attacker.name,
        commentary: `⚽ **GOAL! (${min}')** ${attacker.name} blasts a sensational strike into the top corner for **${attackingSide.clubName}**!`,
      });
    } else if (roll < baseGoalChance + 30) {
      // SAVE
      events.push({
        minute: min,
        eventType: "SAVE",
        team: teamKey,
        playerName: gk.name,
        commentary: `🧤 **WHAT A SAVE! (${min}')** ${gk.name} denies ${attacker.name} with a full-stretch fingertip dive!`,
      });
    } else if (roll < baseGoalChance + 45) {
      // DEFENSIVE BLOCK / MISS
      events.push({
        minute: min,
        eventType: "MISS",
        team: teamKey,
        playerName: defender.name,
        commentary: `🛡️ **CRUCIAL TACKLE (${min}')** ${defender.name} slides in with a heroic goal-line block!`,
      });
    }
  }

  // Knockout shootout if tied
  let penaltyHomeScore: number | undefined;
  let penaltyAwayScore: number | undefined;

  if (isKnockout && homeGoals === awayGoals) {
    penaltyHomeScore = 0;
    penaltyAwayScore = 0;
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.75) penaltyHomeScore++;
      if (Math.random() < 0.75) penaltyAwayScore++;
    }
    while (penaltyHomeScore === penaltyAwayScore) {
      if (Math.random() < 0.75) penaltyHomeScore++;
      if (Math.random() < 0.75) penaltyAwayScore++;
    }
  }

  // Determine winner
  let winner: ClubMatchSide | null = null;
  if (homeGoals > awayGoals) {
    winner = home;
  } else if (awayGoals > homeGoals) {
    winner = away;
  } else if (penaltyHomeScore !== undefined && penaltyAwayScore !== undefined) {
    winner = penaltyHomeScore > penaltyAwayScore ? home : away;
  }

  const isDraw = homeGoals === awayGoals && penaltyHomeScore === undefined;

  // Economy coin rewards
  let homeReward = 150;
  let awayReward = 150;

  if (winner === home) {
    homeReward = 500;
    awayReward = 200;
  } else if (winner === away) {
    awayReward = 500;
    homeReward = 200;
  } else {
    homeReward = 300;
    awayReward = 300;
  }

  // MVP
  const allAttackingPlayers = [...home.squad.players, ...away.squad.players];
  const mvpPlayer =
    allAttackingPlayers.sort((a, b) => b.rating - a.rating)[0] ||
    new Player("Star Player", "MID", 90, 1);

  return {
    home,
    away,
    homeScore: homeGoals,
    awayScore: awayGoals,
    events,
    mvp: `${mvpPlayer.name} (${mvpPlayer.rating} OVR)`,
    tacticalSummary: matchupNarrative,
    homeReward,
    awayReward,
    isKnockout,
    penaltyHomeScore,
    penaltyAwayScore,
    winner,
    isDraw,
  };
}
