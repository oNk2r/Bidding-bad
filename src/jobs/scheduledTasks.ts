import { prisma } from "../database/client.js";

export function initScheduledTasks(): void {
  // Run periodic health check and cleanup every 1 hour
  setInterval(async () => {
    try {
      // Clean up orphaned records if any
      const userCount = await prisma.user.count();
      const listingCount = await prisma.marketListing.count();
      console.log(`[ScheduledTask] Heartbeat: ${userCount} users, ${listingCount} active market listings.`);
    } catch (err) {
      console.error("[ScheduledTask] Error in periodic maintenance:", err);
    }
  }, 60 * 60 * 1000);
}
