const crypto = require('crypto');

class SessionError extends Error {};

function SessionManager (){
	// default session length - you might want to
	// set this to something small during development
	const CookieMaxAgeMs = 600000;

	// keeping the session data inside a closure to keep them protected
	const sessions = {};

	// might be worth thinking about why we create these functions
	// as anonymous functions (per each instance) and not as prototype methods
	this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
		var token=crypto.randomBytes(30).toString('base64');
        var User = function (username) {
            this.username=username;
            this.timestamp=Date.now();
            this.expire=Date.now()+maxAge;
        }; 
        sessions[token]=new User(username);
        response.cookie('cpen322-session', token, {maxAge: maxAge, encode: String});
        var timeoutHandler = function() {
            delete sessions[token];
        };
        setTimeout(timeoutHandler, maxAge);
	};

	this.deleteSession = (request) => {
		delete sessions[request.session];
		delete request.username;
		delete request.session;
	};

	this.middleware = (request, response, next) => {
		if (!request.headers.cookie) {
            next(new SessionError());
        }
		else{
			let cookie = request.headers.cookie.split(";").reduce((acc,line)=>{
				let eq = line.indexOf("=");
				acc[line.substring(0, eq)] = line.substring(eq + 1);
				return acc
			}
			, {});
			if(cookie['cpen322-session'] in sessions){
				request.username=sessions[cookie['cpen322-session']].username;
				request.session=cookie['cpen322-session'];
				next();
			}
			else{
				next(new SessionError());
			}
		}
	};

	// this function is used by the test script.
	// you can use it if you want.
	this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;