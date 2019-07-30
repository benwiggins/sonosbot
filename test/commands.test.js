const nock = require('nock');
const SonosClient = require('../src/integrations/sonos');
const SpotifyClient = require('../src/integrations/spotify');

const mockQueueNext = jest.fn();
jest.mock('../src/integrations/sonos', () =>
  jest.fn().mockImplementation(() => ({
    getFavouriteSpotifyPlaylists: jest.fn(() => []),
    queueNext: mockQueueNext,
  }))
);

const spotifyClient = new SpotifyClient({ clientId: 'CLIENT_ID', secret: 'SECRET', region: 'AU' });
const Commands = require('../src/commands');

const json = filename => `${__dirname}/responses/${filename}.json`;

const sonosClient = new SonosClient();
describe('commands', () => {
  let commands;
  beforeEach(() => {
    nock('https://accounts.spotify.com')
      .post('/api/token')
      .reply(200, { access_token: 'ACCESS_TOKEN' });

    commands = Commands(spotifyClient, sonosClient);
  });

  describe('search', () => {
    beforeEach(() => {
      nock('https://api.spotify.com')
        .get('/v1/search')
        .query({ q: 'closer', type: 'track', market: 'AU' })
        .replyWithFile(200, json('spotify-search-track'), { 'Content-Type': 'application/json' });
    });

    it('returns a list of songs', async () => {
      const response = await commands.commands.search('closer');
      expect(response).toEqual(`*I found the following tracks:*

*a.* The Chainsmokers, Halsey - Closer
*b.* Six60 - Closer
*c.* Ne-Yo - Closer
*d.* Nine Inch Nails - Closer *\`E\`*
*e.* Linkin Park - One Step Closer
*f.* Kings of Leon - Closer
*g.* Jay & The Americans - Come A Little Bit Closer
*h.* WizKid, Drake - Come Closer *\`E\`*
*i.* Lemaitre, Jennie A. - Closer
*j.* Tore Bojsten - Closer - Acoustic
*k.* Six60 - Closer
*l.* The Chainsmokers, Halsey - Closer
*m.* Boyce Avenue, Sarah Hyland - Closer (feat. Sarah Hyland)
*n.* Tegan and Sara - Closer
*o.* JP Cooper - Closer
*p.* Cage The Elephant - Come a Little Closer
*q.* WizKid, Drake - Come Closer *\`E\`*
*r.* Keith Urban - Long Hot Summer
*s.* Endless Heights - Come a Little Closer
*t.* Lemaitre, Jennie A. - Closer

*To add to the queue, use the \`add\` command.*`);
    });
  });

  describe('searchalbum', () => {
    beforeEach(() => {
      nock('https://api.spotify.com')
        .get('/v1/search')
        .query({ q: 'ok computer', type: 'album', market: 'AU' })
        .replyWithFile(200, json('spotify-search-album'), { 'Content-Type': 'application/json' });
    });
    it('returns a list of albums', async () => {
      const response = await commands.commands.searchalbum('ok computer');
      expect(response).toEqual(
        `*I found the following albums:*

*a.* Radiohead - OK Computer (1997)
*b.* Radiohead - OK Computer OKNOTOK 1997 2017 (2017)
*c.* Mother Falcon - MF Computer (Radiohead’s OK Computer Reimagined) (2014)
*d.* Mozzy - Ok Computer (2015)
*e.* The Gentlemen Of NUCO - Radiohead's OK Computer (2009)
*f.* C. Greenwood, J. Greenwood, P. Selway, E O’Brien, T. Yorke, Vitamin String Quartet` +
          ` - Strung Out On OK Computer - The String Quartet Tribute To Radiohead (2001)
*g.* Molotov Cocktail Piano - MCP Performs Radiohead: OK Computer (2017)

*To add to the queue, use the \`addalbum\` command.*`
      );
    });
  });

  describe('searchartist', () => {
    beforeEach(() => {
      nock('https://api.spotify.com')
        .get('/v1/search')
        .query({ q: 'james', type: 'artist', market: 'AU' })
        .replyWithFile(200, json('spotify-search-artist'), { 'Content-Type': 'application/json' });
    });
    it('returns a list of artists', async () => {
      const response = await commands.commands.searchartist('james');
      expect(response).toEqual(`*I found the following artists:*

*a.* Hayden James
*b.* James Arthur
*c.* Gavin James
*d.* James Bay
*e.* James TW
*f.* James Blake
*g.* James Blunt
*h.* Jarryd James
*i.* James Vincent McMorrow
*j.* James Morrison
*k.* James Taylor
*l.* Fergus James
*m.* Mitch James
*n.* James Horner
*o.* James Reyne
*p.* Parson James
*q.* James Heather
*r.* Trinidad James
*s.* James Chatburn
*t.* James

*To add to the queue, use the \`addartist\` command.*`);
    });
  });

  describe('searchplaylist', () => {
    beforeEach(() => {
      nock('https://api.spotify.com')
        .get('/v1/search')
        .query({ q: 'while you work', type: 'playlist', market: 'AU' })
        .replyWithFile(200, json('spotify-search-playlist'), {
          'Content-Type': 'application/json',
        });
    });
    it('returns a list of playlists', async () => {
      const response = await commands.adminCommands.searchplaylist('while you work');
      expect(response).toEqual(`*I found the following playlists:*

*a.* While You Work (@whileyouwork)  _(3668 tracks)_
*b.* Vintage While You Work: The Complete Postmodern Jukebox Playlist  _(233 tracks)_
*c.* Calm Classical  _(68 tracks)_
*d.* HipHop Instrumentals | Jazz | Boom Bap | Lofi | Beats  _(433 tracks)_
*e.* while(!success){ work++; }  _(461 tracks)_
*f.* Homework Vibes  _(369 tracks)_
*g.* Calm Mood  _(139 tracks)_
*h.* ☁️ Soft  _(178 tracks)_
*i.* Work at home  _(849 tracks)_
*j.* Non-vocal trance for working  _(40 tracks)_
*k.* Game Theme Songs  _(275 tracks)_
*l.* Disney Instrumentals Work Playlist  _(64 tracks)_
*m.* Whistle While You Work!  _(663 tracks)_
*n.* KPM 1000 Series (groovy music—while you work)  _(698 tracks)_
*o.* Work, study or relax with Jacob  _(26 tracks)_
*p.* Dariadaria Office Tunes  _(22 tracks)_
*q.* Cat Purring Sounds  _(64 tracks)_
*r.* Instrumental Office Music to work to  _(182 tracks)_
*s.* Workday Worship  _(75 tracks)_
*t.* Work/Study  _(87 tracks)_

*To replace the queue with a playlist, use the \`playlist\` command.*`);
    });
  });

  describe('addalbum', () => {
    beforeEach(() => {
      nock('https://api.spotify.com')
        .get('/v1/search')
        .query({ q: 'ok computer', type: 'album', market: 'AU' })
        .replyWithFile(200, json('spotify-search-album'), { 'Content-Type': 'application/json' });

      nock('https://api.spotify.com')
        .get('/v1/albums/4ENxWWkPImVwAle9cpJ12I')
        .replyWithFile(200, json('spotify-album-details'), { 'Content-Type': 'application/json' });
    });

    it('adds an album to the queue', async () => {
      mockQueueNext.mockImplementation(() => true);
      await commands.commands.searchalbum('ok computer');
      const response = await commands.commands.addalbum('b');

      const expectedResult = {
        text: 'Album added to queue.',
        body: '*OK Computer OKNOTOK 1997 2017*\nRadiohead\n_2017_',
        thumbUrl: 'https://i.scdn.co/image/819b35407ee4fe3da687cbacd8017b4448f0775b',
      };
      expect(response).toEqual(expectedResult);
    });
  });
});
