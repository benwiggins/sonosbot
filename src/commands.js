const log = require('./log');
const { indexToChar, isChar, charToIndex } = require('./utils');

const formatTrack = (track) => {
  const artists = track.artists.map(a => a.name).join(', ');
  return `${artists} - ${track.name}`;
};

module.exports = (spotifyClient) => {
  let lastResult = [];

  const add = async (text) => {
    if (!(text && text.length)) {
      return 'What am I adding?';
    }
    if (lastResult.length) {
      if (isChar(text)) {
        const track = lastResult[charToIndex(text)];
        return `Adding ${track.name}`;
      }

      const track = lastResult.find(t => formatTrack(t) === text);
      if (track) {
        return `Adding ${track.name}`;
      }
    }

    // Otherwise just search
    const newSearch = await spotifyClient.searchTracks(text);
    if (!(newSearch && newSearch.length)) {
      return 'I could not find that track. Have you tried `search`ing for it?';
    }

    const track = newSearch[0];
    return `Adding ${track.name}`;
  };

  const help = () => `*I understand the following commands:*\n
*\`search\`* _text_ : Search for a track\n
\`searchalbum\`' _text_ : Search for an album\n
\`searchplaylist\`: Search for a playlist\n
\`add\` _text_: Add a track to the queue. You can specify the full text or the character code.\n
\`gong\`: Express your dislike for the current track\n
`;

  const adminHelp = () => `${help()}\n*Admin functions:*\n
  \`blacklist\`: List users currently blacklisted\n
  \`blacklist add @username\`: Add a user to the blacklist\n
  \`blacklist del @username\`: Remove a user from the blacklist`;

  const search = async (text) => {
    const tracks = await spotifyClient.searchTracks(text);
    lastResult = tracks || [];

    if (!(tracks && tracks.length)) {
      return 'I could not find anything :(';
    }

    const trackNames = tracks.map((t, idx) => `*${indexToChar(idx)}.* ${formatTrack(t)} ${t.explicit ? '*`E`*' : ''}`);

    return `*I found the following tracks:*\n\n${trackNames.join('\n')}\n\n*To play, use the \`add\` command.*`;
  };

  const commands = {
    help,
    search,
    add,
  };

  const adminCommands = {
    help: adminHelp,
  };

  return {
    commands,
    adminCommands,
  };
};
