const { chai } = require('./testHelper');
const utils = require('../src/utils');

const { expect } = chai;

describe('utils', () => {
  describe('charToIndex', () => {
    it('converts a-z chars to indexes', () => {
      expect(utils.charToIndex('a')).to.equal(0);
      expect(utils.charToIndex('b')).to.equal(1);
      expect(utils.charToIndex('z')).to.equal(25);
    });
    it('handles uppercase', () => {
      expect(utils.charToIndex('E')).to.equal(4);
      expect(utils.charToIndex('Y')).to.equal(24);
    });
    it('ignores subsequent characters', () => {
      expect(utils.charToIndex('b....!')).to.equal(1);
    });
    it('ignores invalid values', () => {
      expect(utils.charToIndex('[')).to.be.undefined();
      expect(utils.charToIndex('~')).to.be.undefined();
    });
  });

  describe('formatMilliseconds', () => {
    it('converts milliseconds to minutes and seconds', () => {
      expect(utils.formatMilliseconds(237480)).to.equal('3:57');
    });
    it('pads seconds to 2 digits', () => {
      expect(utils.formatMilliseconds(61000)).to.equal('1:01');
    });
    it('pads minutes to 1 digit', () => {
      expect(utils.formatMilliseconds(30000)).to.equal('0:30');
    });
    it('displays hours as minutes', () => {
      expect(utils.formatMilliseconds(2 * 60 * 60 * 1000)).to.equal('120:00');
    });
  });

  describe('formatSeconds', () => {
    it('converts seconds to minutes and seconds', () => {
      expect(utils.formatSeconds(237)).to.equal('3:57');
    });
    it('pads seconds to 2 digits', () => {
      expect(utils.formatSeconds(61)).to.equal('1:01');
    });
    it('pads minutes to 1 digit', () => {
      expect(utils.formatSeconds(30)).to.equal('0:30');
    });
    it('displays hours as minutes', () => {
      expect(utils.formatSeconds(2 * 60 * 60)).to.equal('120:00');
    });
  });

  describe('indextoChar', () => {
    it('converts indexes to chars', () => {
      expect(utils.indexToChar(0)).to.equal('a');
      expect(utils.indexToChar(1)).to.equal('b');
      expect(utils.indexToChar(25)).to.equal('z');
    });
    it('ignores invalid indexes', () => {
      expect(utils.indexToChar(-1)).to.be.undefined();
      expect(utils.indexToChar(12131)).to.be.undefined();
    });
  });

  describe('isChar', () => {
    it('detects valid chars', () => {
      expect(utils.isChar('a')).to.be.true();
      expect(utils.isChar('b')).to.be.true();
      expect(utils.isChar('c.')).to.be.true();
      expect(utils.isChar('D.   ')).to.be.true();
      expect(utils.isChar('E          ')).to.be.true();
    });

    it('rejects invalid inputs', () => {
      expect(utils.isChar('0')).to.be.false();
      expect(utils.isChar('Hi, how are you?')).to.be.false();
      expect(utils.isChar('Special K')).to.be.false();
      expect(utils.isChar()).to.be.false();
      expect(utils.isChar('f.f.f.f.')).to.be.false();
    });
  });

  describe('sanitiseChannel', () => {
    it('strips # from channel names', () => {
      expect(utils.sanitiseChannel('#sonos')).to.equal('sonos');
      expect(utils.sanitiseChannel('sonosadmin')).to.equal('sonosadmin');
    });
    it('leaves the rest of the string intact', () => {
      expect(utils.sanitiseChannel('#so#n#o#s')).to.equal('so#n#o#s');
    });
  });

  describe('wordSearch', () => {
    it('finds matching strings', () => {
      const string = 'This is most certainly a string with a few words in it';
      expect(utils.wordSearch('this is', string)).to.be.true();
      expect(utils.wordSearch('This is', string)).to.be.true();
      expect(utils.wordSearch('CERTAIN', string)).to.be.true();
      expect(utils.wordSearch('string few words', string)).to.be.true();
      expect(utils.wordSearch('most few words in', string)).to.be.true();
      expect(utils.wordSearch('a it is with this', string)).to.be.true();
    });

    it('rejects non matching strings', () => {
      const string = 'This is most certainly a string with a few words in it';
      expect(utils.wordSearch('not here', string)).to.be.false();
      expect(utils.wordSearch('This is most certainly a camel', string)).to.be.false();
      expect(utils.wordSearch('This is almost certainly a string', string)).to.be.false();
    });

    it('handles special chars', () => {
      const string = 'Some cool regex chars are (?:/])';
      expect(utils.wordSearch('.*', string)).to.be.false();
      expect(utils.wordSearch('(?:/', string)).to.be.true();
    });
  });
});
