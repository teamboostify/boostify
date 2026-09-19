import {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import axios from "axios";
import { Command } from "../base/classes/command.js";
import { Embed, Accent } from "../base/functions/embed.js";

interface GithubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string;
  prerelease: boolean;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export default new Command({
  info: new SlashCommandBuilder()
    .setName("changelog")
    .setDescription("Shows the latest Boostify updates."),
  async execute(interaction) {
    await interaction.deferReply();

    let releases: GithubRelease[];
    try {
      const res = await axios.get<GithubRelease[]>(
        "https://api.github.com/repos/teamboostify/boostify/releases",
        { params: { per_page: 5 } },
      );
      releases = res.data;
    } catch (error) {
      const embed = await Embed(Accent.error);
      embed.setTitle("Couldn't fetch the changelog")
        .setDescription(
          "Boostify couldn't reach the GitHub API right now. Please try again later.",
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (releases.length === 0) {
      const embed = await Embed();
      embed.setTitle("No releases yet")
        .setDescription("No official releases have been published so far.")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const [latest, ...older] = releases;
    const repoButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("View on GitHub")
      .setURL("https://boostify.breaddevv.cc/github");

    const embed = await Embed(Accent.brand);
    embed.setTitle(`Release ${latest.name ?? latest.tag_name}`)
      .setURL(latest.html_url)
      .setDescription(
        latest.body ? truncate(latest.body, 4000) : "No notes provided for this release.",
      )
      .addFields(
        {
          name: "Version",
          value: `\`${latest.tag_name}\``,
          inline: true,
        },
        {
          name: "Published",
          value: `<t:${Math.floor(new Date(latest.published_at).getTime() / 1000)}:R>`,
          inline: true,
        },
        latest.prerelease
          ? {
              name: "Type",
              value: "Pre-release",
              inline: true,
            }
          : {
              name: "Type",
              value: "Stable",
              inline: true,
            },
      );

    if (older.length > 0) {
      embed.addFields({
        name: "Previous releases",
        value: older
          .map(
            (r) =>
              `[${r.tag_name}](${r.html_url}) — <t:${Math.floor(new Date(r.published_at).getTime() / 1000)}:D>`,
          )
          .join("\n"),
      });
    }

    await interaction.editReply({
      embeds: [embed],
      components: [new ActionRowBuilder<ButtonBuilder>().setComponents(repoButton)],
    });
  },
});