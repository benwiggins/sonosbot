const NodeCache = require('node-cache');
const rp = require('request-promise-native');
const log = require('../log')('spotify');

const CACHE_KEY = 'spotifyToken';
const SPOTIFY_API = 'https://api.spotify.com/v1';
const gzip = process.env.NODE_ENV !== 'test';

const request = (uri, token, query = {}, method = 'GET') => ({
  method,
  uri,
  headers: {
    Authorization: `Bearer ${token}`,
  },
  qs: query,
  json: true,
  gzip,
});

const jsonRequest = (command, token, query, method = 'GET') =>
  request(`${SPOTIFY_API}/${command}`, token, query, method);

class SpotifyClient {
  constructor({ clientId, secret, region }) {
    this.credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
    this.cache = new NodeCache();
    this.region = region || 'US';
    log(`Spotify region: ${this.region}`);
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
    const req = jsonRequest('search', token, {
      ...query,
      market: this.region,
    });
    return rp(req);
  }

  async searchTracks(text) {
    const response = await this.searchQuery({ type: 'track', q: text });
    return (response && response.tracks && response.tracks.items) || [];
  }

  async searchPlaylists(text) {
    const response = await this.searchQuery({ type: 'playlist', q: text });
    return (response && response.playlists && response.playlists.items) || [];
  }

  async searchAlbums(text) {
    const response = await this.searchQuery({ type: 'album', q: text });
    return (response && response.albums && response.albums.items) || [];
  }

  async searchArtists(text) {
    const response = await this.searchQuery({ type: 'artist', q: text });
    return (response && response.artists && response.artists.items) || [];
  }

  async getTopTracks(artistId) {
    const token = await this.getToken();
    const response = await rp(jsonRequest(`artists/${artistId}/top-tracks?country=${this.region}`, token));
    return (response && response.tracks) || [];
  }

  async uriRequest(uri) {
    const token = await this.getToken();
    const response = await rp(request(uri, token));
    return response;
  }
}

module.exports = SpotifyClient;
