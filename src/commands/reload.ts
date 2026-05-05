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
import { loadVariables } from "../libs/loadVariables.js";

const reloadCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reload all slash commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const config = loadVariables();
      const client = interaction.client as Client & { commands?: Collection<string, Command> };

      await loadCommands(client, config.clientId, config.guildId, config.botToken);

      await interaction.editReply("Commands reloaded successfully.");
    } catch (error) {
      console.error("Reload failed:", error);
      await interaction.editReply("Failed to reload commands.");
    }
  },
};

export default reloadCommand;