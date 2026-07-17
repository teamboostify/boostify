import { Client, Events } from "discord.js";
import { processDueCustomRoleDeletions } from "../services/customRoleCleanup.js";
import { DiscordClient } from "../base/types/discord.js";

const CUSTOM_ROLE_CLEANUP_MS = 60 * 60 * 1000;

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: DiscordClient) {
    if (!client.user) return;

    void processDueCustomRoleDeletions(client);
    setInterval(() => {
      void processDueCustomRoleDeletions(client);
    }, CUSTOM_ROLE_CLEANUP_MS);
  },
};