var Service, Characteristic;
var request = require("request");

module.exports = function(homebridge){
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-http-securitysystem", "Http-SecuritySystem", HttpSecuritySystemAccessory);
}

function HttpSecuritySystemAccessory(log, config) {
	this.log = log;

	// url info
	this.urls = {
		stay: {
			url: config.urls.stay.url,
			body: config.urls.stay.body || ""
		},
		away: {
			url: config.urls.away.url,
			body: config.urls.away.body || ""
		},
		night: {
			url: config.urls.night.url,
			body: config.urls.night.body || ""
		},
		disarm: {
			url: config.urls.disarm.url,
			body: config.urls.disarm.body || ""
		},
		readCurrentState: {
			url: config.urls.readCurrentState.url,
			body: config.urls.readCurrentState.body || ""
		},
		readTargetState: {
			url: config.urls.readTargetState.url,
			body: config.urls.readTargetState.body || ""
		}
	};
	
	this.httpMethod = config["http_method"] || "GET";
	this.key = config["key"] || "";
	this.log("setting key %s", this.key);
	this.auth = {};
	this.auth.username = config.username || "";
	this.auth.password = config.password || "";
	this.auth.immediately = config.immediately || "true";	
	this.name = config["name"];
}

HttpSecuritySystemAccessory.prototype = {
	httpRequest: function(url, body, callback) {
		request({
			url: url,
			headers: {
				"Authorization": this.key
			},
			body: body,
			method: this.httpMethod,
		},
		function(error, response, body) {
			callback(error, response, body)
		})
	},

	setTargetState: function(state, callback) {
		this.log("Setting state to %s", state);
		var self = this;
		var cfg = null;
		switch (state) {
			case Characteristic.SecuritySystemTargetState.STAY_ARM:
				cfg = this.urls.stay;
				break;
			case Characteristic.SecuritySystemTargetState.AWAY_ARM :
				cfg = this.urls.away;
				break;
			case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
				cfg = this.urls.night;
				break;
			case Characteristic.SecuritySystemTargetState.DISARM:
				cfg = this.urls.disarm;
				break;
		}
		
		var url = cfg.url;
		var body = cfg.body;
		if (url) {
			this.httpRequest(url, body, function(error, response, responseBody) {
				if (error) {
					this.log('SetState function failed: %s', error.message);
					callback(error);
				} else {
					this.log('SetState function succeeded!');
					self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
					callback(error, response, state);
				}
			}.bind(this));
		} else {
			callback(null);
		}
	},
	
	getState: function(url, body, callback) {
		if (!url) { 
			callback(null); 
		}
		
		this.httpRequest(url, body, function(error, response, responseBody) {
			if (error) {
				this.log('GetState function failed: %s', error.message);
				callback(error);
			} else {
				//var state = parseInt(responseBody);
				var stateObj = JSON.parse(responseBody);
				if(true) {
					this.log(stateObj);
					callback(error);					
				}
				else {
					this.log(stateObj);
					// TODO: WAS WORKING HERE
					var isAlarming = stateObj.panel_alarming;
					var isArmed = stateObj.panel_armed;
					var isArmedStay = stateObj.panel_armed_stay;
					var isArmedNight = false;
					var lastmessage = stateObj.last_message_received;
					if(lastmessage.includes("NIGHT") || lastmessage.includes("INSTANT"))
						isArmedNight = true;
					/* 0 = stay, 1 = away, 2 = night, 3 = disarmed */
					if(isAlarming)
						state = 4
					else if(isArmed && !isArmedNight && !isArmedStay)
						state = 1;
					else if(isArmedNight)
						state = 2;
					else if(isArmedStay)
						state = 0;
					else
						state = 3;
					this.log("State is currently %s", state);
					callback(null, state);
				}
			}
		}.bind(this));
	},

	getCurrentState: function(callback) {
		this.log("Getting current state");
		this.getState(this.urls.readCurrentState.url, this.urls.readCurrentState.body, callback);
	},
	getTargetState: function(callback) {
		this.log("Getting target state");
		this.getState(this.urls.readTargetState.url, this.urls.readTargetState.body, callback);
	},
	identify: function(callback) {
		this.log("Identify requested!");
		callback(); // success
	},

	getServices: function() {
        	this.securityService = new Service.SecuritySystem(this.name);

        	this.securityService
            		.getCharacteristic(Characteristic.SecuritySystemCurrentState)
            		.on('get', this.getCurrentState.bind(this));

        	this.securityService
            		.getCharacteristic(Characteristic.SecuritySystemTargetState)
            		.on('get', this.getTargetState.bind(this))
            		.on('set', this.setTargetState.bind(this));

        	return [this.securityService];
    	}
};
