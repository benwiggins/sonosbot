const _ = require('lodash');

module.exports = {
  charToIndex: (string) => {
    const index = string.toLowerCase().charCodeAt(0) - 97;
    if (index < 0 || index > 25) {
      return undefined;
    }
    return index;
  },

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
    return `${minutes.padStart(Math.max(minutes.length, 1), '0')}:${remainingSeconds.padStart(
      2,
      '0'
    )}`;
  },

  indexToChar: (index) => {
    if (!(index !== undefined && index >= 0 && index < 26)) {
      return undefined;
    }
    return String.fromCharCode(97 + (index % 26));
  },

  isChar: (string) => /^[a-z]\.?\s*$/i.test(string),

  wordSearch: (input, string) => {
    const words = input.split(' ');
    return words.reduce((isValid, word) => {
      const regex = RegExp(`${_.escapeRegExp(word)}`, 'i');
      const isMatch = regex.test(string);
      const result = isValid && isMatch;
      return result;
    }, true);
  },

  sanitiseChannel: (channel) => channel.toLowerCase().replace(/^#/, ''),
};
