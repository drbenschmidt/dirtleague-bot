# discord-tag-bot

Discord bot to track dirt league tags.

## Usage

Add bot, configure to watch channels for uDisc CardCast URLs, parse results, announce tag changes!

## Commands

| Command | Args | Description |
| ------- | ---- | ----------- |
| `help` | | Display commands allowed to user |
| `set-tag` | `<uDiscUsername> [reason]` | Sets a user to a tag |
| `list` | | Displays current tags and who owns them (in order). |
| `add-discord-username` | `<uDiscUsername> <discordUserName>` | Maps a uDisc user to a discord user. Used for announcement tagging. |
| `where-am-i` | `[size=5]` | Shows the user who the 5 players in front and behind them currently are. |
