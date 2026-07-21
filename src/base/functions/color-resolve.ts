import { ColorResolvable } from "discord.js";
import { client } from "../../index.js";
import { SystemColors } from "../../libs/colors.js";
import { logger } from "../../libs/logger.js";

const cachedColors = new Map<string, ColorResolvable>();

export async function resolveColor(): Promise<ColorResolvable> {
    if (process.env.CLIENT_ID == '1453802179789066442') return SystemColors.main; // custom branding coming as a future update

    const guildid = process.env.GUILD_ID! || process.env.MASTER_GUILD!;

    if (!guildid) {
        return SystemColors.main;
    }

    if (cachedColors.has(guildid)) {
        return cachedColors.get(guildid)!;
    }

    try {
        const guild = await client.guilds.fetch(guildid);
        const me = await guild.members.fetchMe();

        const color = me.displayColor;
        const resolved: ColorResolvable = color !== 0 ? color : SystemColors.main;

        cachedColors.set(guildid, resolved);
        return resolved;
    } catch (err) {
        logger.error(`Failed to resolve color for guild ${guildid}: ${err}`);
        return SystemColors.main;
    }
}