const {
  charToIndex,
  formatMilliseconds,
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

const formatTrackDetail = (track) => {
  const artists = track.artists.map(a => a.name).join(', ');
  const albumYear = track.album.release_date.substring(0, 4);
  const length = formatMilliseconds(track.duration_ms);

  return `*${track.name}*${track.explicit ? ' *`E`*' : ''} (${length})\n
*Artist:* ${artists}
*Album:* ${track.album.name} (${albumYear})`;
};

module.exports = (spotifyClient, sonosClient, slackClient) => {
  let lastResult = {};

  const add = async (text) => {
    const addToQueue = uri => sonosClient.queueNext(uri);
    let track;

    if (!(text && text.length)) {
      return 'What am I adding?';
    }
    if (lastResult.tracks && lastResult.tracks.length) {
      if (isChar(text)) {
        track = lastResult.tracks[charToIndex(text)];
      } else {
        track = lastResult.tracks.find(t => formatTrack(t).toLowerCase().startsWith(text.toLowerCase()));
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
        return {
          text: 'Added to queue.',
          body: formatTrackDetail(track),
          thumbUrl: track.album.images[Math.min(1, track.album.images.length - 1)].url,
        };
      }
    }
    return GENERIC_ERROR;
  };

  const blacklist = async (args, user) => {
    const addUser = (username) => {
      const result = slackClient.addToBlacklist(username);
      if (result === undefined) {
        return `An error occurred adding ${username} to the blacklist.`;
      }
      if (result) {
        return `${username} has been added to the blacklist.`;
      }
      return `${username} was already on the blacklist.`;
    };
    const removeUser = (username) => {
      const result = slackClient.removeFromBlacklist(username);
      if (result === undefined) {
        return `An error occurred removing ${username} from the blacklist.`;
      }
      if (result) {
        return `${username} has been removed from the blacklist.`;
      }
      return `${username} was not on the blacklist.`;
    };

    if (args) {
      const [operation, targetUser] = args.split(' ');
      switch (operation) {
        case 'add':
          if (!targetUser) {
            return 'Usage: `blacklist add @username`';
          }
          if (targetUser === `<@${user}>`) {
            return "You really shouldn't blacklist yourself.";
          }
          return addUser(targetUser);

        case 'del':
        case 'remove':
          if (!targetUser) {
            return `Usage: \`blacklist ${operation} @username\``;
          }
          return removeUser(targetUser);
        default:
          return 'Invalid blacklist command. I understand `add` and `del / `remove`';
      }
    }

    const users = await slackClient.getBlacklistedUsers();
    if (users && users.length) {
      return `The following users are on the blacklist: ${users.map(u => `<@${u.id}>`).join(', ')}`;
    }
    return 'There are no users on the blacklist';
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

  const getStatus = async () => {
    const status = await sonosClient.getCurrentState();
    return `Sonos is currently ${status}!`;
  };

  const getVolume = async () => {
    const volume = await sonosClient.getVolume();
    return `Current volume is ${volume}.`;
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

  const help = () => `>>>*I understand the following commands:*\n
  *\`search\`* _text_: Search for a track
  *\`add\`* _text_: Add a track to the queue. You can specify the full text or the character code ` +
    `returned from a \`search\`.
  *\`current\`*: Display the currently playing track.
  *\`gong\`*: Express your dislike for the current track. ${gongLimit} gongs and it will be skipped.
  *\`help\`*: Display this message.
  *\`list\`*: Display the current Sonos queue.
  *\`status\`*: Get the current Sonos status.
  *\`volume\`*: List current volume.\n\n*Admin commands:*\n
  *\`blacklist\`*: List users currently blacklisted
  *\`blacklist add @username\`*: Add a user to the blacklist
  *\`blacklist del @username\`*: Remove a user from the blacklist
  *\`next\`*: Skip to the next track
  *\`searchplaylist\`* _text_: Search for a Spotify playlist.
  *\`setvolume\`*: Set Sonos volume
  *\`shuffle\`*: (Re)shuffle the playlist
  *\`stop\`*: Stop the music entirely. :(
  *\`pause\`*: Pause Sonos
  *\`playlist\`*: Replace the current queue with a Spotify playlist. You can specify the full text ` +
    `or the character code returned from a \`searchplaylist\`
  *\`previous\`*: Go to the previous track
  *\`play\`*: Play or unpause Sonos`;

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

  const next = async () => {
    const skip = await sonosClient.next();
    if (skip) {
      return 'Skipping track...';
    }
    return GENERIC_ERROR;
  };

  const pause = async () => {
    const paused = await sonosClient.pause();
    if (paused) {
      return 'Sonos is now paused';
    }
    return GENERIC_ERROR;
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


  const search = async (text) => {
    const tracks = await spotifyClient.searchTracks(text);
    lastResult = { tracks: (tracks || []) };

    if (!(tracks && tracks.length)) {
      return 'I could not find anything :(';
    }

    const trackNames = tracks.map((t, idx) => `*${indexToChar(idx)}.* ${formatTrack(t)}${t.explicit ? ' *`E`*' : ''}`);

    return `*I found the following tracks:*\n
${trackNames.join('\n')}\n
*To add to the queue, use the \`add\` command.*`;
  };

  const searchPlaylists = async (text) => {
    const playlists = await spotifyClient.searchPlaylists(text);
    lastResult = { playlists: (playlists || []) };

    if (!(playlists && playlists.length)) {
      return 'I could not find anything :(';
    }
    const playlistNames = playlists.map((p, idx) =>
      `*${indexToChar(idx)}.* ${p.name}  _(${p.tracks.total || 0} tracks)_`);

    return `*I found the following playlists:*\n
${playlistNames.join('\n')}
\n*To replace the queue with a playlist, use the \`playlist\` command.*`;
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

  const switchPlaylist = async (text) => {
    const setQueue = uri => sonosClient.replaceQueue(uri);
    let playlist;

    if (!(text && text.length)) {
      return 'What am I playing?';
    }
    if (lastResult.playlists && lastResult.playlists.length) {
      if (isChar(text)) {
        playlist = lastResult.playlists[charToIndex(text)];
      } else {
        playlist = lastResult.playlists.find(p => p.name.toLowerCase().startsWith(text.toLowerCase()));
      }
    } else {
      // Otherwise just search
      const newSearch = await spotifyClient.searchPlaylists(text);
      if (!(newSearch && newSearch.length)) {
        return 'I could not find that playlist. Have you tried `searchplaylist`ing for it?';
      }
      playlist = newSearch && newSearch[0];
    }
    if (playlist) {
      const added = await setQueue(playlist.uri);
      if (added) {
        const trackList = await list();
        return `*${playlist.name}* is now playing!\n\n${trackList}`;
      }
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
      next,
      pause,
      play,
      previous,
      searchplaylist: searchPlaylists,
      playlist: switchPlaylist,
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
