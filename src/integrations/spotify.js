const NodeCache = require('node-cache');
const rp = require('request-promise-native');
const log = require('../log');

const CACHE_KEY = 'spotifyToken';
const SPOTIFY_API = 'https://api.spotify.com/v1';

class SpotifyClient {
  constructor({ clientId, secret, region }) {
    this.credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
    this.cache = new NodeCache();
    this.region = region || 'US';
  }

  async getToken() {
    const token = await this.cache.get(CACHE_KEY);
    if (token) {
      return token;
    }
    return this.generateAccessToken();
  }

  async generateAccessToken() {
    log('Generating Spotify access token');
    const tokenData = await rp({
      uri: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      headers: { Authorization: `Basic ${this.credentials}` },
      form: { grant_type: 'client_credentials' },
      json: true,
      gzip: true,
    });

    const token = tokenData.access_token;
    const ttl = tokenData.expires_in * 0.95; // Just in case, lower the ttl a bit
    this.cache.set(CACHE_KEY, token, ttl);
  }

  async searchTracks(text) {
    const token = await this.getToken();
    const request = {
      method: 'GET',
      uri: `${SPOTIFY_API}/search`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      qs: {
        q: text,
        type: 'track',
        market: this.region,
      },
      json: true,
      gzip: true
    };
    const response = await rp(request);
    return (response && response.tracks && response.tracks.items || []);
  }
}

module.exports = SpotifyClient;
