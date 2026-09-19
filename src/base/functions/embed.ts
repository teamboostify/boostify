import { EmbedBuilder, ColorResolvable, ContainerBuilder, resolveColor as resolveColorValue } from "discord.js";
import { resolveColor } from "./color-resolve.js";
import { client } from "../../index.js";
import { SystemColors } from "../../libs/colors.js";

export const Accent = {
  brand: SystemColors.main,
  success: 0x57f287,
  info: 0x70d7ff,
  warning: 0xfee75c,
  error: 0xed4245,
} as const;

export interface EmbedOptions {
  footer?: string | false | null;
}

export async function Embed(
  color?: ColorResolvable,
  options: EmbedOptions = {},
): Promise<EmbedBuilder> {
  const embedColor = color ?? (await resolveColor());
  const embed = new EmbedBuilder().setColor(embedColor);

  if (options.footer !== false && options.footer !== null) {
    embed.setFooter({
      text: options.footer ?? "Boostify",
      iconURL: client.user?.displayAvatarURL({ size: 64 }),
    });
  }

  return embed;
}

export async function Container(color?: ColorResolvable): Promise<ContainerBuilder> {
  const embedColor = color ?? (await resolveColor());
  const accentColor = resolveColorValue(embedColor);

  return new ContainerBuilder().setAccentColor(accentColor);
}