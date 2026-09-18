import type { ChaosEvent } from "../types.js";

export interface ChaosState {
  activeEvent: ChaosEvent | null;
  inflationRoundsRemaining: number;
  lockdownUserId: string | null;
  doubleBidActive: boolean;
}

export const CHAOS_EVENTS: ChaosEvent[] = [
  {
    id: "inflation",
    name: "Inflation",
    emoji: "💸",
    description: "Economic crisis! The next winning bid costs an extra +2 BB in luxury tax!",
  },
  {
    id: "stimulus",
    name: "Stimulus Check",
    emoji: "🤑",
    description: "Central bank bailout! Every player receives an unexpected +3 BB!",
  },
  {
    id: "lockdown",
    name: "Lockdown",
    emoji: "🔒",
    description: "Anti-monopoly enforcement! The highest spender is banned from bidding on this item!",
  },
  {
    id: "double_bid",
    name: "Double Jeopardy",
    emoji: "🎰",
    description: "High-roller round! The next winning bid costs 2× its final hammer price!",
  },
  {
    id: "mystery_airdrop",
    name: "Care Package",
    emoji: "📦",
    description: "A random player receives +2 BB grant from an anonymous sponsor!",
  },
];

export function createInitialChaosState(): ChaosState {
  return {
    activeEvent: null,
    inflationRoundsRemaining: 0,
    lockdownUserId: null,
    doubleBidActive: false,
  };
}

/**
 * 20% chance to roll a chaos event before an item auction if none active
 */
export function rollChaosEvent(): ChaosEvent | null {
  const roll = Math.random();
  if (roll < 0.2) {
    const idx = Math.floor(Math.random() * CHAOS_EVENTS.length);
    return CHAOS_EVENTS[idx];
  }
  return null;
}
