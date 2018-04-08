module.exports = {
  charToIndex: string => string.toLowerCase().charCodeAt(0) - 97,
  indexToChar: index => String.fromCharCode(97 + (index % 26)),
  isChar: string => string.match(/^[a-z]$/i),
  sanitiseChannel: channel => channel.toLowerCase().replace(/^#/, ''),
  sanitiseUser: user => user.toLowerCase().replace(/^@/, ''),
};
