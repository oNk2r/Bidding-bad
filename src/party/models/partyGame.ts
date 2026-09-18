import type {
  PartyItem,
  PartyCategory,
  PartyScenario,
  PartyGameStatus,
  PartyPlayerState,
  PartyAward,
  ShareablePartyResult,
} from "../types.js";
import { PartySquad } from "./partySquad.js";
import {
  getCategory,
  getCategoryItems,
  getCategoryScenario,
  getAllCategories,
  randomCategory,
} from "../categories/index.js";
import {
  assignSecretObjectives,
  evaluateSecretObjectives,
} from "../objectives/objectives.js";
import {
  createInitialChaosState,
  rollChaosEvent,
  type ChaosState,
} from "../chaos/chaosEvents.js";
import { PartyRoastEngine } from "../commentary/roastEngine.js";

export class PartyGame {
  gameId: string;
  guildId: string;
  channelId: string;
  hostId: string;
  hostName: string;

  minPlayers: number;
  maxPlayers: number;
  startingPurse: number;
  squadSize: number;
  minReservePerSlot: number;

  category: PartyCategory;
  scenario: PartyScenario;
  status: PartyGameStatus;

  players: string[] = [];
  playerStates: Record<string, PartyPlayerState> = {};
  squads: Record<string, PartySquad> = {};

  itemPool: PartyItem[] = [];
  unpickedItems: PartyItem[] = [];
  currentItem: PartyItem | null = null;
  currentBid = 0;
  currentBidder: string | null = null;
  currentBidderName: string | null = null;

  passedUsers: Set<string> = new Set();
  votes: Map<string, string> = new Map(); // voterId -> candidateId
  allowSelfVoting = true;

  chaosState: ChaosState = createInitialChaosState();
  currentChaosAnnouncement: string | null = null;
  awards: PartyAward[] = [];

  constructor(
    guildId: string,
    channelId: string,
    hostId: string,
    hostName: string,
    options?: {
      minPlayers?: number;
      maxPlayers?: number;
      startingPurse?: number;
      squadSize?: number;
      category?: string;
      scenarioId?: string;
    }
  ) {
    this.gameId = `party_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.guildId = guildId;
    this.channelId = channelId;
    this.hostId = hostId;
    this.hostName = hostName;

    this.minPlayers = options?.minPlayers ?? 3;
    this.maxPlayers = options?.maxPlayers ?? 6;
    this.startingPurse = options?.startingPurse ?? 50;
    this.squadSize = options?.squadSize ?? 5;
    this.minReservePerSlot = 1;

    const cat = options?.category ? getCategory(options.category) : randomCategory;
    this.category = cat || randomCategory;
    this.scenario = getCategoryScenario(this.category.id, options?.scenarioId);
    this.status = "LOBBY";

    this.addPlayer(hostId, hostName);
  }

  get canStart(): boolean {
    return (
      this.status === "LOBBY" &&
      this.players.length >= this.minPlayers &&
      this.players.length <= this.maxPlayers
    );
  }

  addPlayer(
    userId: string,
    displayName: string
  ): { success: boolean; message: string } {
    if (this.status !== "LOBBY") {
      return { success: false, message: "Game has already started or ended." };
    }
    if (this.players.includes(userId)) {
      return { success: false, message: "You have already joined this party lobby." };
    }
    if (this.players.length >= this.maxPlayers) {
      return {
        success: false,
        message: `Lobby is full (${this.maxPlayers}/${this.maxPlayers} players).`,
      };
    }

    this.players.push(userId);
    this.playerStates[userId] = {
      userId,
      displayName,
      purse: this.startingPurse,
      items: [],
      itemPrices: {},
      totalBidsPlaced: 0,
      outbidsCount: 0,
      questionablePurchases: 0,
    };
    this.squads[userId] = new PartySquad(this.squadSize);

    return { success: true, message: `Welcome to the party, ${displayName}!` };
  }

  removePlayer(userId: string): { success: boolean; message: string } {
    if (this.status !== "LOBBY") {
      return { success: false, message: "Cannot leave after auction has begun." };
    }
    const idx = this.players.indexOf(userId);
    if (idx === -1) {
      return { success: false, message: "You are not in this lobby." };
    }
    this.players.splice(idx, 1);
    delete this.playerStates[userId];
    delete this.squads[userId];
    return { success: true, message: "Left the party lobby." };
  }

  setCategory(categoryId: string): boolean {
    if (this.status !== "LOBBY") return false;
    const cat = getCategory(categoryId);
    if (!cat) return false;
    this.category = cat;
    this.scenario = getCategoryScenario(cat.id);
    return true;
  }

  setScenario(scenarioId: string): boolean {
    if (this.status !== "LOBBY") return false;
    this.scenario = getCategoryScenario(this.category.id, scenarioId);
    return true;
  }

  start(): boolean {
    if (!this.canStart) return false;

    this.status = "AUCTION";

    // Re-initialize player states for clean start
    const playerList = this.players.map((id) => this.playerStates[id]);
    assignSecretObjectives(playerList);

    // Build curated item pool for the player count (e.g. 5 items * players + 5 buffer)
    const potTarget = this.players.length * this.squadSize + 6;
    this.itemPool = getCategoryItems(this.category.id, potTarget);

    return this.nextItem();
  }

  nextItem(): boolean {
    if (this.isAuctionFinished()) {
      this.currentItem = null;
      return false;
    }

    if (this.itemPool.length === 0) {
      this.currentItem = null;
      return false;
    }

    this.currentItem = this.itemPool.shift() || null;
    if (!this.currentItem) return false;

    this.currentBid = this.currentItem.startingPrice || 1;
    this.currentBidder = null;
    this.currentBidderName = null;
    this.passedUsers.clear();
    this.currentChaosAnnouncement = null;

    // Reset single-round chaos modifiers
    if (this.chaosState.lockdownUserId) {
      this.chaosState.lockdownUserId = null;
    }
    if (this.chaosState.doubleBidActive) {
      this.chaosState.doubleBidActive = false;
    }

    // Roll for Chaos Event (20% chance)
    const chaos = rollChaosEvent();
    if (chaos) {
      this.applyChaosEvent(chaos);
    }

    return true;
  }

  private applyChaosEvent(event: any): void {
    this.chaosState.activeEvent = event;
    if (event.id === "inflation") {
      this.chaosState.inflationRoundsRemaining = 2;
      this.currentChaosAnnouncement = `💸 **CHAOS EVENT: INFLATION!** Next 2 winning bids incur +2 BB luxury tax!`;
    } else if (event.id === "stimulus") {
      for (const pid of this.players) {
        this.playerStates[pid].purse += 3;
      }
      this.currentChaosAnnouncement = `🤑 **CHAOS EVENT: STIMULUS!** Central Bank injects +3 BB to all players!`;
    } else if (event.id === "lockdown") {
      // Find highest spender
      let highestSpenderId = this.players[0];
      let maxSpent = -1;
      for (const pid of this.players) {
        const spent = this.startingPurse - this.playerStates[pid].purse;
        if (spent > maxSpent) {
          maxSpent = spent;
          highestSpenderId = pid;
        }
      }
      this.chaosState.lockdownUserId = highestSpenderId;
      const spenderName = this.playerStates[highestSpenderId]?.displayName || "Highest spender";
      this.currentChaosAnnouncement = `🔒 **CHAOS EVENT: LOCKDOWN!** Anti-trust regulators banned **${spenderName}** from bidding on this item!`;
    } else if (event.id === "double_bid") {
      this.chaosState.doubleBidActive = true;
      this.currentChaosAnnouncement = `🎰 **CHAOS EVENT: DOUBLE JEOPARDY!** Winning bid on this item costs 2×!`;
    } else if (event.id === "mystery_airdrop") {
      const randPid = this.players[Math.floor(Math.random() * this.players.length)];
      this.playerStates[randPid].purse += 2;
      const rName = this.playerStates[randPid]?.displayName || "A player";
      this.currentChaosAnnouncement = `📦 **CHAOS EVENT: CARE PACKAGE!** **${rName}** was gifted +2 BB from an anonymous sponsor!`;
    }
  }

  calculateMaxLegalBid(userId: string): number {
    const pState = this.playerStates[userId];
    const squad = this.squads[userId];
    if (!pState || !squad || squad.isFull) return 0;

    const emptySlots = squad.remainingSlots;
    const requiredReserve = (emptySlots - 1) * this.minReservePerSlot;
    return Math.max(0, pState.purse - requiredReserve);
  }

  placeBid(
    userId: string,
    displayName: string,
    amount?: number
  ): {
    success: boolean;
    message: string;
    newBid: number;
    bidderId: string;
    isOutbid: boolean;
    prevBidderId: string | null;
    roast: string | null;
  } {
    if (this.status !== "AUCTION" || !this.currentItem) {
      return {
        success: false,
        message: "No active item on the auction block.",
        newBid: 0,
        bidderId: "",
        isOutbid: false,
        prevBidderId: null,
        roast: null,
      };
    }

    if (!this.players.includes(userId)) {
      return {
        success: false,
        message: "You are not registered in this party auction.",
        newBid: 0,
        bidderId: "",
        isOutbid: false,
        prevBidderId: null,
        roast: null,
      };
    }

    const squad = this.squads[userId];
    const pState = this.playerStates[userId];
    if (!squad || !pState) {
      return {
        success: false,
        message: "Player state not found.",
        newBid: 0,
        bidderId: "",
        isOutbid: false,
        prevBidderId: null,
        roast: null,
      };
    }

    if (squad.isFull) {
      return {
        success: false,
        message: `Your squad is already full (${this.squadSize}/${this.squadSize} items)!`,
        newBid: 0,
        bidderId: "",
        isOutbid: false,
        prevBidderId: null,
        roast: null,
      };
    }

    // Check lockdown chaos
    if (this.chaosState.lockdownUserId === userId) {
      return {
        success: false,
        message: "🚫 LOCKDOWN ACTIVE! You are banned from bidding on this item!",
        newBid: 0,
        bidderId: "",
        isOutbid: false,
        prevBidderId: null,
        roast: null,
      };
    }

    // Target bid calculation
    let bidTarget = amount;
    if (bidTarget === undefined || bidTarget === null) {
      bidTarget =
        this.currentBidder === null
          ? this.currentItem.startingPrice || 1
          : this.currentBid + 1;
    }

    const minStarting = this.currentItem.startingPrice || 1;
    if (bidTarget < minStarting) {
      return {
        success: false,
        message: `Bid must be at least the starting price of ${minStarting} BB.`,
        newBid: 0,
        bidderId: "",
        isOutbid: false,
        prevBidderId: null,
        roast: null,
      };
    }

    if (this.currentBidder !== null && bidTarget <= this.currentBid) {
      return {
        success: false,
        message: `Bid must be higher than current bid of ${this.currentBid} BB.`,
        newBid: 0,
        bidderId: "",
        isOutbid: false,
        prevBidderId: null,
        roast: null,
      };
    }

    if (bidTarget > pState.purse) {
      return {
        success: false,
        message: `You cannot afford ${bidTarget} BB (Your purse: ${pState.purse} BB).`,
        newBid: 0,
        bidderId: "",
        isOutbid: false,
        prevBidderId: null,
        roast: null,
      };
    }

    const maxLegal = this.calculateMaxLegalBid(userId);
    if (bidTarget > maxLegal) {
      const remainingEmpty = squad.remainingSlots;
      return {
        success: false,
        message: `Illegal bid! You must reserve at least 1 BB per remaining empty slot (${remainingEmpty - 1} slots). Max legal bid is ${maxLegal} BB.`,
        newBid: 0,
        bidderId: "",
        isOutbid: false,
        prevBidderId: null,
        roast: null,
      };
    }

    // Capture previous bidder for outbid roast and stats
    const prevBidderId = this.currentBidder;
    const prevBidderName = this.currentBidderName;
    const prevBidAmount = this.currentBid;

    this.currentBid = bidTarget;
    this.currentBidder = userId;
    this.currentBidderName = displayName;
    pState.totalBidsPlaced++;

    // Un-pass on new bid
    this.passedUsers.clear();

    let isOutbid = false;
    let roast: string | null = null;

    if (prevBidderId && prevBidderId !== userId) {
      isOutbid = true;
      pState.outbidsCount++;
      if (prevBidderName) {
        roast = PartyRoastEngine.getOutbidCommentary(
          prevBidderName,
          prevBidAmount,
          displayName,
          bidTarget
        );
      }
    }

    return {
      success: true,
      message: `Bid placed for ${bidTarget} BB!`,
      newBid: this.currentBid,
      bidderId: userId,
      isOutbid,
      prevBidderId,
      roast,
    };
  }

  pass(userId: string): { allPassed: boolean; passCount: number; needed: number } {
    if (this.status !== "AUCTION" || !this.currentItem) {
      return { allPassed: false, passCount: 0, needed: this.players.length };
    }

    this.passedUsers.add(userId);

    // Eligible players are those who haven't completed their squad
    const eligiblePlayers = this.players.filter((pid) => !this.squads[pid].isFull);
    const needed = eligiblePlayers.length;
    let passCount = 0;
    for (const pid of eligiblePlayers) {
      if (this.passedUsers.has(pid)) passCount++;
    }

    const allPassed = passCount >= needed;
    return { allPassed, passCount, needed };
  }

  sellCurrentItem(): {
    item: PartyItem;
    winnerId: string;
    winnerName: string;
    finalPrice: number;
    remainingPurse: number;
    squadFilled: boolean;
    roast: string;
    bankruptcyAlert: string | null;
  } | null {
    if (!this.currentItem || !this.currentBidder) return null;

    const winnerId = this.currentBidder;
    const winnerName = this.currentBidderName || "Winner";
    const item = this.currentItem;
    let finalPrice = this.currentBid;

    // Apply chaos event cost multiplier / addition
    if (this.chaosState.doubleBidActive) {
      finalPrice *= 2;
    }
    if (this.chaosState.inflationRoundsRemaining > 0) {
      finalPrice += 2;
      this.chaosState.inflationRoundsRemaining--;
    }

    const pState = this.playerStates[winnerId];
    const squad = this.squads[winnerId];

    // Deduct purse and add item
    pState.purse = Math.max(0, pState.purse - finalPrice);
    pState.items.push(item);
    pState.itemPrices[item.id] = finalPrice;
    squad.addItem(item, finalPrice);

    const squadFilled = squad.isFull;

    const roast = PartyRoastEngine.getSaleCommentary(
      winnerName,
      item.name,
      finalPrice,
      pState.purse,
      squad.items.length,
      this.squadSize
    );

    const bankruptcyAlert = PartyRoastEngine.getBankruptcyWatch(
      winnerName,
      pState.purse,
      squad.items.length,
      this.squadSize
    );

    this.currentItem = null;
    this.currentBidder = null;
    this.currentBidderName = null;

    return {
      item,
      winnerId,
      winnerName,
      finalPrice,
      remainingPurse: pState.purse,
      squadFilled,
      roast,
      bankruptcyAlert,
    };
  }

  skipCurrentItem(): PartyItem | null {
    if (!this.currentItem) return null;
    const skipped = this.currentItem;
    this.unpickedItems.push(skipped);
    this.currentItem = null;
    this.currentBidder = null;
    this.currentBidderName = null;
    return skipped;
  }

  isAuctionFinished(): boolean {
    const allFilled = this.players.every(
      (pid) => (this.squads[pid]?.items.length ?? 0) >= this.squadSize
    );
    return allFilled || (this.itemPool.length === 0 && this.currentItem === null);
  }

  autoFillMissingItems(): void {
    // Fill remaining slots if items pool ran dry
    for (const pid of this.players) {
      const squad = this.squads[pid];
      const pState = this.playerStates[pid];
      if (!squad || !pState) continue;

      let counter = 1;
      while (squad.items.length < this.squadSize) {
        const backupItem: PartyItem = {
          id: `free_agent_${pid}_${counter}`,
          name: `Unsigned Wildcard #${counter}`,
          category: this.category.id,
          tags: ["wildcard", "budget", "free_agent"],
          startingPrice: 1,
        };
        squad.addItem(backupItem, 0);
        pState.items.push(backupItem);
        pState.itemPrices[backupItem.id] = 0;
        counter++;
      }
    }
  }

  revealSecretObjectives(): void {
    this.status = "REVEAL";
    evaluateSecretObjectives(Object.values(this.playerStates));
  }

  startVoting(): void {
    this.status = "VOTING";
    this.votes.clear();
  }

  castVote(
    voterId: string,
    candidateId: string
  ): { success: boolean; message: string } {
    if (this.status !== "VOTING") {
      return { success: false, message: "Community voting is not currently open." };
    }
    if (!this.players.includes(candidateId)) {
      return { success: false, message: "Selected user is not a contestant." };
    }
    if (this.votes.has(voterId)) {
      return { success: false, message: "You have already voted! Only 1 vote per user." };
    }
    if (!this.allowSelfVoting && voterId === candidateId) {
      return { success: false, message: "Self-voting is disabled for this auction." };
    }

    this.votes.set(voterId, candidateId);
    const candidateName = this.playerStates[candidateId]?.displayName || "Candidate";
    return { success: true, message: `Voted for **${candidateName}**!` };
  }

  calculateAwards(): PartyAward[] {
    this.status = "RESULTS";

    // 1. Vote tally
    const voteCounts: Record<string, number> = {};
    for (const pid of this.players) {
      voteCounts[pid] = 0;
    }
    for (const candId of this.votes.values()) {
      voteCounts[candId] = (voteCounts[candId] || 0) + 1;
    }

    // Award 1: The Cook (Most votes)
    let bestCookId = this.players[0];
    let maxVotes = -1;
    for (const [pid, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        bestCookId = pid;
      }
    }
    const cookName = this.playerStates[bestCookId]?.displayName || "The Chef";
    this.awards.push({
      id: "the_cook",
      title: "The Cook",
      emoji: "🏆",
      description: "Best overall squad as voted by the Discord community.",
      winnerId: bestCookId,
      winnerName: cookName,
      reason: `${maxVotes} votes for masterful scenario execution!`,
    });

    // Award 2: Moneyball (Highest remaining BB while having full squad)
    let maxRemainingBB = -1;
    let moneyballId = this.players[0];
    for (const pid of this.players) {
      const p = this.playerStates[pid];
      if (p.purse > maxRemainingBB) {
        maxRemainingBB = p.purse;
        moneyballId = pid;
      }
    }
    this.awards.push({
      id: "moneyball",
      title: "Moneyball",
      emoji: "💰",
      description: "Best value manager with the most unspent BB.",
      winnerId: moneyballId,
      winnerName: this.playerStates[moneyballId]?.displayName || "Moneyballer",
      reason: `Saved ${maxRemainingBB} BB without compromising their team!`,
    });

    // Award 3: 5D Chess (Completed secret objective or spent the least while winning)
    let chessId = this.players[0];
    const completedObjPlayers = this.players.filter(
      (pid) => this.playerStates[pid].objectiveCompleted
    );
    if (completedObjPlayers.length > 0) {
      chessId = completedObjPlayers[0];
    }
    this.awards.push({
      id: "5d_chess",
      title: "5D Chess",
      emoji: "🧠",
      description: "Mastermind who completed their secret objective.",
      winnerId: chessId,
      winnerName: this.playerStates[chessId]?.displayName || "Grandmaster",
      reason: `Secretly fulfilled their objective: ${this.playerStates[chessId]?.secretObjective?.name || "Tactician"}!`,
    });

    // Award 4: Aura Farmer (Most synergies and distinct tags)
    let auraId = this.players[0];
    let maxSynergy = -1;
    for (const pid of this.players) {
      const score = this.squads[pid]?.getSynergyScore() ?? 0;
      if (score > maxSynergy) {
        maxSynergy = score;
        auraId = pid;
      }
    }
    this.awards.push({
      id: "aura_farmer",
      title: "Aura Farmer",
      emoji: "🔥",
      description: "Assembled the most aesthetic squad with maximum tag synergies.",
      winnerId: auraId,
      winnerName: this.playerStates[auraId]?.displayName || "Aura Farmer",
      reason: `Cultivated unmatched aesthetic synergy and presence!`,
    });

    // Award 5: Snake of the Game (Most outbids)
    let snakeId = this.players[0];
    let maxOutbids = -1;
    for (const pid of this.players) {
      if (this.playerStates[pid].outbidsCount > maxOutbids) {
        maxOutbids = this.playerStates[pid].outbidsCount;
        snakeId = pid;
      }
    }
    this.awards.push({
      id: "snake",
      title: "Snake of the Game",
      emoji: "🐍",
      description: "Most ruthless sniper who outbid rivals the most.",
      winnerId: snakeId,
      winnerName: this.playerStates[snakeId]?.displayName || "The Snake",
      reason: `Sniped opponents ${Math.max(1, maxOutbids)} times in cold blood!`,
    });

    // Award 6: NPC Purchase (Highest single item spend)
    let npcId = this.players[0];
    let highestSinglePrice = -1;
    let npcItemName = "Mystery Item";
    for (const pid of this.players) {
      for (const [itemId, price] of Object.entries(this.playerStates[pid].itemPrices)) {
        if (price > highestSinglePrice) {
          highestSinglePrice = price;
          npcId = pid;
          const itm = this.playerStates[pid].items.find((i) => i.id === itemId);
          if (itm) npcItemName = itm.name;
        }
      }
    }
    this.awards.push({
      id: "npc_purchase",
      title: "NPC Purchase",
      emoji: "🗿",
      description: "Most questionable or eye-watering business decision.",
      winnerId: npcId,
      winnerName: this.playerStates[npcId]?.displayName || "Broke Manager",
      reason: `Dropped ${highestSinglePrice} BB on ${npcItemName}!`,
    });

    // Award 7: The Fraud (Lowest community reception)
    let fraudId = this.players[0];
    let minVotes = 9999;
    for (const [pid, count] of Object.entries(voteCounts)) {
      if (count < minVotes) {
        minVotes = count;
        fraudId = pid;
      }
    }
    this.awards.push({
      id: "the_fraud",
      title: "The Fraud",
      emoji: "💀",
      description: "Lowest overall voter reception.",
      winnerId: fraudId,
      winnerName: this.playerStates[fraudId]?.displayName || "Fraudster",
      reason: `Received only ${minVotes} votes. The jury was unimpressed!`,
    });

    return this.awards;
  }

  generateShareableResult(): ShareablePartyResult {
    const awards = this.awards.length > 0 ? this.awards : this.calculateAwards();
    const cookAward = awards.find((a) => a.id === "the_cook");
    const winnerId = cookAward ? cookAward.winnerId : this.players[0];
    const winnerName = this.playerStates[winnerId]?.displayName || "Winner";

    // Spending breakdown
    const totalSpending: Record<string, number> = {};
    for (const pid of this.players) {
      const name = this.playerStates[pid]?.displayName || pid;
      const spent = this.startingPurse - (this.playerStates[pid]?.purse ?? 0);
      totalSpending[name] = spent;
    }

    const voteCounts: Record<string, number> = {};
    for (const candId of this.votes.values()) {
      voteCounts[candId] = (voteCounts[candId] || 0) + 1;
    }

    return {
      gameId: this.gameId,
      guildId: this.guildId,
      channelId: this.channelId,
      completedAt: new Date().toISOString(),
      category: {
        id: this.category.id,
        name: this.category.name,
        emoji: this.category.emoji,
      },
      scenario: {
        id: this.scenario.id,
        title: this.scenario.title,
        description: this.scenario.description,
      },
      players: this.players.map((pid) => {
        const p = this.playerStates[pid];
        return {
          userId: pid,
          displayName: p.displayName,
          items: p.items.map((i) => ({
            name: i.name,
            price: p.itemPrices[i.id] || 0,
            tags: i.tags,
          })),
          remainingPurse: p.purse,
          spentPurse: this.startingPurse - p.purse,
          secretObjective: p.secretObjective
            ? {
                name: p.secretObjective.name,
                completed: !!p.objectiveCompleted,
              }
            : undefined,
          votesReceived: voteCounts[pid] || 0,
        };
      }),
      winner: {
        userId: winnerId,
        displayName: winnerName,
        votes: voteCounts[winnerId] || 0,
      },
      awards,
      totalSpending,
    };
  }

  resetForRematch(): void {
    this.status = "LOBBY";
    this.itemPool = [];
    this.unpickedItems = [];
    this.currentItem = null;
    this.currentBid = 0;
    this.currentBidder = null;
    this.currentBidderName = null;
    this.passedUsers.clear();
    this.votes.clear();
    this.awards = [];
    this.chaosState = createInitialChaosState();

    // Re-initialize players with fresh purse
    for (const pid of this.players) {
      const name = this.playerStates[pid]?.displayName || `Player ${pid}`;
      this.playerStates[pid] = {
        userId: pid,
        displayName: name,
        purse: this.startingPurse,
        items: [],
        itemPrices: {},
        totalBidsPlaced: 0,
        outbidsCount: 0,
        questionablePurchases: 0,
      };
      this.squads[pid] = new PartySquad(this.squadSize);
    }
  }
}
