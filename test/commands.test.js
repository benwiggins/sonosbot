const { expect } = require('chai');
const nock = require('nock');

const Commands = require('../src/commands');
const SpotifyClient = require('../src/integrations/spotify');

const json = filename => `${__dirname}/responses/${filename}.json`;

describe('commands', () => {
  describe('search', () => {
    let commands;

    beforeEach(() => {
      const spotifyClient = new SpotifyClient({ clientId: 'CLIENT_ID', secret: 'SECRET', region: 'AU' });

      nock('https://accounts.spotify.com')
        .post('/api/token')
        .reply(200, { access_token: 'ACCESS_TOKEN' });

      nock('https://api.spotify.com')
        .get('/v1/search')
        .query({ q: 'closer', type: 'track', market: 'AU' })
        .replyWithFile(200, json('spotify-search'), { 'Content-Type': 'application/json' });

      commands = Commands(spotifyClient);
    });

    it('returns a list of songs', async () => {
      const response = await commands.commands.search('closer');
      expect(response).to.equal(`*I found the following tracks:*

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
});

