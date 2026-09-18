import type { PartyCategory, PartyItem, PartyScenario } from "../types.js";
import { footballCategory } from "./football.js";
import { cricketCategory } from "./cricket.js";
import { basketballCategory } from "./basketball.js";
import { moviesCategory } from "./movies.js";
import { tvCategory } from "./tv.js";
import { gamesCategory } from "./games.js";
import { superheroesCategory } from "./superheroes.js";
import { animeCategory } from "./anime.js";
import { musicCategory } from "./music.js";
import { randomCategory, buildRandomPool } from "./random.js";
export { randomCategory, buildRandomPool };

export const CATEGORY_REGISTRY: Record<string, PartyCategory> = {
  football: footballCategory,
  cricket: cricketCategory,
  basketball: basketballCategory,
  movies: moviesCategory,
  tv: tvCategory,
  games: gamesCategory,
  superheroes: superheroesCategory,
  anime: animeCategory,
  music: musicCategory,
  random: randomCategory,
};

export function getAllCategories(): PartyCategory[] {
  return Object.values(CATEGORY_REGISTRY);
}

export function getCategory(id: string): PartyCategory | undefined {
  const clean = id.toLowerCase().trim();
  return CATEGORY_REGISTRY[clean];
}

export function getRandomCategory(): PartyCategory {
  const keys = Object.keys(CATEGORY_REGISTRY).filter((k) => k !== "random");
  const randKey = keys[Math.floor(Math.random() * keys.length)];
  return CATEGORY_REGISTRY[randKey] || footballCategory;
}

export function getCategoryItems(categoryId: string, count = 25): PartyItem[] {
  const cat = getCategory(categoryId);
  if (!cat) return buildRandomPool(count);

  if (cat.id === "random") {
    return buildRandomPool(count);
  }

  const items = [...cat.items];
  // Shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  // Ensure items have starting price
  return items.slice(0, count).map((item) => ({
    ...item,
    startingPrice: item.startingPrice || 1,
  }));
}

export function getCategoryScenario(
  categoryId: string,
  scenarioId?: string
): PartyScenario {
  const cat = getCategory(categoryId) || randomCategory;
  if (scenarioId) {
    const found = cat.scenarios.find((s: PartyScenario) => s.id === scenarioId);
    if (found) return found;
  }
  // If random or not found, pick a random one
  const scenarios = cat.scenarios.length > 0 ? cat.scenarios : randomCategory.scenarios;
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}
