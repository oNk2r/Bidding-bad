# Bidding Bad ⚽

A premier competitive football management and live auction bot for Discord. Assemble your dream 5-player squad through real-time bidding wars, build chemistry synergies, upgrade your club stadium, trade cards on the open market, and duel other managers in 90-minute simulated matches.

---

## 🌟 Key Features

- **Squad Building Challenges (SBCs)**: Solve tactical squad puzzles (`/sbc`) by exchanging unwanted cards for coin bounties, booster packs, and exclusive 95 OVR Icon Legends.
- **Division Rivals & Ranked Seasons**: Climb the competitive ladder across 5 tiers (`/division`) from Grassroots (Bronze) to Elite Masters, earn win streak bonuses, and claim lucrative weekly season rewards.
- **Live Fast-Paced Auctions**: Real-time bidding timers with interactive button controls (`+$1`, `+$5`, `Pass`, `My Squad`).
- **Tactical Squad Building**: Draft a balanced 5-player squad (1 GK, 1-2 DEF, 1-2 MID, 1-2 FW) with reserve budget rules.
- **Dynamic Chemistry & Synergies**: Gain score bonuses by pairing players from the same real-world club (+3.0 pts per link tier) or nation (+2.0 pts per link tier).
- **Match Simulation Engine**: Challenge rivals or the AI in simulated 90-minute matches driven by squad ratings, chemistry modifiers, and stadium morale buffs.
- **Club Infrastructure & Stadiums**: Expand your home venue across 5 tiers (from Community Ground to Galactic Megastructure) to boost ticket revenue and matchday advantage.
- **Card Economy & Marketplace**: Open daily packs, claim scout airdrops, trade directly with other managers, or list cards on the server market.
- **Manager Profiles & Records**: Track career win rate, total spend, most signed players, tactical archetypes, and global leaderboard rankings.

---

## 🛠️ Production Tech Stack

1. **Runtime & Language**:
   - Node.js 20+ / ES2022 / NodeNext ESM
   - TypeScript 5.7+
   - `tsx` for high-performance development and scripting

2. **Discord API**:
   - `discord.js` v14.18+ (Discord API v10)
   - Slash Commands with rich autocomplete
   - Interactive Buttons, Select Menus, and ActionRows

3. **Database & Persistence**:
   - `Prisma ORM` 6+
   - SQLite for local dev (`dev.db`) / PostgreSQL compatibility for production
   - Atomic `prisma.$transaction` wrappers across all economy, auction, and trading operations

4. **Validation & Testing**:
   - `Zod` environment validation at application startup
   - `Vitest` automated test suite

---

## 📁 Project Structure

```
src/
├── commands/             # Modular Discord slash command definitions
│   ├── auction/          # /auction, /join, /start, /bid, /pass, /squad, /auction_cancel
│   ├── club/             # /club, /lineup, /tactic, /captain, /drop, /renameclub, /kit, /motto
│   ├── economy/          # /daily, /pack, /balance, /inventory, /trade
│   ├── game/             # /game, /match, /penalty, /spin
│   ├── market/           # /market, /buy, /sell, /quicksell, /cancel_listing, /dailyshop
│   ├── rivals/           # /division, /leaderboard, /profile
│   ├── sbc/              # /sbc
│   ├── stadium/          # /stadium
│   ├── tournament/       # /tournament
│   └── utility/          # /help, /hello, /sync
├── config/               # Environment config (Zod) & Game constants
│   ├── env.ts            # Runtime environment validation
│   └── constants.ts      # Game rules, timers, and catalogs
├── database/             # Prisma client singleton
│   └── client.ts         # Singleton client export with disconnect handlers
├── events/               # Discord client event listeners
│   ├── ready.ts          # onReady presence & slash command sync
│   └── interactionCreate.ts # Slash command, autocomplete & component router
├── jobs/                 # Timers and background jobs
│   ├── auctionTimer.ts   # Guild live auction countdowns & sold/pass workflows
│   └── scheduledTasks.ts # Background heartbeat and maintenance
├── models/               # Pure domain models and rule engines
│   ├── auction.ts        # Live auction state & pot generation
│   ├── divisions.ts      # Division tiers & RP calculations
│   ├── manager.ts        # Manager profile, archetypes, and roles
│   ├── match.ts          # 90-min match engine & timeline events
│   ├── penalty.ts        # 1v1 penalty shootout state
│   ├── player.ts         # Player entity & tier valuations
│   ├── sbc.ts            # SBC challenge definition & requirement validator
│   ├── scoring.ts        # Chemistry links & transparent squad scoring
│   ├── spin.ts           # Mystery wheel weighted sectors
│   ├── squad.ts          # 5-player squad constraints (1 GK, 1 Flex)
│   ├── stadium.ts        # 5 Stadium infrastructure tiers
│   └── tactics.ts        # 6 Tactical playstyles & counter matrix
├── services/             # Pure game & business logic with Prisma transactions
│   ├── auctionService.ts     # Live multi-guild auction room management
│   ├── divisionService.ts    # Division Rivals ladder & leaderboards
│   ├── economyService.ts     # Coins, packs, inventory, drops, stadium ($transaction)
│   ├── managerRoleService.ts # Dynamic badge and role assignments
│   ├── marketService.ts      # P2P marketplace listing & purchases ($transaction)
│   ├── matchService.ts       # Match simulation, RP recording, and rewards
│   ├── playerService.ts      # 18,400+ player dataset loader & queries
│   ├── profileService.ts     # Manager stats, branding, and tactical identity
│   ├── rewardService.ts      # Centralized claim workflows
│   ├── sbcService.ts         # SBC puzzle submissions and card burning ($transaction)
│   ├── squadService.ts       # Lineup composition & chemistry evaluation
│   └── tournamentService.ts  # 3-way Round Robin & 4/8-way Knockout cups
├── ui/                   # Color-coded Discord embeds and interactive buttons
│   ├── embeds/           # Rich EmbedBuilders for all game systems
│   └── components/       # ActionRows, Buttons, StringSelectMenus, Modals
├── utils/                # Discord helpers, string formatters, and ID helpers
│   ├── discord.ts        # Safe message senders & mention resolvers
│   ├── formatters.ts     # Currency, progress bars, time remaining
│   └── id.ts             # Custom ID parser and generator
└── index.ts              # Application bootstrap & graceful shutdown
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher

### 2. Installation
```powershell
npm install
```

### 3. Database Setup
```powershell
npx prisma generate
npx prisma db push
```

### 4. Running the Bot
- **Development Mode** (auto-reload on code change):
  ```powershell
  npm run dev
  ```
- **Production Mode**:
  ```powershell
  npm run build
  npm start
  ```

### 5. Running Tests
```powershell
npm test
```
