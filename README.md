# Letsflix

An npm package written in ES6 for discovering whether a movie or TV show is available on Netflix from the Guidebox API. If not, alternative sources are provided.

## Basic Usage

```javascript
const Letsflix = require('letsflix');

/**
* Letsflix accepts three parameters:
* @key (string) => A Guidebox API key
* @type (string) => Either 'movie' or 'show'
* @title (string) => The movie or TV show title
**/
let netflixQuery = new Letsflix('api_key', 'show', 'Abstract');

netflixQuery.on('end', console.dir);

netflixQuery.on('error', console.error);
```