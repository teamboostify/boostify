import {
  SlashCommandBuilder,
  ModalBuilder,
  ChannelType,
  LabelBuilder,
  MessageFlags,
  ContainerBuilder,
} from "discord.js";
import { Command } from "#/base/classes/command.js";
import { prisma } from "#/libs/database.js";
import { SystemColors } from "#/libs/colors.js";

export default new Command({
  info: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup this server!"),
  async execute(interaction) {
    if (!interaction.guild) return;

    const serversetup = await prisma.guildSetting.findFirst({
        where: {
            gid: interaction.guild.id
        }
    });

    if (serversetup) {
      const container = new ContainerBuilder().setAccentColor(SystemColors.main)
      .addTextDisplayComponents((txt) => txt.setContent([
        "## This server is already set up",
        "This server was already configured, if you want to change a setting please run the `/settings` command."
      ].join("\n")))
        await interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]})
        return
    }

    const modal = new ModalBuilder().setTitle('Setup').setCustomId('setupboostifymodal')
    const GreetingChannelRes = new LabelBuilder()
    .setLabel('Where should boosts be sent?')
    .setChannelSelectMenuComponent(
        (channel) => 
            channel.addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText)
            .setCustomId('boostchannel')
            .setRequired(true)
    );

    const LoggingChannel = new LabelBuilder()
    .setLabel('Where should logs be sent?')
    .setChannelSelectMenuComponent(
        (channel) => 
            channel.addChannelTypes(ChannelType.GuildText)
            .setCustomId('logs')
            .setRequired(true)
    );

    modal.addLabelComponents(GreetingChannelRes, LoggingChannel);
    interaction.showModal(modal);
  },
  ownerOnly: true,
})

