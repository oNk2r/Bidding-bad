import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required in .env"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_ID: z.string().optional(),
  GUILD_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.format();
    console.error("❌ Environment configuration validation failed:");
    console.error(JSON.stringify(errorDetails, null, 2));
    throw new Error("Invalid environment variables. Please check your .env file.");
  }

  return result.data;
}

export const env = validateEnv();
