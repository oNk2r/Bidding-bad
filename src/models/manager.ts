export interface ManagerSigning {
  playerName: string;
  price: number;
  rating: number;
  position: string;
}

export interface ManagerStatsData {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  tournamentsWon: number;
  highestScore?: number;
  avgScore?: number;
  totalSpent?: number;
  playersSigned?: number;
  positionCounts?: Record<string, number>;
  signedRatings?: number[];
  mostExpensiveSigning?: ManagerSigning;
  customRoles?: string[];
}

export interface ManagerProfile {
  displayName: string;
  userId: string;
  rank: string;
  rating: number;
  titles: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  highestScore: number;
  avgScore: number;
  playersSigned: number;
  totalSpent: number;
  roles: string[];
  archetypeTitle: string | null;
  archetypeDesc: string | null;
  coins: number;
  cardsOwned: number;
  clubValue: number;
  clubName: string;
  kitEmoji: string;
  motto: string | null;
  tournamentsWon: number;
  rp: number;
}

export function determineManagerRoles(stats?: ManagerStatsData | null): string[] {
  if (!stats) {
    return ["🔰 New Player"];
  }

  const roles: string[] = [];
  const matches = stats.matchesPlayed || 0;
  const wins = stats.wins || 0;
  const winRate = matches > 0 ? (wins / matches) * 100 : 0.0;
  const highestScore = stats.highestScore || 0.0;
  const tournamentsWon = stats.tournamentsWon || 0;

  // 1. New Player vs OG
  if (matches === 0) {
    roles.push("🔰 New Player");
  } else if (matches <= 2) {
    roles.push("🔰 Newbie");
  } else if (matches >= 5) {
    roles.push("🌟 OG");
  }

  // 2. Chef: Cooking in the transfer market
  if ((winRate >= 60.0 && matches >= 3) || highestScore >= 97.0) {
    roles.push("👨‍🍳 Chef");
  }

  // 3. Champion: Tournament titles
  if (tournamentsWon >= 1) {
    roles.push("🏆 Champion");
  }

  // 4. Custom/Assigned roles
  if (stats.customRoles) {
    for (const cr of stats.customRoles) {
      if (!roles.includes(cr)) {
        roles.push(cr);
      }
    }
  }

  return roles.length > 0 ? roles : ["🎮 Player"];
}

export function calculateManagerRating(
  wins: number,
  draws: number,
  losses: number,
  avgScore = 88.0,
  matchesPlayed = 0
): number {
  if (matchesPlayed === 0) return 1000;

  const baseRating = 1000;
  const wPts = wins * 25;
  const dPts = draws * 10;
  const lPts = losses * 15;

  const perfMod = avgScore > 0 ? Math.floor((avgScore - 88.0) * 8) : 0;
  const rating = baseRating + wPts + dPts - lPts + perfMod;
  return Math.max(800, rating);
}

export function determineArchetype(
  stats: ManagerStatsData
): { title: string; desc: string } | null {
  const matches = stats.matchesPlayed || 0;
  if (matches < 2) return null;

  const totalSpent = stats.totalSpent || 0;
  const playersSigned = stats.playersSigned || 0;
  const avgSpentPerPlayer = totalSpent / Math.max(1, playersSigned);

  const positions = stats.positionCounts || {};
  const totalPos = Object.values(positions).reduce((a, b) => a + b, 0) || 1;

  const midRatio = (positions.MID || 0) / totalPos;
  const defGkRatio = ((positions.DEF || 0) + (positions.GK || 0)) / totalPos;

  const ratingsList = stats.signedRatings || [];
  const avgRating =
    ratingsList.length > 0
      ? ratingsList.reduce((a, b) => a + b, 0) / ratingsList.length
      : 88.0;

  const recordSigning = stats.mostExpensiveSigning;
  const recordPrice = recordSigning ? recordSigning.price : 0;

  // 1. The Galáctico
  if (avgRating >= 89.5 && recordPrice >= 18) {
    return {
      title: "THE GALÁCTICO",
      desc: "Obsessed with elite superstar names regardless of price tag.",
    };
  }

  // 2. The Bargain Hunter
  if (avgSpentPerPlayer <= 5.0 && (stats.wins || 0) >= 1) {
    return {
      title: "THE BARGAIN HUNTER",
      desc: "Rarely overpays and consistently finds value in the market.",
    };
  }

  // 3. The Midfield Merchant
  if (midRatio >= 0.35) {
    return {
      title: "THE MIDFIELD MERCHANT",
      desc: "Controls the tempo by stockpiling elite midfielders.",
    };
  }

  // 4. The Defensive Wall
  if (defGkRatio >= 0.45) {
    return {
      title: "THE DEFENSIVE WALL",
      desc: "Prioritizes a rock-solid backline and clean sheets.",
    };
  }

  // 5. The Big Spender
  if (totalSpent / matches >= 40.0) {
    return {
      title: "THE BIG SPENDER",
      desc: "Dominates the auction room with deep pockets and aggressive bids.",
    };
  }

  // 6. Default
  return {
    title: "THE TACTICIAN",
    desc: "Values balanced squad composition and disciplined market timing.",
  };
}
