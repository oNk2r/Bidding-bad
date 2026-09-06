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

export interface MatchStats {
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
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
  headCoach?: string | null;
  isBot: boolean;

  constructor(
    userId: string,
    managerName: string,
    clubName: string,
    kitEmoji: string,
    squad: Squad,
    stadiumBonus = 0.0,
    tactic?: TacticInfo,
    isBot = false,
    headCoach?: string | null
  ) {
    this.userId = userId;
    this.managerName = managerName;
    this.clubName = clubName;
    this.kitEmoji = kitEmoji;
    this.squad = squad;
    this.stadiumBonus = stadiumBonus;
    this.tactic = tactic || getTacticInfo(TacticType.BALANCED);
    this.isBot = isBot;
    this.headCoach = headCoach;

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
  stats: MatchStats;
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
    true,
    "AI Coach Arrigo"
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

  let homeShots = 0;
  let awayShots = 0;
  let homeOnTarget = 0;
  let awayOnTarget = 0;
  let homeCorners = Math.floor(Math.random() * 4) + 2;
  let awayCorners = Math.floor(Math.random() * 4) + 2;
  let homeFouls = Math.floor(Math.random() * 5) + 3;
  let awayFouls = Math.floor(Math.random() * 5) + 3;

  const homePossession = Math.min(72, Math.max(28, Math.round(50 + diff * 2 + (Math.random() * 8 - 4))));
  const awayPossession = 100 - homePossession;

  // Key event intervals
  const keyMinutes = [8, 21, 34, 44, 55, 68, 81, 89];

  // Head coach opening tactical event
  if (home.headCoach || away.headCoach) {
    const coachTeam = home.headCoach ? home : away;
    const coachName = coachTeam.headCoach || coachTeam.managerName;
    events.push({
      minute: 1,
      eventType: "TACTICAL",
      team: coachTeam === home ? "HOME" : "AWAY",
      playerName: coachName,
      commentary: `👔 **TACTICAL SETUP (1')** Head Coach **${coachName}** directs **${coachTeam.clubName}** into their \`${coachTeam.tactic.name}\` shape!`,
    });
  }

  for (const min of keyMinutes) {
    const isHomeAttack = Math.random() * 100 < 50 + diff * 1.6;
    const attackingSide = isHomeAttack ? home : away;
    const defendingSide = isHomeAttack ? away : home;
    const teamKey: "HOME" | "AWAY" = isHomeAttack ? "HOME" : "AWAY";

    if (isHomeAttack) homeShots++;
    else awayShots++;

    const forwards = attackingSide.squad.players.filter((p) => p.position === "FW");
    const mids = attackingSide.squad.players.filter((p) => p.position === "MID");
    const defs = defendingSide.squad.players.filter((p) => p.position === "DEF");
    const gks = defendingSide.squad.players.filter((p) => p.position === "GK");

    const attacker =
      forwards.length > 0 && Math.random() < 0.65
        ? forwards[Math.floor(Math.random() * forwards.length)]
        : mids.length > 0
          ? mids[Math.floor(Math.random() * mids.length)]
          : attackingSide.squad.players[0] || new Player("Striker", "FW", 85, 1);

    const defender =
      defs.length > 0
        ? defs[Math.floor(Math.random() * defs.length)]
        : gks[0] || new Player("Defender", "DEF", 85, 1);

    const gk = gks[0] || new Player("Goalkeeper", "GK", 85, 1);

    const roll = Math.random() * 100;
    const baseGoalChance = isHomeAttack ? 30 + diff * 0.9 : 30 - diff * 0.9;

    if (roll < baseGoalChance) {
      // GOAL
      if (isHomeAttack) {
        homeGoals++;
        homeOnTarget++;
      } else {
        awayGoals++;
        awayOnTarget++;
      }

      const goalPhrases = [
        `⚽ **GOAL! (${min}')** Spectacular finish! **${attacker.name}** curls a venomous strike into the top corner for **${attackingSide.clubName}**!`,
        `⚽ **GOAL! (${min}')** Pure class! **${attacker.name}** dribbles past the defender and slots it calmly past ${gk.name}!`,
        `⚽ **GOAL! (${min}')** Bullet header! **${attacker.name}** rises above everyone to thump the ball home for **${attackingSide.clubName}**!`,
        `⚽ **GOAL! (${min}')** Rapid counter-attack! **${attacker.name}** unleashes an unstoppable rocket!`,
      ];
      const selectedPhrase = goalPhrases[Math.floor(Math.random() * goalPhrases.length)];

      events.push({
        minute: min,
        eventType: "GOAL",
        team: teamKey,
        playerName: attacker.name,
        commentary: selectedPhrase,
      });
    } else if (roll < baseGoalChance + 32) {
      // SAVE
      if (isHomeAttack) homeOnTarget++;
      else awayOnTarget++;

      events.push({
        minute: min,
        eventType: "SAVE",
        team: teamKey,
        playerName: gk.name,
        commentary: `🧤 **WHAT A SAVE! (${min}')** **${gk.name}** produces a world-class reflex dive to deny **${attacker.name}**!`,
      });
    } else if (roll < baseGoalChance + 48) {
      // DEFENSIVE BLOCK / TACKLE
      events.push({
        minute: min,
        eventType: "MISS",
        team: teamKey,
        playerName: defender.name,
        commentary: `🛡️ **HEROIC DEFENDING (${min}')** **${defender.name}** slides in with a crunching tackle to avert danger!`,
      });
    } else if (roll < baseGoalChance + 58 && min > 30) {
      // YELLOW CARD
      events.push({
        minute: min,
        eventType: "YELLOW_CARD",
        team: isHomeAttack ? "AWAY" : "HOME",
        playerName: defender.name,
        commentary: `🟨 **YELLOW CARD (${min}')** **${defender.name}** is booked for a cynical tactical foul to stop the breakaway!`,
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

  const stats: MatchStats = {
    homePossession,
    awayPossession,
    homeShots: Math.max(homeGoals + homeOnTarget, homeShots),
    awayShots: Math.max(awayGoals + awayOnTarget, awayShots),
    homeShotsOnTarget: Math.max(homeGoals, homeOnTarget),
    awayShotsOnTarget: Math.max(awayGoals, awayOnTarget),
    homeCorners,
    awayCorners,
    homeFouls,
    awayFouls,
  };

  return {
    home,
    away,
    homeScore: homeGoals,
    awayScore: awayGoals,
    events,
    stats,
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
