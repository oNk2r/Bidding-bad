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
  | "PENALTY"
  | "VAR_DECISION"
  | "TACTICAL"
  | "WOODWORK"
  | "CORNER";

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
  homeBigChances: number;
  awayBigChances: number;
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
  type?: "OPEN_PLAY" | "HEADER" | "PENALTY" | "FREE_KICK" | "COUNTER" | "LONG_RANGE";
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

export interface PlayerMatchRating {
  player: Player;
  team: "HOME" | "AWAY";
  rating: number;
  goals: number;
  assists: number;
  saves: number;
  tackles: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
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
  playerRatings?: Record<string, PlayerMatchRating>;
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

// Generates dynamic match minutes across halves
function generateMatchTimeline(): number[] {
  const firstHalfMinutes = [
    Math.floor(Math.random() * 6) + 4,   // 4-9'
    Math.floor(Math.random() * 8) + 14,  // 14-21'
    Math.floor(Math.random() * 9) + 26,  // 26-34'
    Math.floor(Math.random() * 8) + 38,  // 38-45'
  ];

  if (Math.random() < 0.4) {
    firstHalfMinutes.push(45 + Math.floor(Math.random() * 2) + 1); // 45+1' or 45+2'
  }

  const secondHalfMinutes = [
    Math.floor(Math.random() * 7) + 48,  // 48-54'
    Math.floor(Math.random() * 8) + 58,  // 58-65'
    Math.floor(Math.random() * 8) + 69,  // 69-76'
    Math.floor(Math.random() * 7) + 80,  // 80-86'
  ];

  // Stoppage time drama
  if (Math.random() < 0.65) {
    secondHalfMinutes.push(89);
  }
  if (Math.random() < 0.5) {
    secondHalfMinutes.push(90 + Math.floor(Math.random() * 4) + 1); // 90+1' - 90+4'
  }

  return [...new Set([...firstHalfMinutes, ...secondHalfMinutes])].sort((a, b) => a - b);
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

  // Red card tracking per player
  const playerYellows = new Map<string, number>();
  const sentOffPlayers = new Set<string>();

  // Base power calculations
  let homeBasePower = home.squadScore + home.chemistryBonus * 0.15 + home.stadiumBonus + homeMod;
  let awayBasePower = away.squadScore + away.chemistryBonus * 0.15 + awayMod;
  const initialDiff = homeBasePower - awayBasePower;

  // Possession calculation driven by midfield quality & tactical philosophy
  const midDiff = homeUnits.midRating - awayUnits.midRating;
  let basePoss = 50 + initialDiff * 1.2 + midDiff * 0.8;

  if (home.tactic.tacticType === TacticType.TIKI_TAKA) basePoss += 10;
  if (away.tactic.tacticType === TacticType.TIKI_TAKA) basePoss -= 10;
  if (home.tactic.tacticType === TacticType.PARK_THE_BUS) basePoss -= 12;
  if (away.tactic.tacticType === TacticType.PARK_THE_BUS) basePoss += 12;
  if (home.tactic.tacticType === TacticType.ALL_OUT_ATTACK) basePoss += 4;
  if (away.tactic.tacticType === TacticType.ALL_OUT_ATTACK) basePoss -= 4;

  const homePossession = Math.min(78, Math.max(22, Math.round(basePoss + (Math.random() * 4 - 2))));
  const awayPossession = 100 - homePossession;

  // Pass accuracy
  const homePassAcc = Math.min(
    95,
    Math.max(68, Math.round(81 + (homeUnits.midRating - 80) * 0.7 + (home.tactic.tacticType === TacticType.TIKI_TAKA ? 6 : 0)))
  );
  const awayPassAcc = Math.min(
    95,
    Math.max(68, Math.round(81 + (awayUnits.midRating - 80) * 0.7 + (away.tactic.tacticType === TacticType.TIKI_TAKA ? 6 : 0)))
  );

  const events: MatchEvent[] = [];
  const homeGoalScorers: GoalEntry[] = [];
  const awayGoalScorers: GoalEntry[] = [];

  let homeShots = 0;
  let awayShots = 0;
  let homeOnTarget = 0;
  let awayOnTarget = 0;
  let homeXg = 0.0;
  let awayXg = 0.0;
  let homeBigChances = 0;
  let awayBigChances = 0;
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

  // Individual player performance tracking for 10.0 rating system
  const ratingsMap = new Map<string, PlayerMatchRating>();

  const initRating = (p: Player, team: "HOME" | "AWAY") => {
    ratingsMap.set(p.name, {
      player: p,
      team,
      rating: 6.0,
      goals: 0,
      assists: 0,
      saves: 0,
      tackles: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
    });
  };

  home.squad.players.forEach((p) => initRating(p, "HOME"));
  away.squad.players.forEach((p) => initRating(p, "AWAY"));

  // 1' Kickoff Tactical Briefing
  if (home.headCoach || away.headCoach) {
    const coachSide = home.headCoach ? home : away;
    const coachName = coachSide.headCoach || coachSide.managerName;
    events.push({
      minute: 1,
      eventType: "TACTICAL",
      team: coachSide === home ? "HOME" : "AWAY",
      playerName: coachName,
      commentary: `👔 **TACTICAL SETUP (1')** Head Coach **${coachName}** deploys **${coachSide.clubName}** in \`${coachSide.tactic.name}\` formation!`,
    });
  }

  const matchMinutes = generateMatchTimeline();

  const getAvailablePlayers = (side: ClubMatchSide, list: Player[]) => {
    const valid = list.filter((p) => !sentOffPlayers.has(p.name));
    return valid.length > 0 ? valid : side.squad.players.filter((p) => !sentOffPlayers.has(p.name));
  };

  const getAttacker = (side: ClubMatchSide, units: PositionalUnits) => {
    const fwList = getAvailablePlayers(side, units.att);
    if (fwList.length > 0 && Math.random() < 0.72) {
      return fwList[Math.floor(Math.random() * fwList.length)];
    }
    const midList = getAvailablePlayers(side, units.mid);
    if (midList.length > 0) {
      return midList[Math.floor(Math.random() * midList.length)];
    }
    const any = getAvailablePlayers(side, side.squad.players);
    return any[0] || new Player("Forward", "FW", 85, 1);
  };

  const getAssister = (side: ClubMatchSide, units: PositionalUnits, excludeName: string) => {
    const candidates = getAvailablePlayers(side, side.squad.players).filter((p) => p.name !== excludeName);
    if (candidates.length === 0) return undefined;
    // Midfielders have highest assist probability
    const midCandidates = candidates.filter((p) => p.position === "MID" || p.position === "FW");
    if (midCandidates.length > 0 && Math.random() < 0.78) {
      return midCandidates[Math.floor(Math.random() * midCandidates.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const getDefender = (side: ClubMatchSide, units: PositionalUnits) => {
    const defCandidates = getAvailablePlayers(side, units.def);
    if (defCandidates.length > 0) {
      return defCandidates[Math.floor(Math.random() * defCandidates.length)];
    }
    const midCandidates = getAvailablePlayers(side, units.mid);
    if (midCandidates.length > 0) {
      return midCandidates[Math.floor(Math.random() * midCandidates.length)];
    }
    const any = getAvailablePlayers(side, side.squad.players);
    return any[0] || new Player("Defender", "DEF", 84, 1);
  };

  const getGoalkeeper = (side: ClubMatchSide, units: PositionalUnits) => {
    if (units.gk.length > 0 && !sentOffPlayers.has(units.gk[0].name)) {
      return units.gk[0];
    }
    const any = getAvailablePlayers(side, side.squad.players);
    return any[0] || new Player("Goalkeeper", "GK", 84, 1);
  };

  for (const minute of matchMinutes) {
    // Check dynamic red card power penalty
    const homeRedPenalty = homeRedCards * 6.0;
    const awayRedPenalty = awayRedCards * 6.0;
    const liveDiff = (homeBasePower - homeRedPenalty) - (awayBasePower - awayRedPenalty);

    // Dynamic phase initiative
    const homeInitiative = Math.min(85, Math.max(15, homePossession + liveDiff * 0.8));
    const isHomeAttack = Math.random() * 100 < homeInitiative;
    const attackingSide = isHomeAttack ? home : away;
    const defendingSide = isHomeAttack ? away : home;
    const attackUnits = isHomeAttack ? homeUnits : awayUnits;
    const defendUnits = isHomeAttack ? awayUnits : homeUnits;
    const teamKey: "HOME" | "AWAY" = isHomeAttack ? "HOME" : "AWAY";
    const oppTeamKey: "HOME" | "AWAY" = isHomeAttack ? "AWAY" : "HOME";

    const attacker = getAttacker(attackingSide, attackUnits);
    const defender = getDefender(defendingSide, defendUnits);
    const gk = getGoalkeeper(defendingSide, defendUnits);

    const attRec = ratingsMap.get(attacker.name);
    const defRec = ratingsMap.get(defender.name);
    const gkRec = ratingsMap.get(gk.name);

    // Action roll type: 1) Penalty Box Foul, 2) Dangerous Attack / Shot, 3) Tactical Foul / Midfield Battle
    const actionTypeRoll = Math.random() * 100;

    // === SCENARIO 1: IN-MATCH PENALTY KICK (approx 5-7% of chances) ===
    if (actionTypeRoll < 6 && (defendingSide.tactic.tacticType === TacticType.PARK_THE_BUS || defendingSide.tactic.tacticType === TacticType.GEGENPRESS || actionTypeRoll < 3)) {
      if (isHomeAttack) {
        homeShots++;
        homeOnTarget++;
        homeBigChances++;
        homeXg += 0.78;
        awayFouls++;
      } else {
        awayShots++;
        awayOnTarget++;
        awayBigChances++;
        awayXg += 0.78;
        homeFouls++;
      }

      if (defRec) defRec.fouls++;

      // Penalty taker vs Keeper duel (standard conversion rate ~76%)
      const penaltyConversion = Math.min(88, Math.max(62, 76 + (attacker.rating - gk.rating) * 1.1));
      const penaltyRoll = Math.random() * 100;

      if (penaltyRoll < penaltyConversion) {
        // Penalty Goal
        if (isHomeAttack) {
          homeGoalScorers.push({ name: attacker.name, minute, type: "PENALTY" });
        } else {
          awayGoalScorers.push({ name: attacker.name, minute, type: "PENALTY" });
        }

        if (attRec) {
          attRec.goals++;
          attRec.rating += 1.0;
        }

        events.push({
          minute,
          eventType: "PENALTY",
          team: teamKey,
          playerName: attacker.name,
          commentary: `🎯 **PENALTY CONVERTED! (${minute}')** **${attacker.name}** steps up to the spot and calmly sends ${gk.name} the wrong way! Ice in the veins for **${attackingSide.clubName}**!`,
        });
      } else {
        // Penalty Saved
        if (isHomeAttack) awaySaves++;
        else homeSaves++;

        if (gkRec) {
          gkRec.saves += 2;
          gkRec.rating += 1.2;
        }

        events.push({
          minute,
          eventType: "SAVE",
          team: teamKey,
          playerName: gk.name,
          commentary: `🧤 **PENALTY SAVED! (${minute}')** Sensational stop! **${gk.name}** guesses right and parries **${attacker.name}**'s spot-kick away to safety!`,
        });
      }
      continue;
    }

    // === SCENARIO 2: TACTICAL FOUL / BOOKING (without shot) ===
    if (actionTypeRoll < 14) {
      if (isHomeAttack) awayFouls++;
      else homeFouls++;

      if (defRec) defRec.fouls++;

      const isYellowCard = Math.random() < 0.65;
      if (isYellowCard) {
        const curYellows = (playerYellows.get(defender.name) || 0) + 1;
        playerYellows.set(defender.name, curYellows);

        if (curYellows === 2) {
          // SECOND YELLOW -> RED CARD!
          sentOffPlayers.add(defender.name);
          if (isHomeAttack) awayRedCards++;
          else homeRedCards++;

          if (defRec) {
            defRec.yellowCards++;
            defRec.redCards++;
            defRec.rating -= 1.8;
          }

          events.push({
            minute,
            eventType: "RED_CARD",
            team: oppTeamKey,
            playerName: defender.name,
            commentary: `🟥 **SECOND YELLOW & RED CARD! (${minute}')** Disastrous moment for **${defendingSide.clubName}**! **${defender.name}** commits a second cynical foul and is sent off! They are down to 10 men!`,
          });
        } else {
          // YELLOW CARD
          if (isHomeAttack) awayYellowCards++;
          else homeYellowCards++;

          if (defRec) {
            defRec.yellowCards++;
            defRec.rating -= 0.4;
          }

          events.push({
            minute,
            eventType: "YELLOW_CARD",
            team: oppTeamKey,
            playerName: defender.name,
            commentary: `🟨 **TACTICAL BOOKING (${minute}')** **${defender.name}** takes one for the team, pulling down **${attacker.name}** to prevent a lethal breakaway!`,
          });
        }
      }
      continue;
    }

    // === SCENARIO 3: SHOT / DANGEROUS ATTACKING CHANCE ===
    if (isHomeAttack) homeShots++;
    else awayShots++;

    const assister = getAssister(attackingSide, attackUnits, attacker.name);
    const astRec = assister ? ratingsMap.get(assister.name) : undefined;

    // Determine shot quality and xG based on attacker skill, defender pressure, and tactics
    const skillAdvantage = (attacker.rating - (defender.rating + gk.rating) / 2) * 0.9;
    let baseConversion = 26 + (isHomeAttack ? liveDiff * 0.7 : -liveDiff * 0.7) + skillAdvantage;

    // Tactical influence
    if (attackingSide.tactic.tacticType === TacticType.GEGENPRESS) baseConversion += 4;
    if (attackingSide.tactic.tacticType === TacticType.COUNTER_ATTACK) baseConversion += 5;
    if (attackingSide.tactic.tacticType === TacticType.ALL_OUT_ATTACK) baseConversion += 6;
    if (defendingSide.tactic.tacticType === TacticType.PARK_THE_BUS) baseConversion -= 7;
    if (defendingSide.tactic.tacticType === TacticType.TIKI_TAKA) baseConversion -= 2;

    const goalChance = Math.min(58, Math.max(12, baseConversion));
    const chanceXg = parseFloat((goalChance / 100 * 1.15).toFixed(2));

    if (isHomeAttack) {
      homeXg += chanceXg;
      if (goalChance > 35) homeBigChances++;
    } else {
      awayXg += chanceXg;
      if (goalChance > 35) awayBigChances++;
    }

    const shotRoll = Math.random() * 100;

    // Sub-scenario A: GOAL SCORED!
    if (shotRoll < goalChance) {
      // Rare VAR Disallowed Goal drama (3% chance)
      if (Math.random() < 0.04) {
        events.push({
          minute,
          eventType: "VAR_DECISION",
          team: teamKey,
          playerName: attacker.name,
          commentary: `📺 **VAR DECISION (${minute}')** Goal under review! After VAR review, **${attacker.name}** is ruled offside by inches! **NO GOAL!**`,
        });
        continue;
      }

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

      if (attRec) {
        attRec.goals++;
        attRec.rating += 1.2;
      }
      if (astRec) {
        astRec.assists++;
        astRec.rating += 0.7;
      }

      const assistText = assister ? ` *(Assist: ${assister.name})*` : "";
      const goalDescriptions = [
        `⚽ **GOAL! (${minute}')** Top corner perfection! **${attacker.name}** curls a sublime world-class finish past ${gk.name}!${assistText}`,
        `⚽ **GOAL! (${minute}')** Clinical composure! **${attacker.name}** latches onto the through ball and buries it into the bottom corner!${assistText}`,
        `⚽ **GOAL! (${minute}')** Bullet header! **${attacker.name}** leaps highest in the penalty box and thumps it home for **${attackingSide.clubName}**!${assistText}`,
        `⚽ **GOAL! (${minute}')** What a strike! **${attacker.name}** unleashes an unstoppable 25-yard rocket that tears into the roof of the net!${assistText}`,
        `⚽ **GOAL! (${minute}')** Rapid transition counter! **${attacker.name}** finishes off a lightning-fast counter attack in style!${assistText}`,
        `⚽ **GOAL! (${minute}')** Pure poacher instinct! **${attacker.name}** pounces on the loose ball and taps in from close range!${assistText}`,
      ];

      events.push({
        minute,
        eventType: "GOAL",
        team: teamKey,
        playerName: attacker.name,
        assistName: assister?.name,
        commentary: goalDescriptions[Math.floor(Math.random() * goalDescriptions.length)],
      });
    }
    // Sub-scenario B: GOALKEEPER SAVE
    else if (shotRoll < goalChance + 34) {
      if (isHomeAttack) {
        homeOnTarget++;
        awaySaves++;
      } else {
        awayOnTarget++;
        homeSaves++;
      }

      if (gkRec) {
        gkRec.saves++;
        gkRec.rating += 0.45;
      }

      const saveDescriptions = [
        `🧤 **WORLD-CLASS SAVE! (${minute}')** **${gk.name}** reacts at lightning speed to tip **${attacker.name}**'s fierce volley over the bar!`,
        `🧤 **WHAT A STOP! (${minute}')** Point-blank reflex save! **${gk.name}** denies **${attacker.name}** in a dramatic 1-on-1 duel!`,
        `🧤 **BRILLIANT GOALKEEPING (${minute}')** **${gk.name}** dives full-stretch to palm away **${attacker.name}**'s curling effort!`,
      ];

      events.push({
        minute,
        eventType: "SAVE",
        team: teamKey,
        playerName: gk.name,
        commentary: saveDescriptions[Math.floor(Math.random() * saveDescriptions.length)],
      });
    }
    // Sub-scenario C: WOODWORK
    else if (shotRoll < goalChance + 44) {
      if (isHomeAttack) homeOnTarget++;
      else awayOnTarget++;

      events.push({
        minute,
        eventType: "WOODWORK",
        team: teamKey,
        playerName: attacker.name,
        commentary: `💥 **OFF THE WOODWORK! (${minute}')** Agony for **${attacker.name}**! The thunderous shot beats the keeper but smashes off the crossbar!`,
      });
    }
    // Sub-scenario D: DEFENSIVE BLOCK / TACKLE
    else if (shotRoll < goalChance + 60) {
      if (isHomeAttack) awayTacklesWon++;
      else homeTacklesWon++;

      if (defRec) {
        defRec.tackles++;
        defRec.rating += 0.35;
      }

      events.push({
        minute,
        eventType: "BLOCK",
        team: teamKey,
        playerName: defender.name,
        commentary: `🛡️ **HEROIC DEFENDING (${minute}')** **${defender.name}** throws their body on the line with a crucial goal-saving block on **${attacker.name}**!`,
      });
    }
    // Sub-scenario E: CORNER / SET PIECE
    else if (shotRoll < goalChance + 74) {
      if (isHomeAttack) homeCorners++;
      else awayCorners++;

      events.push({
        minute,
        eventType: "CORNER",
        team: teamKey,
        playerName: attacker.name,
        commentary: `🚩 **CORNER KICK (${minute}')** **${attacker.name}** forces a deflection out for a corner as **${attackingSide.clubName}** pile on the pressure!`,
      });
    }
    // Sub-scenario F: MISS / OFF-TARGET
    else {
      events.push({
        minute,
        eventType: "MISS",
        team: teamKey,
        playerName: attacker.name,
        commentary: `💨 **CHANCE WASTED (${minute}')** **${attacker.name}** gets into space on the edge of the box but drags the shot wide of the far post!`,
      });
    }
  }

  const homeGoals = homeGoalScorers.length;
  const awayGoals = awayGoalScorers.length;

  // Clean sheet bonuses for GK & Defenders
  if (awayGoals === 0) {
    home.squad.players.forEach((p) => {
      const rec = ratingsMap.get(p.name);
      if (rec && (p.position === "GK" || p.position === "DEF")) {
        rec.rating += 0.7;
      }
    });
  }
  if (homeGoals === 0) {
    away.squad.players.forEach((p) => {
      const rec = ratingsMap.get(p.name);
      if (rec && (p.position === "GK" || p.position === "DEF")) {
        rec.rating += 0.7;
      }
    });
  }

  // Knockout penalty shootout if level after regular time
  let penaltyHomeScore: number | undefined;
  let penaltyAwayScore: number | undefined;

  if (isKnockout && homeGoals === awayGoals) {
    penaltyHomeScore = 0;
    penaltyAwayScore = 0;
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.76) penaltyHomeScore++;
      if (Math.random() < 0.76) penaltyAwayScore++;
    }
    while (penaltyHomeScore === penaltyAwayScore) {
      if (Math.random() < 0.74) penaltyHomeScore++;
      if (Math.random() < 0.74) penaltyAwayScore++;
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

  // Dynamic economy rewards
  let homeReward = 250;
  let awayReward = 250;

  if (winner === home) {
    const goalDiff = homeGoals - awayGoals;
    homeReward = 650 + Math.min(350, goalDiff * 100);
    awayReward = 250 + Math.min(150, awayGoals * 50);
  } else if (winner === away) {
    const goalDiff = awayGoals - homeGoals;
    awayReward = 650 + Math.min(350, goalDiff * 100);
    homeReward = 250 + Math.min(150, homeGoals * 50);
  } else {
    homeReward = 380 + Math.min(200, homeGoals * 50);
    awayReward = 380 + Math.min(200, awayGoals * 50);
  }

  // Finalize player ratings & MOTM
  let highestRating = -1;
  let motmPlayer: PlayerMatchRating | null = null;

  const playerRatingsRecord: Record<string, PlayerMatchRating> = {};

  for (const [name, rec] of ratingsMap.entries()) {
    // Clamp match ratings between 4.5 and 9.9
    rec.rating = Math.min(9.9, Math.max(4.5, parseFloat(rec.rating.toFixed(1))));
    playerRatingsRecord[name] = rec;

    // Weight winner squad slightly for MOTM
    const isWinnerTeam = (winner === home && rec.team === "HOME") || (winner === away && rec.team === "AWAY");
    const motmScore = rec.rating + (isWinnerTeam ? 0.3 : 0);

    if (motmScore > highestRating) {
      highestRating = motmScore;
      motmPlayer = rec;
    }
  }

  const defaultTop = home.squad.players[0] || new Player("Star Player", "FW", 85, 1);
  const mvpString = motmPlayer
    ? `${motmPlayer.player.name} (${motmPlayer.rating} ★ MOTM${motmPlayer.goals > 0 ? ` • ${motmPlayer.goals}G` : ""}${motmPlayer.assists > 0 ? ` • ${motmPlayer.assists}A` : ""}${motmPlayer.saves > 0 ? ` • ${motmPlayer.saves} Saves` : ""})`
    : `${defaultTop.name} (8.0 ★ MOTM)`;

  const stats: MatchStats = {
    homePossession,
    awayPossession,
    homeShots: Math.max(homeGoals + homeOnTarget, homeShots),
    awayShots: Math.max(awayGoals + awayOnTarget, awayShots),
    homeShotsOnTarget: Math.max(homeGoals, homeOnTarget),
    awayShotsOnTarget: Math.max(awayGoals, awayOnTarget),
    homeXg: parseFloat(homeXg.toFixed(2)),
    awayXg: parseFloat(awayXg.toFixed(2)),
    homeBigChances: Math.max(homeGoals, homeBigChances),
    awayBigChances: Math.max(awayGoals, awayBigChances),
    homeCorners: Math.max(homeCorners, Math.floor(Math.random() * 3) + 2),
    awayCorners: Math.max(awayCorners, Math.floor(Math.random() * 3) + 2),
    homeFouls: Math.max(homeFouls, Math.floor(Math.random() * 3) + 3),
    awayFouls: Math.max(awayFouls, Math.floor(Math.random() * 3) + 3),
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
    mvp: mvpString,
    playerRatings: playerRatingsRecord,
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
