import {
  ChannelType,
  Client,
  ContainerBuilder,
  Events,
  Interaction,
  MessageFlags
} from "discord.js";
import { db } from "../prisma/db.js";
import { upsertOnUniqueIndex } from "../prisma/upsert.js";
import { SystemColors } from "../libs/colors.js";
import { DiscordClient } from "../base/types/discord.js";

export default {
  name: Events.InteractionCreate,
  async execute(_client: DiscordClient, interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.guild) return;
    if (interaction.customId != 'setupboostifymodal' && interaction.customId != 'configboostifymodal') return;
    const boostchannel = interaction.fields.getSelectedChannels('boostchannel', true, [ChannelType.GuildText, ChannelType.GuildAnnouncement]);
    const logsChannel = interaction.fields.getSelectedChannels('logs', true, [ChannelType.GuildText]);

    const setup = await db.orm.public.GuildSetting.where({ gid: interaction.guild.id }).first()

    const boostChannelId = boostchannel.first()
    const logChannelId = logsChannel.first()

    if (!boostChannelId || !logChannelId) {
      return interaction.reply({ content: 'Please select both channels.', ephemeral: true });
    }

    await upsertOnUniqueIndex(db.orm.public.GuildSetting, {
      create: {
        uid: crypto.randomUUID(),
        gid: interaction.guild.id,
        greetChannelId: boostChannelId.id,
        logChannelId: logChannelId.id
      },
      update: {
        greetChannelId: boostChannelId.id,
        logChannelId: logChannelId.id
      },
      conflictOn: { gid: interaction.guild.id }
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