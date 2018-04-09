const {
  charToIndex,
  formatSeconds,
  indexToChar,
  isChar,
} = require('./utils');

const { gongLimit } = require('../config/config.json');

const GENERIC_ERROR = 'Something went wrong :(';

let gongCount = 0;
let gongUri;
let gongUsers = [];

const formatTrack = (track) => {
  const artists = track.artists.map(a => a.name).join(', ');
  return `${artists} - ${track.name}`;
};

module.exports = (spotifyClient, sonosClient, slackClient) => {
  let lastResult = [];

  const add = async (text) => {
    const addToQueue = uri => sonosClient.queueNext(uri);
    let track;

    if (!(text && text.length)) {
      return 'What am I adding?';
    }
    if (lastResult.length) {
      if (isChar(text)) {
        track = lastResult[charToIndex(text)];
      } else {
        track = lastResult.find(t => formatTrack(t) === text);
      }
    } else {
      // Otherwise just search
      const newSearch = await spotifyClient.searchTracks(text);
      if (!(newSearch && newSearch.length)) {
        return 'I could not find that track. Have you tried `search`ing for it?';
      }
      track = newSearch && newSearch[0];
    }
    if (track) {
      const added = await addToQueue(track.uri);
      if (added) {
        return `${formatTrack(track)} added to queue`;
      }
    }
    return GENERIC_ERROR;
  };

  const help = () => `*I understand the following commands:*\n
  *\`search\`* _text_: Search for a track
  *\`add\`* _text_: Add a track to the queue. You can specify the full text or the character code ` +
  `returned from a \`search\`.
  *\`current\`*: Display the currently playing track.
  *\`gong\`*: Express your dislike for the current track. ${gongLimit} gongs and it will be skipped.
  *\`help\`*: Display this message.
  *\`list\`*: Display the current Sonos queue.
  *\`status\`*: Get the current Sonos status.
  *\`volume\`*: List current volume.`;

  const adminHelp = () => `${help()}\n\n*Admin functions:*\n
  *\`blacklist\`*: List users currently blacklisted
  *\`blacklist add @username\`*: Add a user to the blacklist
  *\`blacklist del @username\`*: Remove a user from the blacklist
  *\`next\`*: Skip to the next track
  *\`setvolume\`*: Set Sonos volume
  *\`shuffle\`*: (Re)shuffle the playlist
  *\`pause\`*: Pause Sonos
  *\`previous\`*: Go to the previous track
  *\`play\`*: Play or unpause Sonos`;

  const blacklist = async (args) => {
    if (args) {
      const words = args.split(' ');

      switch (words[0]) {
        case 'add':
          await slackClient.addToBlacklist(words[1]);
          break;
        case 'del':
          await slackClient.removeFromBlacklist(words[1]);
          break;
        default:
          return 'Invalid command';
      }
    }

    const users = await slackClient.getBlacklistedUsers();
    if (!(users && users.length)) {
      return 'There are no users on the blacklist';
    }
    return `The following users are on the blacklist: ${users.map(u => `<@${u.id}>`).join(', ')}`;
  };

  const search = async (text) => {
    const tracks = await spotifyClient.searchTracks(text);
    lastResult = tracks || [];

    if (!(tracks && tracks.length)) {
      return 'I could not find anything :(';
    }

    const trackNames = tracks.map((t, idx) => `*${indexToChar(idx)}.* ${formatTrack(t)}${t.explicit ? ' *`E`*' : ''}`);

    return `*I found the following tracks:*\n\n${trackNames.join('\n')}\n\n*To play, use the \`add\` command.*`;
  };

  const getCurrent = async () => {
    const currentTrack = await sonosClient.currentTrack();
    if (!currentTrack) {
      return 'I have no idea what we’re listening to.';
    }

    const status = await sonosClient.getCurrentState();
    if (status !== 'playing') {
      return 'Sonos is not playing.';
    }

    const timeStamps = `${formatSeconds(currentTrack.position)}/${formatSeconds(currentTrack.duration)}`;
    return `Currently listening to *${currentTrack.artist}* - *${currentTrack.title}* (${timeStamps})`;
  };

  const getVolume = async () => {
    const volume = await sonosClient.getVolume();
    return `Current volume is ${volume}.`;
  };

  const getStatus = async () => {
    const status = await sonosClient.getCurrentState();
    return `Sonos is currently ${status}!`;
  };

  const setVolume = async (volume) => {
    const newVolume = parseInt(volume, 10);
    if (volume && newVolume >= 0 && newVolume <= 100) {
      await sonosClient.setVolume(newVolume);
      const confirmVolume = await sonosClient.getVolume();
      return `Volume is now ${confirmVolume}.`;
    }

    return 'Invalid volume.';
  };

  const list = async () => {
    const currentTrack = await sonosClient.currentTrack();
    const limit = 10;
    const index = currentTrack.queuePosition - 1;

    const result = await sonosClient.getQueue(index, limit);
    if (!result && result.items) {
      return GENERIC_ERROR;
    }

    const np = idx => currentTrack.uri === result.items[idx].uri;

    const items = result.items.map((i, idx) =>
      `*${idx + index + 1}.* ${np(idx) ? '*' : ''}${i.artist} - ${i.title}${np(idx) ? '* :notes:' : ''}`);

    return `*${result.total}* total tracks in queue:\n\n${items.join('\n')}`;
  };

  const pause = async () => {
    const paused = await sonosClient.pause();
    if (paused) {
      return 'Sonos is now paused';
    }
    return GENERIC_ERROR;
  };

  const gong = async (args, user) => {
    const currentTrack = await sonosClient.currentTrack();
    if (currentTrack.uri !== gongUri) {
      gongUri = currentTrack.uri;
      gongCount = 0;
      gongUsers = [];
    }

    if (!gongUsers.includes(user)) {
      gongCount += 1;
      gongUsers.push(user);
      if (gongCount < gongLimit) {
        return `This is gong ${gongCount} of ${gongLimit} for *${currentTrack.artist}* - *${currentTrack.title}*`;
      }
      await sonosClient.next();
      return 'GONGED!';
    }
    return `Nice try, <@${user}>, you've already gonged this!`;
  };

  const play = async () => {
    const playing = await sonosClient.play();
    if (playing) {
      return 'Sonos is now playing.';
    }
    return GENERIC_ERROR;
  };

  const previous = async () => {
    const prev = await sonosClient.previous();
    if (prev) {
      return 'Jumping back!';
    }
    return GENERIC_ERROR;
  };

  const next = async () => {
    const skip = await sonosClient.next();
    if (skip) {
      return 'Skipping track...';
    }
    return GENERIC_ERROR;
  };

  const shuffle = async () => {
    const shuffled = await sonosClient.shuffle();
    if (shuffled) {
      return 'Every day I’m shufflin...\'';
    }
    return GENERIC_ERROR;
  };

  const stop = async () => {
    const stopped = await sonosClient.stop();
    if (stopped) {
      return 'Stahped. :(';
    }
    return GENERIC_ERROR;
  };

  return {
    adminCommands: {
      blacklist,
      help: adminHelp,
      next,
      pause,
      play,
      previous,
      setvolume: setVolume,
      shuffle,
      stop,
    },
    commands: {
      add,
      current: getCurrent,
      gong,
      help,
      list,
      search,
      status: getStatus,
      volume: getVolume,
    },
  };
};
