import { ActivityType, Events } from "discord.js";
import { DiscordClient } from "../base/types/discord.js";

function getStatus(guilds: number, users: number) {
    const statuses = [
        `Managing ${guilds} servers!`,
        `Watching over ${users} users`,
        `Boost, boost, boost!`,
        `Keeping communities active`,
        `Powering Discord servers`,
        `Tracking boosts in real-time`,
        `Helping servers grow`,
        `Thanking boosters 24/7`,
        `Making server management easier`,
        `Serving ${guilds} amazing communities 🎉`,
        `Keeping the hype alive`,
        `Running on caffeine and Node.js ☕`,
        `Auto-managing booster perks`,
        `Boosters deserve the best`,
        `Syncing rewards like magic`,
        `Made with TypeScript`,
        `Keeping roles in sync`,
        `Boosting experiences daily`,
        `Listening to slash commands`,
        `Managing chaos professionally`,
        `Protecting the server vibes`,
        `One boost at a time 💜`,
        `Currently in ${guilds} servers 🌐`,
        `Making Discord better`,
    ];

    return statuses[Math.floor(Math.random() * statuses.length)];
}

export default {
    name: Events.ClientReady,
    once: true,

    execute(client: DiscordClient) {
        if (!client.user) return;

        const updatePresence = () => {
            const guilds = client.guilds.cache.size;

            const users = client.guilds.cache.reduce(
                (acc, guild) => acc + (guild.memberCount || 0),
                0
            );

            client.user!.setActivity({
                type: ActivityType.Custom,
                name: getStatus(guilds, users),
            });
        };

        setTimeout(() => {
            updatePresence();
            setInterval(updatePresence, 1000 * 60 * 60);
        }, 3000);
    },
};