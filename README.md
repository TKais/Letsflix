# Letsflix

An npm package for discovering whether a movie or TV show is available on Netflix from the Guidebox API.

## Basic Usage

```javascript
var Letsflix = require('letsflix');

var netflixQuery = new Letsflix('api_key', 'show', 'Abstract');

netflixQuery.on('end', console.dir);

netflixQuery.on('error', console.error);
```