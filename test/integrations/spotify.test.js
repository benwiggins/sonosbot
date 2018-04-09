const { expect } = require('chai');
const nock = require('nock');

const SpotifyClient = require('../../src/integrations/spotify');

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
      expect(response).to.equal('ACCESS_TOKEN');
    });
  });
});

