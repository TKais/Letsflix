var EventEmitter = require("events").EventEmitter;
var http = require('http');
var util = require("util");

function OnNetflix(key, type, title) {
	var self = this;
	http.get('http://api-public.guidebox.com/v2/search\?api_key\=' + key + '\&type\=' + type + '\&field\=title\&query\=' + title, function(response) {
		handleMovieQuery.call(self, response)});

	var findID = function(responseData) {
		return new Promise( function(resolve, reject) {
			if(responseData.results.length > 0) {
				resolve(responseData.results[responseData.results.length - 1].id);
			} else {
				reject(Error(errorMessage));
			}
		});
	}

	var handleSourceQuery = function(id) {
		var self = this;
		var newType = type === 'movie' ? 'movies' : 'shows';
		var movieRequest = http.get('http://api-public.guidebox.com/v2/' + newType + '/' + id + '\?api_key\=' + key + '\&sources\=netflix', function(newResponse){
			handleResponse.call(self, newResponse);
		});
	}

	var handleResponse = function(newResponse) {
		var string = '';
		var sourceBody = '';
		var returnObject;

		newResponse.on('data', function(chunk) {
			string += chunk;
			this.emit('data', chunk);
		}.bind(this));
		newResponse.on('end', function() {
			sourceBody  = JSON.parse(string);
			sourceArray = sourceBody.subscription_web_sources.length ? sourceBody.subscription_web_sources : [false];
			sourceArray.forEach( function(src) {
				if(src.source === 'netflix') {
					returnObject = { isOnNetlix: true, movieLink: src.link };
				} else {
					returnObject = { isOnNetlix: false };
				}
			});
			this.emit('end', returnObject);
		}.bind(this));
	}

	var handleMovieQuery = function(response) {
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