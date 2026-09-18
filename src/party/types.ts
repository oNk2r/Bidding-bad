export interface PartyItem {
  id: string;
  name: string;
  category: string;
  image?: string;
  metadata?: Record<string, any>;
  tags: string[];
  startingPrice?: number;
}

export interface PartyScenario {
  id: string;
  title: string;
  description: string;
  emoji?: string;
}

export interface SecretObjective {
  id: string;
  name: string;
  emoji: string;
  description: string;
  validate: (player: PartyPlayerState, allPlayers: PartyPlayerState[]) => boolean;
}

export interface ChaosEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  apply?: (game: any) => string;
}

export interface PartyAward {
  id: string;
  title: string;
  emoji: string;
  description: string;
  winnerId: string;
  winnerName: string;
  reason: string;
}

export interface PartyPlayerState {
  userId: string;
  displayName: string;
  purse: number;
  items: PartyItem[];
  itemPrices: Record<string, number>;
  secretObjective?: SecretObjective;
  objectiveCompleted?: boolean;
  totalBidsPlaced: number;
  outbidsCount: number;
  questionablePurchases: number;
}

export type PartyGameStatus =
  | "LOBBY"
  | "AUCTION"
  | "REVEAL"
  | "VOTING"
  | "RESULTS"
  | "COMPLETED"
  | "CANCELLED";

export interface PartyCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  items: PartyItem[];
  scenarios: PartyScenario[];
  secretObjectives?: string[];
  chaosEvents?: string[];
}

export interface PartyPlayerStats {
  userId: string;
  partyGames: number;
  partyWins: number;
  partyLosses: number;
  partyAuctions: number;
  partyItemsWon: number;
  partyMoneySpent: number;
  partyVotesReceived: number;
  partyCookAwards: number;
  partyFraudAwards: number;
  partySnakeAwards: number;
  unlockedAchievements: string[];
}

export interface ShareablePartyResult {
  gameId: string;
  guildId: string;
  channelId: string;
  completedAt: string;
  category: { id: string; name: string; emoji: string };
  scenario: { id: string; title: string; description: string };
  players: Array<{
    userId: string;
    displayName: string;
    items: Array<{ name: string; price: number; tags: string[] }>;
    remainingPurse: number;
    spentPurse: number;
    secretObjective?: { name: string; completed: boolean };
    votesReceived: number;
  }>;
  winner: { userId: string; displayName: string; votes: number };
  awards: PartyAward[];
  totalSpending: Record<string, number>;
}
