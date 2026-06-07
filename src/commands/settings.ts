import {
  SlashCommandBuilder,
  ModalBuilder,
  ChannelType,
  LabelBuilder,
} from "discord.js";
import { Command } from "#/base/classes/command.js";

export default new Command({
  info: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Change the configuration of this server."),
  async execute(interaction) {
    if (!interaction.guild) return;

    const modal = new ModalBuilder().setTitle('Configuration').setCustomId('configboostifymodal')
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

