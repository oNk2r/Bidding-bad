/**
 * Resolves various user-provided GIF and media URLs (Tenor, Giphy, Imgur, direct links)
 * into direct media URLs that Discord embeds can render natively.
 */
export async function resolveDirectMediaUrl(inputUrl: string): Promise<string> {
  const url = inputUrl.trim();

  // 1. Tenor Webpage (e.g. https://tenor.com/view/ronaldo-siu-gif-25637213 or https://tenor.com/bK4hO.gif)
  if (url.includes("tenor.com/view/") || (url.includes("tenor.com/") && !url.includes("media.tenor.com"))) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (response.ok) {
        const html = await response.text();
        // Look for og:image or og:video or direct .gif link in meta tags
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                             html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
          return ogImageMatch[1];
        }

        const mediaTenorMatch = html.match(/https:\/\/media[0-9]*\.tenor\.com\/[^\s"']+\.gif/i);
        if (mediaTenorMatch) {
          return mediaTenorMatch[0].replace(/AAAAC(?=\/|\.gif)/i, "AAAAM");
        }
      }
    } catch (err) {
      console.warn("Could not resolve Tenor URL:", err);
    }
  }

  // Optimize direct media.tenor.com URLs from AAAAC (huge 20MB) to AAAAM (optimized 2MB)
  if (url.includes("media.tenor.com") || url.includes("media1.tenor.com")) {
    return url.replace(/AAAAC(?=\/|\.gif)/i, "AAAAM");
  }

  // 2. Giphy Webpage (e.g. https://giphy.com/gifs/cristiano-ronaldo-xT1XGzgkBT1effWaVu)
  if (url.includes("giphy.com/gifs/") && !url.includes("media.giphy.com") && !url.includes("i.giphy.com")) {
    try {
      const parts = url.split("/").filter(Boolean);
      const lastSlug = parts[parts.length - 1];
      const id = lastSlug.includes("-") ? lastSlug.split("-").pop() : lastSlug;
      if (id) {
        return `https://i.giphy.com/media/${id}/giphy.gif`;
      }
    } catch {
      // Fallback
    }
  }

  // 3. Imgur link without extension (e.g. https://imgur.com/abc1234)
  if (url.includes("imgur.com/") && !url.includes("i.imgur.com") && !url.match(/\.(gif|png|jpe?g|webp)$/i)) {
    const id = url.split("/").pop();
    if (id) {
      return `https://i.imgur.com/${id}.gif`;
    }
  }

  return url;
}
