const config = require('../config/config.json');
const log = require('./log')();
const SlackClient = require('./integrations/slack');
const SpotifyClient = require('./integrations/spotify');
const SonosClient = require('./integrations/sonos');
const Commands = require('./commands');

const {
  standardChannel,
  adminChannel,
  slackToken,
  sonosAddress,
  spotifyClientId,
  spotifyRegion,
  spotifySecret,
} = config;

const doStuff = async () => {
  log('Startup...');

  const slackClient = new SlackClient({
    token: slackToken,
    standardChannel,
    adminChannel,
  });
  await slackClient.start();
  const spotifyClient = new SpotifyClient({ clientId: spotifyClientId, secret: spotifySecret, region: spotifyRegion });

  const sonosClient = new SonosClient(sonosAddress);

  const { commands, adminCommands } = Commands(spotifyClient, sonosClient, slackClient);

  const messageHandler = async (event, isAdmin) => {
    if (!event.text) {
      return;
    }
    const words = event.text.split(' ');
    const keyword = words[0].toLowerCase();
    const args = words.slice(1).join(' ');

    const responseFunction = (isAdmin && adminCommands[keyword]) || commands[keyword];

    if (responseFunction) {
      const response = await responseFunction(args, event.user);
      slackClient.sendMessage(response, event.channel);
    }
  };
  slackClient.onMessage = messageHandler;
};

doStuff();
