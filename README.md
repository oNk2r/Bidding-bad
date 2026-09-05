# Bidding Bad

A competitive football management and live auction bot for Discord. Draft 5-player squads through real-time bidding, build tactical chemistry, trade cards on the transfer market, customize club branding, and compete in simulated 90-minute matches and division ladders.

---

## Features

- **Live Fast-Paced Auctions**: Real-time bidding timers with interactive button controls (`/auction`).
- **Tactical Squad Building**: Draft and manage a 5-player lineup with chemistry bonuses for shared clubs and nations.
- **Club Management & Custom Banners**: Customize your club name, tactic, kit, stadium tier, and upload animated or static club banners (`/club`, `/club banner`).
- **Match Simulation & Penalties**: Play 90-minute simulated matches against managers or AI (`/match`) and 1v1 penalty shootouts (`/penalty`).
- **Division Rivals & Leaderboards**: Compete across rank tiers from Bronze to Elite Masters (`/division`, `/leaderboard`).
- **Card Economy & Marketplace**: Open packs, claim daily rewards, list cards on the transfer market, and trade with other players (`/market`, `/trade`, `/pack`).
- **Squad Building Challenges (SBCs)**: Exchange cards to solve squad puzzles and unlock rewards (`/sbc`).
- **Tournaments**: Host multi-player knockout cups and round-robin tournaments (`/tournament`).

---

## Tech Stack

- **Runtime**: Node.js 20+ (ESM)
- **Language**: TypeScript 5.7+
- **Framework**: Discord.js v14
- **Database**: PostgreSQL with Prisma ORM
- **Validation & Testing**: Zod, Vitest

---

## Project Structure

```
src/
├── commands/          # Slash command definitions (auction, club, economy, game, market, rivals, sbc, stadium, tournament)
├── config/            # Environment validation (Zod) and game constants
├── database/          # Prisma database client singleton and heartbeat
├── events/            # Discord event handlers (ready, interactionCreate)
├── jobs/              # Background auction timers and maintenance tasks
├── models/            # Domain models (scoring, chemistry, tactics, penalties)
├── services/          # Core business logic and database transaction services
├── ui/                # Discord embeds, buttons, select menus, and modals
├── utils/             # Helpers, formatters, and media resolvers
└── index.ts           # Application entry point
```

---

## Getting Started

### 1. Prerequisites
- Node.js 20.0.0 or higher
- PostgreSQL database (local or hosted like Neon / Supabase)

### 2. Environment Setup
Create a `.env` file in the root directory (based on `.env.example`):

```env
DISCORD_TOKEN=your_discord_bot_token_here
DATABASE_URL=postgresql://user:password@localhost:5432/biddingbad?sslmode=prefer
NODE_ENV=development
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
```bash
npx prisma generate
npx prisma db push
```

### 5. Running the Bot

**Development Mode** (auto-reloads on file changes):
```bash
npm run dev
```

**Production Mode**:
```bash
npm run build
npm start
```

### 6. Running Tests
```bash
npm test
```

---

## Deployment

1. Set `DATABASE_URL`, `DISCORD_TOKEN`, and `NODE_ENV=production` in your hosting environment.
2. Run database sync and build steps:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run build
   ```
3. Start the process with `npm start` (or a process manager like PM2 / Docker).
