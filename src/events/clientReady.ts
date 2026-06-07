import { Client, Events } from "discord.js";
import { logger } from "#/libs/logger.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    if (!client.user) return;
    logger.bot(`Ready! Logged in as ${client.user.tag}`);
  },
};