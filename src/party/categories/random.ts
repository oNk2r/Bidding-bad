import type { PartyCategory, PartyItem } from "../types.js";
import { footballCategory } from "./football.js";
import { cricketCategory } from "./cricket.js";
import { basketballCategory } from "./basketball.js";
import { moviesCategory } from "./movies.js";
import { tvCategory } from "./tv.js";
import { gamesCategory } from "./games.js";
import { superheroesCategory } from "./superheroes.js";
import { animeCategory } from "./anime.js";
import { musicCategory } from "./music.js";

export function buildRandomPool(count = 25): PartyItem[] {
  const allOtherItems: PartyItem[] = [
    ...footballCategory.items,
    ...cricketCategory.items,
    ...basketballCategory.items,
    ...moviesCategory.items,
    ...tvCategory.items,
    ...gamesCategory.items,
    ...superheroesCategory.items,
    ...animeCategory.items,
    ...musicCategory.items,
  ];

  // Shuffle and pick
  const shuffled = [...allOtherItems];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export const randomCategory: PartyCategory = {
  id: "random",
  name: "Random Multiverse",
  emoji: "🎲",
  description: "A chaotic crossover where athletes, superheroes, anime protagonists, and chefs collide.",
  scenarios: [
    {
      id: "survive_an_apocalypse",
      title: "Survive an Apocalypse",
      description: "Pick 5 survivors across all multiverses to outlast radiation, mutants, and society collapse.",
      emoji: "☢️",
    },
    {
      id: "rob_most_secure_bank",
      title: "Rob the World's Most Secure Bank",
      description: "Gather 5 crossover specialists to crack the vault and outsmart international authorities.",
      emoji: "🏦",
    },
    {
      id: "create_most_chaotic_team",
      title: "Create the Most Chaotic Team",
      description: "Who can assemble 5 unhinged wildcards that will cause maximum havoc wherever they go?",
      emoji: "💥",
    },
    {
      id: "survive_haunted_house",
      title: "Survive a Night in a Haunted Victorian Mansion",
      description: "Ghosts, creaking floors, possession, and who runs away screaming first.",
      emoji: "👻",
    },
    {
      id: "win_game_7",
      title: "Win Game 7 with the Entire World Watching",
      description: "The ultimate clutch performers when all the chips are on the line.",
      emoji: "🏆",
    },
    {
      id: "build_the_ultimate_team",
      title: "Build the Ultimate Team",
      description: "Pure synergy, unstoppable dominance, and unmatched flair across all dimensions.",
      emoji: "👑",
    },
  ],
  items: [], // Dynamically populated from all categories by buildRandomPool
};
