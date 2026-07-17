import { Events } from "discord.js";
import { logger } from "../libs/logger.js";
import { DiscordClient } from "../base/types/discord.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: DiscordClient) {
    if (!client.user) return;
    logger.bot(`Ready! Logged in as ${client.user.tag}`);
  },
};