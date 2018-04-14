const NodeCache = require('node-cache');
const rp = require('request-promise-native');
const log = require('../log')('spotify');

const CACHE_KEY = 'spotifyToken';
const SPOTIFY_API = 'https://api.spotify.com/v1';
const gzip = process.env.NODE_ENV !== 'test';

const jsonRequest = (command, token, query, method = 'GET') => ({
  method,
  uri: `${SPOTIFY_API}/${command}`,
  headers: {
    Authorization: `Bearer ${token}`,
  },
  qs: query,
  json: true,
  gzip,
});

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
      gzip,
    });
    const token = tokenData.access_token;
    const ttl = tokenData.expires_in * 0.95; // Just in case, lower the ttl a bit
    this.cache.set(CACHE_KEY, token, ttl);
    return token;
  }

  async searchQuery(query) {
    const token = await this.getToken();
    const request = jsonRequest('search', token, {
      ...query,
      market: this.region,
    });
    return rp(request);
  }

  async searchTracks(text) {
    const response = await this.searchQuery({ type: 'track', q: text });
    return (response && response.tracks && response.tracks.items) || [];
  }

  async searchPlaylists(text) {
    const response = await this.searchQuery({ type: 'playlist', q: text });
    return (response && response.playlists && response.playlists.items) || [];
  }
}

module.exports = SpotifyClient;
