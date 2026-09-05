export interface SpinSector {
  name: string;
  badge: string;
  rewardType: "coins" | "pack" | "card" | "miss";
  value: number;
  packType?: "standard" | "premium";
  weight: number;
  colorHex: number;
}

export const SPIN_SECTORS: SpinSector[] = [
  {
    name: "Club Coins Stash",
    badge: "💰",
    rewardType: "coins",
    value: 500,
    weight: 35,
    colorHex: 0xeab308,
  },
  {
    name: "Standard Booster Pack",
    badge: "📦",
    rewardType: "pack",
    packType: "standard",
    value: 0,
    weight: 25,
    colorHex: 0x3b82f6,
  },
  {
    name: "Treasury Bounty",
    badge: "💎",
    rewardType: "coins",
    value: 1500,
    weight: 15,
    colorHex: 0xa855f7,
  },
  {
    name: "Premium Star Pack",
    badge: "✨",
    rewardType: "pack",
    packType: "premium",
    value: 0,
    weight: 12,
    colorHex: 0xf59e0b,
  },
  {
    name: "Jackpot Treasury Vault",
    badge: "👑",
    rewardType: "coins",
    value: 5000,
    weight: 5,
    colorHex: 0x22c55e,
  },
  {
    name: "Crossbar Miss",
    badge: "💨",
    rewardType: "miss",
    value: 0,
    weight: 8,
    colorHex: 0x64748b,
  },
];

export function spinWheel(): SpinSector {
  const totalWeight = SPIN_SECTORS.reduce((acc, s) => acc + s.weight, 0);
  let random = Math.random() * totalWeight;

  for (const sector of SPIN_SECTORS) {
    if (random < sector.weight) {
      return sector;
    }
    random -= sector.weight;
  }

  return SPIN_SECTORS[0];
}
