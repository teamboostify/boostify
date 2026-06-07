import {
  Collection,
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { logger } from "./logger.js";
import chalk from "chalk";
import { client } from "../index.js";

export interface Command {
  data:
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function loadCommands(): Promise<void> {
  client.commands = new Collection<string, Command>();

  const commandsPath = path.join(__dirname, "..", "commands");

  if (!fs.existsSync(commandsPath)) {
    logger.fatal(`Commands directory not found: ${commandsPath}`);
    return;
  }

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts") ||file.endsWith(".js"));

  if (commandFiles.length === 0) {
    logger.warn("No command files found — nothing to register.");
    return;
  }

  const commandData: ReturnType<SlashCommandBuilder["toJSON"]>[] = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = (await import(pathToFileURL(filePath).href)).default;

    if (!command?.data || !command?.execute) {
      logger.warn(`Skipping ${file} - missing data or execute`);
      continue;
    }

    if (command?.masterLock) {
      if (!process.env.MASTER_GUILD) {
        logger.warn(`Skipping ${file} - missing ${chalk.bold('MASTER_GUILD')} on environmental variables.`);
        continue;
      }
    }

    client.commands.set(command.data.name, command);
    commandData.push(command.data.toJSON());
  }

  logger.info(`Registering ${commandData.length} command(s)...`);

  const rest = new REST().setToken(process.env.BOT_TOKEN!);

  try {
    if (process.env.GUILD_ID) {
      logger.info(`Loading Server (${chalk.grey(process.env.GUILD_ID)}) commands...`);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID),
        { body: commandData }
      );
    } else {
      logger.info("Loading Global commands...");
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID!),
        { body: commandData }
      );
    }
    logger.info("Completed!");
  } catch (err) {
    logger.fatal("An error occurred while loading commands", err);
  }
}