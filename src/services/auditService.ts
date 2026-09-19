import { Guild, PermissionFlagsBits, TextChannel } from "discord.js";
import { prisma } from "../libs/database.js";
import { logger } from "../libs/logger.js";
import { Embed, Accent } from "../base/functions/embed.js";

export interface AuditField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface AuditEntry {
  title: string;
  description?: string;
  type?: "info" | "success" | "warning" | "error";
  fields?: AuditField[];
  timestamp?: boolean;
  footer?: string | false;
}

export async function getLogChannel(guild: Guild): Promise<TextChannel | null> {
  const settings = await prisma.guildSetting.findUnique({
    where: { gid: guild.id },
  });
  if (!settings?.logChannelId) return null;

  const channel = guild.channels.cache.get(settings.logChannelId) as
    | TextChannel
    | undefined;
  if (!channel || !channel.isTextBased()) return null;

  const me = guild.members.me;
  const perms = me ? channel.permissionsFor(me) : null;
  if (!perms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    return null;
  }

  return channel;
}

export async function auditLog(
  guild: Guild,
  entry: AuditEntry,
): Promise<void> {
  const channel = await getLogChannel(guild);
  if (!channel) return;

  const color = Accent[entry.type ?? "info"];

  const embed = await Embed(color, { footer: entry.footer });
  embed.setTitle(entry.title);

  if (entry.description) embed.setDescription(entry.description);
  if (entry.fields?.length) embed.addFields(entry.fields);
  if (entry.timestamp !== false) embed.setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    logger.error(
      `Failed to send audit log to channel ${channel.id}:`,
      error,
    );
  }
}