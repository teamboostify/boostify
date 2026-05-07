import "../libs/loadVariables.js";
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Client,
  Collection,
  MessageFlags,
} from "discord.js";
import { Command } from "../libs/loadCommands.js";
import { loadCommands } from "../libs/loadCommands.js";

const reloadCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reload all slash commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const client = interaction.client as Client & { commands?: Collection<string, Command> };

      await loadCommands(client, process.env.CLIENT_ID, process.env.BOT_TOKEN, process.env.GUILD_ID);

      await interaction.editReply("Commands reloaded successfully.");
    } catch (error) {
      console.error("Reload failed:", error);
      await interaction.editReply("Failed to reload commands.");
    }
  },
};

export default reloadCommand;