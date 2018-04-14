const chai = require('chai');
const spies = require('chai-spies');
const nock = require('nock');

const { expect } = chai;
chai.use(spies);

const SpotifyClient = require('../../src/integrations/spotify');

const json = filename => `${__dirname}/../responses/${filename}.json`;

describe('Spotify', () => {
  describe('generateAccessToken', () => {
    beforeEach(() => {
      nock('https://accounts.spotify.com')
        .post('/api/token')
        .reply(200, { access_token: 'ACCESS_TOKEN' });
    });

    it('parses a returned token from spotify', async () => {
      const client = new SpotifyClient({ clientId: 'CLIENT_ID', secret: 'SECRET', region: 'FR' });
      const response = await client.generateAccessToken();
      expect(response).to.deep.equal({ access_token: 'ACCESS_TOKEN' });
    });
  });

  describe('client', () => {
    beforeEach(() => {
      nock('https://api.spotify.com')
        .get('/v1/search')
        .query({ q: 'closer', type: 'track', market: 'AU' })
        .replyWithFile(200, json('spotify-search-track'), { 'Content-Type': 'application/json' });
      nock('https://api.spotify.com')
        .get('/v1/search')
        .query({ q: 'ok computer', type: 'album', market: 'AU' })
        .replyWithFile(200, json('spotify-search-album'), { 'Content-Type': 'application/json' });
    });

    it('automatically generates a token', async () => {
      const client = new SpotifyClient({ clientId: 'CLIENT_ID', secret: 'SECRET', region: 'AU' });
      const spy = chai.spy(() => ({ access_token: 'ACCESS_TOKEN', ttl: 60 }));
      chai.spy.on(client, 'generateAccessToken', spy);
      await client.searchTracks('closer');
      expect(spy).to.have.been.called();
    });

    it('reuses generated tokens', async () => {
      const client = new SpotifyClient({ clientId: 'CLIENT_ID', secret: 'SECRET', region: 'AU' });
      const spy = chai.spy(() => ({ access_token: 'ACCESS_TOKEN', ttl: 60 }));
      chai.spy.on(client, 'generateAccessToken', spy);
      await client.searchTracks('closer');
      await client.searchAlbums('ok computer');
      expect(spy).to.have.been.called.exactly(1);
    });
  });
});

