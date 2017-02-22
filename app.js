var EventEmitter = require('events').EventEmitter;
var http = require('http');
var util = require('util');

function OnNetflix(key, type, title) {
	var self = this;
	http.get('http://api-public.guidebox.com/v2/search\?api_key\=' + key + '\&type\=' + type + '\&field\=title\&query\=' + title + '\&sources=subscription', function(response) {
		handleTitleQuery.call(self, response)});

	var findID = function(responseData) {
		return new Promise( function(resolve, reject) {
			if(responseData.results.length > 0) {
				resolve(selectResult(responseData.results).id);
			} else {
				reject(Error(errorMessage));
			}
		});
	}

	var selectResult = function(results) {
		var searchTitle;
		var regex = new RegExp('^' + title + '$');
		if(results.length === 1) { return results[0]; }
		results.forEach( function(result) {
			if(result.title.match(regex)) {
				searchTitle = result;
			}
		});
		return searchTitle;
	}

	var handleSourceQuery = function(id) {
		var self = this;
		var movieQueryString = 'http://api-public.guidebox.com/v2/movies/' + id + '\?api_key\=' + key;
		var showQueryString = 'http://api-public.guidebox.com/v2/shows/' + id + '/available_content\?api_key\=' + key;
		var requestString = type === 'movie' ? movieQueryString : showQueryString;
		var sourceRequest = http.get( requestString, function(newResponse){
			handleSourceResponse.call(self, newResponse);
		});
	}

	var returnMovieObject = function(sourceBody) {
		var sourceArray = sourceBody.subscription_web_sources.length ? sourceBody.subscription_web_sources : [false];
		var alternativesArray = [];
		var returnedSource;
		sourceArray && sourceArray.forEach( function(src) {
			if(src.source === 'netflix') {
				returnedSource = { isOnNetlix: true, link: src.link };
			} else {
				alternativesArray.push(src.source)
				returnedSource = { isOnNetlix: false, alternatives: alternativesArray };
			}
		});
		return returnedSource;
	}

	var returnShowObject = function(sourceBody) {
		var showSources = sourceBody.results.web.episodes.all_sources;
		var returnedSource;
		if(showSources.length > 0) {
			showSources.forEach( function(src) {
				if(src.source === 'netflix') {
					returnedSource = { isOnNetlix: true, info: sourceBody };
				} else {
					returnedSource = { isOnNetlix: false };
				}
			});
		} else {
			returnedSource = 'No sources found for ' + title;
		}
		return returnedSource;
	}

	var handleSourceResponse = function(newResponse) {
		var responseString = '';
		var sourceBody = '';
		var returnObject;

		newResponse.on('data', function(chunk) {
			responseString += chunk;
			this.emit('data', chunk);
		}.bind(this));
		newResponse.on('end', function() {
			sourceBody  = JSON.parse(responseString);
			if(type === 'movie') {
				returnObject = returnMovieObject.call(this, sourceBody);
			} else {
				returnObject = returnShowObject.call(this, sourceBody);
			}
			this.emit('end', returnObject);
		}.bind(this));
	}

	var handleTitleQuery = function(response) {
		var responseData;
		var body = '';
		var errorMessage = new Error('There was a problem retrieving data for ' + title);

		EventEmitter.call(this);

		if(response.statusCode !== 200) {
			request.abort();
			this.emit('error', errorMessage);
		}

		response.on('data', function(chunk) {
			body += chunk;
			this.emit('data', chunk);
		}.bind(this));

		response.on('end', function() {
			if(response.statusCode === 200) {
				try {
					responseData = JSON.parse(body);
					findID.call(this, responseData).then(handleSourceQuery.bind(this));
				} catch (error) {
					this.emit('error', error);
				}
			}
		}.bind(this)).on('error', function(error) {
			this.emit('error', error);
		}.bind(this));
	}
}

util.inherits(OnNetflix, EventEmitter);

module.exports = OnNetflix;