# sonosbot
[![Build Status](https://img.shields.io/travis/benwiggins/sonosbot.svg?style=flat-square)](https://travis-ci.org/benwiggins/sonosbot)
[![Dependency Status](https://img.shields.io/david/benwiggins/sonosbot.svg?style=flat-square)](https://david-dm.org/benwiggins/sonosbot)
[![Known Vulnerabilities](https://snyk.io/test/github/benwiggins/sonosbot/badge.svg?style=flat-square)](https://snyk.io/test/github/benwiggins/sonosbot)

## Control Sonos/Spotify through Slack

### Details

Control Sonos through Slack. Integrates with Spotify. Written from scratch but borrows _very_ liberally from the [zenmusic project](https://github.com/htilly/zenmusic).

### Requirements

Node 12.x or higher

### Configuration

You will need to create `config/config.json`. An example is provided. 

`sonosAddress` should be set to the IP of your Sonos controller.

To generate a `slackToken` you need to create an app in Slack and install it in your workspace. Once done you can go to **Features -> OAuth & Permissions**
 and retrieve the _Bot User OAuth Access Token_.

Once done you should invite the bot to the configured `standardChannel` and `adminChannel`s.

To create a `spotifyClientId` and `spotifySecret` you should create an app at [developer.spotify.com](https://developer.spotify.com).

### License

MIT licensed. Do what you want.

