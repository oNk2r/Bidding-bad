import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Player, type PlayerData } from "../models/player.js";
import type { Position } from "../config/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PlayerService {
  private players: Player[] = [];

  constructor() {
    this.loadPlayers();
  }

  private loadPlayers(): void {
    try {
      const candidates = [
        path.join(__dirname, "..", "data", "players.json"),
        path.join(process.cwd(), "src", "data", "players.json"),
        path.join(process.cwd(), "dist", "data", "players.json"),
      ];

      let jsonPath = candidates[0];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          jsonPath = p;
          break;
        }
      }

      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        const list: PlayerData[] = JSON.parse(raw);
        this.players = list.map(
          (p) =>
            new Player(
              p.name,
              p.position,
              p.rating,
              p.startingPrice,
              p.purchasePrice || 0,
              p.club,
              p.nation
            )
        );
      }
    } catch (err) {
      console.error("Failed to load players dataset:", err);
      this.players = [];
    }
  }

  getAllPlayers(): Player[] {
    return this.players;
  }

  getPlayersByPosition(position: Position): Player[] {
    return this.players.filter((p) => p.position === position);
  }

  findPlayerByName(name: string): Player | undefined {
    const clean = name.trim().toLowerCase();
    return this.players.find(
      (p) => p.name.toLowerCase() === clean || p.name.toLowerCase().includes(clean)
    );
  }

  getPlayerByName(name: string): Player | undefined {
    return this.findPlayerByName(name);
  }

  searchPlayers(query: string, limit = 25): Player[] {
    const clean = query.trim().toLowerCase();
    if (!clean) return this.players.slice(0, limit);
    return this.players
      .filter((p) => p.name.toLowerCase().includes(clean) || p.club.toLowerCase().includes(clean))
      .slice(0, limit);
  }

  getRandomPlayer(ratingRange?: { min?: number; max?: number }): Player {
    let pool = this.players;
    if (ratingRange) {
      const min = ratingRange.min ?? 0;
      const max = ratingRange.max ?? 100;
      pool = pool.filter((p) => p.rating >= min && p.rating <= max);
    }
    if (pool.length === 0) pool = this.players;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

export const playerService = new PlayerService();
