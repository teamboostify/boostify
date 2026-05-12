import {
  ChannelType,
  Client,
  Events,
  Interaction,
  MessageFlags
} from "discord.js";
import { prisma } from "../libs/database.js";

export default {
  name: Events.InteractionCreate,
  async execute(_client: Client, interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.guild) return;
    if (interaction.customId != 'setupboostifymodal') return;
    const boostchannel = interaction.fields.getSelectedChannels('boostchannel', true, [ChannelType.GuildText, ChannelType.GuildAnnouncement]);
    const logsChannel = interaction.fields.getSelectedChannels('logs', true, [ChannelType.GuildText]);

    const boostChannelId = boostchannel.first()
    const logChannelId = logsChannel.first()

    if (!boostChannelId || !logChannelId) {
      return interaction.reply({ content: 'Please select both channels.', ephemeral: true });
    }

    await prisma.guildSetting.create({
      data: {
        uid: crypto.randomUUID(),
        gid: interaction.guild!.id,
        greetChannelId: boostChannelId.id,
        logChannelId: logChannelId.id,
      }
    });

    await interaction.reply({
      content: `Setup complete!\n- Boost notifications: ${boostChannelId}\n- Logs: ${logChannelId}`,
      flags: MessageFlags.Ephemeral,
    });
  }
};