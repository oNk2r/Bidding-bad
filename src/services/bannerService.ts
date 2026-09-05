import fs from "node:fs";
import path from "node:path";
import { prisma } from "../database/client.js";
import { resolveDirectMediaUrl } from "../utils/mediaResolver.js";

const BANNER_DIR = path.resolve(process.cwd(), "data", "banners");

// Ensure banners directory exists
if (!fs.existsSync(BANNER_DIR)) {
  fs.mkdirSync(BANNER_DIR, { recursive: true });
}

export interface BannerInfo {
  filePath: string;
  fileName: string;
  isAnimated: boolean;
}

export class BannerService {
  /**
   * Returns the local banner file for a user if one exists.
   */
  getBannerAttachment(userId: string): BannerInfo | null {
    if (!fs.existsSync(BANNER_DIR)) return null;

    const files = fs.readdirSync(BANNER_DIR);
    const userBanner = files.find((f) => f.startsWith(`${userId}.`));
    if (!userBanner) return null;

    const filePath = path.join(BANNER_DIR, userBanner);
    const ext = path.extname(userBanner).toLowerCase();
    const isAnimated = ext === ".gif";

    return {
      filePath,
      fileName: `club_banner${ext}`,
      isAnimated,
    };
  }

  /**
   * Downloads and saves a banner from an uploaded Discord attachment URL or remote web URL.
   */
  async saveBanner(
    userId: string,
    sourceUrl: string
  ): Promise<{ success: boolean; error?: string; banner?: BannerInfo }> {
    try {
      // 1. Resolve raw URL (e.g. Tenor/Giphy webpage to direct media stream)
      const directUrl = await resolveDirectMediaUrl(sourceUrl);

      // 2. Fetch media stream with timeout & standard User-Agent
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(directUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/*,video/*,*/*",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          success: false,
          error: `Could not download banner media (HTTP ${response.status}). Please check the link or upload the file directly.`,
        };
      }

      const contentType = response.headers.get("content-type") || "";
      let ext = ".gif";

      if (contentType.includes("gif") || directUrl.toLowerCase().includes(".gif")) {
        ext = ".gif";
      } else if (contentType.includes("png") || directUrl.toLowerCase().includes(".png")) {
        ext = ".png";
      } else if (contentType.includes("webp") || directUrl.toLowerCase().includes(".webp")) {
        ext = ".webp";
      } else if (contentType.includes("jpeg") || contentType.includes("jpg") || directUrl.toLowerCase().includes(".jpg")) {
        ext = ".jpg";
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Limit banner size to 25MB for Discord bot upload limits
      if (buffer.length > 25 * 1024 * 1024) {
        return {
          success: false,
          error: `The chosen banner is too large (${(buffer.length / (1024 * 1024)).toFixed(1)}MB). Discord has a limit of 25MB for media uploads. Please choose a smaller GIF or optimize it.`,
        };
      }

      // Remove any existing banners for this user
      this.clearUserBannerFiles(userId);

      const fileName = `${userId}${ext}`;
      const filePath = path.join(BANNER_DIR, fileName);
      fs.writeFileSync(filePath, buffer);

      // Update user in DB
      await prisma.user.update({
        where: { id: userId },
        data: { bannerUrl: filePath },
      });

      return {
        success: true,
        banner: {
          filePath,
          fileName: `club_banner${ext}`,
          isAnimated: ext === ".gif",
        },
      };
    } catch (err: any) {
      console.error("Error saving banner:", err);
      return {
        success: false,
        error: `Failed to download and save banner: ${err?.message || "Unknown error"}`,
      };
    }
  }

  /**
   * Removes custom banner for a user.
   */
  async removeBanner(userId: string): Promise<boolean> {
    this.clearUserBannerFiles(userId);
    await prisma.user.update({
      where: { id: userId },
      data: { bannerUrl: null },
    });
    return true;
  }

  private clearUserBannerFiles(userId: string) {
    if (!fs.existsSync(BANNER_DIR)) return;
    const files = fs.readdirSync(BANNER_DIR);
    for (const f of files) {
      if (f.startsWith(`${userId}.`)) {
        try {
          fs.unlinkSync(path.join(BANNER_DIR, f));
        } catch {
          // Ignore unlink errors
        }
      }
    }
  }
}

export const bannerService = new BannerService();
