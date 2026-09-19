import { EmbedBuilder, ColorResolvable, ContainerBuilder, resolveColor as resolveColorValue, Colors } from "discord.js";
import { resolveColor } from "./color-resolve.js";
import { client } from "../../index.js";
import { SystemColors } from "../../libs/colors.js";

export const Accent = {
  brand: SystemColors.main,
  success: SystemColors.main,
  info: SystemColors.main,
  warning: Colors.Yellow,
  error: Colors.Red,
} as const;

export interface EmbedOptions {
  footer?: string | false | null;
}

export async function Embed(
  color?: ColorResolvable,
  options: EmbedOptions = {},
): Promise<EmbedBuilder> {
  const embedColor =
    color === undefined || color === SystemColors.main
      ? await resolveColor()
      : color;
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
  const embedColor =
    color === undefined || color === SystemColors.main
      ? await resolveColor()
      : color;
  const accentColor = resolveColorValue(embedColor);

  return new ContainerBuilder().setAccentColor(accentColor);
}