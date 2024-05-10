import Discord, { APIEmbedField } from 'discord.js';
import {
  getIdFromUrl,
  isValidUrl,
  parseScorecardById,
} from '@dirtleague/udisc-api';

export const getTagBot = () => {
  // Discord setup
  const client = new Discord.Client({ intents: 'MessageContent' });
  const prefix = '!'; // Change this to your preferred prefix

  client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
  });

  // When people post scorecards just look for the message and for now reply with the embedded thing.
  // Tie into actual database later.
  // Add slash-commands later.
  client.on('messageCreate', async message => {
    // Command to parse scorecard
    if (message.author.bot || !isValidUrl(message.content)) {
      // Ignore messages from bots or messages that aren't the URL.
      return;
    }

    const scorecardId = getIdFromUrl(message.content);
    if (scorecardId) {
      try {
        const scorecard = await parseScorecardById(scorecardId);

        const scorecardEmbed = new Discord.EmbedBuilder()
          .setTitle(scorecard.courseName)
          .setDescription(`Date: ${scorecard.date}`)
          .setURL(message.content)
          .addFields([
            {
              name: 'Players',
              value: scorecard.entries
                .map(m => m.players.join(', '))
                .join('\n'),
              inline: true,
            },
          ]);

        const playerScoreFields: APIEmbedField[] = scorecard.entries.map(
          entry => ({
            name: entry.players.map(p => p.name).join(', '),
            value: entry.total.toString(),
            inline: true,
          }),
        );

        scorecardEmbed.addFields(playerScoreFields);

        message.channel.send({ embeds: [scorecardEmbed] });
      } catch (e) {
        console.error(e);
      }
    }
  });

  return {
    start: () => {
      // Replace 'YOUR_DISCORD_TOKEN' with your actual Discord bot token
      client.login('YOUR_DISCORD_TOKEN');
    }
  }
};
