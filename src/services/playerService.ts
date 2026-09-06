import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Player, type PlayerData } from "../models/player.js";
import type { Position } from "../config/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PlayerService {
  private players: Player[] = [];
  private managers: Player[] = [];

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    this.loadPlayers();
    this.loadManagers();
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

  private loadManagers(): void {
    try {
      const candidates = [
        path.join(__dirname, "..", "data", "managers.json"),
        path.join(process.cwd(), "src", "data", "managers.json"),
        path.join(process.cwd(), "dist", "data", "managers.json"),
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
        this.managers = list.map(
          (m) =>
            new Player(
              m.name,
              "MGR" as Position,
              m.rating,
              m.startingPrice,
              m.purchasePrice || 0,
              m.club,
              m.nation
            )
        );
      }
    } catch (err) {
      console.error("Failed to load managers dataset:", err);
      this.managers = [];
    }
  }

  getAllPlayers(): Player[] {
    return this.players;
  }

  getAllManagers(): Player[] {
    return this.managers;
  }

  getAllEntities(): Player[] {
    return [...this.players, ...this.managers];
  }

  getPlayersByPosition(position: Position): Player[] {
    if (position === "MGR") return this.managers;
    return this.players.filter((p) => p.position === position);
  }

  findPlayerByName(name: string): Player | undefined {
    const clean = name.trim().toLowerCase();
    return this.getAllEntities().find(
      (p) => p.name.toLowerCase() === clean || p.name.toLowerCase().includes(clean)
    );
  }

  getPlayerByName(name: string): Player | undefined {
    return this.findPlayerByName(name);
  }

  searchPlayers(query: string, limit = 25): Player[] {
    const clean = query.trim().toLowerCase();
    const pool = this.getAllEntities();
    if (!clean) return pool.slice(0, limit);
    return pool
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

  getRandomManager(ratingRange?: { min?: number; max?: number }): Player {
    let pool = this.managers;
    if (ratingRange) {
      const min = ratingRange.min ?? 0;
      const max = ratingRange.max ?? 100;
      pool = pool.filter((m) => m.rating >= min && m.rating <= max);
    }
    if (pool.length === 0) pool = this.managers;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

export const playerService = new PlayerService();
