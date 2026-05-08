import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} from "discord.js";
import {
  getBooster,
  addBoostCount,
  removeBoostCount,
  getAllBoosters,
  getActiveBoosters,
  getTotalBoosts,
  registerBoost,
} from "../services/boosterService.js";
import { Command } from "../base/classes/command.js";

export default new Command({
  info: new SlashCommandBuilder()
  .setName("booster")
    .setDescription("Booster management commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("check")
        .setDescription("Check booster info for a user")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The user to check").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add boost count to a user")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The user").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to add")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove boost count from a user")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The user").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to remove")
            .setRequired(true)
            .setMinValue(1)
          )
    )
    .addSubcommand((sub) =>
      sub.setName("stats").setDescription("View server boost statistics")
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    const discordGuild = interaction.guild;
    if (!discordGuild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (sub === "check") {
      const user = interaction.options.getUser("user", true);
      const result = await getBooster(user.id, interaction);
      const member = await discordGuild.members.fetch(user.id).catch(() => null);
      const isBoostingServer = member?.premiumSince !== null;
      const avatarUrl =
        member?.displayAvatarURL({ size: 256 }) ?? user.displayAvatarURL({ size: 256 });

      if (!result?.success) {
        await interaction.editReply({ content: "Could not load booster info for this server." });
        return;
      }

      if (!result.data) {
        if (isBoostingServer && member && member.premiumSince) {
          const discordBoost = `🟢 Boosting since <t:${Math.floor(member.premiumSince.getTime() / 1000)}:D>`;
          const embed = new EmbedBuilder()
            .setColor(0xff73fa)
            .setTitle(`Here is the Booster Information for ${user.id}!`)
            .setThumbnail(avatarUrl)
            .addFields(
              { name: "Status", value: "🟢 Active (Nitro Boost)", inline: true },
              { name: "Discord boost", value: discordBoost, inline: true },
              { name: "Custom Role", value: "None", inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const container = new ContainerBuilder()
          .setAccentColor(0xe642a4)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("**Uh oh!**"),
            new TextDisplayBuilder().setContent(`It looks like ${user} is not a Booster.`)
          );

        await interaction.editReply({
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          components: [container],
        });
        return;
      }

      const booster = result.data;

      const embed = new EmbedBuilder()
        .setColor(booster.active ? 0xf47fff : 0x99aab5)
        .setTitle(`Booster Info: ${user.username}`)
        .setThumbnail(avatarUrl)
        .addFields(
          { name: "Status", value: booster.active ? "🟢 Active" : "🔴 Inactive", inline: true },
          {
            name: "Custom Role",
            value: booster.customRole ? `<@&${booster.customRole.discordRoleId}>` : "None",
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "add") {
      const user = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);

      const targetMember = await discordGuild.members.fetch(user.id).catch(() => null);
      if (!targetMember?.premiumSince) {
        await interaction.editReply({
          content: `${user} is not currently boosting this server with Nitro, so boosts can't be added for them.`,
        });
        return;
      }

      await registerBoost(user.id, discordGuild.id, discordGuild.name, discordGuild.iconURL());

      const updated = await addBoostCount(user.id, discordGuild.id, amount);
      if (!updated) {
        await interaction.editReply({ content: "Failed to update boost count." });
        return;
      }

      const boostWord = amount === 1 ? "boost" : "boosts";
      const countWord = updated.boostCounts === 1 ? "boost" : "boosts";
      const container = new ContainerBuilder()
        .setAccentColor(0xe642a4)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Boost successfully added!**`
          ),
          new TextDisplayBuilder().setContent(
            `We've successfully added ${amount} ${boostWord} to ${user}'s profile.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        components: [container],
      });
      return;
    }

    if (sub === "remove") {
      const user = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);

      const updated = await removeBoostCount(user.id, discordGuild.id, amount);
      if (!updated) {
        await interaction.editReply({ content: `No booster record found for ${user.tag}.` });
        return;
      }

      await interaction.editReply({
        content: `Removed **${amount}** boost(s) from ${user.tag}. New count: **${updated.boostCounts}**.`,
      });
      return;
    }

    if (sub === "stats") {
      const [activeBoosters, allBoosters, totalBoosts] = await Promise.all([
        getActiveBoosters(discordGuild.id),
        getAllBoosters(discordGuild.id),
        getTotalBoosts(discordGuild.id),
      ]);

      const embed = new EmbedBuilder()
        .setColor(0xf47fff)
        .setTitle("Server Boost Statistics")
        .addFields(
          { name: "Current Boosters", value: String(activeBoosters.length), inline: true },
          { name: "Total Boosts (All Time)", value: String(totalBoosts), inline: true },
          { name: "Unique Boosters (All Time)", value: String(allBoosters.length), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  },
})