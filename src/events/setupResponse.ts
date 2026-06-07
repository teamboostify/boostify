import {
  ChannelType,
  Client,
  ContainerBuilder,
  Events,
  Interaction,
  MessageFlags
} from "discord.js";
import { prisma } from "#database";
import { SystemColors } from "#/libs/colors.js";

export default {
  name: Events.InteractionCreate,
  async execute(_client: Client, interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.guild) return;
    if (interaction.customId != 'setupboostifymodal' && interaction.customId != 'configboostifymodal') return;
    const boostchannel = interaction.fields.getSelectedChannels('boostchannel', true, [ChannelType.GuildText, ChannelType.GuildAnnouncement]);
    const logsChannel = interaction.fields.getSelectedChannels('logs', true, [ChannelType.GuildText]);

    const setup = await prisma.guildSetting.findFirst({ where: { gid: interaction.guild.id }})

    const boostChannelId = boostchannel.first()
    const logChannelId = logsChannel.first()

    if (!boostChannelId || !logChannelId) {
      return interaction.reply({ content: 'Please select both channels.', ephemeral: true });
    }

    await prisma.guildSetting.upsert({
      where: {
        gid: interaction.guild.id
      },
      update: {
        greetChannelId: boostChannelId.id,
        logChannelId: logChannelId.id
      },
      create: {
        uid: crypto.randomUUID(),
        gid: interaction.guild.id,
        greetChannelId: boostChannelId.id,
        logChannelId: logChannelId.id
      }
    });

    const container = new ContainerBuilder()
    .setAccentColor(SystemColors.main)
    .addTextDisplayComponents(
      (txt) => txt.setContent([
        `## ${!setup ? "Aaannndd... we're done!" : "Configuration changed" }`,
        `- Boost notifications: ${boostChannelId}\n- Logs: ${logChannelId}`
      ].join('\n'))
    );

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
    })
  }
};