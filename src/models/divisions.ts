export interface DivisionTier {
  division: number; // 1 (Elite) to 5 (Grassroots)
  name: string;
  badge: string;
  minRp: number;
  maxRp: number | null;
  winRp: number;
  drawRp: number;
  lossRpDeduction: number;
  weeklyCoins: number;
  weeklyPacks: string[];
  colorHex: number;
}

export const DIVISIONS: DivisionTier[] = [
  {
    division: 5,
    name: "Grassroots (Bronze)",
    badge: "🥉",
    minRp: 0,
    maxRp: 299,
    winRp: 35,
    drawRp: 12,
    lossRpDeduction: 0, // Safe floor, no loss penalty in Div 5
    weeklyCoins: 1500,
    weeklyPacks: ["standard"],
    colorHex: 0xcd7f32,
  },
  {
    division: 4,
    name: "Semi-Pro (Silver)",
    badge: "🥈",
    minRp: 300,
    maxRp: 699,
    winRp: 35,
    drawRp: 12,
    lossRpDeduction: 5,
    weeklyCoins: 3500,
    weeklyPacks: ["standard", "standard"],
    colorHex: 0xc0c0c0,
  },
  {
    division: 3,
    name: "Professional (Gold)",
    badge: "🥇",
    minRp: 700,
    maxRp: 1199,
    winRp: 35,
    drawRp: 12,
    lossRpDeduction: 10,
    weeklyCoins: 7500,
    weeklyPacks: ["premium"],
    colorHex: 0xffd700,
  },
  {
    division: 2,
    name: "Champions League",
    badge: "💎",
    minRp: 1200,
    maxRp: 1799,
    winRp: 35,
    drawRp: 12,
    lossRpDeduction: 15,
    weeklyCoins: 15000,
    weeklyPacks: ["premium", "premium"],
    colorHex: 0x3b82f6,
  },
  {
    division: 1,
    name: "Elite Masters",
    badge: "👑",
    minRp: 1800,
    maxRp: null,
    winRp: 40,
    drawRp: 15,
    lossRpDeduction: 20,
    weeklyCoins: 30000,
    weeklyPacks: ["premium", "premium", "premium"],
    colorHex: 0xeab308,
  },
];

export function getDivisionByRp(rp: number): DivisionTier {
  const cleanRp = Math.max(0, rp);
  for (let i = DIVISIONS.length - 1; i >= 0; i--) {
    if (cleanRp >= DIVISIONS[i].minRp) {
      return DIVISIONS[i];
    }
  }
  return DIVISIONS[0];
}

export function getNextDivision(currentDiv: DivisionTier): DivisionTier | null {
  return DIVISIONS.find((d) => d.division === currentDiv.division - 1) || null;
}

export function calculateMatchRp(
  currentRp: number,
  outcome: "WIN" | "DRAW" | "LOSS",
  winStreak = 0
): { newRp: number; delta: number; commentary: string } {
  const div = getDivisionByRp(currentRp);

  if (outcome === "WIN") {
    const streakBonus = winStreak >= 3 ? 10 : 0;
    const delta = div.winRp + streakBonus;
    const newRp = currentRp + delta;
    let note = `+${delta} RP`;
    if (streakBonus > 0) {
      note += ` (includes +${streakBonus} 🔥 ${winStreak}-Streak Bonus!)`;
    }
    return { newRp, delta, commentary: note };
  }

  if (outcome === "DRAW") {
    const delta = div.drawRp;
    const newRp = currentRp + delta;
    return { newRp, delta, commentary: `+${delta} RP (Draw)` };
  }

  // LOSS
  const delta = div.lossRpDeduction === 0 ? 0 : -div.lossRpDeduction;
  const newRp = Math.max(0, currentRp + delta);
  const note = delta !== 0 ? `${delta} RP` : "+0 RP (Div 5 Protection)";
  return { newRp, delta, commentary: note };
}

export function getCurrentSeasonId(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getTimeUntilSeasonReset(): { hours: number; minutes: number; totalMs: number } {
  const now = new Date();
  const day = now.getUTCDay(); // 0 is Sunday, 1 is Monday
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);

  const diffMs = Math.max(0, nextMonday.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes, totalMs: diffMs };
}
