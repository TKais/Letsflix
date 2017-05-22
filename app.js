const EventEmitter = require('events').EventEmitter;
const http = require('http');
const util = require('util');

function Letsflix(key, type, title) {
	var self = this;
	http.get('http://api-public.guidebox.com/v2/search\?api_key\=' + key + '\&type\=' + type + '\&field\=title\&query\=' + title + '\&sources=subscription', (response) => {
		handleTitleQuery.call(self, response)});

	const findID = (responseData) => {
		return new Promise( (resolve, reject) => {
			if(responseData.results.length > 0) {
				resolve(selectResult.call(this, responseData.results).id);
			} else {
				reject(Error(errorMessage));
			}
		});
	}

	const selectResult = (results) => {
		var searchTitle;
		var error = new Error('Could not find title ' + title);
		var regex = new RegExp('^' + title + '$');
		if(results.length === 1) { return results[0]; }
		results.some( (result) => {
			if(result.title.match(regex)) {
				searchTitle = result;
				return true;
			}
		});

		if(searchTitle) { return searchTitle; } else { this.emit('error', error); }
	}

	const handleSourceQuery = (id) => {
		var self = this;
		var movieQueryString = 'http://api-public.guidebox.com/v2/movies/' + id + '\?api_key\=' + key;
		var showQueryString = 'http://api-public.guidebox.com/v2/shows/' + id + '/available_content\?api_key\=' + key;
		var requestString = type === 'movie' ? movieQueryString : showQueryString;
		var sourceRequest = http.get( requestString, (newResponse) => {
			handleSourceResponse.call(self, newResponse);
		});
	}

	const returnMovieObject = (sourceBody) => {
		var sourceArray = sourceBody.subscription_web_sources.length ? sourceBody.subscription_web_sources : [false];
		var alternativesArray = [];
		var returnedSource;
		if(sourceArray.length > 0) {
			sourceArray.some( (src) => {
				if(src.source === 'netflix') {
					returnedSource = { isOnNetlix: true, link: src.link };
					return true;
				} else {
					alternativesArray.push(src.source)
					returnedSource = { isOnNetlix: false, alternatives: alternativesArray };
				}
			});
		} else {
			returnedSource = 'No sources found for ' + title;
		}
		return returnedSource;
	}

	const returnShowObject = (sourceBody) => {
		var showSources = sourceBody.results.web.episodes.all_sources;
		var alternativesArray = [];
		var returnedSource;
		if(showSources.length > 0) {
			showSources.some( (src) => {
				if(src.source === 'netflix') {
					returnedSource = { isOnNetlix: true };
					return true;
				} else {
					alternativesArray.push(src.source);
					returnedSource = { isOnNetlix: false, alternatives: alternativesArray };
				}
			});
		} else {
			returnedSource = 'No sources found for ' + title;
		}
		return returnedSource;
	}

	const handleSourceResponse = (newResponse) => {
		var responseString = '';
		var sourceBody = '';
		var returnObject;

		newResponse.on('data', (chunk) => {
			responseString += chunk;
			this.emit('data', chunk);
		});
		newResponse.on('end', () => {
			sourceBody  = JSON.parse(responseString);
			if(type === 'movie') {
				returnObject = returnMovieObject.call(this, sourceBody);
			} else {
				returnObject = returnShowObject.call(this, sourceBody);
			}
			this.emit('end', returnObject);
		});
	}

	const handleTitleQuery = (response) => {
		var responseData;
		var body = '';
		var errorMessage = new Error('There was a problem retrieving data for ' + title);
		var noSuchTitle = new Error('There were no results for ' + title);

		EventEmitter.call(this);

		if(response.statusCode !== 200) {
			request.abort();
			this.emit('error', errorMessage);
		}

		response.on('data', (chunk) => {
			body += chunk;
			this.emit('data', chunk);
		});

		response.on('end', () => {
			if(response.statusCode === 200) {
				try {
					responseData = JSON.parse(body);
					if(responseData.total_results > 0) {
						findID.call(this, responseData).then(handleSourceQuery.bind(this));
					} else {
						this.emit('error', noSuchTitle);
					}
				} catch (error) {
					this.emit('error', error);
				}
			}
		}).on('error', (error) => {
			this.emit('error', error);
		});
	}
}

util.inherits(Letsflix, EventEmitter);

module.exports = Letsflix;