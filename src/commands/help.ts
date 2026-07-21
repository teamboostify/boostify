import {
  SlashCommandBuilder,
  ContainerBuilder,
  MessageFlags,
  Colors,
} from "discord.js";
import { Command } from "../base/classes/command.js";
import { SystemColors } from "../libs/colors.js";
import { Container } from "../base/functions/embed.js";

const knowledgebase: Record<string, string> = {
  booster:
`## Overview

> The Booster system is responsible for recording, managing, and reviewing booster information within the server. It extends Discord's native Nitro boosting functionality by maintaining additional records such as historical boost counts and custom booster-related data.

## Command Usage

### \`/booster check\`

Retrieves the booster profile associated with a user.

**Parameters**
• \`user\` — The member whose booster information should be displayed.

**Information Returned**
* Current booster status.
* Discord Nitro boosting status.
* Date the member began boosting the server.
* Assigned custom booster role, if applicable.
* Total recorded boost count.

**Notes**
* Members actively boosting through Discord Nitro may still have information available even if they have not been manually registered.
* Historical booster records may remain accessible after a member stops boosting.

### \`/booster add\`

Registers additional boosts to a member's booster profile.

**Parameters**
* \`user\` — The member receiving the boost count adjustment.
* \`amount\` — The number of boosts to add.

**Behaviour**
* The system verifies that the member is actively boosting the server through Discord Nitro.
* If no booster profile exists, one will automatically be created.
* The member's recorded boost count is then increased accordingly.

**Intended Usage**
* Recording additional booster benefits.
* Synchronising existing booster data.
* Administrative adjustments.

### \`/booster remove\`

Removes boosts from a member's recorded booster profile.

**Parameters**
* \`user\` — The member whose profile should be adjusted.
* \`amount\` — The number of boosts to remove.

**Behaviour**
* The specified amount is deducted from the member's recorded boost count.
* Existing booster records are preserved whenever possible.

**Intended Usage**
* Correcting inaccurate records.
* Reverting accidental additions.
* Administrative maintenance.

### \`/booster stats\`

Displays aggregate booster statistics for the current server.

**Information Returned**
* Number of currently active boosters.
* Total recorded boosts.
* Total unique booster profiles registered.

**Purpose**
Provides administrators with an overview of booster activity and historical engagement.

## Permissions

Use of the Booster management system requires the \`Manage Server\` permission.

## Additional Information

* Recorded boost counts are maintained independently from Discord's native Nitro boost system.

* A member's presence within the booster database does not necessarily indicate that they are currently boosting the server.

* All booster information is scoped to the server in which the command is executed.`,

"bot-info":
`## Overview

> The Bot Information command provides a detailed overview of the bot's current status, technical environment, and project resources. It is intended to help users and administrators quickly access important information regarding the bot's operation and development.

## Command Usage

### \`/bot-info\`

Displays general information about the bot.

**Information Returned**
* Project description and purpose.
* List of project contributors retrieved directly from GitHub.
* Current bot version.
* Bot uptime since the last restart.
* Technology stack used to build the bot.
* Server and user statistics.
* Current WebSocket latency (ping).
* Bot account creation date.
* Active Node.js runtime version.
* Installed discord.js version.

## Information Breakdown

### Developers

Displays all contributors associated with the project's GitHub repository.

**Source**
• Retrieved dynamically from the GitHub Contributors API.

**Purpose**
Allows users to identify the individuals responsible for the project's development and maintenance.

### Version

Displays the currently running release version of the bot.

**Source**
* Loaded directly from the application's package metadata.

**Purpose**
Useful when reporting bugs, requesting support, or confirming deployment versions.

### Uptime

Indicates how long the bot has remained online without interruption.

**Format**
* Days
* Hours
* Minutes
* Seconds

**Purpose**
Provides insight into the stability and availability of the service.

### How Was I Made?

Displays the primary technologies used during development.

**Current Stack**
* TypeScript
* discord.js

### Statistics

Displays basic operational metrics.

**Information Returned**
• Number of servers currently using the bot.
• Number of cached users accessible to the bot.

**Purpose**
Provides a general indication of the bot's scale and reach.

### Ping

Displays the current WebSocket latency between the bot and Discord.

**Purpose**
Helps identify potential connectivity issues.

**Interpretation**
• Lower values generally indicate better responsiveness.
• Temporary fluctuations are normal.

### Created On

Displays the creation date of the bot's Discord account.

**Format**
Uses Discord's timestamp formatting for localisation.

### Node.js Version

Displays the version of Node.js currently running the application.

**Purpose**
Useful for debugging, compatibility checks, and support requests.

### discord.js Version

Displays the version of discord.js installed by the application.

**Purpose**
Allows developers and users to determine framework compatibility.

## Interactive Resources

The command also provides quick access buttons to important project resources.

### Website
Official project website.

### Terms
Terms of Service governing the use of the bot.

### Privacy
Privacy Policy outlining how data is handled.

### Support Server
Community support and assistance.

### Repository
Public source code repository and development resources.

## Permissions

No special permissions are required to use this command.

Any member with access to application commands may execute it.

## Additional Information

* Contributor information is fetched in real time from GitHub whenever the command is used.

* Statistics displayed are based on Discord.js cache data and may differ slightly from Discord's global counts.

* Uptime resets whenever the bot process restarts.

* The information provided reflects the state of the bot at the moment the command is executed.`,
role:
`## Overview

> The Custom Role system allows active Nitro boosters to create and manage a personalised role within the server. Eligible members can customise their role's name and colour while maintaining booster benefits.

Custom roles are exclusive to members currently boosting the server.

## Command Usage

### \`/role create\`

Creates a new custom booster role.

**Parameters**
* \`name\` — The name of the custom role.
* \`color\` — The primary role colour in hexadecimal format.
* \`gradient\` *(Optional)* — Additional colour used for gradient role styling.

**Behaviour**
* Verifies that the member is actively boosting the server.
* Automatically creates a booster profile if one does not already exist.
* Creates a new Discord role.
* Assigns the newly created role to the member.
* Stores the role information for future management.

**Requirements**
* The member must currently be boosting the server.
* The member cannot already own a custom role.
* Colours must use hexadecimal formatting such as \`#ff0000\`.

**Examples**
* \`/role create name:Elite color:#ff69b4\`
* \`/role create name:Galaxy color:#6a5acd gradient:#ff69b4\`

### \`/role edit\`

Updates an existing custom booster role.

**Parameters**
* \`name\` *(Optional)* — The new role name.
* \`color\` *(Optional)* — The new hexadecimal colour.

**Behaviour**
* Updates the stored Discord role.
* Only supplied values are modified.
* Existing settings remain unchanged if omitted.

**Requirements**
* The member must currently be boosting the server.
* The member must already own a custom role.

**Examples**
* \`/role edit name:Legend\`
* \`/role edit color:#00ff00\`
* \`/role edit name:Legend color:#00ff00\`

### \`/role delete\`

Deletes the member's custom booster role.

**Behaviour**
* Removes the Discord role.
* Deletes the associated role record.
* Revokes access to the custom role.

**Requirements**
* The member must currently be boosting the server.
* The member must already own a custom role.

## Eligibility

The Custom Role system is reserved exclusively for active Discord Nitro boosters.

Members who stop boosting the server lose access to role management functionality.

If a member resumes boosting later, their booster profile can be restored or recreated depending on server configuration.

## Validation Rules

### Colour Formatting

Accepted format:

* \`#RRGGBB\`

Examples:

* \`#ff0000\`
* \`#00ff00\`
* \`#4287f5\`

Invalid examples:

* \`red\`
* \`ff0000\`
* \`#fff\`

## Permissions

No additional Discord permissions are required.

The system determines eligibility based solely on active Nitro boosting status.

## Additional Information

* Booster profiles are automatically generated for eligible members when necessary.

* Custom role ownership is limited to one role per booster.

* If a role is deleted manually outside of the bot, some actions may fail until the role is recreated.

* Gradient support depends on the implementation provided by the role service.

* All custom role data is scoped to the server where the command is executed.`,

config:
`## Overview

> The Configuration system allows server administrators to customise how Boostify behaves within their server. Through an interactive configuration modal, administrators can select the channels used for boost announcements and logging.

These settings apply only to the server in which the command is executed.

## Command Usage

### \`/config\`

Opens the server configuration interface.

**Behaviour**
* Displays an interactive modal.
* Allows administrators to configure important server settings.
* Saves configuration values after the modal is submitted.
* Restricts access to authorised administrators only.

## Configuration Options

### Boost Announcement Channel

Determines where Boostify should send boost-related messages.

**Purpose**
Used for:
* Boost celebration messages.
* Booster recognition.
* Future boost announcement features.

**Accepted Channel Types**
* Text Channels
* Announcement Channels

**Required**
Yes.

**Example Usage**
Select a channel such as:
* \`#boosts\`
* \`#announcements\`
* \`#community-updates\`

### Logging Channel

Determines where Boostify should send administrative logs.

**Purpose**
Used for:
* Booster management logs.
* Role creation and deletion logs.
* Configuration change records.
* Future moderation and audit events.

**Accepted Channel Types**
* Text Channels only.

**Required**
Yes.

**Example Usage**
Select a channel such as:
* \`#boostify-logs\`
* \`#staff-logs\`
* \`#audit-log\`

## Permissions

Use of the Configuration system requires the \`Administrator\` permission.

Members without this permission cannot access or modify server settings.

## User Experience

When the command is executed:

1. Boostify opens the Configuration modal.
2. The administrator selects the boost announcement channel.
3. The administrator selects the logging channel.
4. The modal is submitted.
5. The server configuration is updated.

## Additional Information

* Configuration settings are stored independently for each server.

* Announcement channels and text channels are both supported for boost notifications.

* Logging functionality is restricted to standard text channels to ensure compatibility.

* Future Boostify updates may introduce additional configuration options through this interface.

* Only administrators should modify these settings, as changes affect the entire server.`,
setup:
`## Overview

> The Setup system is the initial onboarding process for Boostify. It allows server administrators to configure the channels required for Boostify's core functionality.

**If you have just invited Boostify to your server, this command must be run before using most features.**

Without completing setup, Boostify cannot determine where to send boost announcements or administrative logs.
## First-Time Setup

### Required After Inviting Boostify

After adding Boostify to your server, an administrator should immediately execute:

\`/setup\`

This process establishes the server configuration used by Boostify.

**Until setup has been completed:**
• Boost notifications may not function.
• Administrative logs cannot be delivered.
• Certain features may be unavailable.
• Server-specific settings cannot be applied.

## Command Usage

### \`/setup\`

Launches the initial setup wizard.

**Behaviour**
* Verifies whether the server has already been configured.
* Opens an interactive setup modal if no configuration exists.
* Prevents duplicate setups.
* Stores the selected channels for future use.

## Setup Options

### Boost Announcement Channel

Determines where Boostify should send boost-related messages.

**Purpose**
Used for:
* Boost celebration messages.
* Booster acknowledgements.
* Future boost notification features.

**Accepted Channel Types**
* Text Channels
* Announcement Channels

**Required**
Yes.

**Examples**
* \`#boosts\`
* \`#announcements\`
* \`#community-news\`

### Logging Channel

Determines where Boostify should send operational logs.

**Purpose**
Used for:
* Booster activity logs.
* Role management logs.
* Configuration updates.
* Audit and troubleshooting information.
* Future administrative events.

**Accepted Channel Types**
* Text Channels only.

**Required**
Yes.

**Examples**
* \`#boostify-logs\`
* \`#staff-logs\`
* \`#audit-log\`

## Existing Configurations

If setup has already been completed, Boostify will prevent the setup wizard from being run again.

Instead, administrators will receive a message indicating that the server is already configured.

To modify existing settings, use:

\`/settings\`

## Permissions

Use of the Setup system requires the \`Administrator\` permission.

Only administrators can initialise Boostify within a server.

## Setup Flow

1. Invite Boostify to your server.
2. Run \`/setup\`.
3. Select a boost announcement channel.
4. Select a logging channel.
5. Submit the setup modal.
6. Begin using Boostify's features.

## Additional Information

* Setup only needs to be completed once per server.

* All configuration data is stored independently for each server.

* Attempting to rerun setup after configuration has been completed will not overwrite existing settings.

* Administrators can update configuration later through the \`/settings\` command.

* Completing setup is strongly recommended immediately after inviting Boostify to ensure all features operate correctly.`
};

export default new Command({
  info: new SlashCommandBuilder()
  .setName("help")
    .setDescription("Help command for other commands.")
    .addStringOption((opt) => opt.setName("command").setDescription("The command which you want to see.").setRequired(true).setAutocomplete(true)),
  async execute(interaction) {
    const sub = interaction.options.getString("command", true);

    if (knowledgebase[sub]) {
      const container = await Container()
      container.addTextDisplayComponents(txt => txt.setContent(
        `## Command info: \`/${sub}\`\n`+
        knowledgebase[sub] 
      ));

      await interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2]})
    } else {
      const container = await Container(Colors.Red);
      container.setAccentColor(Colors.Red)
      .addTextDisplayComponents(txt => txt.setContent(
        `## Command not found\n`+
        `We couldn't find any resources matching the command \`${sub}\`, please try later.` 
      ));

      await interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2]})
    }
    
  },
})