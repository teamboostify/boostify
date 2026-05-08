import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import axios from "axios";
import { Command } from "../base/classes/command.js";

interface GithubRes {
  login: string,
  html_url: string
}

export default new Command({
  info: new SlashCommandBuilder()
    .setName("bot-info")
    .setDescription("Shows information regarding the bot"),
  async execute(interaction) {
    await interaction.deferReply();

    const info = await axios.get<GithubRes[]>(
      "https://api.github.com/repos/teamboostify/boostify/contributors"
    );

    const embed = new EmbedBuilder()
      .setColor(16712630)
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 2048 }))
      .setTitle("Bot information")
      .setDescription(
        "Boostify is a Discord bot designed to help you manage your server boosts."
      )
      .addFields(
        {
          name: "Developers",
          value: info.data
            .map((user) => `[${user.login}](${user.html_url})`)
            .join("\n"),
          inline: true,
        },
        {
          name: "How was I made?",
          value: "I was built using TypeScript and discord.js.",
          inline: false,
        }
      )
      .setTimestamp();

    const website = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Our Website")
      .setURL("https://boostify.breaddevv.cc/");

    const terms = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Terms of Service")
      .setURL("https://boostify.breaddevv.cc/terms");

    const privacy = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Privacy Policy")
      .setURL("https://boostify.breaddevv.cc/privacy");

    const actionBar = new ActionRowBuilder<ButtonBuilder>().setComponents(
      website,
      terms,
      privacy
    );

    await interaction.editReply({
      embeds: [embed],
      components: [actionBar],
    });
  },
})

