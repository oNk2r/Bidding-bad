export enum TacticType {
  BALANCED = "BALANCED",
  TIKI_TAKA = "TIKI_TAKA",
  GEGENPRESS = "GEGENPRESS",
  COUNTER_ATTACK = "COUNTER_ATTACK",
  PARK_THE_BUS = "PARK_THE_BUS",
  ALL_OUT_ATTACK = "ALL_OUT_ATTACK",
}

export interface TacticInfo {
  tacticType: TacticType;
  name: string;
  emoji: string;
  description: string;
  strengthDesc: string;
  weaknessDesc: string;
  counters: TacticType | null;
  vulnerableTo: TacticType | null;
}

export const TACTICS_CATALOG: Record<TacticType, TacticInfo> = {
  [TacticType.BALANCED]: {
    tacticType: TacticType.BALANCED,
    name: "Balanced",
    emoji: "⚖️",
    description: "Steady tempo, versatile positioning, and balanced offensive and defensive discipline.",
    strengthDesc: "Consistent all-round performance with no specific tactical vulnerability.",
    weaknessDesc: "No specialized tactical multiplier.",
    counters: null,
    vulnerableTo: null,
  },
  [TacticType.TIKI_TAKA]: {
    tacticType: TacticType.TIKI_TAKA,
    name: "Tiki-Taka",
    emoji: "🪄",
    description: "Patient build-up play, short passing mastery, and chemistry-fueled possession.",
    strengthDesc: "+50% Chemistry synergy bonus. Breaks down defensive low blocks.",
    weaknessDesc: "Vulnerable to ferocious high-pressing.",
    counters: TacticType.PARK_THE_BUS,
    vulnerableTo: TacticType.GEGENPRESS,
  },
  [TacticType.GEGENPRESS]: {
    tacticType: TacticType.GEGENPRESS,
    name: "Gegenpress",
    emoji: "⚡",
    description: "Relentless high-intensity pressing to force attacking turnovers immediately.",
    strengthDesc: "+15% Goal conversion rate. Overwhelms possession build-up.",
    weaknessDesc: "Exposed behind the defensive line against swift counter-attacks.",
    counters: TacticType.TIKI_TAKA,
    vulnerableTo: TacticType.COUNTER_ATTACK,
  },
  [TacticType.COUNTER_ATTACK]: {
    tacticType: TacticType.COUNTER_ATTACK,
    name: "Counter-Attack",
    emoji: "🎯",
    description: "Absorb opponent pressure and unleash lethal, rapid-fire transition breaks.",
    strengthDesc: "Underdog modifier scaling when playing against higher-rated squads.",
    weaknessDesc: "Can be overpowered by all-out wave attacking.",
    counters: TacticType.GEGENPRESS,
    vulnerableTo: TacticType.ALL_OUT_ATTACK,
  },
  [TacticType.PARK_THE_BUS]: {
    tacticType: TacticType.PARK_THE_BUS,
    name: "Park the Bus",
    emoji: "🧱",
    description: "Ultra-defensive compact low block designed to frustrate attackers.",
    strengthDesc: "+30% Goalkeeper & Defensive save conversion. Smothers all-out attacks.",
    weaknessDesc: "Susceptible to patient, intricate Tiki-Taka passing sequences.",
    counters: TacticType.ALL_OUT_ATTACK,
    vulnerableTo: TacticType.TIKI_TAKA,
  },
  [TacticType.ALL_OUT_ATTACK]: {
    tacticType: TacticType.ALL_OUT_ATTACK,
    name: "All-Out Attack",
    emoji: "🚀",
    description: "Flood forward with maximum numbers for explosive, high-scoring shootouts.",
    strengthDesc: "Generates extra attacking chances per match. Overwhelms counter setups.",
    weaknessDesc: "Leaves spaces open and easily blocked by parked defensive lines.",
    counters: TacticType.COUNTER_ATTACK,
    vulnerableTo: TacticType.PARK_THE_BUS,
  },
};

export function getTacticInfo(tacticName?: string | TacticType | null): TacticInfo {
  if (!tacticName) return TACTICS_CATALOG[TacticType.BALANCED];

  if (Object.values(TacticType).includes(tacticName as TacticType)) {
    return TACTICS_CATALOG[tacticName as TacticType];
  }

  const normalized = tacticName.trim().toUpperCase().replace(/[\s-]/g, "_");
  for (const key of Object.values(TacticType)) {
    if (key === normalized) {
      return TACTICS_CATALOG[key];
    }
  }

  return TACTICS_CATALOG[TacticType.BALANCED];
}

export function calculateTacticalMatchup(
  homeTactic: TacticInfo,
  awayTactic: TacticInfo
): { homeMod: number; awayMod: number; matchupNarrative: string } {
  if (homeTactic.tacticType === awayTactic.tacticType) {
    return {
      homeMod: 0.0,
      awayMod: 0.0,
      matchupNarrative: `Tactical Mirror Match (${homeTactic.name} vs ${awayTactic.name})`,
    };
  }

  if (homeTactic.counters === awayTactic.tacticType) {
    return {
      homeMod: 4.0,
      awayMod: -2.0,
      matchupNarrative: `Tactical Advantage: ${homeTactic.name} (${homeTactic.emoji}) counters ${awayTactic.name} (${awayTactic.emoji})!`,
    };
  }

  if (awayTactic.counters === homeTactic.tacticType) {
    return {
      homeMod: -2.0,
      awayMod: 4.0,
      matchupNarrative: `Tactical Advantage: ${awayTactic.name} (${awayTactic.emoji}) counters ${homeTactic.name} (${homeTactic.emoji})!`,
    };
  }

  return {
    homeMod: 0.0,
    awayMod: 0.0,
    matchupNarrative: `Tactical Clash: ${homeTactic.name} vs ${awayTactic.name}`,
  };
}

export const MANAGER_SIGNATURE_TACTICS: Record<string, TacticType> = {
  "pep guardiola": TacticType.TIKI_TAKA,
  "sir alex ferguson": TacticType.COUNTER_ATTACK,
  "jürgen klopp": TacticType.GEGENPRESS,
  "jurgen klopp": TacticType.GEGENPRESS,
  "josé mourinho": TacticType.PARK_THE_BUS,
  "jose mourinho": TacticType.PARK_THE_BUS,
  "carlo ancelotti": TacticType.BALANCED,
  "zinedine zidane": TacticType.BALANCED,
  "mikel arteta": TacticType.TIKI_TAKA,
  "xabi alonso": TacticType.TIKI_TAKA,
  "hansi flick": TacticType.GEGENPRESS,
  "diego simeone": TacticType.PARK_THE_BUS,
  "lionel scaloni": TacticType.BALANCED,
  "arsène wenger": TacticType.TIKI_TAKA,
  "arsene wenger": TacticType.TIKI_TAKA,
  "luis enrique": TacticType.TIKI_TAKA,
  "simone inzaghi": TacticType.COUNTER_ATTACK,
  "antonio conte": TacticType.COUNTER_ATTACK,
  "unai emery": TacticType.COUNTER_ATTACK,
  "arne slot": TacticType.GEGENPRESS,
  "julian nagelsmann": TacticType.GEGENPRESS,
  "arrigo sacchi": TacticType.PARK_THE_BUS,
  "johan cruyff": TacticType.TIKI_TAKA,
};

export function getManagerSignatureTactic(managerName?: string | null): TacticType {
  if (!managerName) return TacticType.BALANCED;
  const clean = managerName.trim().toLowerCase();
  for (const [key, tactic] of Object.entries(MANAGER_SIGNATURE_TACTICS)) {
    if (clean.includes(key)) {
      return tactic;
    }
  }
  return TacticType.BALANCED;
}

