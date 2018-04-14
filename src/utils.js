module.exports = {
  charToIndex: string => string.toLowerCase().charCodeAt(0) - 97,

  formatMilliseconds: (milliseconds) => {
    const ms = parseInt(milliseconds, 10);
    const minutes = `${Math.floor(ms / 60000)}`;
    const seconds = `${((ms % 60000) / 1000).toFixed(0)}`;
    return `${minutes.padStart(Math.max(minutes.length, 1), '0')}:${seconds.padStart(2, '0')}`;
  },

  formatSeconds: (seconds) => {
    const totalSeconds = parseInt(seconds, 10);
    const minutes = `${Math.floor(totalSeconds / 60)}`;
    const remainingSeconds = `${totalSeconds % 60}`;
    return `${minutes.padStart(Math.max(minutes.length, 1), '0')}:${remainingSeconds.padStart(2, '0')}`;
  },

  indexToChar: index => String.fromCharCode(97 + (index % 26)),

  isChar: string => string.match(/^[a-z]\.?\s*$/i),

  sanitiseChannel: channel => channel.toLowerCase().replace(/^#/, ''),
};
