import { logger } from "./logger.js";

export interface Config {
  botToken: string;
  clientId: string;
  guildId: string | undefined;
  greetChannelId: string;
  logChannelId: string;
  databaseUrl: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  console.log("here")
  if (!value) {
    logger.fatal(`Missing required environment variable: ${key}`);
  }
  return value as string;
}

export function loadVariables(): Config {
  return {
    botToken: requireEnv("BOT_TOKEN"),
    clientId: requireEnv("CLIENT_ID"),
    guildId: process.env.GUILD_ID?.toString() ?? undefined,
    greetChannelId: requireEnv("GREET_CHANNEL_ID"),
    logChannelId: requireEnv("LOG_CHANNEL_ID"),
    databaseUrl: requireEnv("DATABASE_URL"),
  };
}