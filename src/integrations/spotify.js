const NodeCache = require('node-cache');
const got = require('got');
const FormData = require('form-data');
const log = require('../log')('spotify');

const CACHE_KEY = 'spotifyToken';
const SPOTIFY_API = 'https://api.spotify.com/v1';

const useGzip = process.env.NODE_ENV !== 'test';

const spotifyApi = got.extend({
  baseUrl: SPOTIFY_API,
  decompress: useGzip,
  json: true,
});

const jsonRequest = (command, token, query, method = 'GET') =>
  spotifyApi(`/${command}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query,
    method,
  }).then(r => r.body);

class SpotifyClient {
  constructor({ clientId, secret, region }) {
    this.credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
    this.cache = new NodeCache();
    this.region = region || 'US';
    log(`Spotify region: ${this.region}`);
  }

  async getToken() {
    let token = await this.cache.get(CACHE_KEY);
    if (token) {
      return token;
    }
    const tokenData = await this.generateAccessToken();

    token = tokenData.access_token;
    const ttl = tokenData.expires_in * 0.95; // Just in case, lower the ttl a bit
    this.cache.set(CACHE_KEY, token, ttl);
    return token;
  }

  async generateAccessToken() {
    log('Generating Spotify access token');
    const form = new FormData();
    form.append('grant_type', 'client_credentials');

    return got
      .post('https://accounts.spotify.com/api/token', {
        body: form,
        decompress: useGzip,
        headers: { Authorization: `Basic ${this.credentials}` },
      })
      .then(r => JSON.parse(r.body));
  }

  async searchQuery(query) {
    const token = await this.getToken();
    return jsonRequest('search', token, {
      ...query,
      market: this.region,
    });
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
    const response = await jsonRequest(`artists/${artistId}/top-tracks`, token, {
      country: this.region,
    });

    return (response && response.tracks) || [];
  }

  async getFeaturedPlaylists() {
    const token = await this.getToken();
    const response = await jsonRequest('browse/featured-playlists', token, {
      country: this.region,
    });
    return (response && response.playlists) || [];
  }

  async uriRequest(uri) {
    const token = await this.getToken();
    return got(uri, {
      decompress: useGzip,
      json: true,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(r => r.body);
  }
}

module.exports = SpotifyClient;
