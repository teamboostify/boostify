import {
  Guild,
  GuildMember,
  Role,
  ColorResolvable,
  resolveColor,
  PermissionFlagsBits,
} from "discord.js";
import {
  setCustomRole,
  getCustomRole,
  patchCustomRoleStoredName,
} from "./boosterService.js";
import { logger } from "../libs/logger.js";

export interface BoostLevelRole {
  minBoosts: number;
  roleId: string;
}

const BOOST_LEVEL_ROLES: BoostLevelRole[] = [
  // { minBoosts: 1, roleId: "ROLE_ID_FOR_1X" },
  // { minBoosts: 3, roleId: "ROLE_ID_FOR_3X" },
  // { minBoosts: 5, roleId: "ROLE_ID_FOR_5X" },
];

export async function assignLevelRoles(
  member: GuildMember,
  boostCount: number
): Promise<void> {
  if (BOOST_LEVEL_ROLES.length === 0) return;

  const eligibleRoleIds = BOOST_LEVEL_ROLES
    .filter((lr) => boostCount >= lr.minBoosts)
    .map((lr) => lr.roleId);

  const ineligibleRoleIds = BOOST_LEVEL_ROLES
    .filter((lr) => boostCount < lr.minBoosts)
    .map((lr) => lr.roleId);

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
  for (const lr of BOOST_LEVEL_ROLES) {
    if (member.roles.cache.has(lr.roleId)) {
      const role = member.guild.roles.cache.get(lr.roleId);
      if (role) {
        try {
          await member.roles.remove(role);
        } catch (error) {
          logger.error(`Failed to remove level role ${role.name} (${lr.roleId}) from ${member.user.tag}:`, error);
        }
      }
    }
  }
}

export async function createCustomRole(
  guild: Guild,
  member: GuildMember,
  name: string,
  color: ColorResolvable,
  gradientColor: ColorResolvable
): Promise<Role | null> {
  const botMember = guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    logger.error(`Bot lacks ManageRoles permission in guild ${guild.id}`);
    await member.send("I don't have permission to manage roles. Please contact an admin.").catch(() => {});
    return null;
  }
  const botHighestRole = botMember.roles.highest;
  const newRolePosition = botHighestRole.position - 1;
  
  if (newRolePosition < 0) {
    logger.error(`Bot's highest role is too low to create new roles in guild ${guild.id}`);
    await member.send("I cannot create roles because my highest role is too low. Please move my role higher in the role hierarchy.").catch(() => {});
    return null;
  }

  try {
    const role = await guild.roles.create({
      name,
      permissions: [],
      position: newRolePosition,
    });

    try {
      await member.roles.add(role);
    } catch (addError) {
      logger.error(`Failed to add custom role ${role.id} to ${member.user.tag}:`, addError);
      await role.delete();
      await member.send(`I created your custom role but couldn't assign it to you due to permission issues. Please contact an admin.`).catch(() => {});
      return null;
    }

    await setCustomRole(member.id, guild.id, role.id, role.name);
    return role;
  } catch (error) {
    logger.error(`Failed to create custom role for ${member.user.tag} in guild ${guild.id}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Missing Permissions")) {
      await member.send("I don't have permission to create roles. Please make sure I have the 'Manage Roles' permission and my role is high enough in the hierarchy.").catch(() => {});
    } else {
      await member.send("Failed to create your custom role due to an unexpected error. Please try again or contact an admin.").catch(() => {});
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
  return true;
}

export async function updateCustomRole(
  guild: Guild,
  userId: string,
  name?: string,
  color?: ColorResolvable
): Promise<Role | null> {
  const customRole = await getCustomRole(userId, guild.id);
  if (!customRole) return null;

  const role = guild.roles.cache.get(customRole.discordRoleId);
  if (!role) return null;

  try {
    await role.edit({
      ...(name ? { name } : {}),
      ...(color ? { color } : {}),
    });

    await patchCustomRoleStoredName(userId, guild.id, role.name);
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