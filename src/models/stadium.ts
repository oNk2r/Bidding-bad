export interface StadiumTierInfo {
  tier: number;
  name: string;
  capacity: number;
  upgradeCost: number;
  revenuePerClaim: number;
  homeMoraleBuff: number;
  emoji: string;
}

export const STADIUM_TIERS: Record<number, StadiumTierInfo> = {
  1: {
    tier: 1,
    name: "Community Ground",
    capacity: 5000,
    upgradeCost: 0,
    revenuePerClaim: 100,
    homeMoraleBuff: 0.0,
    emoji: "🏟️",
  },
  2: {
    tier: 2,
    name: "Municipal Stadium",
    capacity: 25000,
    upgradeCost: 1000,
    revenuePerClaim: 250,
    homeMoraleBuff: 1.0,
    emoji: "🏟️✨",
  },
  3: {
    tier: 3,
    name: "Premier Arena",
    capacity: 50000,
    upgradeCost: 2500,
    revenuePerClaim: 500,
    homeMoraleBuff: 2.0,
    emoji: "🏟️🔥",
  },
  4: {
    tier: 4,
    name: "Champions Coliseum",
    capacity: 80000,
    upgradeCost: 6000,
    revenuePerClaim: 900,
    homeMoraleBuff: 3.0,
    emoji: "🏟️👑",
  },
  5: {
    tier: 5,
    name: "Galactic Megastructure",
    capacity: 110000,
    upgradeCost: 15000,
    revenuePerClaim: 1500,
    homeMoraleBuff: 5.0,
    emoji: "🌌🏟️",
  },
};

export function getStadiumTier(tier: number): StadiumTierInfo {
  return STADIUM_TIERS[tier] || STADIUM_TIERS[1];
}
