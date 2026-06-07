import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import axios from "axios";
import { Command } from "../base/classes/command.js";
import packageInfo from "../../package.json" with { type: "json" };

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

    const uptime = interaction.client.uptime;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor(uptime / 3600000) % 24;
    const minutes = Math.floor(uptime / 60000) % 60;
    const seconds = Math.floor(uptime / 1000) % 60;
    
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

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
            .map((user) => `[@${user.login}](${user.html_url})`)
            .join("\n"),
          inline: true,
        },
        {
          name: "Version",
          value: `\`v${packageInfo.version}\``,
          inline: true,
        },
        {
          name: "Uptime",
          value: uptimeString,
          inline: true,
        },
        {
          name: "How was I made?",
          value: "I was built using TypeScript and discord.js.",
          inline: false,
        },
        {
          name: "Statistics",
          value: `**Servers:** ${interaction.client.guilds.cache.size}\n` +
                `**Users:** ${interaction.client.users.cache.size}\n`,
          inline: true,
        },
        {
          name: "Ping",
          value: `${Math.round(interaction.client.ws.ping)}ms`,
          inline: true,
        },
        {
          name: "Created On",
          value: `<t:${Math.floor(interaction.client.user.createdTimestamp / 1000)}:D>`,
          inline: true,
        },
        {
          name: "Node.js Version",
          value: process.version,
          inline: true,
        },
        {
          name: "discord.js Version",
          value: packageInfo.dependencies["discord.js"] || "Unknown",
          inline: true,
        }
      )
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    const website = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Website")
      .setURL("https://boostify.breaddevv.cc/");

    const terms = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Terms")
      .setURL("https://boostify.breaddevv.cc/terms");

    const privacy = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Privacy")
      .setURL("https://boostify.breaddevv.cc/privacy");

    const support = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Support Server")
      .setURL("https://boostify.breaddevv.cc/discord");

      const repo = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Our Repository")
      .setURL("https://boostify.breaddevv.cc/github");

    const actionBar = new ActionRowBuilder<ButtonBuilder>().setComponents(
      website,
      terms,
      privacy,
      support,
      repo
    );

    await interaction.editReply({
      embeds: [embed],
      components: [actionBar],
    });
  },
})