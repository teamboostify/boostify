import {
  Guild,
  GuildMember,
  Role,
  ColorResolvable,
  GuildFeature,
  PermissionFlagsBits,
  Constants,
  resolveColor,
  RoleColorsEditResolvable,
  RoleColorsResolvable,
} from "discord.js";
import axios from "axios";
import {
  setCustomRole,
  getCustomRole,
  patchCustomRoleStoredName,
} from "./boosterService.js";
import { auditLog } from "./auditService.js";
import { prisma } from "../libs/database.js";
import type { Prisma } from "../generated/prisma/client.js";
import { logger } from "../libs/logger.js";

export interface LevelRoleConfig {
  minBoosts: number;
  discordRoleId: string;
  name?: string;
}

export interface StyleTiers {
  gradientMinBoosts: number;
  holographicMinBoosts: number;
  roleIconMinBoosts: number;
}

const GRADIENT_SUPPORT_FEATURE = "ENHANCED_ROLE_COLORS" as GuildFeature;
const ROLE_ICONS_FEATURE = "ROLE_ICONS" as GuildFeature;

export function guildSupportsGradient(guild: Guild): boolean {
  return guild.features.includes(GRADIENT_SUPPORT_FEATURE);
}

export function guildSupportsRoleIcons(guild: Guild): boolean {
  return guild.features.includes(ROLE_ICONS_FEATURE);
}

function isLevelRoleConfig(value: unknown): value is LevelRoleConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.minBoosts === "number" &&
    typeof v.discordRoleId === "string"
  );
}

export async function getLevelRoleConfig(
  discordGuildId: string
): Promise<LevelRoleConfig[]> {
  const guild = await prisma.guild.findUnique({
    where: { discordId: discordGuildId },
  });
  const raw = guild?.levelRoles;
  if (!Array.isArray(raw)) return [];
  const list = raw as unknown[];
  return list.filter(isLevelRoleConfig);
}

export async function setLevelRoleConfig(
  discordGuildId: string,
  config: LevelRoleConfig[]
): Promise<void> {
  await prisma.guild.update({
    where: { discordId: discordGuildId },
    data: { levelRoles: config as unknown as Prisma.InputJsonValue },
  });
}

export async function getStyleTiers(discordGuildId: string): Promise<StyleTiers> {
  const guild = await prisma.guild.findUnique({
    where: { discordId: discordGuildId },
  });
  return {
    gradientMinBoosts: guild?.gradientMinBoosts ?? 2,
    holographicMinBoosts: guild?.holographicMinBoosts ?? 3,
    roleIconMinBoosts: guild?.roleIconMinBoosts ?? 3,
  };
}

type RoleStyle = "solid" | "gradient" | "holographic";

export interface CustomRoleCreateOptions {
  gradientColor?: ColorResolvable;
  holographic?: boolean;
  icon?: string;
  silent?: boolean;
}

export interface CustomRoleEditOptions {
  name?: string;
  color?: ColorResolvable;
  gradientColor?: ColorResolvable;
  holographic?: boolean;
  icon?: string;
}

export interface StoredRoleStyle {
  discordRoleId: string;
  name: string | null;
  color: string | null;
  gradientColor: string | null;
  holographic: boolean | null;
  icon: string | null;
}

export async function restoreCustomRole(
  guild: Guild,
  member: GuildMember,
  record: StoredRoleStyle
): Promise<Role | null> {
  return createCustomRole(
    guild,
    member,
    record.name || "Custom Booster Role",
    (record.color as ColorResolvable) ?? "#000000",
    {
      gradientColor: (record.gradientColor as ColorResolvable) ?? undefined,
      holographic: record.holographic ?? false,
      icon: record.icon ?? undefined,
      silent: true,
    },
  );
}

function buildRoleColors(
  style: RoleStyle,
  color: ColorResolvable,
  gradientColor?: ColorResolvable
): RoleColorsEditResolvable {
  switch (style) {
    case "holographic":
      return {
        primaryColor: Constants.HolographicStyle.Primary,
        secondaryColor: Constants.HolographicStyle.Secondary,
        tertiaryColor: Constants.HolographicStyle.Tertiary,
      };
    case "gradient":
      return { primaryColor: color, secondaryColor: gradientColor };
    default:
      return { primaryColor: color };
  }
}

function colorToHex(value: ColorResolvable): string {
  return `#${resolveColor(value).toString(16).padStart(6, "0")}`;
}

async function fetchRoleIcon(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

export async function assignLevelRoles(
  member: GuildMember,
  boostCount: number
): Promise<void> {
  const levelRoles = await getLevelRoleConfig(member.guild.id);
  if (levelRoles.length === 0) return;

  const eligibleRoleIds = levelRoles
    .filter((lr) => boostCount >= lr.minBoosts)
    .map((lr) => lr.discordRoleId);

  const ineligibleRoleIds = levelRoles
    .filter((lr) => boostCount < lr.minBoosts)
    .map((lr) => lr.discordRoleId);

  for (const roleId of eligibleRoleIds) {
    if (!member.roles.cache.has(roleId)) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) {
        try {
          await member.roles.add(role);
        } catch (error) {
          logger.error(`Failed to add level role ${role.name} (${roleId}) to ${member.user.tag}:`, error);
        }
      } else {
        logger.warn(`Level role ${roleId} not found in guild ${member.guild.id}`);
      }
    }
  }

  for (const roleId of ineligibleRoleIds) {
    if (member.roles.cache.has(roleId)) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) {
        try {
          await member.roles.remove(role);
        } catch (error) {
          logger.error(`Failed to remove level role ${role.name} (${roleId}) from ${member.user.tag}:`, error);
        }
      }
    }
  }
}

export async function removeAllLevelRoles(member: GuildMember): Promise<void> {
  const levelRoles = await getLevelRoleConfig(member.guild.id);

  for (const lr of levelRoles) {
    const role = member.guild.roles.cache.get(lr.discordRoleId);
    if (role && member.roles.cache.has(lr.discordRoleId)) {
      try {
        await member.roles.remove(role);
      } catch (error) {
        logger.error(`Failed to remove level role ${role.name} (${lr.discordRoleId}) from ${member.user.tag}:`, error);
      }
    }
  }
}

export async function createCustomRole(
  guild: Guild,
  member: GuildMember,
  name: string,
  color: ColorResolvable,
  options: CustomRoleCreateOptions = {}
): Promise<Role | null> {
  const botMember = guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    logger.error(`Bot lacks ManageRoles permission in guild ${guild.id}`);
    if (!options.silent) {
      await member.send("I don't have permission to manage roles. Please contact an admin.").catch(() => {});
    }
    return null;
  }
  const botHighestRole = botMember.roles.highest;
  const newRolePosition = botHighestRole.position - 1;

  if (newRolePosition < 0) {
    logger.error(`Bot's highest role is too low to create new roles in guild ${guild.id}`);
    if (!options.silent) {
      await member.send("I cannot create roles because my highest role is too low. Please move my role higher in the role hierarchy.").catch(() => {});
    }
    return null;
  }

  const supportsGradient = guildSupportsGradient(guild);
  const supportsRoleIcons = guildSupportsRoleIcons(guild);

  const style: RoleStyle =
    supportsGradient && options.holographic
      ? "holographic"
      : supportsGradient && options.gradientColor
        ? "gradient"
        : "solid";

  let roleIcon: Buffer | undefined;
  if (options.icon && supportsRoleIcons) {
    try {
      roleIcon = await fetchRoleIcon(options.icon);
    } catch (error) {
      logger.error(`Failed to fetch role icon for ${member.user.tag}:`, error);
    }
  }

  try {
    const role = await guild.roles.create({
      name,
      permissions: [],
      position: newRolePosition,
      colors: buildRoleColors(
        style,
        color,
        options.gradientColor
      ) as RoleColorsResolvable,
      ...(roleIcon ? { icon: roleIcon } : {}),
    });

    try {
      await member.roles.add(role);
    } catch (addError) {
      logger.error(`Failed to add custom role ${role.id} to ${member.user.tag}:`, addError);
      await role.delete();
      if (!options.silent) {
        await member.send(`I created your custom role but couldn't assign it to you due to permission issues. Please contact an admin.`).catch(() => {});
      }
      return null;
    }

    await setCustomRole(member.id, guild.id, role.id, {
      name: role.name,
      color: colorToHex(color),
      gradientColor:
        style === "gradient" && options.gradientColor
          ? colorToHex(options.gradientColor)
          : null,
      holographic: style === "holographic",
      icon:
        options.icon && supportsRoleIcons && roleIcon ? options.icon : null,
    });

    if (!options.silent) {
      await auditLog(guild, {
        type: "success",
        title: "Custom role created",
        description: `<@${member.id}> created their custom role.`,
        fields: [
          { name: "User", value: `<@${member.id}>`, inline: true },
          { name: "Role", value: `<@&${role.id}>`, inline: true },
        ],
      });
    }

    return role;
  } catch (error) {
    logger.error(`Failed to create custom role for ${member.user.tag} in guild ${guild.id}:`, error);

    if (!options.silent) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Missing Permissions")) {
        await member.send("I don't have permission to create roles. Please make sure I have the 'Manage Roles' permission and my role is high enough in the hierarchy.").catch(() => {});
      } else {
        await member.send("Failed to create your custom role due to an unexpected error. Please try again or contact an admin.").catch(() => {});
      }
    }

    return null;
  }
}

export async function deleteCustomRole(
  guild: Guild,
  userId: string
): Promise<boolean> {
  const customRole = await getCustomRole(userId, guild.id);
  if (!customRole) return false;

  const role = guild.roles.cache.get(customRole.discordRoleId);
  if (role) {
    try {
      await role.delete();
    } catch (error) {
      logger.error(`Failed to delete custom role ${customRole.discordRoleId} for user ${userId}:`, error);
      return false;
    }
  }

  await setCustomRole(userId, guild.id, null);

  await auditLog(guild, {
    type: "warning",
    title: "Custom role deleted",
    description: `<@${userId}> deleted their custom role.`,
    fields: [
      { name: "User", value: `<@${userId}>`, inline: true },
      { name: "Role", value: `<@&${customRole.discordRoleId}>`, inline: true },
    ],
  });

  return true;
}

export async function updateCustomRole(
  guild: Guild,
  userId: string,
  options: CustomRoleEditOptions = {}
): Promise<Role | null> {
  const customRole = await getCustomRole(userId, guild.id);
  if (!customRole) return null;

  const role = guild.roles.cache.get(customRole.discordRoleId);
  if (!role) return null;

  const supportsGradient = guildSupportsGradient(guild);
  const supportsRoleIcons = guildSupportsRoleIcons(guild);

  const visualChanged =
    options.color !== undefined ||
    options.gradientColor !== undefined ||
    options.holographic !== undefined;

  const primary: ColorResolvable | undefined =
    options.color ?? (customRole.color as ColorResolvable) ?? role.color ?? undefined;
  const gradient: ColorResolvable | undefined =
    options.gradientColor ?? (customRole.gradientColor as ColorResolvable) ?? undefined;
  const appliesHolographic =
    options.holographic === true
      ? true
      : options.holographic === false
        ? false
        : options.gradientColor
          ? false
          : customRole.holographic ?? false;

  const style: RoleStyle = appliesHolographic
    ? supportsGradient
      ? "holographic"
      : "solid"
    : supportsGradient && gradient
      ? "gradient"
      : "solid";

  const editOptions: {
    name?: string;
    colors?: RoleColorsEditResolvable;
    icon?: Buffer;
  } = {};

  if (options.name) editOptions.name = options.name;

  if (visualChanged && primary !== undefined) {
    const colorsPayload = buildRoleColors(style, primary, gradient);
    const currentColors = role.colors;

    if (
      style === "solid" &&
      (currentColors?.secondaryColor || currentColors?.tertiaryColor)
    ) {
      colorsPayload.secondaryColor = null;
      colorsPayload.tertiaryColor = null;
    }

    editOptions.colors = colorsPayload;
  }

  if (options.icon !== undefined && supportsRoleIcons) {
    try {
      editOptions.icon = await fetchRoleIcon(options.icon);
    } catch (error) {
      logger.error(`Failed to fetch role icon for user ${userId}:`, error);
    }
  }

  try {
    await role.edit(editOptions);

    await patchCustomRoleStoredName(userId, guild.id, role.name);

    if (visualChanged || options.icon !== undefined) {
      await setCustomRole(userId, guild.id, role.id, {
        name: role.name,
        color: primary !== undefined ? colorToHex(primary) : undefined,
        gradientColor:
          style === "gradient" && gradient !== undefined
            ? colorToHex(gradient)
            : null,
        holographic: style === "holographic",
        icon: options.icon !== undefined ? options.icon : undefined,
      });
    }

    await auditLog(guild, {
      type: "info",
      title: "Custom role updated",
      description: `<@${userId}> updated their custom role.`,
      fields: [
        { name: "User", value: `<@${userId}>`, inline: true },
        { name: "Role", value: `<@&${role.id}>`, inline: true },
      ],
    });

    return role;
  } catch (error) {
    logger.error(`Failed to update custom role ${customRole.discordRoleId} for user ${userId}:`, error);

    if (error instanceof Error && error.message.includes("Missing Permissions")) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.send("I couldn't update your custom role due to missing permissions. Please contact an admin to check my role position.").catch(() => {});
      }
    }

    return null;
  }
}