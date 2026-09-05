import { createCanvas } from "@napi-rs/canvas";
import type { InventoryCard } from "@prisma/client";

export async function renderPitchSquad(
  clubName: string,
  kitEmoji: string,
  starting5: InventoryCard[]
): Promise<Buffer> {
  const width = 720;
  const height = 480;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Pitch Grass Base & Alternating Stripes
  const stripeWidth = 60;
  for (let x = 0; x < width; x += stripeWidth) {
    const isEven = (x / stripeWidth) % 2 === 0;
    ctx.fillStyle = isEven ? "#15803d" : "#166534";
    ctx.fillRect(x, 0, stripeWidth, height);
  }

  // Pitch Boundary Lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Center Line
  ctx.beginPath();
  ctx.moveTo(width / 2, 20);
  ctx.lineTo(width / 2, height - 20);
  ctx.stroke();

  // Center Circle & Spot
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Left Penalty Box
  ctx.strokeRect(20, height / 2 - 90, 110, 180);
  ctx.strokeRect(20, height / 2 - 45, 45, 90);

  // Right Penalty Box
  ctx.strokeRect(width - 130, height / 2 - 90, 110, 180);
  ctx.strokeRect(width - 65, height / 2 - 45, 45, 90);

  // Club Banner Overlay on Top
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.beginPath();
  ctx.roundRect(width / 2 - 180, 26, 360, 36, 18);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${kitEmoji} ${clubName.toUpperCase()} — STARTING LINEUP`, width / 2, 44);

  // Sort starting 5 into positions: GK, DEF, MID, FW
  const gks = starting5.filter((c) => c.position === "GK");
  const defs = starting5.filter((c) => c.position === "DEF");
  const mids = starting5.filter((c) => c.position === "MID");
  const fws = starting5.filter((c) => c.position === "FW");

  // Calculate coordinates (Left-to-Right progression on pitch)
  const coords: { card: InventoryCard; x: number; y: number }[] = [];

  // GK
  if (gks[0]) coords.push({ card: gks[0], x: 80, y: height / 2 });

  // DEF
  defs.forEach((card, idx) => {
    const yOffset = defs.length === 1 ? height / 2 : idx === 0 ? height / 2 - 80 : height / 2 + 80;
    coords.push({ card, x: 220, y: yOffset });
  });

  // MID
  mids.forEach((card, idx) => {
    const yOffset = mids.length === 1 ? height / 2 : idx === 0 ? height / 2 - 80 : height / 2 + 80;
    coords.push({ card, x: 420, y: yOffset });
  });

  // FW
  fws.forEach((card, idx) => {
    const yOffset = fws.length === 1 ? height / 2 : idx === 0 ? height / 2 - 80 : height / 2 + 80;
    coords.push({ card, x: 600, y: yOffset });
  });

  // If cards are remaining or unassigned, distribute remaining slots
  const placedIds = new Set(coords.map((c) => c.card.id));
  const unplaced = starting5.filter((c) => !placedIds.has(c.id));
  unplaced.forEach((card, idx) => {
    coords.push({ card, x: 300 + idx * 80, y: height / 2 + (idx % 2 === 0 ? 60 : -60) });
  });

  // Draw Player Card Badges on Pitch
  for (const { card, x, y } of coords) {
    const cardW = 100;
    const cardH = 68;

    // Card Shield Box
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = card.rating >= 90 ? "#451a03" : card.rating >= 88 ? "#082f49" : "#0f172a";
    ctx.beginPath();
    ctx.roundRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);
    ctx.fill();

    const borderClr = card.rating >= 91 ? "#ffd700" : card.rating >= 90 ? "#f87171" : card.rating >= 88 ? "#38bdf8" : "#fbbf24";
    ctx.strokeStyle = borderClr;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Rating & Position Tag
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${card.rating}`, x - cardW / 2 + 8, y - cardH / 2 + 18);

    ctx.fillStyle = borderClr;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(card.position, x + cardW / 2 - 8, y - cardH / 2 + 18);

    // Player Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    const shortName = card.name.split(" ").pop() || card.name;
    ctx.fillText(shortName.slice(0, 11), x, y + 5);

    // Club / Nation Small Subtext
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.fillText(card.club.slice(0, 13), x, y + 22);
  }

  return canvas.toBuffer("image/png");
}
