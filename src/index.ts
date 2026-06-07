import "./libs/loadVariables.js";
import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import * as dotenv from "dotenv/config";
import { Command, loadCommands } from "./libs/loadCommands.js";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { logger } from "./libs/logger.js";
import chalk from "chalk";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

dotenv;

process.on("uncaughtException", (error) => {
  logger.error(
    JSON.stringify({
      type: "uncaughtException",
      message: error.message,
      stack: error?.stack,
      cause: error.cause,
    }),
  );
});

if (!fs.existsSync(path.join(__dirname, 'generated'))) {
  logger.fatal(`No generated prisma folder could be found at ${__dirname}, to generate run ${chalk.bold("npm run prisma:generate")}.`)
  throw new Error(`No prisma folder found`)
}

process.on("unhandledRejection", (reason) => {
  const safeStringify = (value: unknown): string => {
    try {
      if (value instanceof Error) return value.message;
      return JSON.stringify(value, null, 2);
    } catch {
      try {
        return String(value);
      } catch {
        return "[Unstringifiable rejection]";
      }
    }
  };

  const safeStack = (value: unknown): string => {
    if (value instanceof Error && value.stack) return value.stack;
    return "No stack trace available";
  };

  logger.error(
    JSON.stringify({
      type: "unhandledRejection",
      reason: safeStringify(reason),
      stack: safeStack(reason),
    }),
  );
});

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.GuildMember],
}) as Client & { commands?: Collection<string, Command> };

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js") || file.endsWith(".ts") || !file.endsWith(".map"));

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js") || file.endsWith(".ts") || !file.endsWith(".map"));

(async () => {
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = (await import(pathToFileURL(filePath).href)).default;
    if (command != undefined && Object.keys(command).length !== 0) {
      client.commands!.set(command.data.name, command);
      logger.startup(`Loaded command ${chalk.bold(file.replace(/\.[jt]s$/, ''))}`);
    } else {
      logger.warn(`Couldn't load command ${chalk.bold(file.replace(/\.[jt]s$/, ''))}`);
    }
  }

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const { once, name, execute } = (await import(pathToFileURL(filePath).href))
      .default;
    if (once) {
      client.once(name, (...args) => execute(client, ...args));
    } else {
      client.on(name, (...args) => execute(client, ...args));
    }
    logger.startup(`Loaded event ${file.replace(/\.[jt]s$/, '')}`);
  }

  await loadCommands();

  try {
    client.login(process.env.BOT_TOKEN);
  } catch (err) {
    console.log(err);
  }
})()
