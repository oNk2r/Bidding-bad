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
  | "WOODWORK"
  | "COUNTER"
  | "PENALTY_GOAL"
  | "PENALTY_SAVED"
  | "FREE_KICK_GOAL";

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
  type?: "OPEN_PLAY" | "COUNTER" | "HEADER" | "LONG_RANGE" | "PENALTY" | "FREE_KICK" | "TAP_IN";
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

interface PlayerMatchPerformance {
  player: Player;
  team: "HOME" | "AWAY";
  rating: number;
  goals: number;
  assists: number;
  saves: number;
  tackles: number;
  yellowCards: number;
  redCards: number;
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

  // Effective tactical strengths with chemistry and stadium influence
  const homeChemBuff = home.chemistryBonus * 0.1;
  const awayChemBuff = away.chemistryBonus * 0.1;

  const homeEffectivePower = home.squadScore + homeChemBuff + home.stadiumBonus + homeMod;
  const awayEffectivePower = away.squadScore + awayChemBuff + awayMod;
  const overallDiff = homeEffectivePower - awayEffectivePower;

  // Midfield & Possession Dynamics
  let baseHomePossession = 50 + (homeUnits.midRating - awayUnits.midRating) * 1.5 + overallDiff * 1.2;

  // Tactical possession adjustments
  if (home.tactic.tacticType === TacticType.TIKI_TAKA) baseHomePossession += 9;
  if (away.tactic.tacticType === TacticType.TIKI_TAKA) baseHomePossession -= 9;
  if (home.tactic.tacticType === TacticType.PARK_THE_BUS) baseHomePossession -= 12;
  if (away.tactic.tacticType === TacticType.PARK_THE_BUS) baseHomePossession += 12;
  if (home.tactic.tacticType === TacticType.COUNTER_ATTACK) baseHomePossession -= 7;
  if (away.tactic.tacticType === TacticType.COUNTER_ATTACK) baseHomePossession += 7;

  // Add slight organic variation
  const randPossVariation = Math.random() * 6 - 3;
  const homePossession = Math.min(76, Math.max(24, Math.round(baseHomePossession + randPossVariation)));
  const awayPossession = 100 - homePossession;

  // Pass Accuracy calculation
  const calcPassAcc = (tactic: TacticInfo, midRating: number) => {
    let base = 78 + (midRating - 80) * 0.8;
    if (tactic.tacticType === TacticType.TIKI_TAKA) base += 8;
    if (tactic.tacticType === TacticType.PARK_THE_BUS) base -= 6;
    if (tactic.tacticType === TacticType.COUNTER_ATTACK) base -= 4;
    return Math.min(96, Math.max(65, Math.round(base + (Math.random() * 4 - 2))));
  };

  const homePassAccuracy = calcPassAcc(home.tactic, homeUnits.midRating);
  const awayPassAccuracy = calcPassAcc(away.tactic, awayUnits.midRating);

  // Match stats accumulators
  const events: MatchEvent[] = [];
  const homeGoalScorers: GoalEntry[] = [];
  const awayGoalScorers: GoalEntry[] = [];

  let homeGoals = 0;
  let awayGoals = 0;
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

  // Player Performance Tracking Map
  const performances = new Map<string, PlayerMatchPerformance>();
  const initPlayer = (player: Player, team: "HOME" | "AWAY") => {
    if (!performances.has(player.name)) {
      performances.set(player.name, {
        player,
        team,
        rating: 6.0 + (player.rating - 80) * 0.05,
        goals: 0,
        assists: 0,
        saves: 0,
        tackles: 0,
        yellowCards: 0,
        redCards: 0,
      });
    }
  };

  home.squad.players.forEach((p) => initPlayer(p, "HOME"));
  away.squad.players.forEach((p) => initPlayer(p, "AWAY"));

  // Head Coach Tactical Briefing Event (1')
  if (home.headCoach || away.headCoach) {
    const coachTeam = home.headCoach ? home : away;
    const coachName = coachTeam.headCoach || coachTeam.managerName;
    events.push({
      minute: 1,
      eventType: "TACTICAL",
      team: coachTeam === home ? "HOME" : "AWAY",
      playerName: coachName,
      commentary: `👔 **TACTICAL SETUP (1')** Head Coach **${coachName}** directs **${coachTeam.clubName}** into their \`${coachTeam.tactic.name}\` setup!`,
    });
  }

  // Generate dynamic match timeline minutes (7 to 10 key attacking/defensive phases)
  const numPhases = 8 + Math.floor(Math.random() * 3); // 8 to 10 phases
  const generatedMinutes: number[] = [];
  const minInterval = 88 / numPhases;
  for (let i = 0; i < numPhases; i++) {
    const base = Math.round(5 + i * minInterval + (Math.random() * 5 - 2.5));
    const minute = Math.min(94, Math.max(3, base));
    if (!generatedMinutes.includes(minute)) {
      generatedMinutes.push(minute);
    }
  }
  generatedMinutes.sort((a, b) => a - b);

  // Helper pickers for positional units with safe fallbacks
  const pickAttacker = (side: ClubMatchSide, units: PositionalUnits): Player => {
    if (units.att.length > 0 && Math.random() < 0.75) {
      return units.att[Math.floor(Math.random() * units.att.length)];
    }
    if (units.mid.length > 0) {
      return units.mid[Math.floor(Math.random() * units.mid.length)];
    }
    return side.squad.players[0] || new Player("Striker", "FW", 85, 1);
  };

  const pickPlaymaker = (side: ClubMatchSide, units: PositionalUnits, excludeName?: string): Player | undefined => {
    const availableMids = units.mid.filter((p) => p.name !== excludeName);
    if (availableMids.length > 0 && Math.random() < 0.8) {
      return availableMids[Math.floor(Math.random() * availableMids.length)];
    }
    const otherAtts = units.att.filter((p) => p.name !== excludeName);
    if (otherAtts.length > 0 && Math.random() < 0.6) {
      return otherAtts[Math.floor(Math.random() * otherAtts.length)];
    }
    return undefined;
  };

  const pickDefender = (side: ClubMatchSide, units: PositionalUnits): Player => {
    if (units.def.length > 0) {
      return units.def[Math.floor(Math.random() * units.def.length)];
    }
    if (units.mid.length > 0) {
      return units.mid[Math.floor(Math.random() * units.mid.length)];
    }
    return side.squad.players[0] || new Player("Defender", "DEF", 84, 1);
  };

  const pickGoalkeeper = (side: ClubMatchSide, units: PositionalUnits): Player => {
    if (units.gk.length > 0) return units.gk[0];
    return (
      side.squad.players.find((p) => p.position === "GK") ||
      side.squad.players[0] ||
      new Player("Goalkeeper", "GK", 84, 1)
    );
  };

  // Main Match Simulation Loop
  for (const minute of generatedMinutes) {
    // Red card penalty modifier if a team is down a man
    const homeRedPenalty = homeRedCards * 15;
    const awayRedPenalty = awayRedCards * 15;

    // Tactical attack bias
    let homeAttackBias = homePossession - homeRedPenalty + awayRedPenalty;
    if (home.tactic.tacticType === TacticType.ALL_OUT_ATTACK) homeAttackBias += 8;
    if (away.tactic.tacticType === TacticType.ALL_OUT_ATTACK) homeAttackBias -= 8;
    if (home.tactic.tacticType === TacticType.GEGENPRESS) homeAttackBias += 5;
    if (away.tactic.tacticType === TacticType.GEGENPRESS) homeAttackBias -= 5;

    const isHomeAttack = Math.random() * 100 < Math.min(85, Math.max(15, homeAttackBias));
    const attackingSide = isHomeAttack ? home : away;
    const defendingSide = isHomeAttack ? away : home;
    const attackUnits = isHomeAttack ? homeUnits : awayUnits;
    const defendUnits = isHomeAttack ? awayUnits : homeUnits;
    const teamKey: "HOME" | "AWAY" = isHomeAttack ? "HOME" : "AWAY";

    if (isHomeAttack) homeShots++;
    else awayShots++;

    const attacker = pickAttacker(attackingSide, attackUnits);
    const playmaker = pickPlaymaker(attackingSide, attackUnits, attacker.name);
    const defender = pickDefender(defendingSide, defendUnits);
    const gk = pickGoalkeeper(defendingSide, defendUnits);

    // Determine chance type:
    // 1. Box Penalty (4%)
    // 2. Direct Free Kick (6%)
    // 3. Corner Header (14%)
    // 4. Fast Counter-Attack Break (20% if Counter tactic, 10% otherwise)
    // 5. Open Play Build-up (Remainder)
    const chanceRoll = Math.random() * 100;
    const isCounterTactic = attackingSide.tactic.tacticType === TacticType.COUNTER_ATTACK;

    let chanceType: "PENALTY" | "FREE_KICK" | "CORNER" | "COUNTER" | "OPEN_PLAY" = "OPEN_PLAY";
    if (chanceRoll < 4) {
      chanceType = "PENALTY";
    } else if (chanceRoll < 10) {
      chanceType = "FREE_KICK";
    } else if (chanceRoll < 24) {
      chanceType = "CORNER";
      if (isHomeAttack) homeCorners++;
      else awayCorners++;
    } else if (isCounterTactic || chanceRoll < 34) {
      chanceType = "COUNTER";
    }

    // Calculate Base xG for this opportunity
    let shotXg = 0.22;
    if (chanceType === "PENALTY") shotXg = 0.79;
    else if (chanceType === "FREE_KICK") shotXg = 0.18;
    else if (chanceType === "CORNER") shotXg = 0.28;
    else if (chanceType === "COUNTER") shotXg = 0.42;
    else shotXg = 0.26;

    // Modify xG by attacker quality vs defender + GK quality
    const qualityDiff = attacker.rating - (defender.rating * 0.4 + gk.rating * 0.6);
    shotXg += qualityDiff * 0.015;

    // Tactical modifications to xG
    if (attackingSide.tactic.tacticType === TacticType.TIKI_TAKA) shotXg += 0.06;
    if (attackingSide.tactic.tacticType === TacticType.GEGENPRESS) shotXg += 0.04;
    if (defendingSide.tactic.tacticType === TacticType.PARK_THE_BUS) shotXg -= 0.09;

    shotXg = Math.min(0.92, Math.max(0.08, parseFloat(shotXg.toFixed(2))));

    if (isHomeAttack) homeXg += shotXg;
    else awayXg += shotXg;

    // Determine defensive duel outcome vs shooting outcome
    const outcomeRoll = Math.random() * 100;
    const goalThreshold = shotXg * 100; // e.g. 35%
    const saveThreshold = goalThreshold + (defendUnits.gkRating > 85 ? 32 : 28);
    const blockThreshold = saveThreshold + (defendUnits.defRating > 85 ? 18 : 14);
    const woodworkThreshold = blockThreshold + 6;
    const foulThreshold = woodworkThreshold + 10;

    const attPerf = performances.get(attacker.name);
    const playPerf = playmaker ? performances.get(playmaker.name) : undefined;
    const defPerf = performances.get(defender.name);
    const gkPerf = performances.get(gk.name);

    if (outcomeRoll < goalThreshold) {
      // GOAL SCORED!
      const goalType =
        chanceType === "PENALTY"
          ? "PENALTY"
          : chanceType === "FREE_KICK"
            ? "FREE_KICK"
            : chanceType === "CORNER"
              ? "HEADER"
              : chanceType === "COUNTER"
                ? "COUNTER"
                : "OPEN_PLAY";

      if (isHomeAttack) {
        homeGoals++;
        homeOnTarget++;
        homeGoalScorers.push({
          name: attacker.name,
          minute,
          assist: playmaker?.name,
          type: goalType,
        });
      } else {
        awayGoals++;
        awayOnTarget++;
        awayGoalScorers.push({
          name: attacker.name,
          minute,
          assist: playmaker?.name,
          type: goalType,
        });
      }

      if (attPerf) {
        attPerf.goals += 1;
        attPerf.rating += 1.3;
      }
      if (playPerf) {
        playPerf.assists += 1;
        playPerf.rating += 0.7;
      }

      const assistText = playmaker ? ` *(Assist: ${playmaker.name})*` : "";
      let goalCommentary = "";

      if (chanceType === "PENALTY") {
        goalCommentary = `⚽ **PENALTY GOAL! (${minute}')** Ice in his veins! **${attacker.name}** sends ${gk.name} the wrong way from the spot!`;
      } else if (chanceType === "FREE_KICK") {
        goalCommentary = `🎯 **FREE KICK GOLAZO! (${minute}')** Sensational technique! **${attacker.name}** bends a pinpoint free kick right into the top postage stamp!`;
      } else if (chanceType === "CORNER") {
        goalCommentary = `💥 **BULLET HEADER GOAL! (${minute}')** Towering above everyone! **${attacker.name}** meets the corner delivery with a thunderous header!${assistText}`;
      } else if (chanceType === "COUNTER") {
        goalCommentary = `⚡ **LETHAL COUNTER GOAL! (${minute}')** Devastating transition! **${attacker.name}** breaks free on goal and slots it coolly home!${assistText}`;
      } else {
        const finishes = [
          `⚽ **GOAL! (${minute}')** Top corner perfection! **${attacker.name}** curls a mesmerizing strike into the back of the net for **${attackingSide.clubName}**!${assistText}`,
          `⚽ **GOAL! (${minute}')** Pure class! **${attacker.name}** glides past ${defender.name} and fires an unstoppable laser past ${gk.name}!${assistText}`,
          `⚽ **GOAL! (${minute}')** Poacher's instinct! **${attacker.name}** pounces on the loose ball and thumps it home!${assistText}`,
        ];
        goalCommentary = finishes[Math.floor(Math.random() * finishes.length)];
      }

      events.push({
        minute,
        eventType: chanceType === "PENALTY" ? "PENALTY_GOAL" : chanceType === "FREE_KICK" ? "FREE_KICK_GOAL" : "GOAL",
        team: teamKey,
        playerName: attacker.name,
        assistName: playmaker?.name,
        commentary: goalCommentary,
      });
    } else if (outcomeRoll < saveThreshold) {
      // GOALKEEPER SAVE
      if (isHomeAttack) {
        homeOnTarget++;
        awaySaves++;
      } else {
        awayOnTarget++;
        homeSaves++;
      }

      if (gkPerf) {
        gkPerf.saves += 1;
        gkPerf.rating += 0.5;
      }

      const savePhrases = [
        `🧤 **WORLD-CLASS SAVE! (${minute}')** **${gk.name}** reacts with cat-like reflexes to fingertip **${attacker.name}**'s venomous drive over the crossbar!`,
        `🧤 **STUNNING STOP! (${minute}')** **${gk.name}** dives full-stretch to deny **${attacker.name}** what looked like a certain goal!`,
        `🧤 **HEROIC 1v1 DENIAL! (${minute}')** **${gk.name}** rushes off the line to smother **${attacker.name}**'s breakaway strike!`,
      ];

      events.push({
        minute,
        eventType: "SAVE",
        team: teamKey,
        playerName: gk.name,
        commentary: savePhrases[Math.floor(Math.random() * savePhrases.length)],
      });
    } else if (outcomeRoll < blockThreshold) {
      // DEFENDER TACKLE OR BLOCK
      if (isHomeAttack) awayTacklesWon++;
      else homeTacklesWon++;

      if (defPerf) {
        defPerf.tackles += 1;
        defPerf.rating += 0.4;
      }

      events.push({
        minute,
        eventType: "BLOCK",
        team: teamKey,
        playerName: defender.name,
        commentary: `🛡️ **COLOSSAL DEFENDING (${minute}')** **${defender.name}** throws their body on the line with a goal-saving last-ditch slide tackle on **${attacker.name}**!`,
      });
    } else if (outcomeRoll < woodworkThreshold) {
      // WOODWORK
      if (isHomeAttack) homeOnTarget++;
      else awayOnTarget++;

      events.push({
        minute,
        eventType: "WOODWORK",
        team: teamKey,
        playerName: attacker.name,
        commentary: `💥 **OFF THE WOODWORK! (${minute}')** Agony for **${attacker.name}**! A thunderbolt rattles off the crossbar and bounces away!`,
      });
    } else if (outcomeRoll < foulThreshold && minute > 15) {
      // DEFENSIVE FOUL & BOOKING
      if (isHomeAttack) {
        awayFouls++;
        awayYellowCards++;
      } else {
        homeFouls++;
        homeYellowCards++;
      }

      if (defPerf) {
        defPerf.yellowCards += 1;
        defPerf.rating -= 0.6;
      }

      // Check if defender gets a second yellow -> RED CARD!
      const isSecondYellow = defPerf && defPerf.yellowCards >= 2;
      if (isSecondYellow) {
        if (isHomeAttack) {
          awayRedCards++;
          awayYellowCards = Math.max(0, awayYellowCards - 1);
        } else {
          homeRedCards++;
          homeYellowCards = Math.max(0, homeYellowCards - 1);
        }
        if (defPerf) {
          defPerf.redCards = 1;
          defPerf.rating -= 1.5;
        }

        events.push({
          minute,
          eventType: "RED_CARD",
          team: isHomeAttack ? "AWAY" : "HOME",
          playerName: defender.name,
          commentary: `🟥 **RED CARD DISMISSAL! (${minute}')** A second yellow card for **${defender.name}** after a cynical foul to stop **${attacker.name}**! **${defendingSide.clubName}** are down to 10 men!`,
        });
      } else {
        events.push({
          minute,
          eventType: "YELLOW_CARD",
          team: isHomeAttack ? "AWAY" : "HOME",
          playerName: defender.name,
          commentary: `🟨 **YELLOW CARD (${minute}')** **${defender.name}** goes into the referee's notebook for a professional foul on **${attacker.name}**!`,
        });
      }
    } else {
      // MISS / WIDE
      events.push({
        minute,
        eventType: "MISS",
        team: teamKey,
        playerName: attacker.name,
        commentary: `💨 **CHANCE MISSED (${minute}')** **${attacker.name}** carves out space inside the box but drags the shot just wide of the post!`,
      });
    }
  }

  // Knockout Penalty Shootout if tied
  let penaltyHomeScore: number | undefined;
  let penaltyAwayScore: number | undefined;

  if (isKnockout && homeGoals === awayGoals) {
    penaltyHomeScore = 0;
    penaltyAwayScore = 0;

    // 5 regulation penalties each
    for (let round = 1; round <= 5; round++) {
      const homeTaker = home.squad.players[(round - 1) % home.squad.players.length];
      const awayTaker = away.squad.players[(round - 1) % away.squad.players.length];

      const homeGk = pickGoalkeeper(home, homeUnits);
      const awayGk = pickGoalkeeper(away, awayUnits);

      const homeScoreRoll = Math.random() + (homeTaker.rating - awayGk.rating) * 0.01;
      if (homeScoreRoll > 0.28) penaltyHomeScore++;

      const awayScoreRoll = Math.random() + (awayTaker.rating - homeGk.rating) * 0.01;
      if (awayScoreRoll > 0.28) penaltyAwayScore++;
    }

    // Sudden death if still tied
    let suddenRounds = 0;
    while (penaltyHomeScore === penaltyAwayScore && suddenRounds < 10) {
      suddenRounds++;
      if (Math.random() < 0.72) penaltyHomeScore++;
      if (Math.random() < 0.72) penaltyAwayScore++;
    }

    // Break deadlock if still tied
    if (penaltyHomeScore === penaltyAwayScore) {
      if (Math.random() < 0.5) penaltyHomeScore++;
      else penaltyAwayScore++;
    }
  }

  // Determine Winner
  let winner: ClubMatchSide | null = null;
  if (homeGoals > awayGoals) {
    winner = home;
  } else if (awayGoals > homeGoals) {
    winner = away;
  } else if (penaltyHomeScore !== undefined && penaltyAwayScore !== undefined) {
    winner = penaltyHomeScore > penaltyAwayScore ? home : away;
  }

  const isDraw = homeGoals === awayGoals && penaltyHomeScore === undefined;

  // Rewards calculation
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

  // Calculate MOTM / MVP based on player match ratings
  let bestPlayer: Player = home.squad.players[0] || new Player("Star Player", "FW", 90, 1);
  let highestRating = -1;

  performances.forEach((perf) => {
    // Clean sheet bonus for GK and DEF
    if (perf.team === "HOME" && awayGoals === 0 && (perf.player.position === "GK" || perf.player.position === "DEF")) {
      perf.rating += 0.8;
    }
    if (perf.team === "AWAY" && homeGoals === 0 && (perf.player.position === "GK" || perf.player.position === "DEF")) {
      perf.rating += 0.8;
    }

    if (perf.rating > highestRating) {
      highestRating = perf.rating;
      bestPlayer = perf.player;
    }
  });

  const finalHomeXg = parseFloat(homeXg.toFixed(2));
  const finalAwayXg = parseFloat(awayXg.toFixed(2));

  // Ensure shots logic: shots >= shotsOnTarget >= goals
  const safeHomeShots = Math.max(homeGoals + homeOnTarget, homeShots);
  const safeAwayShots = Math.max(awayGoals + awayOnTarget, awayShots);
  const safeHomeOnTarget = Math.max(homeGoals, homeOnTarget);
  const safeAwayOnTarget = Math.max(awayGoals, awayOnTarget);

  const stats: MatchStats = {
    homePossession,
    awayPossession,
    homeShots: safeHomeShots,
    awayShots: safeAwayShots,
    homeShotsOnTarget: safeHomeOnTarget,
    awayShotsOnTarget: safeAwayOnTarget,
    homeXg: finalHomeXg,
    awayXg: finalAwayXg,
    homeCorners: Math.max(homeCorners, Math.floor(Math.random() * 3) + 1),
    awayCorners: Math.max(awayCorners, Math.floor(Math.random() * 3) + 1),
    homeFouls: Math.max(homeFouls, Math.floor(Math.random() * 4) + 2),
    awayFouls: Math.max(awayFouls, Math.floor(Math.random() * 4) + 2),
    homeYellowCards,
    awayYellowCards,
    homeRedCards,
    awayRedCards,
    homeSaves,
    awaySaves,
    homePassAccuracy,
    awayPassAccuracy,
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
    mvp: `${bestPlayer.name} (${bestPlayer.rating} ${bestPlayer.position}) • Rating: ${Math.min(9.9, Math.max(6.0, highestRating)).toFixed(1)}`,
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
