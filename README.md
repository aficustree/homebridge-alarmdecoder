# homebridge-alarmdecoder
Homebridge plugin for the alarmdecoder (alarmdecoder.com) interface to Honeywell/DSC Systems. It requires a functioning alarmdecoder-webapp (https://www.alarmdecoder.com/wiki/index.php/AlarmDecoder_WebApp) for the homebridge plugin to contact (via the rest API). Please make sure your webapp is updated with the latest alarmdecoder python package. 

This plugin can be used as a security system in HomeKit/Homebridge. It creates a Homebridge accessory which uses HTTP calls to arm, disarm and check the status of security systems 
and provides the Service.SecuritySystem service to HomeKit with both the SecuritySystemCurrentState and the SecuritySystemTargetState characteristics implemented. If alarmdecoder webui is setup to push notifications, system will listen on the noted port and execute a rest API query to get state. 

## Installation

1. Install homebridge using: npm install -g homebridge
2. Install homebridge-alarmdecoder using: npm install -g git+https://github.com/aficustree/homebridge-alarmdecoder.git#master
3. Update your configuration file. See sample-config.json in this repository for a sample. 

## Configuration
This module requires that the URLs for getting and setting the security system's state are configured correctly. This has to be done in Homebridge's config.json. 
You can find a sample configuration file in this repository. 

The configuration options are the following:

Configuration example with explanation

```
    "accessories": [
        {
            "accessory": "alarmdecoder",
            "name": "Alarm System",
            "key": "YOUR API KEY FROM ALARMDECODER GUI",
            "port": port to listen on for push messages from alarmdecoder
            "urls": {
                "stay": { "url": "http://YOURIP:YOURPORT/api/v1/alarmdecoder/send", "body": "11113" },
                "away": { "url": "http://YOURIP:YOURPORT/api/v1/alarmdecoder/send", "body": "11112" },
                "night": { "url": "http://YOURIP:YOURPORT/api/v1/alarmdecoder/send", "body": "111133" },
                "disarm": { "url": "http://YOURIP:YOURPORT/api/v1/alarmdecoder/send", "body": "11111" },
                "readCurrentState": { "url": "http://YOURIP:YOURPORT/api/v1/alarmdecoder", "body": "" },
                "readTargetState": { "url": "http://YOURIP:YOURPORT/api/v1/alarmdecoder", "body": "" }
        }
    ]

```

- The **name** parameter determines the name of the security system you will see in HomeKit.
- The **urls section** configures the URLs that are to be called on certain events. 
  - The **stay**, **away** and **night** URLs are called when HomeKit is instructed to arm the alarm (it has 3 different alarm on states)
  - The **disarm** URL is used when HomeKit is instructed to disarm the alarm
  - The **readCurrentState** and **readTargetState** are used by HomeKit for querying the current state of the alarm device. It should return a JSON with the status from alarmdecoder, internally, it's remapped to the below state integers.
    - **"0"**: stay armed
    - **"1"**: away armed
    - **"2"**: night armed
    - **"3"**: disarmed
    - **"4"**: alarm has been triggered
- Replace "1111" in body with your four digit passcode, the remaining digits set the alarm mode (3 for stay, 2 for away, 33 for night, 1 for off)
- stay/away/night/disarm are POST, read is a GET

