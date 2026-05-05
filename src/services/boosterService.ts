import { ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../libs/database.js";
import { Prisma } from "../generated/prisma/client.js";

type BoosterWithRole = Prisma.BoosterGetPayload<{
  include: { customRole: true };
}>;

export interface BoosterResult {
  success: boolean;
  data: BoosterWithRole | null;
}

export async function ensureGuild(
  discordId: string,
  name: string,
  iconUrl?: string | null
) {
  return prisma.guild.upsert({
    where: { discordId },
    update: { name, iconUrl },
    create: { discordId, name, iconUrl },
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

  const data = await prisma.booster.findFirst({
    where: { userId, guildId: guild.id },
    include: { customRole: true },
  });

  return { success: true, data };
}

export async function ensureBoosterWhileBoosting(
  userId: string,
  guildDiscordId: string,
  guildName: string,
  guildIconUrl?: string | null
): Promise<BoosterWithRole> {
  const guild = await ensureGuild(guildDiscordId, guildName, guildIconUrl);
  const existing = await prisma.booster.findUnique({
    where: { userId_guildId: { userId, guildId: guild.id } },
    include: { customRole: true },
  });

  if (existing) {
    if (!existing.active) {
      return prisma.booster.update({
        where: { id: existing.id },
        data: { active: true },
        include: { customRole: true },
      });
    }
    return existing;
  }

  return prisma.booster.create({
    data: {
      userId,
      guildId: guild.id,
      active: true,
      boostCounts: 0,
    },
    include: { customRole: true },
  });
}

export async function scheduleCustomRoleDeletionAfterGrace(
  userId: string,
  guildDiscordId: string
): Promise<void> {
  const guild = await prisma.guild.findUnique({
    where: { discordId: guildDiscordId },
  });
  if (!guild) return;

  const booster = await prisma.booster.findUnique({
    where: { userId_guildId: { userId, guildId: guild.id } },
    include: { customRole: true },
  });
  if (!booster?.customRole) return;

  const graceMs = 3 * 24 * 60 * 60 * 1000;
  await prisma.customRole.update({
    where: { id: booster.customRole.id },
    data: { deleteScheduledAt: new Date(Date.now() + graceMs) },
  });
}

export async function clearPendingCustomRoleDeletion(boosterId: string): Promise<void> {
  await prisma.customRole.updateMany({
    where: { boosterId, deleteScheduledAt: { not: null } },
    data: { deleteScheduledAt: null },
  });
}

export async function patchCustomRoleStoredName(
  userId: string,
  guildDiscordId: string,
  name: string
): Promise<void> {
  const guild = await prisma.guild.findUnique({
    where: { discordId: guildDiscordId },
  });
  if (!guild) return;

  const booster = await prisma.booster.findUnique({
    where: { userId_guildId: { userId, guildId: guild.id } },
    include: { customRole: true },
  });
  if (!booster?.customRole) return;

  await prisma.customRole.update({
    where: { id: booster.customRole.id },
    data: { name },
  });
}

export async function getAllBoosters(guildDiscordId: string) {
  return prisma.booster.findMany({
    where: { guild: { discordId: guildDiscordId } },
    include: { customRole: true },
  });
}

export async function getActiveBoosters(guildDiscordId: string) {
  return prisma.booster.findMany({
    where: { guild: { discordId: guildDiscordId }, active: true },
    include: { customRole: true },
  });
}

export async function getTotalBoosts(guildDiscordId: string): Promise<number> {
  const result = await prisma.booster.aggregate({
    where: { guild: { discordId: guildDiscordId } },
    _sum: { boostCounts: true },
  });
  return result._sum.boostCounts ?? 0;
}


export async function registerBoost(
  userId: string,
  guildDiscordId: string,
  guildName: string,
  guildIconUrl?: string | null
) {
  const guild = await ensureGuild(guildDiscordId, guildName, guildIconUrl);

  const existing = await prisma.booster.findUnique({
    where: { userId_guildId: { userId, guildId: guild.id } },
  });

  if (existing) {
    return prisma.booster.update({
      where: { id: existing.id },
      data: {
        active: true,
        boostCounts: { increment: 1 },
        boostedAt: new Date(),
      },
      include: { customRole: true },
    });
  }

  return prisma.booster.create({
    data: {
      userId,
      guildId: guild.id,
      active: true,
      boostCounts: 1,
    },
    include: { customRole: true },
  });
}

export async function removeBoost(userId: string, guildDiscordId: string) {
  const guild = await prisma.guild.findUnique({
    where: { discordId: guildDiscordId },
  });
  if (!guild) return null;

  return prisma.booster.update({
    where: { userId_guildId: { userId, guildId: guild.id } },
    data: { active: false },
    include: { customRole: true },
  });
}

export async function addBoostCount(
  userId: string,
  guildDiscordId: string,
  amount: number
) {
  const guild = await prisma.guild.findUnique({
    where: { discordId: guildDiscordId },
  });
  if (!guild) return null;

  return prisma.booster.update({
    where: { userId_guildId: { userId, guildId: guild.id } },
    data: { boostCounts: { increment: amount } },
  });
}

export async function removeBoostCount(
  userId: string,
  guildDiscordId: string,
  amount: number
) {
  const guild = await prisma.guild.findUnique({
    where: { discordId: guildDiscordId },
  });
  if (!guild) return null;

  const booster = await prisma.booster.findUnique({
    where: { userId_guildId: { userId, guildId: guild.id } },
  });
  if (!booster) return null;

  return prisma.booster.update({
    where: { id: booster.id },
    data: {
      boostCounts: Math.max(0, (booster.boostCounts ?? 0) - amount),
    },
  });
}

export async function setCustomRole(
  userId: string,
  guildDiscordId: string,
  discordRoleId: string | null,
  roleName?: string | null
) {
  const guild = await prisma.guild.findUnique({
    where: { discordId: guildDiscordId },
  });
  if (!guild) return null;

  const booster = await prisma.booster.findUnique({
    where: { userId_guildId: { userId, guildId: guild.id } },
  });
  if (!booster) return null;

  if (discordRoleId === null) {
    await prisma.customRole.deleteMany({ where: { boosterId: booster.id } });
    return null;
  }

  const name = roleName?.trim() ?? "";

  return prisma.customRole.upsert({
    where: { boosterId: booster.id },
    update: {
      discordRoleId,
      ...(roleName !== undefined && roleName !== null ? { name } : {}),
    },
    create: {
      boosterId: booster.id,
      discordRoleId,
      name,
    },
  });
}

export async function getCustomRole(userId: string, guildDiscordId: string) {
  const guild = await prisma.guild.findUnique({
    where: { discordId: guildDiscordId },
  });
  if (!guild) return null;

  const booster = await prisma.booster.findUnique({
    where: { userId_guildId: { userId, guildId: guild.id } },
    include: { customRole: true },
  });

  return booster?.customRole ?? null;
}