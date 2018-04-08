const log = require('../log');
const { RTMClient, WebClient } = require('@slack/client');
const { sanitiseChannel } = require('../utils');

class SlackClient {
  constructor({ token, standardChannel, adminChannel }) {
    this.token = token;
    this.client = new RTMClient(token);
    this.standardChannel = sanitiseChannel(standardChannel);
    this.adminChannel = sanitiseChannel(adminChannel);
  }

  set onMessage(messageHandler) {
    this.messageHandler = messageHandler;
  }

  handleMessage(event) {
    // Don't listen to bots, or ourselves.
    if ((event.subtype && event.subtype === 'bot_message') || event.user === this.client.activeUserId) {
      return;
    }
    log(event);
    if (this.messageHandler) {
      const isAdmin = event.channel === this.adminChannelId;
      this.messageHandler(event, isAdmin);
    }
  }

  async start() {
    this.client.start();
    log('Slack Client started');

    const webClient = new WebClient(this.token);
    const { channels } = await webClient.channels.list(); // Public channels
    const { groups } = await webClient.groups.list(); // Private channels

    const allChannels = [...channels.filter(c => c.is_member && !c.is_archived), ...groups.filter(g => !g.is_archived)];

    const standardChannel = allChannels.find(c => c.name === this.standardChannel);
    const adminChannel = allChannels.find(c => c.name === this.adminChannel);
    if (!(standardChannel && standardChannel.id)) {
      throw new Error(`I am not a member of channel #${this.standardChannel}`);
    }
    if (!(adminChannel && standardChannel.id)) {
      throw new Error(`I am not a member of channel #${this.adminChannel}`);
    }
    this.adminChannelId = adminChannel.id;

    this.client.on('message', event => this.handleMessage(event));
  }

  sendMessage(message, channel) {
    this.client.sendMessage(message, channel);
  }
}

module.exports = SlackClient;
