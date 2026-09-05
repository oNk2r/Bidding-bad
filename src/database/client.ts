import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// Keep-alive heartbeat every 3.5 minutes to keep Neon Serverless pool socket active
const HEARTBEAT_INTERVAL_MS = 3.5 * 60 * 1000;
let heartbeatTimer: NodeJS.Timeout | undefined;

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      // Sockets will auto-reconnect on next demand
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Unref so process can cleanly exit on SIGINT
  if (heartbeatTimer && typeof heartbeatTimer.unref === "function") {
    heartbeatTimer.unref();
  }
}

startHeartbeat();

export async function disconnectPrisma(): Promise<void> {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }
  await prisma.$disconnect();
}

