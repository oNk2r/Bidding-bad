import { Player } from "./player.js";
import { calculateScore, getChemistryBreakdown } from "./scoring.js";
import { Squad } from "./squad.js";
import {
  calculateTacticalMatchup,
  getTacticInfo,
  type TacticInfo,
  TacticType,
} from "./tactics.js";

export type EventType =
  | "GOAL"
  | "SAVE"
  | "MISS"
  | "BLOCK"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "TACTICAL"
  | "WOODWORK";

export interface MatchEvent {
  minute: number;
  eventType: EventType;
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
  homeRedCards: number;
  awayRedCards: number;
  homeSaves: number;
  awaySaves: number;
  homePassAccuracy: number;
  awayPassAccuracy: number;
  homeTacklesWon: number;
  awayTacklesWon: number;
}

export interface GoalEntry {
  name: string;
  minute: number;
  assist?: string;
}

export interface PositionalUnits {
  gk: Player[];
  def: Player[];
  mid: Player[];
  att: Player[];
  gkRating: number;
  defRating: number;
  midRating: number;
  attRating: number;
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

  getUnits(): PositionalUnits {
    const players = this.squad.players || [];
    const gk = players.filter((p) => p.position === "GK");
    const def = players.filter((p) => p.position === "DEF");
    const mid = players.filter((p) => p.position === "MID");
    const att = players.filter((p) => p.position === "FW");

    const avg = (list: Player[], fallback = 80) =>
      list.length > 0
        ? list.reduce((s, p) => s + p.rating, 0) / list.length
        : fallback;

    return {
      gk,
      def,
      mid,
      att,
      gkRating: avg(gk, 80),
      defRating: avg(def, 80),
      midRating: avg(mid, 80),
      attRating: avg(att, 80),
    };
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
    new Player("Buffon Prime", "GK", ratingTier, 1, 0, "Bot United", "Italy"),
    new Player("Maldini Prime", "DEF", ratingTier + 1, 1, 0, "Bot United", "Italy"),
    new Player("Zidane Prime", "MID", ratingTier + 2, 1, 0, "Bot United", "France"),
    new Player("Henry Prime", "FW", ratingTier + 2, 1, 0, "Bot United", "France"),
    new Player("Kante Prime", "MID", ratingTier, 1, 0, "Bot United", "France"),
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

interface PlayerPerformance {
  player: Player;
  team: "HOME" | "AWAY";
  points: number;
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

  const homeUnits = home.getUnits();
  const awayUnits = away.getUnits();

  // Effective rating difference
  const homePower = home.squadScore + home.chemistryBonus * 0.1 + home.stadiumBonus + homeMod;
  const awayPower = away.squadScore + away.chemistryBonus * 0.1 + awayMod;
  const diff = homePower - awayPower;

  // Possession calculation
  let basePoss = 50 + diff * 1.5;
  if (home.tactic.tacticType === TacticType.TIKI_TAKA) basePoss += 8;
  if (away.tactic.tacticType === TacticType.TIKI_TAKA) basePoss -= 8;
  if (home.tactic.tacticType === TacticType.PARK_THE_BUS) basePoss -= 10;
  if (away.tactic.tacticType === TacticType.PARK_THE_BUS) basePoss += 10;

  const homePossession = Math.min(75, Math.max(25, Math.round(basePoss + (Math.random() * 4 - 2))));
  const awayPossession = 100 - homePossession;

  // Pass accuracy
  const homePassAcc = Math.min(95, Math.max(68, Math.round(80 + (homeUnits.midRating - 80) * 0.8 + (home.tactic.tacticType === TacticType.TIKI_TAKA ? 6 : 0))));
  const awayPassAcc = Math.min(95, Math.max(68, Math.round(80 + (awayUnits.midRating - 80) * 0.8 + (away.tactic.tacticType === TacticType.TIKI_TAKA ? 6 : 0))));

  const events: MatchEvent[] = [];
  const homeGoalScorers: GoalEntry[] = [];
  const awayGoalScorers: GoalEntry[] = [];

  let homeShots = 0;
  let awayShots = 0;
  let homeOnTarget = 0;
  let awayOnTarget = 0;
  let homeXg = 0.0;
  let awayXg = 0.0;
  let homeSaves = 0;
  let awaySaves = 0;
  let homeCorners = 0;
  let awayCorners = 0;
  let homeFouls = 0;
  let awayFouls = 0;
  let homeYellowCards = 0;
  let awayYellowCards = 0;
  let homeRedCards = 0;
  let awayRedCards = 0;
  let homeTacklesWon = 0;
  let awayTacklesWon = 0;

  const playerPoints = new Map<string, PlayerPerformance>();
  const addPoints = (p: Player, team: "HOME" | "AWAY", pts: number) => {
    const cur = playerPoints.get(p.name) || { player: p, team, points: p.rating * 0.1 };
    cur.points += pts;
    playerPoints.set(p.name, cur);
  };

  home.squad.players.forEach((p) => addPoints(p, "HOME", 0));
  away.squad.players.forEach((p) => addPoints(p, "AWAY", 0));

  // 1' Kickoff Tactical Briefing
  if (home.headCoach || away.headCoach) {
    const coachSide = home.headCoach ? home : away;
    const coachName = coachSide.headCoach || coachSide.managerName;
    events.push({
      minute: 1,
      eventType: "TACTICAL",
      team: coachSide === home ? "HOME" : "AWAY",
      playerName: coachName,
      commentary: `👔 **TACTICAL SETUP (1')** Head Coach **${coachName}** leads **${coachSide.clubName}** in \`${coachSide.tactic.name}\` formation!`,
    });
  }

  // Exact, clean, chronological football minutes:
  // First Half (4 key chances): 12', 25', 36', 43'
  // Second Half (4 key chances): 52', 65', 77', 88'
  const matchMinutes = [12, 25, 36, 43, 52, 65, 77, 88];

  const getAttacker = (side: ClubMatchSide, units: PositionalUnits) => {
    if (units.att.length > 0 && Math.random() < 0.75) {
      return units.att[Math.floor(Math.random() * units.att.length)];
    }
    if (units.mid.length > 0) {
      return units.mid[Math.floor(Math.random() * units.mid.length)];
    }
    return side.squad.players[0] || new Player("Forward", "FW", 85, 1);
  };

  const getAssister = (side: ClubMatchSide, units: PositionalUnits, excludeName: string) => {
    const candidates = side.squad.players.filter((p) => p.name !== excludeName);
    if (candidates.length > 0 && Math.random() < 0.7) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return undefined;
  };

  const getDefender = (side: ClubMatchSide, units: PositionalUnits) => {
    if (units.def.length > 0) {
      return units.def[Math.floor(Math.random() * units.def.length)];
    }
    return side.squad.players[0] || new Player("Defender", "DEF", 84, 1);
  };

  const getGoalkeeper = (side: ClubMatchSide, units: PositionalUnits) => {
    if (units.gk.length > 0) return units.gk[0];
    return side.squad.players[0] || new Player("Goalkeeper", "GK", 84, 1);
  };

  for (const minute of matchMinutes) {
    const attackBias = homePossession;
    const isHomeAttack = Math.random() * 100 < attackBias;
    const attackingSide = isHomeAttack ? home : away;
    const defendingSide = isHomeAttack ? away : home;
    const attackUnits = isHomeAttack ? homeUnits : awayUnits;
    const defendUnits = isHomeAttack ? awayUnits : homeUnits;
    const teamKey: "HOME" | "AWAY" = isHomeAttack ? "HOME" : "AWAY";

    if (isHomeAttack) homeShots++;
    else awayShots++;

    const attacker = getAttacker(attackingSide, attackUnits);
    const assister = getAssister(attackingSide, attackUnits, attacker.name);
    const defender = getDefender(defendingSide, defendUnits);
    const gk = getGoalkeeper(defendingSide, defendUnits);

    // Goal calculation (realistic 25-35% conversion)
    const ratingAdv = (attacker.rating - (defender.rating + gk.rating) / 2) * 0.8;
    let goalChance = isHomeAttack ? 28 + diff * 0.8 + ratingAdv : 28 - diff * 0.8 + ratingAdv;

    if (attackingSide.tactic.tacticType === TacticType.GEGENPRESS) goalChance += 4;
    if (attackingSide.tactic.tacticType === TacticType.COUNTER_ATTACK) goalChance += 4;
    if (defendingSide.tactic.tacticType === TacticType.PARK_THE_BUS) goalChance -= 6;

    goalChance = Math.min(60, Math.max(12, goalChance));
    const shotXg = parseFloat((goalChance / 100).toFixed(2));

    if (isHomeAttack) homeXg += shotXg;
    else awayXg += shotXg;

    const roll = Math.random() * 100;

    if (roll < goalChance) {
      // GOAL SCORED! (Always eventType: "GOAL")
      if (isHomeAttack) {
        homeOnTarget++;
        homeGoalScorers.push({
          name: attacker.name,
          minute,
          assist: assister?.name,
        });
      } else {
        awayOnTarget++;
        awayGoalScorers.push({
          name: attacker.name,
          minute,
          assist: assister?.name,
        });
      }

      addPoints(attacker, teamKey, 6);
      if (assister) addPoints(assister, teamKey, 3);

      const assistNote = assister ? ` *(Assist: ${assister.name})*` : "";
      const goalPhrases = [
        `⚽ **GOAL! (${minute}')** Top corner finish! **${attacker.name}** curls a brilliant strike home for **${attackingSide.clubName}**!${assistNote}`,
        `⚽ **GOAL! (${minute}')** Ice-cold composure! **${attacker.name}** slots it past ${gk.name}!${assistNote}`,
        `⚽ **GOAL! (${minute}')** Bullet header! **${attacker.name}** rises above the defense and thumps it in!${assistNote}`,
        `⚽ **GOAL! (${minute}')** Lethal counter! **${attacker.name}** unleashes an unstoppable rocket into the net!${assistNote}`,
      ];

      events.push({
        minute,
        eventType: "GOAL",
        team: teamKey,
        playerName: attacker.name,
        assistName: assister?.name,
        commentary: goalPhrases[Math.floor(Math.random() * goalPhrases.length)],
      });
    } else if (roll < goalChance + 32) {
      // SAVE
      if (isHomeAttack) {
        homeOnTarget++;
        awaySaves++;
      } else {
        awayOnTarget++;
        homeSaves++;
      }
      addPoints(gk, isHomeAttack ? "AWAY" : "HOME", 3.5);

      events.push({
        minute,
        eventType: "SAVE",
        team: teamKey,
        playerName: gk.name,
        commentary: `🧤 **WHAT A SAVE! (${minute}')** **${gk.name}** pulls off a magnificent reflex stop to deny **${attacker.name}**!`,
      });
    } else if (roll < goalChance + 42) {
      // WOODWORK
      if (isHomeAttack) homeOnTarget++;
      else awayOnTarget++;

      events.push({
        minute,
        eventType: "WOODWORK",
        team: teamKey,
        playerName: attacker.name,
        commentary: `💥 **OFF THE WOODWORK! (${minute}')** **${attacker.name}**'s venomous strike rattles the crossbar!`,
      });
    } else if (roll < goalChance + 56) {
      // DEFENDER BLOCK / TACKLE
      if (isHomeAttack) awayTacklesWon++;
      else homeTacklesWon++;
      addPoints(defender, isHomeAttack ? "AWAY" : "HOME", 2.5);

      events.push({
        minute,
        eventType: "BLOCK",
        team: teamKey,
        playerName: defender.name,
        commentary: `🛡️ **HEROIC DEFENDING (${minute}')** **${defender.name}** produces a crunching last-ditch slide tackle on **${attacker.name}**!`,
      });
    } else if (roll < goalChance + 68 && minute > 20) {
      // YELLOW CARD
      if (isHomeAttack) {
        awayYellowCards++;
        awayFouls++;
      } else {
        homeYellowCards++;
        homeFouls++;
      }

      events.push({
        minute,
        eventType: "YELLOW_CARD",
        team: isHomeAttack ? "AWAY" : "HOME",
        playerName: defender.name,
        commentary: `🟨 **BOOKING (${minute}')** **${defender.name}** receives a yellow card for a tactical foul to halt a break!`,
      });
    } else {
      // MISS
      events.push({
        minute,
        eventType: "MISS",
        team: teamKey,
        playerName: attacker.name,
        commentary: `💨 **CHANCE MISSED (${minute}')** **${attacker.name}** gets into shooting position but sends it just wide!`,
      });
    }
  }

  const homeGoals = homeGoalScorers.length;
  const awayGoals = awayGoalScorers.length;

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

  // MVP
  let topPlayer = home.squad.players[0] || new Player("Star Player", "FW", 85, 1);
  let maxPts = -1;
  playerPoints.forEach(({ player, points }) => {
    if (points > maxPts) {
      maxPts = points;
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
    homeCorners: Math.max(homeCorners, Math.floor(Math.random() * 3) + 2),
    awayCorners: Math.max(awayCorners, Math.floor(Math.random() * 3) + 2),
    homeFouls: Math.max(homeFouls, Math.floor(Math.random() * 4) + 2),
    awayFouls: Math.max(awayFouls, Math.floor(Math.random() * 4) + 2),
    homeYellowCards,
    awayYellowCards,
    homeRedCards,
    awayRedCards,
    homeSaves,
    awaySaves,
    homePassAccuracy: homePassAcc,
    awayPassAccuracy: awayPassAcc,
    homeTacklesWon,
    awayTacklesWon,
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
