import {
  Events,
  Interaction,
  InteractionType,
  Client,
  MessageFlags,
  type InteractionReplyOptions,
} from "discord.js";

export default {
  name: Events.InteractionCreate,
  async execute(client: Client & { commands: any }, interaction: Interaction) {
    if (
      interaction.type !== InteractionType.ApplicationCommand ||
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);

      const flags = MessageFlags.Ephemeral as InteractionReplyOptions["flags"];

      const msg: InteractionReplyOptions = {
        content: "Something went wrong.",
        flags,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  }
};