var Service, Characteristic;
var request = require("request");
var waitUntil = require('wait-until');

module.exports = function(homebridge){
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-alarmdecoder", "alarmdecoder", alarmdecoderAccessory);
};

function alarmdecoderAccessory(log, config) {
	this.log = log;

	// url info
	this.urls = {
		stay: {
			url: config.urls.stay.url,
			body: config.urls.stay.body || "",
			method: "POST"
		},
		away: {
			url: config.urls.away.url,
			body: config.urls.away.body || "",
			method: "POST"
		},
		night: {
			url: config.urls.night.url,
			body: config.urls.night.body || "",
			method: "POST"
		},
		disarm: {
			url: config.urls.disarm.url,
			body: config.urls.disarm.body || "",
			method: "POST"
		},
		readCurrentState: {
			url: config.urls.readCurrentState.url,
			body: config.urls.readCurrentState.body || "",
			method: "GET"
		},
		readTargetState: {
			url: config.urls.readTargetState.url,
			body: config.urls.readTargetState.body || "",
			method: "GET"
		}
	};
	this.httpMethod = "GET";
	this.key = config["key"] || "";
	this.name = config["name"];
	this.port = config["port"];
	this.statusCode = 200;
	this.listener = require('http').createServer(this.httpListener.bind(this));
	this.listener.listen(this.port);
	this.log("Listening to port " + this.port);
	this.log("Returning status code " + this.statusCode);
}

alarmdecoderAccessory.prototype = {
	
	httpListener: function(req, res) {
		var data = '';
		
		if (req.method == "POST") {
			req.on('data', function(chunk) {
			  data += chunk;
			});		
			req.on('end', function() {
			  this.log('Received notification and body data:');
			  this.log(data.toString());
			}.bind(this));
		}	
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end();
		that = this;
		this.log('Getting current state since ping received');
		this.getCurrentState(function(error, state) {
			if (!error && state != null) {
				this.log('get current state succeded');
				if (state == 0) {
					this.log("state 0 detected, checking again for modifiers");
					waitUntil()
						.interval(2000)
						.times(1)
						.condition(function() {return false;})
						.done(function(result) {
							this.getCurrentState(function(nestederror, nestedstate) {
							this.log("pushing nested" + nestedstate + " to homekit");
							this.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, nestedstate);
					}.bind(this));}.bind(this));
				}
				else {
					this.log("pushing " + state + " to homekit");
					this.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);				
				}
			}
			else
				this.log('get current state failed');
		}.bind(this));
	},	
	
	httpRequest: function(url, body, method, callback) {
		request({
			url: url,
			headers: {
				"Authorization": this.key,
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: body,
			method: method,
		},
		callback);
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
		var method = cfg.method;
		var url = cfg.url;
		var tempObj = new Object();
		tempObj.keys=cfg.body;
		var body = JSON.stringify(tempObj);
		if (url) {
			this.httpRequest(url, body, method, function(error, response, responseBody) {
				if (error) {
					this.log('SetState function failed: %s', error.message);
					callback(error);
				} else {
					this.log('SetState function succeeded!');
					//self.securityService.setCharacteristic(Characteristic.SecuritySystemTargetState, state);
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
		let  method = this.urls.readCurrentState.method;
		this.httpRequest(url, body, method, function(error, response, responseBody) {
			if (error) {
				this.log('GetState function failed: %s', error.message);
				callback(error, null);
			} else {
				let stateObj = JSON.parse(responseBody);
				this.log(stateObj);
				let state = null;
				let isAlarming = stateObj.panel_alarming;
				let isArmed = stateObj.panel_armed;
				let isArmedStay = stateObj.panel_armed_stay;
				let isArmedNight = false;
				let lastmessage = stateObj.last_message_received;
				if(lastmessage && (lastmessage.includes("NIGHT") || lastmessage.includes("INSTANT")))
					isArmedNight = true;
				/* 0 = stay, 1 = away, 2 = night, 3 = disarmed */
				if(isAlarming)
					state = 4;
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

		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, 'honeywell/dsc')
			.setCharacteristic(Characteristic.Model, 'alarmdecoder');

		return [this.informationService, this.securityService];
	}
};
