const log = require('../log')('slack');
const { RTMClient, WebClient } = require('@slack/client');
const { sanitiseChannel } = require('../utils');

class SlackClient {
  constructor({
    adminChannel,
    standardChannel,
    token,
  }) {
    this.token = token;
    this.client = new RTMClient(token);
    this.webClient = new WebClient(token);
    this.standardChannel = sanitiseChannel(standardChannel);
    this.adminChannel = sanitiseChannel(adminChannel);
    this.blacklist = [];
  }

  set onMessage(messageHandler) {
    this.messageHandler = messageHandler;
  }

  async getBlacklistedUsers() {
    const users = await this.webClient.users.list();

    if (users && users.members) {
      return users.members.filter(u => this.blacklist.includes(u.id));
    }
    return [];
  }

  addToBlacklist(user) {
    if (user.match(/^<@.*>$/)) {
      const id = user.substr(2, user.length - 3);
      console.log(id);
      if (!this.blacklist.includes(id)) {
        this.blacklist.push(id);
        return true;
      }
      return false;
    }
    return undefined;
  }

  removeFromBlacklist(user) {
    if (user.match(/^<@.*>$/)) {
      const id = user.substr(2, user.length - 3);
      if (this.blacklist.includes(id)) {
        this.blacklist = this.blacklist.filter(b => b !== id);
        return true;
      }
      return false;
    }
    return undefined;
  }

  async handleMessage(event) {
    // Don't listen to bots, or ourselves.
    if ((event.subtype && event.subtype === 'bot_message') || event.user === this.client.activeUserId) {
      return;
    }
    log(event);

    if (this.blacklist.includes(event.user)) {
      this.sendMessage(`Nice try, <@${event.user}>, you're banned!`, event.channel);
      return;
    }

    if (this.messageHandler) {
      let isAdmin = event.channel === this.adminChannelId;
      if (!isAdmin) {
        const { group } = await this.webClient.groups.info({ channel: this.adminChannelId });
        isAdmin = group.members.includes(event.user);
      }
      this.messageHandler(event, isAdmin);
    }
  }

  async start() {
    this.client.start();
    log('Slack Client started');

    const { channels } = await this.webClient.channels.list(); // Public channels
    const { groups } = await this.webClient.groups.list(); // Private channels
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
    return this.client.sendMessage(message, channel);
  }

  send(messageDetails, channel) {
    const { text, body, thumbUrl } = messageDetails;
    const attachment = { fallback: text, text: `${body}` };
    if (thumbUrl) {
      attachment.thumb_url = thumbUrl;
    }

    const response = {
      attachments: [attachment],
      as_user: true,
      channel,
      text,
      username: this.client.activeUserId,
    };

    return this.webClient.chat.postMessage(response);
  }

  listUsers() {
    return this.client.listUsers();
  }
}

module.exports = SlackClient;
