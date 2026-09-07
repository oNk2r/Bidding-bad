import { describe, it, expect, vi } from "vitest";
import { loadCommands } from "../src/commands/index.js";
import { cancelListingCommand } from "../src/commands/market/cancelListing.js";
import { buyCommand } from "../src/commands/market/buy.js";
import { marketCommand } from "../src/commands/market/market.js";
import { marketService } from "../src/services/marketService.js";
import { prisma } from "../src/database/client.js";

describe("Market Listing Cancellation & Command Registry", () => {
  it("registers cancel_listing and buy commands in loadCommands", () => {
    const commands = loadCommands();
    expect(commands.has("cancel_listing")).toBe(true);
    expect(commands.has("buy")).toBe(true);
    expect(commands.has("market")).toBe(true);
    expect(commands.has("sell")).toBe(true);
  });

  it("has valid metadata and options for cancel_listing command", () => {
    expect(cancelListingCommand.data.name).toBe("cancel_listing");
    expect(cancelListingCommand.data.description).toContain("Cancel your active market listing");
    const json = cancelListingCommand.data.toJSON();
    expect(json.options?.some((opt: any) => opt.name === "listing_id" && opt.autocomplete === true)).toBe(true);
  });

  it("has valid metadata for buy and market commands", () => {
    expect(buyCommand.data.name).toBe("buy");
    expect(marketCommand.data.name).toBe("market");
  });

  it("rejects cancelling a non-existent market listing", async () => {
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      return cb({
        marketListing: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      });
    });

    const res = await marketService.cancelListing("seller_123", "non_existent_id");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Listing not found");
  });

  it("rejects cancelling a listing owned by another manager", async () => {
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      return cb({
        marketListing: {
          findUnique: vi.fn().mockResolvedValue({
            id: "listing_999",
            sellerId: "seller_other",
            cardData: JSON.stringify({ name: "Mbappe", position: "FW", rating: 92, club: "Real Madrid", nation: "France", value: 2000 }),
          }),
        },
      });
    });

    const res = await marketService.cancelListing("seller_123", "listing_999");
    expect(res.success).toBe(false);
    expect(res.message).toContain("You can only cancel your own listings");
  });

  it("rejects cancelling a listing when user inventory is full (>= 50 cards)", async () => {
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      return cb({
        marketListing: {
          findUnique: vi.fn().mockResolvedValue({
            id: "listing_100",
            sellerId: "seller_full",
            cardData: JSON.stringify({ name: "Haaland", position: "FW", rating: 91, club: "Man City", nation: "Norway", value: 1500 }),
          }),
        },
        inventoryCard: {
          count: vi.fn().mockResolvedValue(50),
        },
      });
    });

    const res = await marketService.cancelListing("seller_full", "listing_100");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Inventory is full");
  });

  it("successfully cancels listing, restores card to inventory, and deletes listing", async () => {
    const deleteMock = vi.fn().mockResolvedValue({});
    const createMock = vi.fn().mockResolvedValue({});

    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      return cb({
        marketListing: {
          findUnique: vi.fn().mockResolvedValue({
            id: "listing_100",
            sellerId: "seller_123",
            cardData: JSON.stringify({
              name: "Rodri",
              position: "MID",
              rating: 90,
              club: "Man City",
              nation: "Spain",
              value: 1200,
            }),
          }),
          delete: deleteMock,
        },
        inventoryCard: {
          count: vi.fn().mockResolvedValue(12),
          create: createMock,
        },
      });
    });

    const res = await marketService.cancelListing("seller_123", "listing_100");
    expect(res.success).toBe(true);
    expect(res.message).toContain("Cancelled listing and returned **Rodri** to your inventory");
    expect(res.restoredCard?.name).toBe("Rodri");
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "listing_100" } });
  });
});
