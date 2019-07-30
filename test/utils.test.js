const utils = require('../src/utils');

describe('utils', () => {
  describe('charToIndex', () => {
    it('converts a-z chars to indexes', () => {
      expect(utils.charToIndex('a')).toEqual(0);
      expect(utils.charToIndex('b')).toEqual(1);
      expect(utils.charToIndex('z')).toEqual(25);
    });
    it('handles uppercase', () => {
      expect(utils.charToIndex('E')).toEqual(4);
      expect(utils.charToIndex('Y')).toEqual(24);
    });
    it('ignores subsequent characters', () => {
      expect(utils.charToIndex('b....!')).toEqual(1);
    });
    it('ignores invalid values', () => {
      expect(utils.charToIndex('[')).toBeUndefined();
      expect(utils.charToIndex('~')).toBeUndefined();
    });
  });

  describe('formatMilliseconds', () => {
    it('converts milliseconds to minutes and seconds', () => {
      expect(utils.formatMilliseconds(237480)).toEqual('3:57');
    });
    it('pads seconds to 2 digits', () => {
      expect(utils.formatMilliseconds(61000)).toEqual('1:01');
    });
    it('pads minutes to 1 digit', () => {
      expect(utils.formatMilliseconds(30000)).toEqual('0:30');
    });
    it('displays hours as minutes', () => {
      expect(utils.formatMilliseconds(2 * 60 * 60 * 1000)).toEqual('120:00');
    });
  });

  describe('formatSeconds', () => {
    it('converts seconds to minutes and seconds', () => {
      expect(utils.formatSeconds(237)).toEqual('3:57');
    });
    it('pads seconds to 2 digits', () => {
      expect(utils.formatSeconds(61)).toEqual('1:01');
    });
    it('pads minutes to 1 digit', () => {
      expect(utils.formatSeconds(30)).toEqual('0:30');
    });
    it('displays hours as minutes', () => {
      expect(utils.formatSeconds(2 * 60 * 60)).toEqual('120:00');
    });
  });

  describe('indextoChar', () => {
    it('converts indexes to chars', () => {
      expect(utils.indexToChar(0)).toEqual('a');
      expect(utils.indexToChar(1)).toEqual('b');
      expect(utils.indexToChar(25)).toEqual('z');
    });
    it('ignores invalid indexes', () => {
      expect(utils.indexToChar(-1)).toBeUndefined();
      expect(utils.indexToChar(12131)).toBeUndefined();
    });
  });

  describe('isChar', () => {
    it('detects valid chars', () => {
      expect(utils.isChar('a')).toBeTruthy();
      expect(utils.isChar('b')).toBeTruthy();
      expect(utils.isChar('c.')).toBeTruthy();
      expect(utils.isChar('D.   ')).toBeTruthy();
      expect(utils.isChar('E          ')).toBeTruthy();
    });

    it('rejects invalid inputs', () => {
      expect(utils.isChar('0')).toBeFalsy();
      expect(utils.isChar('Hi, how are you?')).toBeFalsy();
      expect(utils.isChar('Special K')).toBeFalsy();
      expect(utils.isChar()).toBeFalsy();
      expect(utils.isChar('f.f.f.f.')).toBeFalsy();
    });
  });

  describe('sanitiseChannel', () => {
    it('strips # from channel names', () => {
      expect(utils.sanitiseChannel('#sonos')).toEqual('sonos');
      expect(utils.sanitiseChannel('sonosadmin')).toEqual('sonosadmin');
    });
    it('leaves the rest of the string intact', () => {
      expect(utils.sanitiseChannel('#so#n#o#s')).toEqual('so#n#o#s');
    });
  });

  describe('wordSearch', () => {
    it('finds matching strings', () => {
      const string = 'This is most certainly a string with a few words in it';
      expect(utils.wordSearch('this is', string)).toBeTruthy();
      expect(utils.wordSearch('This is', string)).toBeTruthy();
      expect(utils.wordSearch('CERTAIN', string)).toBeTruthy();
      expect(utils.wordSearch('string few words', string)).toBeTruthy();
      expect(utils.wordSearch('most few words in', string)).toBeTruthy();
      expect(utils.wordSearch('a it is with this', string)).toBeTruthy();
    });

    it('rejects non matching strings', () => {
      const string = 'This is most certainly a string with a few words in it';
      expect(utils.wordSearch('not here', string)).toBeFalsy();
      expect(utils.wordSearch('This is most certainly a camel', string)).toBeFalsy();
      expect(utils.wordSearch('This is almost certainly a string', string)).toBeFalsy();
    });

    it('handles special chars', () => {
      const string = 'Some cool regex chars are (?:/])';
      expect(utils.wordSearch('.*', string)).toBeFalsy();
      expect(utils.wordSearch('(?:/', string)).toBeTruthy();
    });
  });
});
