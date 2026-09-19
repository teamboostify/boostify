import {
  Client,
  Guild,
} from "discord.js";
import { prisma } from "../libs/database.js";
import { logger } from "../libs/logger.js";
import {
  getActiveBoosters,
  scheduleCustomRoleDeletionAfterGrace,
  clearPendingCustomRoleDeletion,
} from "./boosterService.js";
import { restoreCustomRole } from "./roleService.js";
import { auditLog } from "./auditService.js";

type BoostersWithRole = Awaited<ReturnType<typeof getActiveBoosters>>;
type BoosterWithRole = BoostersWithRole[number];

export async function processDueCustomRoleDeletions(client: Client): Promise<void> {
  const now = new Date();
  const due = await prisma.customRole.findMany({
    where: { deleteScheduledAt: { lte: now } },
    include: { booster: { include: { guild: true } } },
  });

  for (const cr of due) {
    try {
      const guild = await client.guilds.fetch(cr.booster.guild.discordId).catch(() => null);
      if (guild) {
        const discordRole =
          guild.roles.cache.get(cr.discordRoleId) ??
          (await guild.roles.fetch(cr.discordRoleId).catch(() => null));
        if (discordRole) {
          await discordRole.delete("Boost ended — grace period over").catch(() => {});
        }

        await auditLog(guild, {
          type: "warning",
          title: "Custom role deleted",
          description: `Removed <@&${cr.discordRoleId}> after the boost grace period ended for <@${cr.booster.userId}>.`,
          fields: [
            { name: "User", value: `<@${cr.booster.userId}>`, inline: true },
            { name: "Role", value: `<@&${cr.discordRoleId}>`, inline: true },
          ],
        });
      }
      await prisma.customRole.delete({ where: { id: cr.id } });
    } catch (err) {
      logger.error(`Custom role cleanup failed for ${cr.id}: ${String(err)}`);
    }
  }
}

export interface MaintenanceReport {
  guildId: string;
  boostersChecked: number;
  deletionsScheduled: number;
  deletionsCleared: number;
  rolesRestored: number;
  failures: number;
}

async function restoreMissingRole(
  guild: Guild,
  booster: BoosterWithRole,
): Promise<"restored" | "skipped" | "failed"> {
  if (!booster.customRole) return "skipped";

  const member = await guild.members.fetch(booster.userId).catch(() => null);
  if (!member) return "skipped";

  const role =
    guild.roles.cache.get(booster.customRole.discordRoleId) ??
    (await guild.roles.fetch(booster.customRole.discordRoleId).catch(() => null));
  if (role) return "skipped";

  const restored = await restoreCustomRole(guild, member, booster.customRole);

  if (!restored) return "failed";
  return "restored";
}

export async function runBoosterMaintenance(client: Client): Promise<MaintenanceReport[]> {
  const reports: MaintenanceReport[] = [];

  for (const guild of client.guilds.cache.values()) {
    const boosters = await getActiveBoosters(guild.id).catch(() => []);
    if (boosters.length === 0) continue;

    const report: MaintenanceReport = {
      guildId: guild.id,
      boostersChecked: boosters.length,
      deletionsScheduled: 0,
      deletionsCleared: 0,
      rolesRestored: 0,
      failures: 0,
    };

    for (const booster of boosters) {
      if (!booster.customRole) continue;

      try {
        const member = await guild.members.fetch(booster.userId).catch(() => null);
        const stillBoosting = member?.premiumSince != null;

        if (!stillBoosting) {
          if (!booster.customRole.deleteScheduledAt) {
            await scheduleCustomRoleDeletionAfterGrace(booster.userId, guild.id);
            report.deletionsScheduled++;

            await auditLog(guild, {
              type: "warning",
              title: "Boost ended — role deletion scheduled",
              description: `<@${booster.userId}> stopped boosting. Their custom role will be removed after the grace period.`,
              fields: [
                { name: "User", value: `<@${booster.userId}>`, inline: true },
                { name: "Role", value: `<@&${booster.customRole.discordRoleId}>`, inline: true },
              ],
            });
          }
          continue;
        }

        if (booster.customRole.deleteScheduledAt) {
          await clearPendingCustomRoleDeletion(booster.id);
          report.deletionsCleared++;

          await auditLog(guild, {
            type: "success",
            title: "Boost resumed — deletion cancelled",
            description: `<@${booster.userId}> is boosting again, so their custom role will be kept.`,
            fields: [{ name: "User", value: `<@${booster.userId}>`, inline: true }],
          });
        }

        const status = await restoreMissingRole(guild, booster);
        if (status === "restored") {
          report.rolesRestored++;

          await auditLog(guild, {
            type: "success",
            title: "Custom role restored",
            description:
              `<@${booster.userId}>'s custom role was missing, so it was recreated from the stored style.`,
            fields: [
              { name: "User", value: `<@${booster.userId}>`, inline: true },
              { name: "Role", value: `<@&${booster.customRole.discordRoleId}>`, inline: true },
            ],
          });
        } else if (status === "failed") {
          report.failures++;
        }
      } catch (error) {
        report.failures++;
        logger.error(`Maintenance failed for booster ${booster.id}:`, error);
      }
    }

    const changed =
      report.deletionsScheduled + report.deletionsCleared + report.rolesRestored;
    if (changed > 0) {
      await auditLog(guild, {
        type: "info",
        title: "Booster maintenance completed",
        description:
          `Checked **${report.boostersChecked}** booster(s) for this server.\n` +
          `-# Deletions scheduled: **${report.deletionsScheduled}**\n` +
          `-# Deletions cancelled: **${report.deletionsCleared}**\n` +
          `-# Roles restored: **${report.rolesRestored}**`,
      });
    }

    reports.push(report);
  }

  return reports;
}