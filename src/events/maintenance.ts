import { Events } from "discord.js";
import {
  processDueCustomRoleDeletions,
  runBoosterMaintenance,
} from "../services/maintenanceService.js";
import { DiscordClient } from "../base/types/discord.js";
import { logger } from "../libs/logger.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: DiscordClient) {
    if (!client.user) return;

    void processDueCustomRoleDeletions(client);
    void runBoosterMaintenance(client);

    try {
      Bun.cron(
        "0 0 * * *",
        () => {
          void processDueCustomRoleDeletions(client);
          void runBoosterMaintenance(client);
        },
        { tz: "UTC" },
      );
    } catch (err) {
      logger.error(`Failed to schedule maintenance cron: ${err}`);
    }
  },
};