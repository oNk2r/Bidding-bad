import { describe, it, expect } from "vitest";
import { createClubEmbed } from "../src/ui/embeds/clubEmbeds.js";
import { bannerService } from "../src/services/bannerService.js";
import { Squad } from "../src/models/squad.js";

describe("Club GIF Banner Customization", () => {
  it("builds a formatted club embed ready for image attachments", () => {
    const embed = createClubEmbed({
      userName: "TestManager",
      clubName: "Galácticos FC",
      kitEmoji: "⚪🟣",
      motto: "Hala Madrid",
      tacticName: "GEGENPRESS",
      squad: new Squad([]),
      coins: 5000,
      clubValue: 12000,
      cardCount: 15,
    });

    const data = embed.toJSON();
    expect(data.title).toContain("Galácticos FC");
    expect(data.description).toContain("Hala Madrid");
  });

  it("bannerService handles banner lookup gracefully when no file exists", () => {
    const banner = bannerService.getBannerAttachment("non_existent_user_12345");
    expect(banner).toBeNull();
  });

  it("resolves Giphy webpage links to direct media gif links", async () => {
    const { resolveDirectMediaUrl } = await import("../src/utils/mediaResolver.js");
    const resolved = await resolveDirectMediaUrl("https://giphy.com/gifs/cristiano-ronaldo-xT1XGzgkBT1effWaVu");
    expect(resolved).toBe("https://i.giphy.com/media/xT1XGzgkBT1effWaVu/giphy.gif");
  });

  it("preserves direct .gif and .png URLs", async () => {
    const { resolveDirectMediaUrl } = await import("../src/utils/mediaResolver.js");
    const directUrl = "https://cdn.discordapp.com/attachments/123/456/banner.gif";
    const resolved = await resolveDirectMediaUrl(directUrl);
    expect(resolved).toBe(directUrl);
  });
});
