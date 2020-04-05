const NodeCache = require('node-cache');
const got = require('got');
const FormData = require('form-data');
const log = require('../log')('spotify');
const { name, version, repository } = require('../../package.json');

const CACHE_KEY = 'spotifyToken';
const SPOTIFY_API = 'https://api.spotify.com/v1';

const useCompression = process.env.NODE_ENV !== 'test';

const spotifyApi = got.extend({
  prefixUrl: SPOTIFY_API,
  decompress: useCompression,
  responseType: 'json',
  headers: {
    'user-agent': `${name}/${version} (${repository})`,
  },
});

const jsonRequest = (command, token, searchParams, method = 'GET') =>
  spotifyApi(command, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    searchParams,
    method,
  }).then((r) => r.body);

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
        decompress: useCompression,
        responseType: 'json',
        headers: { Authorization: `Basic ${this.credentials}` },
      })
      .then((r) => r.body);
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
      decompress: useCompression,
      responseType: 'json',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((r) => r.body);
  }
}

module.exports = SpotifyClient;
