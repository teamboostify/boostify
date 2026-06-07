import {
  SlashCommandBuilder,
  ColorResolvable,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} from "discord.js";
import { ensureBoosterWhileBoosting, getBooster } from "../services/boosterService.js";
import {
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
} from "../services/roleService.js";
import { Command } from "../base/classes/command.js";

const ACCENT = 0xe642a4;

function componentsV2(lines: string[]) {
  const container = new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents(...lines.map((content) => new TextDisplayBuilder().setContent(content)));
  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [container],
  };
}

export default new Command({
  info: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage your custom booster role")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create your custom role")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Role name").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("color").setDescription("Hex color (e.g. #ff0000)").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("gradient").setDescription("Make your role colors a gradient.")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit your custom role")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("New role name").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("color").setDescription("New hex color").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("delete").setDescription("Delete your custom role")
    ),
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply(componentsV2(["This command can only be used in a server."]));
      return;
    }

    const member = await guild.members.fetch(interaction.user.id);
    const resolved = await getBooster(interaction.user.id, interaction);

    if (!resolved?.success) {
      await interaction.reply(
        componentsV2(["Could not load your guild data for this server."])
      );
      return;
    }

    const nitroBoosting = member.premiumSince !== null;

    if (!nitroBoosting) {
      await interaction.reply(
        componentsV2([
          "**Uh oh!**",
          "You must be boosting this server with Nitro to use this command.",
        ])
      );
      return;
    }

    const boosterRecord =
      resolved.data ??
      (await ensureBoosterWhileBoosting(
        interaction.user.id,
        guild.id,
        guild.name,
        guild.iconURL()
      ));

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case "create": {
        if (boosterRecord.customRole) {
          await interaction.reply(
            componentsV2([
              "You already have a custom role.",
              "Use `/role edit` to change it.",
            ])
          );
          return;
        }

        const name = interaction.options.getString("name", true);
        const color = interaction.options.getString("color", true);
        const gradient = interaction.options.getString("gradient")

        if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
          await interaction.reply(
            componentsV2([
              "Invalid color.",
              "Use a hex color like `#ff0000`.",
            ])
          );
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const role = await createCustomRole(guild, member, name, color as ColorResolvable, gradient as ColorResolvable);

        await interaction.editReply(
          componentsV2([`**Custom role created!**`, `${role} is ready to use.`])
        );
        break;
      }
      case "edit": {
        if (!boosterRecord.customRole?.discordRoleId) {
          await interaction.reply(
            componentsV2(["You don't have a custom role yet.", "Use `/role create` first."])
          );
          return;
        }

        const name = interaction.options.getString("name") ?? undefined;
        const color = (interaction.options.getString("color") ?? undefined) as ColorResolvable | undefined;

        if (color && !/^#[0-9a-fA-F]{6}$/.test(color as string)) {
          await interaction.reply(
            componentsV2([
              "Invalid color.",
              "Use a hex color like `#ff0000`.",
            ])
          );
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const role = await updateCustomRole(guild, interaction.user.id, name, color);
        if (!role) {
          await interaction.editReply(
            componentsV2(["Couldn't update that role.", "It may have been deleted manually."])
          );
          return;
        }

        await interaction.editReply(componentsV2(["**Custom role updated.**"]));
        break;
      }
      case "delete": {
        if (!boosterRecord.customRole?.discordRoleId) {
          await interaction.reply(componentsV2(["You don't have a custom role to delete."]));
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await deleteCustomRole(guild, interaction.user.id);
        await interaction.editReply(componentsV2(["**Custom role deleted.**"]));
        return;
      }
    }
  },
})
