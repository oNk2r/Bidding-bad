import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Starting full database wipe and stats reset...");

  // Delete all dependent child tables first
  const deletedMarketListings = await prisma.marketListing.deleteMany();
  console.log(`Deleted ${deletedMarketListings.count} market listings.`);

  const deletedCards = await prisma.inventoryCard.deleteMany();
  console.log(`Deleted ${deletedCards.count} inventory cards.`);

  const deletedSbcs = await prisma.sbcCompletion.deleteMany();
  console.log(`Deleted ${deletedSbcs.count} SBC completions.`);

  const deletedGameRecords = await prisma.gameRecord.deleteMany();
  console.log(`Deleted ${deletedGameRecords.count} game records.`);

  const deletedUsers = await prisma.user.deleteMany();
  console.log(`Deleted ${deletedUsers.count} users.`);

  console.log("Database reset complete! All stats, users, inventories, listings, and game data have been reset.");
}

main()
  .catch((e) => {
    console.error("Error executing database reset:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
