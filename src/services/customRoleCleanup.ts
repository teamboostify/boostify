import { Client } from "discord.js";
import { prisma } from "../libs/database.js";
import { logger } from "../libs/logger.js";

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
      }
      await prisma.customRole.delete({ where: { id: cr.id } });
    } catch (err) {
      logger.error(`Custom role cleanup failed for ${cr.id}: ${String(err)}`);
    }
  }
}
