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
  private allEntities: Player[] = [];
  private playerByName: Map<string, Player> = new Map();
  private playersByRating: Map<number, Player[]> = new Map();
  private managersByRating: Map<number, Player[]> = new Map();

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    this.loadPlayers();
    this.loadManagers();
    this.buildIndexes();
  }

  private buildIndexes(): void {
    this.allEntities = [...this.players, ...this.managers];
    this.playerByName.clear();
    this.playersByRating.clear();
    this.managersByRating.clear();

    // 1. Build exact name lookup (O(1))
    // Index footballers first, then managers
    for (const p of this.players) {
      const key = p.name.trim().toLowerCase();
      if (!this.playerByName.has(key)) {
        this.playerByName.set(key, p);
      }

      // Group by rating bucket
      let bucket = this.playersByRating.get(p.rating);
      if (!bucket) {
        bucket = [];
        this.playersByRating.set(p.rating, bucket);
      }
      bucket.push(p);
    }

    for (const m of this.managers) {
      const key = m.name.trim().toLowerCase();
      this.playerByName.set(key, m);

      let bucket = this.managersByRating.get(m.rating);
      if (!bucket) {
        bucket = [];
        this.managersByRating.set(m.rating, bucket);
      }
      bucket.push(m);
    }
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
    return this.allEntities;
  }

  getPlayersByPosition(position: Position): Player[] {
    if (position === "MGR") return this.managers;
    return this.players.filter((p) => p.position === position);
  }

  findPlayerByName(name: string): Player | undefined {
    const clean = name.trim().toLowerCase();
    // 1. O(1) exact map lookup
    const exact = this.playerByName.get(clean);
    if (exact) return exact;

    // 2. Substring fallback across cached allEntities
    return this.allEntities.find((p) => p.name.toLowerCase().includes(clean));
  }

  getPlayerByName(name: string): Player | undefined {
    return this.findPlayerByName(name);
  }

  searchPlayers(query: string, limit = 25): Player[] {
    const clean = query.trim().toLowerCase();
    if (!clean) return this.allEntities.slice(0, limit);
    return this.allEntities
      .filter((p) => p.name.toLowerCase().includes(clean) || p.club.toLowerCase().includes(clean))
      .slice(0, limit);
  }

  getRandomPlayer(ratingRange?: { min?: number; max?: number }): Player {
    if (!ratingRange || (ratingRange.min === undefined && ratingRange.max === undefined)) {
      return this.players[Math.floor(Math.random() * this.players.length)];
    }

    const min = ratingRange.min ?? 0;
    const max = ratingRange.max ?? 100;

    // Use pre-indexed rating buckets
    const pool: Player[] = [];
    for (let r = min; r <= max; r++) {
      const bucket = this.playersByRating.get(r);
      if (bucket) {
        pool.push(...bucket);
      }
    }

    if (pool.length === 0) return this.players[Math.floor(Math.random() * this.players.length)];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  getRandomManager(ratingRange?: { min?: number; max?: number }): Player {
    if (!ratingRange || (ratingRange.min === undefined && ratingRange.max === undefined)) {
      return this.managers[Math.floor(Math.random() * this.managers.length)];
    }

    const min = ratingRange.min ?? 0;
    const max = ratingRange.max ?? 100;

    const pool: Player[] = [];
    for (let r = min; r <= max; r++) {
      const bucket = this.managersByRating.get(r);
      if (bucket) {
        pool.push(...bucket);
      }
    }

    if (pool.length === 0) return this.managers[Math.floor(Math.random() * this.managers.length)];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

export const playerService = new PlayerService();
