import { createCanvas } from "@napi-rs/canvas";
import type { PlayerData } from "../../models/player.js";
import type { InventoryCard } from "@prisma/client";

export interface CardCanvasInput {
  name: string;
  position: string;
  rating: number;
  club: string;
  nation: string;
  value?: number;
}

export async function renderPlayerCard(card: CardCanvasInput | PlayerData | InventoryCard): Promise<Buffer> {
  const width = 360;
  const height = 520;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Determine Tier Color Palette
  let bgGradient1 = "#1e293b";
  let bgGradient2 = "#0f172a";
  let borderColor = "#94a3b8";
  let glowColor = "rgba(148, 163, 184, 0.4)";
  let tierTitle = "SILVER STAR";

  if (card.rating >= 91) {
    bgGradient1 = "#1a1200";
    bgGradient2 = "#3d2700";
    borderColor = "#ffd700";
    glowColor = "rgba(255, 215, 0, 0.6)";
    tierTitle = "ICON LEGEND 👑";
  } else if (card.rating === 90) {
    bgGradient1 = "#2c0b0e";
    bgGradient2 = "#59121b";
    borderColor = "#ff4d4d";
    glowColor = "rgba(255, 77, 77, 0.6)";
    tierTitle = "SUPERSTAR 🔥";
  } else if (card.rating >= 88) {
    bgGradient1 = "#081d33";
    bgGradient2 = "#0f3a66";
    borderColor = "#38bdf8";
    glowColor = "rgba(56, 189, 248, 0.6)";
    tierTitle = "WORLD CLASS 💎";
  } else if (card.rating >= 86) {
    bgGradient1 = "#261d08";
    bgGradient2 = "#4d3a10";
    borderColor = "#facc15";
    glowColor = "rgba(250, 204, 21, 0.6)";
    tierTitle = "GOLD RARE 🥇";
  }

  // Draw Card Outer Shield Clip
  ctx.save();
  ctx.beginPath();
  const radius = 24;
  ctx.roundRect(20, 20, width - 40, height - 40, [radius, radius, radius, radius]);
  ctx.clip();

  // Background Gradient
  const grad = ctx.createLinearGradient(20, 20, width - 20, height - 20);
  grad.addColorStop(0, bgGradient1);
  grad.addColorStop(0.5, bgGradient2);
  grad.addColorStop(1, bgGradient1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Geometric Background Patterns & Sheen
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 2;
  for (let i = -width; i < width * 2; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }

  // Radial highlight on top
  const radialGrad = ctx.createRadialGradient(width / 2, 80, 10, width / 2, 80, 180);
  radialGrad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
  radialGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = radialGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();

  // Draw Glowing Card Frame / Border
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(20, 20, width - 40, height - 40, [radius, radius, radius, radius]);
  ctx.stroke();
  ctx.restore();

  // Tier Badge Header
  ctx.fillStyle = borderColor;
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(tierTitle, width / 2, 50);

  // Divider Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 60);
  ctx.lineTo(width - 50, 60);
  ctx.stroke();

  // Rating & Position Block (Left Column)
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText(card.rating.toString(), 45, 125);

  ctx.fillStyle = borderColor;
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(card.position, 48, 155);

  // Nationality & Club text badges on Left
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(card.nation.toUpperCase().slice(0, 12), 48, 180);

  // Big Central Icon Silhouette / Emblem
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.arc(width / 2 + 50, 150, 65, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "60px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚽", width / 2 + 50, 150);
  ctx.restore();

  // Player Name Plate Banner
  const nameBoxY = 245;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.roundRect(35, nameBoxY, width - 70, 48, 8);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const displayName = card.name.length > 20 ? card.name.slice(0, 18) + "…" : card.name;
  ctx.fillText(displayName.toUpperCase(), width / 2, nameBoxY + 24);

  // Club Name Subtitle
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "14px sans-serif";
  ctx.fillText(card.club, width / 2, 315);

  // Tactical Stats Grid (6 Attributes)
  const statsY = 345;
  const statBoxWidth = (width - 80) / 3;
  const statBoxHeight = 44;

  const mockStats = [
    { label: "PAC", val: Math.min(99, card.rating + (card.position === "FW" ? 3 : -2)) },
    { label: "SHO", val: Math.min(99, card.rating + (card.position === "FW" ? 4 : card.position === "MID" ? 0 : -8)) },
    { label: "PAS", val: Math.min(99, card.rating + (card.position === "MID" ? 3 : -1)) },
    { label: "DRI", val: Math.min(99, card.rating + (card.position === "MID" ? 2 : card.position === "FW" ? 2 : -3)) },
    { label: "DEF", val: Math.min(99, card.rating + (card.position === "DEF" ? 5 : card.position === "GK" ? 5 : -7)) },
    { label: "PHY", val: Math.min(99, card.rating + (card.position === "DEF" ? 2 : 0)) },
  ];

  mockStats.forEach((st, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 40 + col * statBoxWidth;
    const y = statsY + row * (statBoxHeight + 8);

    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    ctx.beginPath();
    ctx.roundRect(x, y, statBoxWidth - 6, statBoxHeight, 6);
    ctx.fill();

    ctx.fillStyle = borderColor;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(st.label, x + (statBoxWidth - 6) / 2, y + 16);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(st.val.toString(), x + (statBoxWidth - 6) / 2, y + 34);
  });

  // Bottom Footer: Value or Badge
  const cardVal = "value" in card && typeof card.value === "number" ? card.value : undefined;
  if (cardVal) {
    ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
    ctx.beginPath();
    ctx.roundRect(40, 455, width - 80, 30, 6);
    ctx.fill();

    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`EST. VALUE: ${cardVal.toLocaleString()} COINS`, width / 2, 474);
  }

  return canvas.toBuffer("image/png");
}
