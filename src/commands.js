const _ = require('lodash');
const log = require('./log')();
const {
  charToIndex,
  formatMilliseconds,
  formatSeconds,
  indexToChar,
  isChar,
  wordSearch,
} = require('./utils');

const { gongLimit } = require('./config');

const ADD_NOT_SPECFIED = 'What am I adding?';
const NOT_FOUND = "I couldn't find anything :(";
const GENERIC_ERROR = 'Something went wrong :(';
const ITEM_LIMIT = 20;

let gongCount = 0;
let gongUri;
let gongUsers = [];

const getRandom = (array = []) => array[Math.floor(Math.random() * array.length)];
const formatArtists = item => item.artists.map(a => a.name).join(', ');
const formatTrack = track => `${formatArtists(track)} - ${track.name}`;
const formatAlbum = album => {
  const year = album.release_date.substring(0, 4);
  return `${formatArtists(album)} - ${album.name} (${year})`;
};

const formatTrackDetail = track => {
  const albumYear = track.album.release_date.substring(0, 4);
  const length = formatMilliseconds(track.duration_ms);

  return `*${track.name}*${track.explicit ? ' *`E`*' : ''} (${length})\n
${formatArtists(track)}
_${track.album.name}_
_${albumYear}_`;
};

const formatAlbumDetail = album => {
  const albumYear = album.release_date.substring(0, 4);
  return `*${album.name}*
${formatArtists(album)}
_${albumYear}_`;
};

module.exports = (spotifyClient, sonosClient, slackClient) => {
  let lastResult = {};

  const add = async text => {
    const addToQueue = uri => sonosClient.queueNext(uri);
    let track;

    if (!(text && text.length)) {
      return ADD_NOT_SPECFIED;
    }
    if (lastResult.tracks && lastResult.tracks.length) {
      if (isChar(text)) {
        track = lastResult.tracks[charToIndex(text)];
      } else {
        track = lastResult.tracks.find(t =>
          formatTrack(t)
            .toLowerCase()
            .startsWith(text.toLowerCase())
        );
      }
    }
    if (!track) {
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
          text: 'Track added to queue.',
          body: formatTrackDetail(track),
          thumbUrl: track.album.images[Math.min(1, track.album.images.length - 1)].url,
        };
      }
    }
    return GENERIC_ERROR;
  };

  const list = async () => {
    const currentTrack = await sonosClient.currentTrack();
    const limit = 10;
    const index = currentTrack.queuePosition - 1;

    const result = await sonosClient.getQueue(index, limit);
    if (!(result && result.items)) {
      return GENERIC_ERROR;
    }

    const np = idx => currentTrack.uri === result.items[idx].uri;

    log(result);
    const items = result.items.map(
      (i, idx) =>
        `*${idx + index + 1}.* ${np(idx) ? '*' : ''}${i.artist} - ${i.title}${
          np(idx) ? '* :notes:' : ''
        }`
    );

    return `*${result.total}* total tracks in queue:\n\n${items.join('\n')}`;
  };

  const addAlbum = async text => {
    const addToQueue = uri => sonosClient.queueNext(uri);
    let album;

    if (!(text && text.length)) {
      return ADD_NOT_SPECFIED;
    }
    if (lastResult.albums && lastResult.albums.length) {
      if (isChar(text)) {
        album = lastResult.albums[charToIndex(text)];
      } else {
        album = lastResult.albums.find(a =>
          formatAlbum(a)
            .toLowerCase()
            .startsWith(text.toLowerCase())
        );
      }
    }
    if (!album) {
      // Otherwise just search
      const newSearch = await spotifyClient.searchAlbums(text);
      if (!(newSearch && newSearch.length)) {
        return 'I could not find that album. Have you tried `searchalbum`ing for it?';
      }
      album = newSearch && newSearch[0];
    }
    if (album) {
      // TODO: there's _GOT_ to be a better way to do this
      // queue(album.uri) doesn't work in shuffle and queuenext() is in the node-sonos docs but is undefined?

      const response = await spotifyClient.uriRequest(album.href);

      const trackUris = response.tracks.items.reverse().map(i => i.uri);
      /* eslint-disable no-restricted-syntax, no-await-in-loop */
      for (const trackUri of trackUris) {
        await addToQueue(trackUri);
      }
      /* eslint-enable no-restricted-syntax, no-await-in-loop */

      return {
        text: 'Album added to queue.',
        body: formatAlbumDetail(album),
        thumbUrl: album.images[Math.min(1, album.images.length - 1)].url,
      };
    }
    return GENERIC_ERROR;
  };

  const addArtist = async text => {
    const addToQueue = uri => sonosClient.queueNext(uri);
    let artist;

    if (!(text && text.length)) {
      return ADD_NOT_SPECFIED;
    }
    if (lastResult.artists && lastResult.artists.length) {
      if (isChar(text)) {
        artist = lastResult.artists[charToIndex(text)];
      } else {
        artist = lastResult.artists.find(a => a.name.toLowerCase().startsWith(text.toLowerCase()));
      }
    }
    if (!artist) {
      // Otherwise just search
      const newSearch = await spotifyClient.searchArtists(text);
      if (!(newSearch && newSearch.length)) {
        return 'I could not find that artist. Have you tried `searchartist`ing for it?';
      }
      artist = newSearch && newSearch[0];
    }
    if (artist) {
      const { id } = artist;
      const topTracks = await spotifyClient.getTopTracks(id);
      log(topTracks);

      const trackUris = topTracks.reverse().map(i => i.uri);
      /* eslint-disable no-restricted-syntax, no-await-in-loop */
      for (const trackUri of trackUris) {
        await addToQueue(trackUri);
      }

      const trackList = await list();
      return `Artist added to queue.\n${trackList}`;
    }
    return GENERIC_ERROR;
  };

  const blacklist = async () => {
    const users = await slackClient.getBlacklistedUsers();
    if (users && users.length) {
      return `The following users are on the blacklist: ${users.map(u => `<@${u.id}>`).join(', ')}`;
    }
    return 'There are no users on the blacklist';
  };

  const adminBlacklist = async (args, user) => {
    const addUser = username => {
      const result = slackClient.addToBlacklist(username);
      if (result === undefined) {
        return `An error occurred adding ${username} to the blacklist.`;
      }
      if (result) {
        return `${username} has been added to the blacklist.`;
      }
      return `${username} was already on the blacklist.`;
    };
    const removeUser = username => {
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
    return blacklist();
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

    const timeStamps = `${formatSeconds(currentTrack.position)}/${formatSeconds(
      currentTrack.duration
    )}`;
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

  const help = () =>
    `>>>*Standard commands:*\n
  *\`search\`* _text_: Search for a track
  *\`add\`* _text_: Add a track to the queue. You can specify the full text or the character code ` +
    `returned from a \`search\`.
  *\`current\`*: Display the currently playing track.
  *\`gong\`*: Express your dislike for the current track. ${gongLimit} gongs and it will be skipped.
  *\`searchalbum\`* _text_: Search for an album
  *\`searchartist\`* _text_: Search for an artist
  *\`addalbum\`* _text_: Add an entire album to the queue.
  *\`addartist\`* _text_: Add an artist's top tracks to the queue.
  *\`blacklist\`*: List users currently blacklisted
  *\`help\`*: Display this message.
  *\`list\`*: Display the current Sonos queue.
  *\`status\`*: Get the current Sonos status.
  *\`volume\`*: List current volume.\n\n*Admin commands:*\n
  *\`blacklist add @username\`*: Add a user to the blacklist
  *\`blacklist del @username\`*: Remove a user from the blacklist
  *\`next\`*: Skip to the next track
  *\`searchplaylist\`* _text_: Search for a Spotify playlist.
  *\`setvolume\`*: Set Sonos volume
  *\`shuffle\`*: (Re)shuffle the playlist
  *\`stop\`*: Stop the music entirely. :(
  *\`pause\`*: Pause Sonos
  *\`playlist\`*: Replace the current queue with a Spotify playlist. You can specify the full text ` +
    `or the character code returned from a \`searchplaylist\`.
  *\`previous\`*: Go to the previous track
  *\`play\`*: Play or unpause Sonos`;

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

  const search = async text => {
    const tracks = await spotifyClient.searchTracks(text);
    lastResult = { tracks: tracks || [] };

    if (!(tracks && tracks.length)) {
      return NOT_FOUND;
    }

    const trackNames = tracks.map(
      (t, idx) => `*${indexToChar(idx)}.* ${formatTrack(t)}${t.explicit ? ' *`E`*' : ''}`
    );

    return `*I found the following tracks:*\n
${trackNames.join('\n')}\n
*To add to the queue, use the \`add\` command.*`;
  };

  const searchAlbums = async text => {
    const albums = await spotifyClient.searchAlbums(text);
    lastResult = { albums: albums || [] };

    if (!(albums && albums.length)) {
      return NOT_FOUND;
    }

    const albumNames = albums.map((a, idx) => `*${indexToChar(idx)}.* ${formatAlbum(a)}`);
    return `*I found the following albums:*\n
${albumNames.join('\n')}\n
*To add to the queue, use the \`addalbum\` command.*`;
  };

  const searchArtists = async text => {
    const artists = await spotifyClient.searchArtists(text);
    lastResult = { artists: artists || [] };

    if (!(artists && artists.length)) {
      return NOT_FOUND;
    }
    const artistNames = artists.map((a, idx) => `*${indexToChar(idx)}.* ${a.name}`);
    return `*I found the following artists:*\n
${artistNames.join('\n')}\n
*To add to the queue, use the \`addartist\` command.*`;
  };

  const searchPlaylists = async text => {
    const playlists = [];

    const [favourites, spotifyPlaylists] = await Promise.all([
      sonosClient.getFavouriteSpotifyPlaylists(),
      spotifyClient.searchPlaylists(text),
    ]);

    if (favourites && favourites.length) {
      const matchingPlaylists = favourites.filter(
        (playlist, idx) => idx < ITEM_LIMIT && wordSearch(text, playlist.name)
      );
      if (matchingPlaylists && matchingPlaylists.length) {
        playlists.push(...matchingPlaylists);
      }
    }

    if (playlists.length < ITEM_LIMIT) {
      if (spotifyPlaylists && spotifyPlaylists.length) {
        const existingUris = favourites.map(p => p.uri);
        const remainingPlaylists = spotifyPlaylists
          .filter(playlist => !existingUris.includes(playlist.uri))
          .slice(0, ITEM_LIMIT - playlists.length);
        playlists.push(...remainingPlaylists);
      }
    }

    lastResult = { playlists };

    if (!(playlists && playlists.length)) {
      return NOT_FOUND;
    }
    const playlistNames = playlists.map(
      (p, idx) => `*${indexToChar(idx)}.* ${p.name}  _(${_.get(p, 'tracks.total', 0)} tracks)_`
    );

    return `*I found the following playlists:*\n
${playlistNames.join('\n')}
\n*To replace the queue with a playlist, use the \`playlist\` command.*`;
  };

  const setVolume = async volume => {
    const newVolume = parseInt(volume, 10);
    if (volume && newVolume >= 0 && newVolume <= 100) {
      await sonosClient.setVolume(newVolume);
      const confirmVolume = await sonosClient.getVolume();
      return `Volume is now ${confirmVolume}.`;
    }

    return 'Invalid volume.';
  };

  const switchPlaylist = async text => {
    const setQueue = uri => sonosClient.replaceQueue(uri);
    let playlist;
    let prefix = '';
    if (!(text && text.length)) {
      const favourites = await sonosClient.getFavouriteSpotifyPlaylists();
      if (favourites && favourites.length) {
        playlist = getRandom(favourites);
        prefix = 'No playlist specified, picking from your Sonos favourites...\n';
      }
      if (!playlist) {
        const { items } = await spotifyClient.getFeaturedPlaylists();
        if (items && items.length) {
          playlist = getRandom(items);
          prefix = 'No playlist specified, picking from Spotify featured playlists...\n';
        }
      }
      if (!playlist) {
        return 'Nothing to play :(';
      }
    }
    if (!playlist) {
      if (lastResult.playlists && lastResult.playlists.length) {
        if (isChar(text)) {
          playlist = lastResult.playlists[charToIndex(text)];
        } else {
          playlist = lastResult.playlists.find(p =>
            p.name.toLowerCase().startsWith(text.toLowerCase())
          );
        }
      }
      if (!playlist) {
        // Otherwise just search
        const newSearch = await spotifyClient.searchPlaylists(text);
        if (!(newSearch && newSearch.length)) {
          return 'I could not find that playlist. Have you tried `searchplaylist`ing for it?';
        }
        playlist = newSearch && newSearch[0];
      }
    }
    if (playlist) {
      log(playlist);
      const added = await setQueue(playlist.uri);
      if (added) {
        const trackList = await list();
        return `${prefix}*${playlist.name}* is now playing!\n\n${trackList}`;
      }
    }

    return GENERIC_ERROR;
  };

  const shuffle = async () => {
    const shuffled = await sonosClient.shuffle();
    if (shuffled) {
      const trackList = await list();
      return `Every day I’m shufflin'...\n\n${trackList}`;
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
      blacklist: adminBlacklist,
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
      addalbum: addAlbum,
      addartist: addArtist,
      blacklist,
      current: getCurrent,
      gong,
      help,
      list,
      search,
      searchalbum: searchAlbums,
      searchartist: searchArtists,
      status: getStatus,
      volume: getVolume,
    },
  };
};
