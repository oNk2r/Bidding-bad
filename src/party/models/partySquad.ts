import type { PartyItem } from "../types.js";

export class PartySquad {
  items: PartyItem[] = [];
  prices: Record<string, number> = {};
  maxSize: number;

  constructor(maxSize = 5) {
    this.maxSize = maxSize;
  }

  get isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  get remainingSlots(): number {
    return Math.max(0, this.maxSize - this.items.length);
  }

  addItem(item: PartyItem, price: number): boolean {
    if (this.isFull) return false;
    this.items.push(item);
    this.prices[item.id] = price;
    return true;
  }

  getTotalSpent(): number {
    return Object.values(this.prices).reduce((sum, p) => sum + p, 0);
  }

  getAllTags(): string[] {
    const tags: string[] = [];
    for (const item of this.items) {
      tags.push(...item.tags);
    }
    return tags;
  }

  getTagCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const tag of this.getAllTags()) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
    return counts;
  }

  getSynergyScore(): number {
    const counts = this.getTagCounts();
    let synergy = 0;
    for (const count of Object.values(counts)) {
      if (count > 1) {
        synergy += (count - 1) * 2;
      }
    }
    return synergy;
  }
}
