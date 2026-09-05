export function formatCoins(amount: number): string {
  return `${amount.toLocaleString()} Coins`;
}

export function formatRp(rp: number): string {
  return `${rp.toLocaleString()} RP`;
}

export function formatProgressBar(current: number, max: number, length = 10): string {
  if (max <= 0) return "🟩".repeat(length);
  const ratio = Math.min(1, Math.max(0, current / max));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return "🟩".repeat(filled) + "⬛".repeat(empty);
}

export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
