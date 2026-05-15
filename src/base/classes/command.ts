import {
  ChatInputCommandInteraction,
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
  private _cooldowns: Map<string, number>;

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
    if (this.guildOnly && !interaction.guild) {
      await interaction.reply({ content: 'This command is limited to servers', flags: MessageFlags.Ephemeral });
      return;
    }

    if (this.ownerOnly && interaction.user.id !== ownerId) {
      await interaction.reply({ content: 'Only the owner can run this command', flags: MessageFlags.Ephemeral });
      return;
    }

    if (this.masterLock && interaction.guild) {
      if (interaction.guild.id != process.env.MASTER_GUILD) {
        await interaction.reply('This command cannot be ran in this server.')
      }
    } 

    if (this.requiredPermissions.length && interaction.guild) {
      const missing = this.requiredPermissions.filter(
        p => !interaction.memberPermissions?.has(PermissionFlagsBits[p])
      );
      if (missing.length) {
        await interaction.reply({
          content: `You're lacking of the necessary permissions: \`${missing.join(', ')}\``,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    if (this.cooldown > 0) {
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
    }

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
}