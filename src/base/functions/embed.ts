import { EmbedBuilder, ColorResolvable, ContainerBuilder, resolveColor as resolveColorValue } from "discord.js";
import { resolveColor } from "./color-resolve.js";

export async function Embed(color?: ColorResolvable): Promise<EmbedBuilder> {
    const embedColor = color ?? await resolveColor();

    return new EmbedBuilder().setColor(embedColor);
}

export async function Container(color?: ColorResolvable): Promise<ContainerBuilder> {
    const embedColor = color ?? await resolveColor();
    const accentColor = resolveColorValue(embedColor);

    return new ContainerBuilder().setAccentColor(accentColor);
}