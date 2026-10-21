import { ChatInputCommandInteraction } from "discord.js";
import { db } from "../prisma/db.js";
import { upsertOnUniqueIndex } from "../prisma/upsert.js";
import type { Models } from "../prisma/contract.js";
import type { Shape } from "@prisma/orm-postgres/family-contract/types";
import { toTimestampString } from "../libs/timestamps.js";

type BoosterWithRole = Shape<Models.public_Booster, { "+": "customRole" }>;

export interface BoosterResult {
  success: boolean;
  data: BoosterWithRole | null;
}

export async function ensureGuild(
  discordId: string,
  name: string,
  iconUrl?: string | null
) {
  return upsertOnUniqueIndex(db.orm.public.Guild, {
    create: { discordId, name, iconUrl },
    update: { name, iconUrl },
    conflictOn: { discordId },
  });
}

export async function getBooster(
  userId: string,
  interaction: ChatInputCommandInteraction
): Promise<BoosterResult | null> {
  const resolvedGuild = await interaction.guild?.fetch();
  if (!resolvedGuild) return null;

  const guild = await ensureGuild(
    resolvedGuild.id,
    resolvedGuild.name,
    resolvedGuild.iconURL()
  );

  const data = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  })
    .include("customRole")
    .first();

  return { success: true, data };
}

export async function ensureBoosterWhileBoosting(
  userId: string,
  guildDiscordId: string,
  guildName: string,
  guildIconUrl?: string | null
): Promise<BoosterWithRole> {
  const guild = await ensureGuild(guildDiscordId, guildName, guildIconUrl);
  const existing = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  })
    .include("customRole")
    .first();

  if (existing) {
    if (!existing.active) {
      const reactivated = await db.orm.public.Booster.where({ id: existing.id })
        .include("customRole")
        .update({ active: true });
      return reactivated ?? existing;
    }
    return existing;
  }

  return db.orm.public.Booster.include("customRole").create({
    userId,
    guildId: guild.id,
    active: true,
    boostCounts: 0,
  });
}

export async function scheduleCustomRoleDeletionAfterGrace(
  userId: string,
  guildDiscordId: string
): Promise<void> {
  const guild = await db.orm.public.Guild.where({
    discordId: guildDiscordId,
  }).first();
  if (!guild) return;

  const booster = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  })
    .include("customRole")
    .first();
  if (!booster?.customRole) return;

  const graceMs = 3 * 24 * 60 * 60 * 1000;
  await db.orm.public.CustomRole.where({ id: booster.customRole.id }).update({
    deleteScheduledAt: toTimestampString(new Date(Date.now() + graceMs)),
  });
}

export async function clearPendingCustomRoleDeletion(boosterId: string): Promise<void> {
  const role = await db.orm.public.CustomRole.where({ boosterId }).first();
  if (!role?.deleteScheduledAt) return;

  await db.orm.public.CustomRole.where({ id: role.id }).update({
    deleteScheduledAt: null,
  });
}

export async function patchCustomRoleStoredName(
  userId: string,
  guildDiscordId: string,
  name: string
): Promise<void> {
  const guild = await db.orm.public.Guild.where({
    discordId: guildDiscordId,
  }).first();
  if (!guild) return;

  const booster = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  })
    .include("customRole")
    .first();
  if (!booster?.customRole) return;

  await db.orm.public.CustomRole.where({ id: booster.customRole.id }).update({
    name,
  });
}

export async function getAllBoosters(guildDiscordId: string) {
  return await db.orm.public.Booster.where((b) =>
    b.guild.some((g) => g.discordId.eq(guildDiscordId))
  )
    .include("customRole")
    .all();
}

export async function getActiveBoosters(guildDiscordId: string) {
  return await db.orm.public.Booster.where((b) =>
    b.guild.some((g) => g.discordId.eq(guildDiscordId))
  )
    .where((b) => b.active.eq(true))
    .include("customRole")
    .all();
}

export async function getTotalBoosts(guildDiscordId: string): Promise<number> {
  const result = await db.orm.public.Booster.where((b) =>
    b.guild.some((g) => g.discordId.eq(guildDiscordId))
  ).aggregate((a) => ({ total: a.sum("boostCounts") }));

  return result.total ?? 0;
}

export async function registerBoost(
  userId: string,
  guildDiscordId: string,
  guildName: string,
  guildIconUrl?: string | null
) {
  const guild = await ensureGuild(guildDiscordId, guildName, guildIconUrl);

  const existing = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  }).first();

  if (existing) {
    return db.orm.public.Booster.where({ id: existing.id })
      .include("customRole")
      .update({
        active: true,
        boostCounts: (existing.boostCounts ?? 0) + 1,
        boostedAt: toTimestampString(new Date()),
      });
  }

  return db.orm.public.Booster.include("customRole").create({
    userId,
    guildId: guild.id,
    active: true,
    boostCounts: 1,
  });
}

export async function removeBoost(userId: string, guildDiscordId: string) {
  const guild = await db.orm.public.Guild.where({
    discordId: guildDiscordId,
  }).first();
  if (!guild) return null;

  const existing = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  }).first();
  if (!existing) return null;

  return db.orm.public.Booster.where({ id: existing.id })
    .include("customRole")
    .update({ active: false });
}

export async function addBoostCount(
  userId: string,
  guildDiscordId: string,
  amount: number
) {
  const guild = await db.orm.public.Guild.where({
    discordId: guildDiscordId,
  }).first();
  if (!guild) return null;

  const existing = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  }).first();
  if (!existing) return null;

  return db.orm.public.Booster.where({ id: existing.id }).update({
    boostCounts: (existing.boostCounts ?? 0) + amount,
  });
}

export async function removeBoostCount(
  userId: string,
  guildDiscordId: string,
  amount: number
) {
  const guild = await db.orm.public.Guild.where({
    discordId: guildDiscordId,
  }).first();
  if (!guild) return null;

  const booster = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  }).first();
  if (!booster) return null;

  return db.orm.public.Booster.where({ id: booster.id }).update({
    boostCounts: Math.max(0, (booster.boostCounts ?? 0) - amount),
  });
}

export interface CustomRoleData {
  name?: string | null;
  color?: string | null;
  gradientColor?: string | null;
  holographic?: boolean | null;
  icon?: string | null;
}

export async function setCustomRole(
  userId: string,
  guildDiscordId: string,
  discordRoleId: string | null,
  data?: CustomRoleData
) {
  const guild = await db.orm.public.Guild.where({
    discordId: guildDiscordId,
  }).first();
  if (!guild) return null;

  const booster = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  }).first();
  if (!booster) return null;

  if (discordRoleId === null) {
    await db.orm.public.CustomRole.where({ boosterId: booster.id }).delete();
    return null;
  }

  const name = data?.name?.trim() ?? "";

  return upsertOnUniqueIndex(db.orm.public.CustomRole, {
    create: {
      boosterId: booster.id,
      discordRoleId,
      name,
      ...(data?.color ? { color: data.color } : {}),
      ...(data?.gradientColor ? { gradientColor: data.gradientColor } : {}),
      ...(data?.holographic !== undefined && data.holographic
        ? { holographic: true }
        : {}),
      ...(data?.icon ? { icon: data.icon } : {}),
    },
    update: {
      discordRoleId,
      ...(name ? { name } : {}),
      ...(data?.color !== undefined ? { color: data.color } : {}),
      ...(data?.gradientColor !== undefined
        ? { gradientColor: data.gradientColor }
        : {}),
      ...(data?.holographic !== undefined && data.holographic !== null
        ? { holographic: data.holographic }
        : {}),
      ...(data?.icon !== undefined ? { icon: data.icon } : {}),
    },
    conflictOn: { boosterId: booster.id },
  });
}

export async function getCustomRole(userId: string, guildDiscordId: string) {
  const guild = await db.orm.public.Guild.where({
    discordId: guildDiscordId,
  }).first();
  if (!guild) return null;

  const booster = await db.orm.public.Booster.where({
    userId,
    guildId: guild.id,
  })
    .include("customRole")
    .first();

  return booster?.customRole ?? null;
}
