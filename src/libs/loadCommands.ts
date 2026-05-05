import {
  Client,
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

export interface Command {
  data:
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function loadCommands(
  client: Client & { commands?: Collection<string, Command> },
  clientId: string,
  token: string,
  guildId?: string,
): Promise<void> {
  client.commands = new Collection<string, Command>();

  const commandsPath = path.join(__dirname, "..", "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

  const commandData: ReturnType<SlashCommandBuilder["toJSON"]>[] = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = (await import(pathToFileURL(filePath).href)).default;

    if (!command?.data || !command?.execute) continue;

    client.commands.set(command.data.name, command);
    commandData.push(command.data.toJSON());
  }

  const rest = new REST().setToken(token);

  if (clientId && guildId) {
    logger.info("here")
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [],
    });

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commandData,
    });
  } else if (clientId) {
    logger.info("a")
    await rest.put(Routes.applicationCommands(clientId), {
      body: [],
    });

    await rest.put(Routes.applicationCommands(clientId), {
      body: commandData,
    });
  }
}