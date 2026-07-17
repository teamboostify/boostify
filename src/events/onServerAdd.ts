import { ButtonBuilder, ButtonStyle, Client, ContainerBuilder, Events, Guild, MessageFlags } from "discord.js";
import { logger } from "../libs/logger.js";
import { SystemColors } from "../libs/colors.js";
import { DiscordClient } from "../base/types/discord.js";

export default {
    name: Events.GuildCreate,
    async execute(client: DiscordClient, guild: Guild,) {
        logger.custom(`Added to the server with ID ${guild.id}`, "ADDED", "magenta");
        try {
            const owner = await guild.fetchOwner();
            const avatarUrl = client.user!.displayAvatarURL({ size: 1024 });

            const termsBtn = new ButtonBuilder().setLabel('Terms of Service').setURL('https://boostify.breaddevv.cc/terms').setStyle(ButtonStyle.Link);
            const privacy = new ButtonBuilder().setLabel('Privacy Policy').setURL('https://boostify.breaddevv.cc/privacy').setStyle(ButtonStyle.Link);
            const github = new ButtonBuilder().setLabel('Our Repository').setURL('https://boostify.breaddevv.cc/github').setStyle(ButtonStyle.Link);
            const topgg = new ButtonBuilder().setLabel('Support Us On Top.gg!').setURL('https://top.gg/bot/1453802179789066442').setStyle(ButtonStyle.Link);

            const container = new ContainerBuilder().addSectionComponents(comp =>
                comp
                    .addTextDisplayComponents(text =>
                        text.setContent(
                            `## Thank you for adding me!\n` +
                            `Hi! I'm **Boostify**! An open-source boosting management bot, made to help you manage your server perks alongside your community!\n` +
                            `Use some of the links below to have a better knowledge about me!`
                        )
                    )
                    .setThumbnailAccessory(accessory => accessory.setURL(avatarUrl))
            )
            .addTextDisplayComponents(text => text.setContent(`-# You're receiving this text because you/other member added me to the server **${guild.name}** — In which you're the owner!`))
            .addActionRowComponents(row => row.addComponents(termsBtn, privacy, github, topgg))
            .setAccentColor(SystemColors.main);

            await owner.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (err) {
            logger.error(`Failed fetching owner & dmming them on server: ${guild.id}: ${err}`);
        }
    }
};