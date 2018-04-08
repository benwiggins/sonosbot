const log = require('../log');
const { RTMClient, WebClient } = require('@slack/client');
const { sanitiseChannel, sanitiseUser } = require('../utils');

class SlackClient {
  constructor({
    adminChannel,
    standardChannel,
    token,
  }) {
    this.token = token;
    this.client = new RTMClient(token);
    this.standardChannel = sanitiseChannel(standardChannel);
    this.adminChannel = sanitiseChannel(adminChannel);
    this.blacklist = [];
  }

  set onMessage(messageHandler) {
    this.messageHandler = messageHandler;
  }

  get blacklistedUsers() {
    return this.blacklist;
  }
  addToBlacklist(user) {
    const sanitisedUser = sanitiseUser(user);

    if (!this.blacklist.includes(sanitisedUser)) {
      this.blacklist.push(sanitisedUser);
      return true;
    }
    return false;
  }

  removeFromBlacklist(user) {
    const sanitisedUser = sanitiseUser(user);
    if (!this.blacklist.includes(sanitisedUser)) {
      return false;
    }
    this.blacklist = this.blacklist.filter(u => u !== sanitisedUser);
    return true;
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
