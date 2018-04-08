const config = require('../config/config.json');
const log = require('./log');
const SlackClient = require('./slack');
const SpotifyClient = require('./spotify');
const Commands = require('./commands');

const {
  standardChannel,
  adminChannel,
  slackToken,
  spotifyApiKey,
} = config;

const doStuff = async () => {
  log('Startup...');

  const slackClient = new SlackClient({
    token: slackToken,
    standardChannel,
    adminChannel,
  });
  await slackClient.start();

  const spotifyClient = new SpotifyClient(spotifyApiKey);

  const { commands, adminCommands } = Commands(spotifyClient);

  const messageHandler = async (event, isAdmin) => {
    if (!event.text) {
      return;
    }
    const words = event.text.split(' ');
    const keyword = words[0].toLowerCase();
    const args = words.slice(1).join(' ');

    const responseFunction = (isAdmin && adminCommands[keyword]) || commands[keyword];

    if (responseFunction) {
      const response = await responseFunction(args);
      slackClient.sendMessage(response, event.channel);
    }
  };
  slackClient.onMessage = messageHandler;
};

doStuff();
