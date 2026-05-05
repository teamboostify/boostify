import { Client, EmbedBuilder, Events, GuildMember, TextChannel } from "discord.js";
import { loadVariables } from "../libs/loadVariables.js";
import {
  registerBoost,
  removeBoost,
  scheduleCustomRoleDeletionAfterGrace,
  clearPendingCustomRoleDeletion,
} from "../services/boosterService.js";
import {
  assignLevelRoles,
  removeAllLevelRoles,
} from "../services/roleService.js";
import { logger } from "../libs/logger.js";

export default {
  name: Events.GuildMemberUpdate,
  async execute(_client: Client, oldMember: GuildMember, newMember: GuildMember) {
    try {
      if (oldMember.partial) oldMember = await oldMember.fetch();
      if (newMember.partial) newMember = await newMember.fetch();
    } catch (error) {
      logger.error(
        `Failed to fetch partials for user ${oldMember.user.username}`,
      );
    }
    const wasBoostingBefore = oldMember.premiumSince !== null;
    const isBoostingNow = newMember.premiumSince !== null;

    if (!wasBoostingBefore && isBoostingNow) {
      await onBoostStart(newMember);
    } else if (wasBoostingBefore && !isBoostingNow) {
      await onBoostEnd(newMember);
    }
  },
};

async function onBoostStart(member: GuildMember): Promise<void> {
  const config = loadVariables();
  const guild = member.guild;

  const record = await registerBoost(
    member.id,
    guild.id,
    guild.name,
    guild.iconURL(),
  );

  if (!record) return;

  await clearPendingCustomRoleDeletion(record.id);
  await assignLevelRoles(member, record.boostCounts ?? 1);

  const greetChannel = guild.channels.cache.get(config.greetChannelId) as
    | TextChannel
    | undefined;
  if (greetChannel) {
    const embed = new EmbedBuilder()
      .setColor(0xf47fff)
      .setTitle("New Server Boost! 🎉")
      .setDescription(`${member} has boosted the server!`)
      .addFields(
        {
          name: "Total Boosts",
          value: String(record.boostCounts ?? 1),
          inline: true,
        },
        { name: "Member", value: member.user.tag, inline: true },
      )
      .setTimestamp();

    await greetChannel.send({ embeds: [embed] });
  }

  const logChannel = guild.channels.cache.get(config.logChannelId) as
    | TextChannel
    | undefined;
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Boost Started")
      .addFields(
        {
          name: "User",
          value: `${member.user.tag} (${member.id})`,
          inline: false,
        },
        {
          name: "Total Boost Count",
          value: String(record.boostCounts ?? 1),
          inline: true,
        },
      )
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
  }

  try {
    await member.send(
      `Thank you for boosting the server! You now have access to booster perks.`,
    );
  } catch {
  }
}

async function onBoostEnd(member: GuildMember): Promise<void> {
  const config = loadVariables();
  const guild = member.guild;

  const result = await removeBoost(member.id, guild.id);
  if (!result) return;

  await removeAllLevelRoles(member);
  await scheduleCustomRoleDeletionAfterGrace(member.id, guild.id);

  const logChannel = guild.channels.cache.get(config.logChannelId) as
    | TextChannel
    | undefined;
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Boost Ended")
      .addFields(
        {
          name: "User",
          value: `${member.user.tag} (${member.id})`,
          inline: false,
        },
        {
          name: "Historical Boost Count",
          value: String(result.boostCounts ?? 0),
          inline: true,
        },
      )
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
  }
}
