export interface Config {
  botToken: string;
  clientId: string;
  guildId: string;
  greetChannelId: string;
  logChannelId: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadVariables(): Config {
  return {
    botToken: requireEnv("BOT_TOKEN"),
    clientId: requireEnv("CLIENT_ID"),
    guildId: requireEnv("GUILD_ID"),
    greetChannelId: requireEnv("GREET_CHANNEL_ID"),
    logChannelId: requireEnv("LOG_CHANNEL_ID"),
  };
}