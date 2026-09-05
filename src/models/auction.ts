import {
  AUCTION_TIMER_SECONDS,
  BID_TIMER_SECONDS,
  MAX_PLAYERS,
  MIN_BID_RESERVE_PER_SLOT,
  MIN_PLAYERS,
  POT_SIZE,
  SQUAD_SIZE,
} from "../config/constants.js";
import { Player } from "./player.js";
import { Squad } from "./squad.js";

export function createBalancedPot(
  masterPool: Player[],
  numPlayers = 2,
  seed?: number
): Player[] {
  const byPos: Record<string, Player[]> = { GK: [], DEF: [], MID: [], FW: [] };

  for (const p of masterPool) {
    if (byPos[p.position]) {
      byPos[p.position].push(
        new Player(
          p.name,
          p.position,
          p.rating,
          p.startingPrice,
          0,
          p.club,
          p.nation
        )
      );
    }
  }

  const numP = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, numPlayers));
  const targetTotal = Math.max(14, numP * 5 + 2);

  // GK allocation
  const gkTarget = Math.min(byPos.GK.length, Math.max(3, numP + 1));
  const remainingSlots = targetTotal - gkTarget;
  const fieldPosTarget = Math.max(3, Math.floor((remainingSlots + 2) / 3));

  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const pot: Player[] = [];
  pot.push(...shuffle(byPos.GK).slice(0, gkTarget));

  for (const pos of ["DEF", "MID", "FW"]) {
    const selected = shuffle(byPos[pos]).slice(0, Math.min(fieldPosTarget, byPos[pos].length));
    pot.push(...selected);
  }

  return shuffle(pot);
}

export class Auction {
  creatorId: string;
  players: string[];
  playerNames: Record<string, string>;
  budget: number;
  squadSize: number;
  minPlayers: number;
  maxPlayers: number;
  started: boolean;
  playerPool: Player[];
  unpickedPot: Player[];
  currentPlayer: Player | null;
  currentBid: number;
  currentBidder: string | null;
  skipVotes: Set<string>;
  passedPlayers: Set<string>;
  budgets: Record<string, number>;
  squads: Record<string, Squad>;
  autofilledPlayers: Record<string, Player[]>;

  constructor(creatorId: string, creatorName?: string) {
    this.creatorId = creatorId;
    this.players = [creatorId];
    this.playerNames = {};
    if (creatorName) {
      this.playerNames[creatorId] = creatorName;
    }

    this.budget = 50;
    this.squadSize = SQUAD_SIZE;
    this.minPlayers = MIN_PLAYERS;
    this.maxPlayers = MAX_PLAYERS;
    this.started = false;

    this.playerPool = [];
    this.unpickedPot = [];
    this.currentPlayer = null;
    this.currentBid = 0;
    this.currentBidder = null;

    this.skipVotes = new Set();
    this.passedPlayers = new Set();
    this.budgets = {};
    this.squads = {};
    this.autofilledPlayers = {};
  }

  get canStart(): boolean {
    return this.players.length >= this.minPlayers && !this.started;
  }

  addPlayer(userId: string, playerName?: string): { success: boolean; message: string } {
    if (this.started) {
      return { success: false, message: "Auction has already started." };
    }
    if (this.players.includes(userId)) {
      return { success: false, message: "You are already in this auction lobby." };
    }
    if (this.players.length >= this.maxPlayers) {
      return { success: false, message: `Lobby is full (${this.maxPlayers}/${this.maxPlayers}).` };
    }
    this.players.push(userId);
    if (playerName) {
      this.playerNames[userId] = playerName;
    }
    return { success: true, message: "Joined lobby!" };
  }

  removePlayer(userId: string): { success: boolean; message: string } {
    if (this.started) {
      return { success: false, message: "Cannot leave after auction has started." };
    }
    const idx = this.players.indexOf(userId);
    if (idx === -1) {
      return { success: false, message: "You are not in this lobby." };
    }
    this.players.splice(idx, 1);
    delete this.playerNames[userId];
    return { success: true, message: "Left lobby." };
  }

  setPlayerName(userId: string, name: string): void {
    this.playerNames[userId] = name;
  }

  start(masterPool: Player[]): boolean {
    if (!this.canStart) return false;

    this.started = true;
    for (const pid of this.players) {
      this.budgets[pid] = this.budget;
      this.squads[pid] = new Squad();
      this.autofilledPlayers[pid] = [];
    }

    this.playerPool = createBalancedPot(masterPool, this.players.length);
    return this.nextPlayer();
  }

  nextPlayer(): boolean {
    if (this.playerPool.length === 0) {
      this.currentPlayer = null;
      return false;
    }

    this.currentPlayer = this.playerPool.shift() || null;
    this.currentBid = this.currentPlayer ? this.currentPlayer.startingPrice : 0;
    this.currentBidder = null;
    this.skipVotes.clear();
    this.passedPlayers.clear();
    return this.currentPlayer !== null;
  }

  calculateMaxBid(userId: string, player: Player): number {
    const budget = this.budgets[userId] ?? 0;
    const squad = this.squads[userId];
    if (!squad) return 0;

    const currentCount = squad.players.length;
    const emptySlots = this.squadSize - currentCount;

    if (emptySlots <= 0) return 0;

    const canAddRes = squad.canAddPlayer(player);
    if (!canAddRes.canAdd) return 0;

    const requiredReserve = (emptySlots - 1) * MIN_BID_RESERVE_PER_SLOT;
    return Math.max(0, budget - requiredReserve);
  }

  placeBid(
    userId: string,
    amount?: number
  ): { success: boolean; message: string; newBid: number; bidderId: string } {
    if (!this.started || !this.currentPlayer) {
      return { success: false, message: "No active player auction.", newBid: 0, bidderId: "" };
    }

    if (!this.players.includes(userId)) {
      return { success: false, message: "You are not registered in this auction.", newBid: 0, bidderId: "" };
    }

    const squad = this.squads[userId];
    if (!squad) {
      return { success: false, message: "Squad record not found.", newBid: 0, bidderId: "" };
    }

    const { canAdd, reason } = squad.canAddPlayer(this.currentPlayer);
    if (!canAdd) {
      return { success: false, message: reason, newBid: 0, bidderId: "" };
    }

    const userBudget = this.budgets[userId] ?? 0;
    const maxBid = this.calculateMaxBid(userId, this.currentPlayer);

    let bidTarget = amount;
    if (bidTarget === undefined || bidTarget === null) {
      bidTarget = this.currentBidder === null ? this.currentPlayer.startingPrice : this.currentBid + 1;
    }

    if (bidTarget < this.currentPlayer.startingPrice) {
      return {
        success: false,
        message: `Bid must be at least the starting price of $${this.currentPlayer.startingPrice}.`,
        newBid: 0,
        bidderId: "",
      };
    }

    if (this.currentBidder !== null && bidTarget <= this.currentBid) {
      return {
        success: false,
        message: `Bid must be higher than current bid of $${this.currentBid}.`,
        newBid: 0,
        bidderId: "",
      };
    }

    if (bidTarget > userBudget) {
      return {
        success: false,
        message: `You cannot afford a bid of $${bidTarget} (Budget: $${userBudget}).`,
        newBid: 0,
        bidderId: "",
      };
    }

    if (bidTarget > maxBid) {
      const emptySlots = this.squadSize - squad.players.length;
      return {
        success: false,
        message: `Illegal bid: You must reserve at least $1 per remaining empty slot (${emptySlots - 1} slots). Max legal bid is $${maxBid}.`,
        newBid: 0,
        bidderId: "",
      };
    }

    this.currentBid = bidTarget;
    this.currentBidder = userId;
    return {
      success: true,
      message: `Bid placed for $${bidTarget}!`,
      newBid: this.currentBid,
      bidderId: userId,
    };
  }

  sellCurrentPlayer(): [Player, string, number] | null {
    if (!this.currentPlayer || !this.currentBidder) return null;

    const winnerId = this.currentBidder;
    const winningBid = this.currentBid;
    const player = this.currentPlayer;

    player.purchasePrice = winningBid;
    this.budgets[winnerId] = (this.budgets[winnerId] ?? 0) - winningBid;
    this.squads[winnerId].addPlayer(player, winningBid);

    this.currentPlayer = null;
    this.currentBidder = null;
    return [player, winnerId, winningBid];
  }

  skipCurrentPlayer(): Player | null {
    if (!this.currentPlayer) return null;
    const skipped = this.currentPlayer;
    this.unpickedPot.push(skipped);
    this.currentPlayer = null;
    this.currentBidder = null;
    return skipped;
  }

  isFinished(): boolean {
    // Finished if all players have completed their 5-player squads
    const allFilled = this.players.every(
      (pid) => (this.squads[pid]?.players.length ?? 0) >= this.squadSize
    );
    return allFilled || (this.playerPool.length === 0 && this.currentPlayer === null);
  }

  autoFillSquads(masterPool: Player[]): void {
    // Fill remaining slots for any user who did not finish drafting
    for (const pid of this.players) {
      const squad = this.squads[pid];
      if (!squad) continue;

      while (squad.players.length < this.squadSize) {
        const missingPos = squad.getMissingPositions();
        const targetPos = missingPos.length > 0 ? missingPos[0] : "MID";

        const pool = masterPool.filter(
          (p) => p.position === targetPos && squad.canAddPlayer(p).canAdd
        );

        const fillPlayer =
          pool.length > 0
            ? pool[Math.floor(Math.random() * pool.length)]
            : new Player(`Free Agent ${targetPos}`, targetPos, 75, 1, 0, "Free Agent", "World");

        const pCopy = new Player(
          fillPlayer.name,
          fillPlayer.position,
          fillPlayer.rating,
          fillPlayer.startingPrice,
          0,
          fillPlayer.club,
          fillPlayer.nation
        );

        squad.addPlayer(pCopy, 0);
        this.autofilledPlayers[pid].push(pCopy);
      }
    }
  }
}
