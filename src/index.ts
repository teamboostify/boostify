import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection
} from "discord.js";
import * as dotenv from "dotenv/config";
import { loadVariables } from "./libs/loadVariables.js";
import { Command, loadCommands } from "./libs/loadCommands.js";
import path from "path";
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from "url";
import { logger } from "./libs/logger.js";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

dotenv;

const config = loadVariables();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.GuildMember],
}) as Client & { commands?: Collection<string, Command> };

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = (await import(pathToFileURL(filePath).href)).default;
  if (command != undefined && Object.keys(command).length !== 0) {
    client.commands.set(command.data.name, command);
    logger.startup(`Loaded command ${file.replace(/\.[jt]s$/, '')}`);
  } else {
    logger.warn(`Couldn't load command ${file.replace(/\.[jt]s$/, '')}`);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const { once, name, execute } = (await import(pathToFileURL(filePath).href)).default;
  if (once) {
    client.once(name, (...args) => execute(client, ...args));
  } else {
    client.on(name, (...args) => execute(client, ...args));
  }
  logger.startup(`Loaded event ${file.replace(/\.[jt]s$/, '')}`);
}

await loadCommands(client, config.clientId, config.botToken, config.guildId)

try {
  client.login(config.botToken);
} catch (err) {
  console.log(err)
}
