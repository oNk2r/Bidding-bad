import { PartyGame } from "../models/partyGame.js";

export class PartyService {
  private games: Map<string, PartyGame> = new Map(); // key: `${guildId}:${channelId}`
  private timerTokens: Map<string, number> = new Map();

  getGameKey(guildId: string, channelId: string): string {
    return `${guildId}:${channelId}`;
  }

  getGame(guildId: string, channelId: string): PartyGame | undefined {
    return this.games.get(this.getGameKey(guildId, channelId));
  }

  getGameByKey(gameKey: string): PartyGame | undefined {
    return this.games.get(gameKey);
  }

  createGame(
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
  ): PartyGame {
    const key = this.getGameKey(guildId, channelId);
    const game = new PartyGame(guildId, channelId, hostId, hostName, options);
    this.games.set(key, game);
    return game;
  }

  removeGame(guildId: string, channelId: string): void {
    const key = this.getGameKey(guildId, channelId);
    this.games.delete(key);
    this.timerTokens.delete(key);
  }

  removeGameByKey(gameKey: string): void {
    this.games.delete(gameKey);
    this.timerTokens.delete(gameKey);
  }

  generateTimerToken(gameKey: string): number {
    const token = Date.now() + Math.floor(Math.random() * 100000);
    this.timerTokens.set(gameKey, token);
    return token;
  }

  isCurrentToken(gameKey: string, token: number): boolean {
    return this.timerTokens.get(gameKey) === token;
  }

  getAllActiveGames(): PartyGame[] {
    return Array.from(this.games.values());
  }
}

export const partyService = new PartyService();
