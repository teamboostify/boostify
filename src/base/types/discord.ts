import { Client, Collection } from "discord.js";
import { Command } from "../classes/command.js";

export type DiscordClient = Client & { commands: Collection<string, Command> }