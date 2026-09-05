import { Client, GatewayIntentBits, Collection, Events } from "discord.js";
import { env } from "./config/env.js";
import { prisma, disconnectPrisma } from "./database/client.js";
import { loadCommands } from "./commands/index.js";
import { onReady } from "./events/ready.js";
import { onInteractionCreate } from "./events/interactionCreate.js";
import type { Command } from "./commands/types.js";

import http from "node:http";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

declare module "discord.js" {
  export interface Client {
    commands: Collection<string, Command>;
  }
}

/**
 * Lightweight HTTP server for Render / cloud health checks & pingers
 */
function startHealthServer(): http.Server {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", bot: "Bidding Bad", timestamp: new Date().toISOString() }));
  });

  server.listen(port, () => {
    console.log(`🌐 Health check HTTP server listening on port ${port}`);
  });

  return server;
}

async function bootstrap(): Promise<void> {
  console.log("⚽ Starting Bidding Bad Discord Bot (TypeScript 5.7+ / discord.js 14+)...");

  // Verify database connectivity
  try {
    await prisma.$connect();
    console.log("✅ Database connection established.");
  } catch (err) {
    console.error("❌ Failed to connect to database:", err);
    process.exit(1);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
    ],
    rest: {
      timeout: 60000,
    },
  });

  client.commands = loadCommands();
  console.log(`📦 Loaded ${client.commands.size} application commands.`);

  client.on("error", (error) => {
    console.error("⚠️ Discord Client Error:", error);
  });

  client.once(Events.ClientReady, () => onReady(client));
  client.on("interactionCreate", (interaction) => onInteractionCreate(interaction));

  // Global error safety handlers
  process.on("unhandledRejection", (reason) => {
    console.error("⚠️ Unhandled Promise Rejection:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("⚠️ Uncaught Exception:", error);
  });

  // Start lightweight HTTP health server for hosting platform checks
  const healthServer = startHealthServer();

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    healthServer.close();
    client.destroy();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  // Login
  await client.login(env.DISCORD_TOKEN);
}

bootstrap().catch((err) => {
  console.error("❌ Fatal error during bootstrap:", err);
  process.exit(1);
});

