import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { Command } from "../base/classes/command.js";

export default new Command({
  info: new SlashCommandBuilder()
    .setName("example_all")
    .setDescription("[TEMP] Preview all bot messages and embeds"),
  async execute(interaction) {
    await interaction.deferReply();

    // 1. Boost start greet embed
    const greetEmbed = new EmbedBuilder()
      .setColor(0xf47fff)
      .setTitle("New Server Boost")
      .setDescription(`${interaction.user} has boosted the server.`)
      .addFields(
        { name: "Total Boosts", value: "3", inline: true },
        { name: "Member", value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    await interaction.followUp({
      content: "**[1/6] Greet channel — boost start announcement:**",
      embeds: [greetEmbed],
    });

    // 2. Boost start log embed
    const logStartEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Boost Started")
      .addFields(
        { name: "User", value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
        { name: "Total Boost Count", value: "3", inline: true }
      )
      .setTimestamp();

    await interaction.followUp({
      content: "**[2/6] Log channel — boost started:**",
      embeds: [logStartEmbed],
    });

    // 3. Boost end log embed
    const logEndEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Boost Ended")
      .addFields(
        { name: "User", value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
        { name: "Historical Boost Count", value: "3", inline: true }
      )
      .setTimestamp();

    await interaction.followUp({
      content: "**[3/6] Log channel — boost ended:**",
      embeds: [logEndEmbed],
    });

    // 4. /booster check embed
    const checkEmbed = new EmbedBuilder()
      .setColor(0xf47fff)
      .setTitle(`Booster Info: ${interaction.user.username}`)
      .addFields(
        { name: "Status", value: "Active", inline: true },
        { name: "Boost Count", value: "3", inline: true },
        { name: "Custom Role", value: "@MyCustomRole", inline: true },
        { name: "Private Channel", value: "#boost-channel", inline: true },
        { name: "First Boosted", value: new Date().toLocaleDateString(), inline: true },
        { name: "Last Updated", value: new Date().toLocaleDateString(), inline: true }
      )
      .setTimestamp();

    await interaction.followUp({
      content: "**[4/6] /booster check response:**",
      embeds: [checkEmbed],
    });

    // 5. /booster stats embed
    const statsEmbed = new EmbedBuilder()
      .setColor(0xf47fff)
      .setTitle("Server Boost Statistics")
      .addFields(
        { name: "Current Boosters", value: "12", inline: true },
        { name: "Total Boosts (All Time)", value: "47", inline: true },
        { name: "Unique Boosters (All Time)", value: "19", inline: true }
      )
      .setTimestamp();

    await interaction.followUp({
      content: "**[5/6] /booster stats response:**",
      embeds: [statsEmbed],
    });

    // 6. DM preview
    await interaction.followUp({
      content:
        "**[6/6] DM sent to booster on boost start:**\n> Thank you for boosting the server! You now have access to booster perks.",
    });
  },
})