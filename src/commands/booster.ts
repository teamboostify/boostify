import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextDisplayBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import {
  getBooster,
  addBoostCount,
  removeBoostCount,
  getAllBoosters,
  getActiveBoosters,
  getTotalBoosts,
  registerBoost,
  removeBoost,
  ensureGuild,
} from "../services/boosterService.js";
import {
  setLevelRoleConfig,
  getLevelRoleConfig,
  assignLevelRoles,
} from "../services/roleService.js";
import { Command } from "../base/classes/command.js";
import { logger } from "../libs/logger.js";
import { Container, Embed, Accent } from "../base/functions/embed.js";

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
          opt
            .setName("user")
            .setDescription("The user to check")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add boost count to a user")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The user").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to add")
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove boost count from a user")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The user").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to remove")
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("stats").setDescription("View server boost statistics"),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("roles")
        .setDescription("Configure boost reward roles")
        .addSubcommand((sub) =>
          sub
            .setName("add")
            .setDescription("Set a reward role for a boost count")
            .addRoleOption((opt) =>
              opt.setName("role").setDescription("The reward role").setRequired(true),
            )
            .addIntegerOption((opt) =>
              opt
                .setName("min-boosts")
                .setDescription("Minimum boosts to unlock this role")
                .setRequired(true)
                .setMinValue(1),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove a reward role")
            .addRoleOption((opt) =>
              opt.setName("role").setDescription("The reward role").setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub.setName("list").setDescription("List configured reward roles"),
        ),
    ),
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    const discordGuild = interaction.guild;
    if (!discordGuild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    if (group === "roles") {
      await ensureGuild(discordGuild.id, discordGuild.name, discordGuild.iconURL());

      const config = await getLevelRoleConfig(discordGuild.id);

      if (sub === "list") {
        if (config.length === 0) {
          await interaction.editReply({
            content: "No reward roles configured yet. Use `/booster roles add` to add one.",
          });
          return;
        }

        const embed = await Embed();
        embed.setTitle("Reward Roles")
          .setDescription(
            config
              .map((lr) => `<@&${lr.discordRoleId}> — **${lr.minBoosts} boost(s)**`)
              .join("\n"),
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (sub === "add") {
        const role = interaction.options.getRole("role", true);
        const minBoosts = interaction.options.getInteger("min-boosts", true);

        const next = [
          ...config.filter((lr) => lr.discordRoleId !== role.id),
          { minBoosts, discordRoleId: role.id, name: role.name },
        ];

        await setLevelRoleConfig(discordGuild.id, next);

        await interaction.editReply({
          content: `Set <@&${role.id}> as a reward role at **${minBoosts} boost(s)**.`,
        });
        return;
      }

      if (sub === "remove") {
        const role = interaction.options.getRole("role", true);
        const removed = config.filter((lr) => lr.discordRoleId === role.id);

        await setLevelRoleConfig(
          discordGuild.id,
          config.filter((lr) => lr.discordRoleId !== role.id),
        );

        if (removed.length === 0) {
          await interaction.editReply({
            content: `No reward role found for <@&${role.id}>.`,
          });
          return;
        }

        await interaction.editReply({
          content: `Removed <@&${role.id}> as a reward role.`,
        });
        return;
      }
    }

    if (sub === "check") {
      const user = interaction.options.getUser("user", true);
      const result = await getBooster(user.id, interaction);
      const member = await discordGuild.members
        .fetch(user.id)
        .catch(() => null);
      const isBoostingServer = member?.premiumSince !== null;
      const avatarUrl =
        member?.displayAvatarURL({ size: 256 }) ??
        user.displayAvatarURL({ size: 256 });

      if (!result?.success) {
        await interaction.editReply({
          content: "Could not load booster info for this server.",
        });
        return;
      }

      if (!result.data) {
        if (isBoostingServer && member && member.premiumSince) {
          const discordBoost = `🟢 Boosting since <t:${Math.floor(member.premiumSince.getTime() / 1000)}:D>`;
          const embed = await Embed();
            embed.setTitle(`Here is the Booster Information for ${user.id}!`)
            .setThumbnail(avatarUrl)
            .addFields(
              {
                name: "Status",
                value: "🟢 Active (Nitro Boost)",
                inline: true,
              },
              { name: "Discord boost", value: discordBoost, inline: true },
              { name: "Custom Role", value: "None", inline: true },
              { name: "User Ping", value: `<@${user.id}>` },
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const container = await Container();
          container.setAccentColor(0xe642a4)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("**Uh oh!**"),
            new TextDisplayBuilder().setContent(
              `It looks like ${user} is not a Booster.`,
            ),
          );

        await interaction.editReply({
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          components: [container],
        });
        return;
      }

      const booster = result.data;

      if (booster.boostCounts == 0) {
        try {
          await removeBoost(booster.userId, interaction.guild.id);
        } catch (err) {
          logger.error(
            `An error occured while removing ${booster.userId}'s data: ${err}`,
          );

          const supportButton = new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Our Support Server")
            .setURL("https://discord.gg/NUtyKs7hA6");

          const container = await Container(Accent.error)
            container.addTextDisplayComponents(
              new TextDisplayBuilder().setContent("**Uh oh!**"),
              new TextDisplayBuilder().setContent(
                `It looks like we ran into an issue\n-# If this issue is persistent, please consult your console logs if you're using a self-hosted version of Boostify, and create an issue on our [Repository](https://github.com/teamboostify/boostify/issues), or use our support server!.`,
              ),
            )
            .addSeparatorComponents((sep) =>
              sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addActionRowComponents((actrow) =>
              actrow.addComponents(supportButton),
            );

          await interaction.editReply({
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            components: [container],
          });
          return;
        }
      }

      const premiumSince = member?.premiumSince;
      const isActiveBooster =
        booster.active && booster.boostCounts > 0 && !!premiumSince;

      const embed = await Embed();
        embed.setColor(booster.active ? Accent.success : Accent.info)
        .setTitle(`Booster Info: ${user.username}`)
        .setThumbnail(avatarUrl)
        .addFields(
          {
            name: "Status",
            value: isActiveBooster ? "🟢 Active" : "🔴 Inactive",
            inline: true,
          },
          {
            name: "Custom Role",
            value: booster.customRole
              ? `<@&${booster.customRole.discordRoleId}>`
              : "None",
            inline: true,
          },
          {
            name: "Boosting since",
            value: premiumSince
              ? `<t:${Math.floor(premiumSince.getTime() / 1000)}:D>`
              : "Not currently boosting",
            inline: true,
          },
          {
            name: "Boosts Counts",
            value: booster.boostCounts.toString(),
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "add") {
      const user = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);

      const targetMember = await discordGuild.members
        .fetch(user.id)
        .catch(() => null);
      if (!targetMember?.premiumSince) {
        await interaction.editReply({
          content: `${user} is not currently boosting this server with Nitro, so boosts can't be added for them.`,
        });
        return;
      }

      const registered = await registerBoost(
        user.id,
        discordGuild.id,
        discordGuild.name,
        discordGuild.iconURL(),
      );

      const updated =
        amount > 1
          ? await addBoostCount(user.id, discordGuild.id, amount - 1)
          : registered;
      if (!updated) {
        await interaction.editReply({
          content: "Failed to update boost count.",
        });
        return;
      }

      const boostWord = amount === 1 ? "boost" : "boosts";
      await assignLevelRoles(targetMember, updated.boostCounts ?? amount);

      const container = await Container();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Boost successfully added!**`),
          new TextDisplayBuilder().setContent(
            `We've successfully added ${amount} ${boostWord} to ${user}'s profile.`,
          ),
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
        await interaction.editReply({
          content: `No booster record found for ${user.tag}.`,
        });
        return;
      }

      const targetMember = await discordGuild.members
        .fetch(user.id)
        .catch(() => null);
      if (targetMember) {
        await assignLevelRoles(targetMember, updated.boostCounts);
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

      const embed = await Embed();
        embed.setTitle("Server Boost Statistics")
        .addFields(
          {
            name: "Current Boosters",
            value: String(activeBoosters.length),
            inline: true,
          },
          {
            name: "Total Boosts (All Time)",
            value: String(totalBoosts),
            inline: true,
          },
          {
            name: "Unique Boosters (All Time)",
            value: String(allBoosters.length),
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  },
});
