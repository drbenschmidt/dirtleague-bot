import Discord from 'discord.js';

// Discord setup
const client = new Discord.Client({ intents: 'MessageContent' });
const prefix = '!'; // Change this to your preferred prefix

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});


// Command to parse and save scorecard from URL
client.on('messageCreate', async (message) => {
  // Command to parse scorecard
  if (message.author.bot || !message.content.startsWith(prefix)) return; // Ignore messages from bots or messages not starting with prefix

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (command === 'scorecard') {
    const url = args[0];
    if (!url || !url.startsWith('https://udisc.com/scorecards/')) {
      return message.channel.send('Please provide a valid scorecard URL.');
    }

    try {
      const scorecard = await parseScorecard(url);
      const scorecardDocument = await saveScorecard(scorecard);

      const scorecardEmbed = new Discord.EmbedBuilder()
        .setTitle(scorecard.courseName)
        .setDescription(`Date: ${scorecard.date}`)
        .addFields([
          {
            name: 'Players',
            value: scorecard.players.join('\n'),
            inline: true,
          },
        ]);

      const playerScoreFields = scorecard.players.map((player) => ({
        name: player.name,
        value: player.holes.join(' | '),
        inline: true,
      }));

      scorecardEmbed.addFields(playerScoreFields);

      message.channel.send(scorecardEmbed);
    } catch (error) {
      console.error('Error parsing scorecard:', error);
      message.channel.send('An error occurred while parsing the scorecard.');
    }
  }
});

// Replace 'YOUR_DISCORD_TOKEN' with your actual Discord bot token
client.login('YOUR_DISCORD_TOKEN');
