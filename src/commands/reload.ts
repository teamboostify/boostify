import "../libs/loadVariables.js";
import {
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { loadCommands } from "../libs/loadCommands.js";
import { Command } from "../base/classes/command.js";
import { client } from "../index.js";

export default new Command({
  info: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reload all slash commands"),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await loadCommands(client, process.env.CLIENT_ID, process.env.BOT_TOKEN, process.env.GUILD_ID);

      await interaction.editReply("Commands reloaded successfully.");
    } catch (error) {
      console.error("Reload failed:", error);
      await interaction.editReply("Failed to reload commands.");
    }
  },
  requiredPermissions: ["Administrator"]
})
