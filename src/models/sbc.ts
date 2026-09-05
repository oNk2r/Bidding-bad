import type { Position } from "../config/constants.js";

export interface SBCReward {
  rewardType: "coins" | "pack" | "card" | "combo";
  coins: number;
  packType?: "standard" | "premium";
  card?: {
    name: string;
    position: Position;
    rating: number;
    club: string;
    nation: string;
    value: number;
    tierName: string;
    tierBadge: string;
    untradeable: boolean;
  };
  description: string;
}

export interface SubmittedCard {
  id: string;
  cardId: string;
  name: string;
  rating: number;
  position: Position;
  club: string;
  nation: string;
}

export interface SBCChallenge {
  id: string;
  title: string;
  description: string;
  category: "Daily" | "Weekly" | "Icon" | "Milestone";
  minPlayers: number;
  minRating?: number;
  maxRating?: number;
  sameNationMin?: number;
  sameClubMin?: number;
  exactPositions?: Position[];
  requiredNations?: string[];
  requiredClubs?: string[];
  reward: SBCReward;
  repeatable: boolean;
  badge: string;
}

export const SBC_CATALOG: SBCChallenge[] = [
  {
    id: "sbc_daily_recycle",
    title: "Daily Grassroots Warmup",
    description: "Recycle 3 common cards to earn bonus treasury coins and a standard booster pack.",
    category: "Daily",
    minPlayers: 3,
    maxRating: 85,
    repeatable: true,
    badge: "⚡",
    reward: {
      rewardType: "combo",
      coins: 800,
      packType: "standard",
      description: "+800 Coins + 1x Standard Pack",
    },
  },
  {
    id: "sbc_tri_nation",
    title: "National Chemistry Unity",
    description: "Exchange 3 players of the exact same nationality with an average rating of 78+.",
    category: "Weekly",
    minPlayers: 3,
    minRating: 78,
    sameNationMin: 3,
    repeatable: true,
    badge: "🌍",
    reward: {
      rewardType: "combo",
      coins: 1800,
      packType: "standard",
      description: "+1,800 Coins + 1x Standard Pack",
    },
  },
  {
    id: "sbc_club_syndicate",
    title: "Club Loyalty Syndicate",
    description: "Exchange 4 players representing the same real-world club with an average rating of 82+.",
    category: "Weekly",
    minPlayers: 4,
    minRating: 82,
    sameClubMin: 4,
    repeatable: true,
    badge: "🛡️",
    reward: {
      rewardType: "combo",
      coins: 3500,
      packType: "premium",
      description: "+3,500 Coins + 1x Premium Pack",
    },
  },
  {
    id: "sbc_superstar_fusion",
    title: "Superstar Essence Fusion",
    description: "Submit a high-tier 5-player squad with an 86+ average rating to trigger an Elite Walkout.",
    category: "Milestone",
    minPlayers: 5,
    minRating: 86,
    repeatable: true,
    badge: "🔥",
    reward: {
      rewardType: "combo",
      coins: 6000,
      packType: "premium",
      description: "+6,000 Coins + 1x Premium Pack",
    },
  },
  {
    id: "sbc_icon_pele",
    title: "O Rei — Pelé Icon Tribute",
    description: "Assemble a squad of 5 elite players (88+ avg rating) with at least 2 Brazilian stars to unlock the King of Football.",
    category: "Icon",
    minPlayers: 5,
    minRating: 88,
    sameNationMin: 2,
    requiredNations: ["Brazil"],
    repeatable: false,
    badge: "👑",
    reward: {
      rewardType: "combo",
      coins: 12000,
      card: {
        name: "Pelé",
        position: "FW",
        rating: 95,
        club: "Santos / Brazil Icons",
        nation: "Brazil",
        value: 15000,
        tierName: "Icon Legend",
        tierBadge: "👑",
        untradeable: true,
      },
      description: "👑 95 OVR Pelé (Icon Legend) + 12,000 Coins",
    },
  },
];

export function getSbcById(sbcId: string): SBCChallenge | undefined {
  return SBC_CATALOG.find((sbc) => sbc.id.toLowerCase() === sbcId.toLowerCase());
}

export function validateSbcSubmission(
  challenge: SBCChallenge,
  cards: SubmittedCard[]
): { valid: boolean; message: string } {
  if (cards.length !== challenge.minPlayers) {
    return {
      valid: false,
      message: `Requires exactly ${challenge.minPlayers} cards (provided ${cards.length}).`,
    };
  }

  // Check unique card IDs
  const cardIds = cards.map((c) => c.id);
  if (new Set(cardIds).size !== cardIds.length) {
    return { valid: false, message: "Cannot submit duplicate card IDs in the same challenge." };
  }

  // Check ratings
  const ratings = cards.map((c) => c.rating || 75);
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  if (challenge.minRating && avgRating < challenge.minRating) {
    return {
      valid: false,
      message: `Requires minimum average squad rating of ${challenge.minRating} OVR (current avg: ${avgRating.toFixed(1)}).`,
    };
  }

  if (challenge.maxRating) {
    for (const r of ratings) {
      if (r > challenge.maxRating) {
        return {
          valid: false,
          message: `All submitted cards must be at or below ${challenge.maxRating} OVR.`,
        };
      }
    }
  }

  // Same nation
  if (challenge.sameNationMin) {
    const nationCounts: Record<string, number> = {};
    for (const c of cards) {
      const n = c.nation || "Unknown";
      nationCounts[n] = (nationCounts[n] || 0) + 1;
    }
    const maxSameNation = Math.max(0, ...Object.values(nationCounts));
    if (maxSameNation < challenge.sameNationMin) {
      return {
        valid: false,
        message: `Requires at least ${challenge.sameNationMin} players from the same nation (max found: ${maxSameNation}).`,
      };
    }
  }

  // Same club
  if (challenge.sameClubMin) {
    const clubCounts: Record<string, number> = {};
    for (const c of cards) {
      const cl = c.club || "Unknown";
      clubCounts[cl] = (clubCounts[cl] || 0) + 1;
    }
    const maxSameClub = Math.max(0, ...Object.values(clubCounts));
    if (maxSameClub < challenge.sameClubMin) {
      return {
        valid: false,
        message: `Requires at least ${challenge.sameClubMin} players from the same club (max found: ${maxSameClub}).`,
      };
    }
  }

  // Specific required nations
  if (challenge.requiredNations) {
    const nations = new Set(cards.map((c) => c.nation || "Unknown"));
    for (const req of challenge.requiredNations) {
      if (!nations.has(req)) {
        return { valid: false, message: `Must include at least one player from **${req}**.` };
      }
    }
  }

  // Specific required clubs
  if (challenge.requiredClubs) {
    const clubs = new Set(cards.map((c) => c.club || "Unknown"));
    for (const req of challenge.requiredClubs) {
      if (!clubs.has(req)) {
        return { valid: false, message: `Must include at least one player from **${req}**.` };
      }
    }
  }

  // Exact positions
  if (challenge.exactPositions) {
    const posList = cards.map((c) => c.position || "MID");
    const reqCopy = [...challenge.exactPositions];
    for (const p of posList) {
      const idx = reqCopy.indexOf(p);
      if (idx !== -1) {
        reqCopy.splice(idx, 1);
      } else {
        return {
          valid: false,
          message: `Position mismatch. Required positions: ${challenge.exactPositions.join(", ")}.`,
        };
      }
    }
    if (reqCopy.length > 0) {
      return { valid: false, message: `Missing required positions: ${reqCopy.join(", ")}.` };
    }
  }

  return { valid: true, message: "Requirements satisfied!" };
}
