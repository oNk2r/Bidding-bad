import { ActivityType, type Client } from "discord.js";
import { initScheduledTasks } from "../jobs/scheduledTasks.js";

export async function onReady(client: Client): Promise<void> {
  console.log(`✅ Logged in as ${client.user?.tag} (ID: ${client.user?.id})`);

  client.user?.setPresence({
    activities: [
      {
        name: "🏆 Live Football Auctions | /help",
        type: ActivityType.Competing,
      },
    ],
    status: "online",
  });

  // Sync slash commands with Discord API
  try {
    if (client.application) {
      const commandData = Array.from(client.commands.values()).map((c) => c.data);
      await client.application.commands.set(commandData);
      console.log(`🚀 Registered ${commandData.length} slash commands with Discord API.`);
    }
  } catch (err) {
    console.error("❌ Failed to register slash commands:", err);
  }

  // Initialize scheduled tasks
  initScheduledTasks();
}
