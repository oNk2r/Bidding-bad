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
  eventType: "GOAL" | "SAVE" | "MISS" | "YELLOW_CARD" | "RED_CARD" | "TACTICAL" | "WOODWORK" | "COUNTER";
  team: "HOME" | "AWAY";
  playerName: string;
  assistName?: string;
  commentary: string;
}

export interface MatchStats {
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeXg: number;
  awayXg: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeSaves: number;
  awaySaves: number;
}

export interface GoalEntry {
  name: string;
  minute: number;
  assist?: string;
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
  homeGoalScorers: GoalEntry[];
  awayGoalScorers: GoalEntry[];
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

  // Effective ratings incorporating Squad OVR, Chemistry, Stadium Morale & Tactical matchup
  const homePower = home.squadScore + (home.chemistryBonus * 0.1) + home.stadiumBonus + homeMod;
  const awayPower = away.squadScore + (away.chemistryBonus * 0.1) + awayMod;
  const diff = homePower - awayPower;

  const events: MatchEvent[] = [];
  const homeGoalScorers: GoalEntry[] = [];
  const awayGoalScorers: GoalEntry[] = [];

  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeOnTarget = 0;
  let awayOnTarget = 0;
  let homeXg = 0;
  let awayXg = 0;
  let homeSaves = 0;
  let awaySaves = 0;
  let homeYellowCards = 0;
  let awayYellowCards = 0;
  let homeCorners = Math.floor(Math.random() * 4) + 2;
  let awayCorners = Math.floor(Math.random() * 4) + 2;
  let homeFouls = Math.floor(Math.random() * 5) + 3;
  let awayFouls = Math.floor(Math.random() * 5) + 3;

  // Tactical possession weightings
  let basePossession = 50 + diff * 1.8;
  if (home.tactic.tacticType === TacticType.TIKI_TAKA) basePossession += 7;
  if (away.tactic.tacticType === TacticType.TIKI_TAKA) basePossession -= 7;
  if (home.tactic.tacticType === TacticType.PARK_THE_BUS) basePossession -= 10;
  if (away.tactic.tacticType === TacticType.PARK_THE_BUS) basePossession += 10;

  const homePossession = Math.min(74, Math.max(26, Math.round(basePossession + (Math.random() * 6 - 3))));
  const awayPossession = 100 - homePossession;

  // Key match moments
  const keyMinutes = [7, 18, 29, 39, 45, 56, 68, 79, 87, 92];

  // Head coach opening tactical setup event
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

  // Player scoring/performance tracker for MVP
  const playerStatsMap = new Map<string, { player: Player; points: number }>();
  const registerPlayer = (p: Player, pts = 0) => {
    const entry = playerStatsMap.get(p.name) || { player: p, points: p.rating * 0.1 };
    entry.points += pts;
    playerStatsMap.set(p.name, entry);
  };

  [...home.squad.players, ...away.squad.players].forEach((p) => registerPlayer(p));

  for (const min of keyMinutes) {
    // Determine which side creates the attacking opportunity
    const attackBias = 50 + diff * 1.5 + (home.tactic.tacticType === TacticType.ALL_OUT_ATTACK ? 8 : 0) - (away.tactic.tacticType === TacticType.ALL_OUT_ATTACK ? 8 : 0);
    const isHomeAttack = Math.random() * 100 < attackBias;
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
      forwards.length > 0 && Math.random() < 0.7
        ? forwards[Math.floor(Math.random() * forwards.length)]
        : mids.length > 0
          ? mids[Math.floor(Math.random() * mids.length)]
          : attackingSide.squad.players[0] || new Player("Striker", "FW", 85, 1);

    const assister =
      mids.length > 0 && Math.random() < 0.65
        ? mids[Math.floor(Math.random() * mids.length)]
        : forwards.find((f) => f.name !== attacker.name) || undefined;

    const defender =
      defs.length > 0
        ? defs[Math.floor(Math.random() * defs.length)]
        : gks[0] || new Player("Defender", "DEF", 85, 1);

    const gk = gks[0] || new Player("Goalkeeper", "GK", 85, 1);

    // Goal chance influenced by rating diff, tactics & attacker quality
    const ratingAdvantage = (attacker.rating - (gk.rating + defender.rating) / 2) * 0.8;
    let baseGoalChance = isHomeAttack ? 28 + diff * 0.8 + ratingAdvantage : 28 - diff * 0.8 + ratingAdvantage;

    if (attackingSide.tactic.tacticType === TacticType.GEGENPRESS) baseGoalChance += 4;
    if (attackingSide.tactic.tacticType === TacticType.COUNTER_ATTACK) baseGoalChance += 5;
    if (defendingSide.tactic.tacticType === TacticType.PARK_THE_BUS) baseGoalChance -= 7;

    const eventRoll = Math.random() * 100;
    const shotXg = Math.min(0.85, Math.max(0.12, (baseGoalChance / 100) * (0.8 + Math.random() * 0.4)));

    if (isHomeAttack) homeXg += shotXg;
    else awayXg += shotXg;

    if (eventRoll < baseGoalChance) {
      // GOAL SCORED!
      if (isHomeAttack) {
        homeGoals++;
        homeOnTarget++;
        homeGoalScorers.push({
          name: attacker.name,
          minute: min,
          assist: assister?.name !== attacker.name ? assister?.name : undefined,
        });
      } else {
        awayGoals++;
        awayOnTarget++;
        awayGoalScorers.push({
          name: attacker.name,
          minute: min,
          assist: assister?.name !== attacker.name ? assister?.name : undefined,
        });
      }

      registerPlayer(attacker, 8);
      if (assister && assister.name !== attacker.name) registerPlayer(assister, 4);

      const assistNote = assister && assister.name !== attacker.name ? ` *(Assist: ${assister.name})*` : "";
      const goalPhrases = [
        `⚽ **GOAL! (${min}')** Top corner finish! **${attacker.name}** curls a brilliant strike home for **${attackingSide.clubName}**!${assistNote}`,
        `⚽ **GOAL! (${min}')** Ice-cold composure! **${attacker.name}** dribbles past ${defender.name} and slots it past ${gk.name}!${assistNote}`,
        `⚽ **GOAL! (${min}')** Bullet header! **${attacker.name}** rises above the defense and thumps it into the net!${assistNote}`,
        `⚽ **GOAL! (${min}')** Lethal counter! **${attacker.name}** unleashes an unstoppable rocket into the roof of the net!${assistNote}`,
      ];

      events.push({
        minute: min,
        eventType: "GOAL",
        team: teamKey,
        playerName: attacker.name,
        assistName: assister?.name,
        commentary: goalPhrases[Math.floor(Math.random() * goalPhrases.length)],
      });
    } else if (eventRoll < baseGoalChance + 32) {
      // SPECTACULAR GOALKEEPER SAVE
      if (isHomeAttack) homeOnTarget++;
      else awayOnTarget++;

      if (isHomeAttack) awaySaves++;
      else homeSaves++;

      registerPlayer(gk, 3.5);

      events.push({
        minute: min,
        eventType: "SAVE",
        team: teamKey,
        playerName: gk.name,
        commentary: `🧤 **WHAT A SAVE! (${min}')** **${gk.name}** pulls off a magnificent flying reflex stop to deny **${attacker.name}**!`,
      });
    } else if (eventRoll < baseGoalChance + 42) {
      // WOODWORK (Post / Crossbar)
      if (isHomeAttack) homeOnTarget++;
      else awayOnTarget++;

      events.push({
        minute: min,
        eventType: "WOODWORK",
        team: teamKey,
        playerName: attacker.name,
        commentary: `💥 **OFF THE WOODWORK! (${min}')** **${attacker.name}**'s venomous strike rattles the crossbar! Inches away from a goal!`,
      });
    } else if (eventRoll < baseGoalChance + 54) {
      // DEFENSIVE TACKLE / BLOCK
      registerPlayer(defender, 3);
      events.push({
        minute: min,
        eventType: "MISS",
        team: teamKey,
        playerName: defender.name,
        commentary: `🛡️ **HEROIC DEFENDING (${min}')** **${defender.name}** produces a crunching last-ditch slide tackle to avert danger!`,
      });
    } else if (eventRoll < baseGoalChance + 66 && min > 20) {
      // YELLOW CARD
      if (isHomeAttack) awayYellowCards++;
      else homeYellowCards++;

      events.push({
        minute: min,
        eventType: "YELLOW_CARD",
        team: isHomeAttack ? "AWAY" : "HOME",
        playerName: defender.name,
        commentary: `🟨 **BOOKING (${min}')** **${defender.name}** receives a yellow card for a tactical foul to halt a counter-attack!`,
      });
    }
  }

  // Knockout penalty shootout if tied
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

  // Economy rewards
  let homeReward = 200;
  let awayReward = 200;

  if (winner === home) {
    homeReward = 600;
    awayReward = 250;
  } else if (winner === away) {
    awayReward = 600;
    homeReward = 250;
  } else {
    homeReward = 350;
    awayReward = 350;
  }

  // Determine MVP based on highest performance points
  let topPlayer: Player = home.squad.players[0] || new Player("Star Player", "FW", 90, 1);
  let highestPoints = -1;
  playerStatsMap.forEach(({ player, points }) => {
    if (points > highestPoints) {
      highestPoints = points;
      topPlayer = player;
    }
  });

  const stats: MatchStats = {
    homePossession,
    awayPossession,
    homeShots: Math.max(homeGoals + homeOnTarget, homeShots),
    awayShots: Math.max(awayGoals + awayOnTarget, awayShots),
    homeShotsOnTarget: Math.max(homeGoals, homeOnTarget),
    awayShotsOnTarget: Math.max(awayGoals, awayOnTarget),
    homeXg: parseFloat(homeXg.toFixed(2)),
    awayXg: parseFloat(awayXg.toFixed(2)),
    homeCorners,
    awayCorners,
    homeFouls,
    awayFouls,
    homeYellowCards,
    awayYellowCards,
    homeSaves,
    awaySaves,
  };

  return {
    home,
    away,
    homeScore: homeGoals,
    awayScore: awayGoals,
    homeGoalScorers,
    awayGoalScorers,
    events,
    stats,
    mvp: `${topPlayer.name} (${topPlayer.rating} ${topPlayer.position})`,
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
