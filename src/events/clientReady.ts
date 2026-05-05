import { Client, Events } from "discord.js";
import { logger } from "../libs/logger.js";
import { processDueCustomRoleDeletions } from "../services/customRoleCleanup.js";

const CUSTOM_ROLE_CLEANUP_MS = 60 * 60 * 1000;

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    if (!client.user) return;
    logger.bot(`Ready! Logged in as ${client.user.tag}`);

    void processDueCustomRoleDeletions(client);
    setInterval(() => {
      void processDueCustomRoleDeletions(client);
    }, CUSTOM_ROLE_CLEANUP_MS);
  },
};