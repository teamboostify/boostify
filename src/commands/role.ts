import {
  SlashCommandBuilder,
  ColorResolvable,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} from "discord.js";
import { ensureBoosterWhileBoosting, getBooster } from "../services/boosterService.js";
import {
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  guildSupportsGradient,
  guildSupportsRoleIcons,
  getStyleTiers,
} from "../services/roleService.js";
import { Command } from "../base/classes/command.js";
import { Container } from "../base/functions/embed.js";

async function componentsV2(lines: string[]) {
  const container = await Container();
    container.addTextDisplayComponents(...lines.map((content) => new TextDisplayBuilder().setContent(content)));
  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [container],
  };
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const URL_REGEX = /^https?:\/\/.+/i;

function isValidIcon(url: string): boolean {
  if (!URL_REGEX.test(url)) return false;
  try {
    return /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export default new Command({
  info: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage your custom booster role")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create your custom role")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Role name").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("color").setDescription("Hex color (e.g. #ff0000)").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("gradient").setDescription("Second color to make your role a gradient.")
        )
        .addBooleanOption((opt) =>
          opt.setName("holographic").setDescription("Apply the holographic role style (overrides gradient).")
        )
        .addStringOption((opt) =>
          opt.setName("icon").setDescription("Image URL to use as the role icon.")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit your custom role")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("New role name").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("color").setDescription("New hex color").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("gradient").setDescription("New gradient color").setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt.setName("holographic").setDescription("Apply or remove the holographic style.").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("icon").setDescription("New role icon image URL").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("delete").setDescription("Delete your custom role")
    ),
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply(await componentsV2(["This command can only be used in a server."]));
      return;
    }

    const member = await guild.members.fetch(interaction.user.id);
    const resolved = await getBooster(interaction.user.id, interaction);

    if (!resolved?.success) {
      await interaction.reply(
        await componentsV2(["Could not load your guild data for this server."])
      );
      return;
    }

    const nitroBoosting = member.premiumSince !== null;

    if (!nitroBoosting) {
      await interaction.reply(
        await componentsV2([
          "**Uh oh!**",
          "You must be boosting this server with Nitro to use this command.",
        ])
      );
      return;
    }

    const boosterRecord =
      resolved.data ??
      (await ensureBoosterWhileBoosting(
        interaction.user.id,
        guild.id,
        guild.name,
        guild.iconURL()
      ));

    const supportsGradient = guildSupportsGradient(guild);
    const supportsRoleIcons = guildSupportsRoleIcons(guild);

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case "create": {
        if (boosterRecord.customRole) {
          await interaction.reply(
            await componentsV2([
              "You already have a custom role.",
              "Use `/role edit` to change it.",
            ])
          );
          return;
        }

        const name = interaction.options.getString("name", true);
        const color = interaction.options.getString("color", true);
        const gradient = interaction.options.getString("gradient");
        const holographic = interaction.options.getBoolean("holographic") ?? false;
        const icon = interaction.options.getString("icon");

        if (!HEX_COLOR_REGEX.test(color)) {
          await interaction.reply(
            await componentsV2([
              "Invalid color.",
              "Use a hex color like `#ff0000`.",
            ])
          );
          return;
        }

        if (gradient && !HEX_COLOR_REGEX.test(gradient)) {
          await interaction.reply(
            await componentsV2([
              "Invalid gradient color.",
              "Use a hex color like `#00ff00`.",
            ])
          );
          return;
        }

        if (icon && !isValidIcon(icon)) {
          await interaction.reply(
            await componentsV2([
              "Invalid icon URL.",
              "Use a direct image link ending in `.png`, `.jpg`, `.gif` or `.webp`.",
            ])
          );
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const tiers = await getStyleTiers(guild.id);
        const boostCount = boosterRecord.boostCounts ?? 0;

        let finalGradient = gradient as ColorResolvable | undefined;
        let finalHolographic = holographic;
        let finalIcon = icon ?? undefined;

        const styleNotes: string[] = [];
        if (finalHolographic && boostCount < tiers.holographicMinBoosts) {
          finalHolographic = false;
          styleNotes.push(
            `Holographic styling requires **${tiers.holographicMinBoosts} boosts** — falling back to your requested color.`,
          );
        } else if (finalGradient && boostCount < tiers.gradientMinBoosts) {
          finalGradient = undefined;
          styleNotes.push(
            `Gradient styling requires **${tiers.gradientMinBoosts} boosts** — falling back to a solid color.`,
          );
        }
        if (finalIcon && boostCount < tiers.roleIconMinBoosts) {
          finalIcon = undefined;
          styleNotes.push(
            `Role icons require **${tiers.roleIconMinBoosts} boosts** — skipping the icon.`,
          );
        }

        const role = await createCustomRole(guild, member, name, color as ColorResolvable, {
          gradientColor: finalGradient,
          holographic: finalHolographic,
          icon: finalIcon,
        });

        const notes: string[] = [...styleNotes];
        if ((finalGradient || finalHolographic) && !supportsGradient) {
          notes.push(
            "This server hasn't unlocked gradient or holographic roles yet, so only your main color was applied."
          );
        }
        if (finalIcon && !supportsRoleIcons) {
          notes.push(
            "This server hasn't unlocked role icons yet, so your icon was skipped."
          );
        }

        await interaction.editReply(
          await componentsV2([
            `**Custom role created!**`,
            `${role} is ready to use.`,
            ...notes.map((note) => `-# ${note}`),
          ])
        );
        break;
      }
      case "edit": {
        if (!boosterRecord.customRole?.discordRoleId) {
          await interaction.reply(
            await componentsV2(["You don't have a custom role yet.", "Use `/role create` first."])
          );
          return;
        }

        const name = interaction.options.getString("name") ?? undefined;
        const color = (interaction.options.getString("color") ?? undefined) as ColorResolvable | undefined;
        const gradient = (interaction.options.getString("gradient") ?? undefined) as ColorResolvable | undefined;
        const holographic = interaction.options.getBoolean("holographic") ?? undefined;
        const icon = interaction.options.getString("icon") ?? undefined;

        if (color && !HEX_COLOR_REGEX.test(color as string)) {
          await interaction.reply(
            await componentsV2([
              "Invalid color.",
              "Use a hex color like `#ff0000`.",
            ])
          );
          return;
        }

        if (gradient && !HEX_COLOR_REGEX.test(gradient as string)) {
          await interaction.reply(
            await componentsV2([
              "Invalid gradient color.",
              "Use a hex color like `#00ff00`.",
            ])
          );
          return;
        }

        if (icon && !isValidIcon(icon)) {
          await interaction.reply(
            await componentsV2([
              "Invalid icon URL.",
              "Use a direct image link ending in `.png`, `.jpg`, `.gif` or `.webp`.",
            ])
          );
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const tiers = await getStyleTiers(guild.id);
        const boostCount = boosterRecord.boostCounts ?? 0;

        let passGradient = gradient;
        let passHolographic = holographic;
        let passIcon = icon;
        const styleNotes: string[] = [];

        if (holographic === true && boostCount < tiers.holographicMinBoosts) {
          passHolographic = undefined;
          styleNotes.push(
            `Holographic styling requires **${tiers.holographicMinBoosts} boosts** — leaving it unchanged.`,
          );
        } else if (gradient !== undefined && boostCount < tiers.gradientMinBoosts) {
          passGradient = undefined;
          styleNotes.push(
            `Gradient styling requires **${tiers.gradientMinBoosts} boosts** — leaving it unchanged.`,
          );
        }
        if (icon !== undefined && boostCount < tiers.roleIconMinBoosts) {
          passIcon = undefined;
          styleNotes.push(
            `Role icons require **${tiers.roleIconMinBoosts} boosts** — leaving the current icon.`,
          );
        }

        const role = await updateCustomRole(guild, interaction.user.id, {
          name,
          color,
          gradientColor: passGradient,
          holographic: passHolographic,
          icon: passIcon,
        });
        if (!role) {
          await interaction.editReply(
            await componentsV2(["Couldn't update that role.", "It may have been deleted manually."])
          );
          return;
        }

        const notes: string[] = [...styleNotes];
        if ((gradient || holographic) && !supportsGradient) {
          notes.push(
            "This server hasn't unlocked gradient or holographic roles yet, so only your main color was applied."
          );
        }
        if (icon && !supportsRoleIcons) {
          notes.push(
            "This server hasn't unlocked role icons yet, so your icon was skipped."
          );
        }

        await interaction.editReply(
          await componentsV2([
            "**Custom role updated.**",
            ...notes.map((note) => `-# ${note}`),
          ])
        );
        break;
      }
      case "delete": {
        if (!boosterRecord.customRole?.discordRoleId) {
          await interaction.reply(await componentsV2(["You don't have a custom role to delete."]));
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await deleteCustomRole(guild, interaction.user.id);
        await interaction.editReply(await componentsV2(["**Custom role deleted.**"]));
        return;
      }
    }
  },
})
