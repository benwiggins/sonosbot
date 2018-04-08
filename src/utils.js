module.exports = {
  charToIndex: string => string.toLowerCase().charCodeAt(0) - 97,
  formatSeconds: (seconds) => {
    const totalSeconds = parseInt(seconds, 10);
    const minutes = `${Math.floor(totalSeconds / 60)}`;
    const remainingSeconds = `${totalSeconds % 60}`;
    return `${minutes.padStart(Math.max(minutes.length, 2), '0')}:${remainingSeconds.padStart(2, '0')}`;
  },
  indexToChar: index => String.fromCharCode(97 + (index % 26)),
  isChar: string => string.match(/^[a-z]\.?\s*$/i),
  sanitiseChannel: channel => channel.toLowerCase().replace(/^#/, ''),
  sanitiseUser: user => user.toLowerCase().replace(/^@/, ''),
};
