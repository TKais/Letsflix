var EventEmitter = require("events").EventEmitter;
var http = require('http');
var util = require("util");

function OnNetflix(key, type, title) {
	var that = this;
	var request      = http.get('http://api-public.guidebox.com/v2/search\?api_key\=' + key + '\&type\=' + type + '\&field\=title\&query\=' + title, function(response) {
		var responseData;
		var isNetflix;
		var errorMessage = new Error('There was a problem retrieving data for ' + title);
		var body         = '';
		var sourceBody   = '';

		var findID = function(responseData) {
			return new Promise( function(resolve, reject) {
				if(responseData.results.length > 0) {
					resolve(responseData.results[responseData.results.length - 1].id);
				} else {
					reject(Error(errorMessage));
				}
			});
		}

		var handleResponse = function(newResponse) {
			var string = '';
			var returnObject;

			newResponse.on('data', function(chunk) {
				string += chunk;
				that.emit('data', chunk);
			});
			newResponse.on('end', function() {
				sourceBody  = JSON.parse(string);
				sourceArray = sourceBody.subscription_web_sources;
				sourceArray.forEach( function(src) {
					if(src.source === 'netflix') {
						returnObject = { isOnNetlix: true, movieLink: src.link };
					} else {
						returnObject = { isOnNetlix: false };
					}
				});
				that.emit('end', returnObject);
			});
		}

		var isOnNetflix = function(id) {
			var newType = type === 'movie' ? 'movies' : 'shows';
			var movieRequest = http.get('http://api-public.guidebox.com/v2/' + newType + '/' + id + '\?api_key\=' + key + '\&sources\=netflix', function(newResponse){
				handleResponse(newResponse);
			});
		}


		EventEmitter.call(that);

		if(response.statusCode !== 200) {
			request.abort();
			that.emit('error', errorMessage);
		}

		response.on('data', function(chunk) {
			body += chunk;
			that.emit('data', chunk);
		});

		response.on('end', function() {
			if(response.statusCode === 200) {
				try {
					responseData = JSON.parse(body);
					findID(responseData).then(isOnNetflix);
				} catch (error) {
					that.emit('error', error);
				}
			}
		}).on('error', function(error) {
			that.emit('error', error);
		});
	});
}

util.inherits(OnNetflix, EventEmitter);

module.exports = OnNetflix;