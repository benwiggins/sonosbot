const log = require('../log')('sonos');
const { Sonos } = require('sonos');

class SonosClient {
  constructor(hostAddress) {
    this.sonos = new Sonos(hostAddress);
  }

  currentTrack() {
    return this.sonos.currentTrack();
  }

  getCurrentState() {
    return this.sonos.getCurrentState();
  }

  getQueue(index = 0, count = 20) {
    /*
     standard getQueue() doesn't support setting the starting index, nor > 1000 items,
     which causes issues on playlists > 1000 songs. For now, hack it.
    */
    const options = {
      BrowseFlag: 'BrowseDirectChildren',
      Filter: '*',
      StartingIndex: `${index}`,
      RequestedCount: `${count}`,
      SortCriteria: '',
      ObjectID: 'Q:0',
    };
    return this.sonos.contentDirectoryService().GetResult(options);
  }

  getVolume() {
    return this.sonos.getVolume();
  }

  next() {
    return this.sonos.next();
  }

  pause() {
    return this.sonos.pause();
  }

  previous() {
    return this.sonos.previous();
  }

  play() {
    return this.sonos.play();
  }

  getFavourites() {
    return this.sonos.getFavorites();
  }

  async queueNext(uri) {
    const current = await this.sonos.currentTrack();
    const position = ((current && current.queuePosition) || 0) + 1;
    return this.sonos.queue(uri, position);
  }

  async replaceQueue(uri) {
    await this.sonos.flush();
    return this.sonos.play(uri);
  }

  setVolume(volume) {
    return this.sonos.setVolume(volume);
  }

  stop() {
    return this.sonos.stop();
  }

  async shuffle() {
    try {
      await this.sonos.setPlayMode('NORMAL');
      await this.sonos.setPlayMode('SHUFFLE');
      return true;
    } catch (err) {
      log(err);
    }
    return false;
  }
}

module.exports = SonosClient;
