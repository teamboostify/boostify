import { AutocompleteInteraction, ChatInputCommandInteraction, Client, Collection, Events } from "discord.js";
import { Command } from "../base/classes/command.js";

export default {
  name: Events.InteractionCreate,
  async execute(client: Client & { commands: Collection<string, Command> }, interaction: AutocompleteInteraction) {
    if (!interaction.isAutocomplete()) return;
    if (interaction.commandName != 'help') return;
    
    const focused = interaction.options.getFocused()
    const filtered = client.commands.filter(f => f.name.startsWith(focused));
    
    await interaction.respond(
      filtered.map(f => ({ name: `/${f.name}`, value: f.name }))
    )
  }
};