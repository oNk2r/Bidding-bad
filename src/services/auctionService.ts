import { Auction } from "../models/auction.js";
import { playerService } from "./playerService.js";
import { economyService } from "./economyService.js";

export class AuctionService {
  private auctions: Map<string, Auction> = new Map();
  private timerTokens: Map<string, number> = new Map();

  getAuction(guildId: string): Auction | undefined {
    return this.auctions.get(guildId);
  }

  createAuction(guildId: string, creatorId: string, creatorName?: string): Auction {
    const auction = new Auction(creatorId, creatorName);
    this.auctions.set(guildId, auction);
    return auction;
  }

  removeAuction(guildId: string): void {
    this.auctions.delete(guildId);
    this.timerTokens.delete(guildId);
  }

  generateTimerToken(guildId: string): number {
    const token = Date.now() + Math.floor(Math.random() * 10000);
    this.timerTokens.set(guildId, token);
    return token;
  }

  isCurrentToken(guildId: string, token: number): boolean {
    return this.timerTokens.get(guildId) === token;
  }

  startAuction(guildId: string): boolean {
    const auction = this.getAuction(guildId);
    if (!auction) return false;

    const allPlayers = playerService.getAllPlayers();
    return auction.start(allPlayers);
  }

  async finishAuctionAndAwardSquads(guildId: string): Promise<void> {
    const auction = this.getAuction(guildId);
    if (!auction) return;

    // Auto-fill any missing slots
    const masterPool = playerService.getAllPlayers();
    auction.autoFillSquads(masterPool);

    // Save cards to winners' inventories
    for (const [userId, squad] of Object.entries(auction.squads)) {
      for (const p of squad.players) {
        await economyService.addCard(userId, p, false);
      }
      // Record match participation
      await economyService.recordMatchPlayed(userId);
    }
  }
}

export const auctionService = new AuctionService();
