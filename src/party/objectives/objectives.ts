import type { SecretObjective, PartyPlayerState } from "../types.js";

export const SECRET_OBJECTIVES: SecretObjective[] = [
  {
    id: "the_collector",
    name: "The Collector",
    emoji: "🕵️",
    description: "Own at least 2 items sharing at least one common tag.",
    validate: (player) => {
      const tagCounts: Record<string, number> = {};
      for (const item of player.items) {
        for (const tag of item.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          if (tagCounts[tag] >= 2) return true;
        }
      }
      return false;
    },
  },
  {
    id: "moneyball",
    name: "Moneyball",
    emoji: "💰",
    description: "Complete your 5-item squad with at least 15 BB remaining.",
    validate: (player) => {
      return player.items.length >= 5 && player.purse >= 15;
    },
  },
  {
    id: "big_spender",
    name: "Big Spender",
    emoji: "🔥",
    description: "Spend at least 40 BB on your 5-item squad.",
    validate: (player) => {
      const totalSpent = Object.values(player.itemPrices).reduce((sum, p) => sum + p, 0);
      return totalSpent >= 40;
    },
  },
  {
    id: "the_snake",
    name: "The Snake",
    emoji: "🐍",
    description: "Successfully outbid other players at least 3 times.",
    validate: (player) => {
      return player.outbidsCount >= 3;
    },
  },
  {
    id: "five_d_chess",
    name: "5D Chess",
    emoji: "🧠",
    description: "Spend strictly less total BB than every other player in the game.",
    validate: (player, allPlayers) => {
      const mySpent = Object.values(player.itemPrices).reduce((sum, p) => sum + p, 0);
      const others = allPlayers.filter((p) => p.userId !== player.userId);
      if (others.length === 0) return true;
      return others.every((other) => {
        const otherSpent = Object.values(other.itemPrices).reduce((sum, p) => sum + p, 0);
        return mySpent < otherSpent;
      });
    },
  },
  {
    id: "specialist",
    name: "Specialist",
    emoji: "🎯",
    description: "Own 3 items that all share a specific common tag.",
    validate: (player) => {
      const tagCounts: Record<string, number> = {};
      for (const item of player.items) {
        for (const tag of item.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          if (tagCounts[tag] >= 3) return true;
        }
      }
      return false;
    },
  },
  {
    id: "bargain_hunter",
    name: "Bargain Hunter",
    emoji: "🏷️",
    description: "Win at least 2 items for 3 BB or less each.",
    validate: (player) => {
      const cheapWins = Object.values(player.itemPrices).filter((p) => p <= 3).length;
      return cheapWins >= 2;
    },
  },
  {
    id: "aura_master",
    name: "Aura Master",
    emoji: "✨",
    description: "Own at least 2 items with elite tags (goat, aura, god, legend, king).",
    validate: (player) => {
      const eliteTags = new Set(["goat", "aura", "god", "legend", "king", "queen", "one_punch"]);
      let matchCount = 0;
      for (const item of player.items) {
        if (item.tags.some((t) => eliteTags.has(t.toLowerCase()))) {
          matchCount++;
        }
      }
      return matchCount >= 2;
    },
  },
];

/**
 * Assigns one unique secret objective to each player in the game.
 */
export function assignSecretObjectives(players: PartyPlayerState[]): void {
  const shuffled = [...SECRET_OBJECTIVES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (let idx = 0; idx < players.length; idx++) {
    players[idx].secretObjective = shuffled[idx % shuffled.length];
    players[idx].objectiveCompleted = false;
  }
}

/**
 * Evaluates whether each player achieved their secret objective.
 */
export function evaluateSecretObjectives(players: PartyPlayerState[]): void {
  for (const player of players) {
    if (player.secretObjective) {
      player.objectiveCompleted = player.secretObjective.validate(player, players);
    }
  }
}
