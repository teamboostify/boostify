import {
  ChatInputCommandInteraction,
  Colors,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { logger } from '../../libs/logger.js';

type DiscordSlashCommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  | SlashCommandSubcommandsOnlyBuilder;

interface CommandOptions {
  info: DiscordSlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  guildOnly?: boolean;
  ownerOnly?: boolean;
  requiredPermissions?: (keyof typeof PermissionFlagsBits)[];
  cooldown?: number;
  masterLock?: boolean
}

export class Command {
  data: DiscordSlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  guildOnly: boolean;
  ownerOnly: boolean;
  requiredPermissions: (keyof typeof PermissionFlagsBits)[];
  cooldown: number;
  masterLock: boolean
  private readonly _cooldowns: Map<string, number>;

  constructor({ info, execute, guildOnly = false, ownerOnly = false, requiredPermissions = [], cooldown = 0, masterLock = false }: CommandOptions) {
    this.data = info;
    this.execute = execute;
    this.guildOnly = guildOnly;
    this.ownerOnly = ownerOnly;
    this.requiredPermissions = requiredPermissions;
    this.cooldown = cooldown;
    this.masterLock = masterLock;
    this._cooldowns = new Map();
  }

  get name(): string {
    return this.data.name;
  }

  async run(interaction: ChatInputCommandInteraction, ownerId?: string): Promise<void> {
    if (!await this.validateCommand(interaction, ownerId)) {
      return;
    }

    await this.applyCooldown(interaction);
    
    try {
      await this.execute(interaction);
    } catch (err) {
      logger.fatal(`[Command: ${this.name}]`, err);
      const msg = { content: 'Something went wrong.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  }

  private async validateCommand(interaction: ChatInputCommandInteraction, ownerId?: string): Promise<boolean> {
    if (this.guildOnly && !interaction.guild) {
      await interaction.reply({ content: 'This command is limited to servers', flags: MessageFlags.Ephemeral });
      return false;
    }

    if (this.ownerOnly && interaction.user.id !== ownerId) {
      const container = new ContainerBuilder().setAccentColor(Colors.Red)
      .addTextDisplayComponents((txt) => txt.setContent([
        "## Owner-locked command",
        "This command can only be used by the owner of this server."
      ].join("\n")))
      await interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]})
      return false;
    }

    if (this.masterLock && interaction.guild?.id !== process.env.MASTER_GUILD) {
      await interaction.reply('This command cannot be ran in this server.');
      return false;
    }

    if (!await this.validatePermissions(interaction)) {
      return false;
    }

    return true;
  }

  private async validatePermissions(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (!this.requiredPermissions.length || !interaction.guild) {
      return true;
    }

    const missing = this.requiredPermissions.filter(
      p => !interaction.memberPermissions?.has(PermissionFlagsBits[p])
    );
    
    if (missing.length) {
      await interaction.reply({
        content: `You're lacking of the necessary permissions: \`${missing.join(', ')}\``,
        flags: MessageFlags.Ephemeral,
      });
      return false;
    }
    
    return true;
  }

  private async applyCooldown(interaction: ChatInputCommandInteraction): Promise<void> {
    if (this.cooldown <= 0) {
      return;
    }

    const now = Date.now();
    const expiry = this._cooldowns.get(interaction.user.id);
    
    if (expiry && now < expiry) {
      const unixExpiry = Math.floor(expiry / 1000);
      await interaction.reply({
        content: `You can use \`/${this.name}\` again, please wait <t:${unixExpiry}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    this._cooldowns.set(interaction.user.id, now + this.cooldown * 1000);
    setTimeout(() => this._cooldowns.delete(interaction.user.id), this.cooldown * 1000);
    await this.execute(interaction);
  }
}