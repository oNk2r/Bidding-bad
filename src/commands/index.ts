import { Collection } from "discord.js";
import type { Command } from "./types.js";

// Auction
import { auctionCommand } from "./auction/auction.js";
import { joinCommand } from "./auction/join.js";
import { startCommand } from "./auction/start.js";
import { bidCommand } from "./auction/bid.js";
import { passCommand } from "./auction/pass.js";
import { squadCommand } from "./auction/squad.js";
import { auctionCancelCommand } from "./auction/auctionCancel.js";

// Club
import { clubCommand } from "./club/club.js";
import { lineupCommand } from "./club/lineup.js";
import { tacticCommand } from "./club/tactic.js";
import { captainCommand } from "./club/captain.js";
import { dropCommand } from "./club/drop.js";
import { renameclubCommand } from "./club/renameclub.js";
import { kitCommand } from "./club/kit.js";
import { mottoCommand } from "./club/motto.js";

// Economy, Packs & Season
import { dailyCommand } from "./economy/daily.js";
import { packCommand } from "./economy/pack.js";
import { inventoryCommand } from "./economy/inventory.js";
import { tradeCommand } from "./economy/trade.js";
import { seasonCommand } from "./economy/season.js";

// Market
import { marketCommand } from "./market/market.js";
import { sellCommand } from "./market/sell.js";
import { quicksellCommand } from "./market/quicksell.js";
import { dailyshopCommand } from "./market/dailyShop.js";

// Match & Competition
import { matchCommand } from "./game/match.js";

// Rivals & Stadium
import { divisionCommand } from "./rivals/division.js";
import { leaderboardCommand } from "./rivals/leaderboard.js";
import { profileCommand } from "./rivals/profile.js";
import { stadiumCommand } from "./stadium/stadium.js";
import { tournamentCommand } from "./tournament/tournament.js";

// Utility & Canvas
import { helpCommand } from "./utility/help.js";

export function loadCommands(): Collection<string, Command> {
  const commands = new Collection<string, Command>();

  const all: Command[] = [
    // Live Auction
    auctionCommand,
    joinCommand,
    startCommand,
    bidCommand,
    passCommand,
    squadCommand,
    auctionCancelCommand,

    // Club Identity & Lineup
    clubCommand,
    lineupCommand,
    tacticCommand,
    captainCommand,
    dropCommand,
    renameclubCommand,
    kitCommand,
    mottoCommand,

    // Economy, Packs & Season Pass
    dailyCommand,
    packCommand,
    inventoryCommand,
    tradeCommand,
    seasonCommand,

    // Transfer Market (with 1-click buying)
    marketCommand,
    sellCommand,
    quicksellCommand,
    dailyshopCommand,

    // Matches & Competition
    matchCommand,
    divisionCommand,
    leaderboardCommand,
    profileCommand,
    stadiumCommand,
    tournamentCommand,

    // Utility
    helpCommand,
  ];

  for (const cmd of all) {
    commands.set(cmd.data.name, cmd);
  }

  return commands;
}
