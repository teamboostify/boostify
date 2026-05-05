import {
  Guild,
  GuildMember,
  Role,
  ColorResolvable,
  resolveColor,
} from "discord.js";
import {
  setCustomRole,
  getCustomRole,
  patchCustomRoleStoredName,
} from "./boosterService.js";

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
      if (role) await member.roles.add(role);
    }
  }

  for (const roleId of ineligibleRoleIds) {
    if (member.roles.cache.has(roleId)) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) await member.roles.remove(role);
    }
  }
}

export async function removeAllLevelRoles(member: GuildMember): Promise<void> {
  for (const lr of BOOST_LEVEL_ROLES) {
    if (member.roles.cache.has(lr.roleId)) {
      const role = member.guild.roles.cache.get(lr.roleId);
      if (role) await member.roles.remove(role);
    }
  }
}

export async function createCustomRole(
  guild: Guild,
  member: GuildMember,
  name: string,
  color: ColorResolvable
): Promise<Role> {
  const role = await guild.roles.create({
    name,
    colors: { primaryColor: resolveColor(color) },
    permissions: [],
  });

  await member.roles.add(role);
  await setCustomRole(member.id, guild.id, role.id, role.name);

  return role;
}

export async function deleteCustomRole(
  guild: Guild,
  userId: string
): Promise<void> {
  const customRole = await getCustomRole(userId, guild.id);
  if (!customRole) return;

  const role = guild.roles.cache.get(customRole.discordRoleId);
  if (role) await role.delete();

  await setCustomRole(userId, guild.id, null);
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

  await role.edit({
    ...(name ? { name } : {}),
    ...(color ? { colors: { primaryColor: resolveColor(color) } } : {}),
  });

  await patchCustomRoleStoredName(userId, guild.id, role.name);

  return role;
}