const _ = require('lodash');
const NodeCache = require('node-cache');
const SpotifyApi = require('spotify-web-api-node');
const rp = require('request-promise-native');
const log = require('../log');

const CACHE_KEY = 'spotifyToken';

class SpotifyClient {
  constructor({ clientId, secret }) {
    this.token = Buffer.from(`${clientId}:${secret}`).toString('base64');
    this.spotifyApi = new SpotifyApi();
    this.cache = new NodeCache();
  }

  async checkToken() {
    const token = await this.cache.get(CACHE_KEY);
    if (!token) {
      await this.generateAccessToken();
    }
  }

  async generateAccessToken() {
    log('Generating Spotify access token');
    const tokenData = await rp({
      uri: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      headers: { Authorization: `Basic ${this.token}` },
      form: { grant_type: 'client_credentials' },
      json: true,
      gzip: true,
    });

    const token = tokenData.access_token;
    const ttl = tokenData.expires_in * 0.95; // Just in case, lower the ttl a bit
    this.cache.set(CACHE_KEY, token, ttl);
    this.spotifyApi.setAccessToken(token);
  }

  async searchTracks(text) {
    await this.checkToken();
    const response = await this.spotifyApi.searchTracks(text);
    return _.get(response, 'body.tracks.items', []);
  }
}

module.exports = SpotifyClient;
