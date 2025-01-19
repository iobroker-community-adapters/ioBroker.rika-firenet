/* eslint-disable jsdoc/require-param-description */
'use strict';

/*
 * Created with @iobroker/create-adapter v1.31.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
//const { default: axios } = require("axios");
const axios = require('axios').default;
axios.defaults.withCredentials = true;
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const baseUrl = 'https://www.rika-firenet.com';

class RikaFirenet extends utils.Adapter {
    /**
     * @param [options] - Optional settings for the adapter.
     */
    constructor(options) {
        super({
            ...options,
            name: 'rika-firenet',
        });

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));

        this.timeout = undefined;
        this.sessionId = '';
        this._isConnected = false;
        this.isReady = false;
        this.changeInProgress = false;
    }

    /**
     * Getter for the connected property.
     *
     * @returns The connection state.
     */
    get isConnected() {
        return this._isConnected || false;
    }
    /**
     * Setter for the connected property.
     *
     * @param value - The new value for the connected property.
     */
    set isConnected(value) {
        this._isConnected = value;
        // only update the state if the adapter is ready (prevent error messages on startup)
        if (this.isReady) {
            this.setState('info.connection', { val: value, ack: true });
        }
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        if (!this.config.mystoveid || !this.config.myuser || !this.config.mypassword) {
            this.log.error(
                'Invalid configuration. Please provide "stoveid", "user" and "password" in the adapter settings!',
            );
            return;
        }

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        //log some of the config attributes
        this.log.info(`config user: ${this.config.myuser}`);
        this.log.info(`config interval: ${this.config.myinterval}`);
        this.log.info(`config stoveid: ${this.config.mystoveid}`);

        //create device
        this.setObjectNotExists(this.config.mystoveid, {
            type: 'device',
            common: {
                name: this.config.mystoveid,
            },
            native: {},
        });

        this.isReady = true;
        this.sessionId = (await this.webLogin(this.config.myuser, this.config.mypassword)) || '';
        this.isConnected = this.sessionId !== '';

        // read values for stove first time
        if (this.isConnected) {
            this.getStoveValues();
        }
    }

    /**
     * @param stateNameStr
     * @param stateTypeStr
     * @param stateRoleStr
     * @param stateReadBool
     * @param stateWriteBool
     * @param stateValueMix
     */
    setStoveStates(stateNameStr, stateTypeStr, stateRoleStr, stateReadBool, stateWriteBool, stateValueMix) {
        //set object with specific datatype and value, subscribe and set value
        this.setObjectNotExists(`${this.config.mystoveid}.${stateNameStr}`, {
            type: stateTypeStr,
            common: {
                name: stateNameStr,
                type: typeof stateValueMix,
                role: stateRoleStr,
                read: stateReadBool,
                write: stateWriteBool,
            },
            native: {},
        });

        //subscribe states
        this.subscribeStates(`${this.config.mystoveid}.${stateNameStr}`);

        //set states
        this.setState(`${this.config.mystoveid}.${stateNameStr}`, {
            val: stateValueMix,
            ack: true,
        });
    }

    async webLogin(myemail = '', mypassword = '') {
        clearTimeout(this.timeout);

        try {
            const payload = {
                email: myemail,
                password: mypassword,
            };
            const response = await client.post(`${baseUrl}/web/login`, payload);

            if (response.headers && response.headers['set-cookie']) {
                const cookie = response.headers['set-cookie'];
                if (cookie) {
                    this.log.info('Logged in to rika firenet');
                    this.log.debug(`Cookie: ${cookie}`);
                    let sessionId = cookie.toString().split(';')[0];
                    this.log.debug(`Session-ID: ${sessionId}`);
                    return sessionId;
                }
                throw new Error('Login failed. No session id received');
            }
        } catch (error) {
            this.log.error(`Web-Login error: ${error}`);
        }
    }

    async getStoveValues() {
        if (!this.changeInProgress) {
            try {
                const url = `${baseUrl}/api/client/${this.config.mystoveid}/status`;
                this.log.debug(`url: ${url}`);
                const response = await client.get(url);

                this.log.debug(`${response.status} - API-Connection successful`);

                if (response.status == 200 && response.data) {
                    // request successful
                    this.setState('info.connection', true, true);
                    const content = response.data;
                    this.log.debug(`content: ${JSON.stringify(content)}`);

                    //set objects and values if correct data come in
                    if (content.lastConfirmedRevision) {
                        this.setStoveStates('name', 'state', '', true, false, content.name);
                        this.setStoveStates('stoveID', 'state', '', true, false, content.stoveID);
                        this.setStoveStates('lastSeenMinutes', 'state', '', true, false, content.lastSeenMinutes);
                        this.setStoveStates(
                            'lastConfirmedRevision',
                            'state',
                            '',
                            true,
                            false,
                            content.lastConfirmedRevision,
                        );
                        this.setStoveStates('stoveType', 'state', '', true, false, content.stoveType);
                        this.setStoveStates('oem', 'state', '', true, false, content.oem);

                        //create channels
                        this.setStoveStates('controls', 'channel', '', false, false, '');
                        this.setStoveStates('sensors', 'channel', '', false, false, '');
                        this.setStoveStates('stoveFeatures', 'channel', '', false, false, '');

                        //create and/or update states in controls, sensors and stoveFeatures
                        for (let [key, value] of Object.entries(content.controls)) {
                            this.setStoveStates(`controls.${key}`, 'state', '', true, true, value);
                        }
                        for (let [key, value] of Object.entries(content.sensors)) {
                            this.setStoveStates(`sensors.${key}`, 'state', '', true, false, value);
                        }
                        for (let [key, value] of Object.entries(content.stoveFeatures)) {
                            this.setStoveStates(`stoveFeatures.${key}`, 'state', '', true, false, value);
                        }
                    } else {
                        this.log.error(`Malformed json: ${JSON.stringify(response.data)}`);
                    }

                    //call getstoveValues() every 1 minute
                    clearTimeout(this.timeout);
                    this.timeout = setTimeout(() => this.getStoveValues(), this.config.myinterval * 60000);
                } else {
                    //login failed
                    this.log.error('get data not successful');
                }
            } catch (error) {
                this.log.error(`getstoveValues error: ${error}`);
            }
        } else {
            this.log.debug('change in progress: try to getstoveValues() next time');
        }
    }

    async setstoveValues(controlname, controlvalue) {
        //set true, to not run getstoveValues() at this time
        this.changeInProgress = true;

        var stoveID = this.config.mystoveid;

        try {
            const url = `${baseUrl}/api/client/${stoveID}/status`;
            this.log.debug(`url: ${url}`);
            const response = await client.get(url);

            if (response.status == 200 && response.data) {
                // request successful
                this.log.debug(`${response.status} - API-Connection successful`);

                //kick out adaptername, id, device and other stuff from string
                const cleanControlname = controlname.split('.').slice(4).join('.');
                this.log.debug(`${cleanControlname} = ${controlvalue}`);

                const content = response.data;

                //change value in content.controls
                content.controls[cleanControlname] = controlvalue;

                //send modified json to server
                await client.post(`${baseUrl}/api/client/${stoveID}/controls`, content.controls);

                this.log.debug(JSON.stringify(content.controls));
            } else {
                this.log.error('get data not successful');
            }
        } catch (error) {
            this.log.error(`setstoveValues error: ${error}`);
        }

        //set free
        this.changeInProgress = false;
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback
     */
    async onUnload(callback) {
        try {
            await this.setState('info.connection', { val: false, ack: true });
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            callback();
        } catch {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     *
     * @param id
     * @param obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.debug(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.debug(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     *
     * @param id
     * @param state
     */
    onStateChange(id, state) {
        if (state && !state.ack) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            this.setstoveValues(id, state.val);
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param [options]
     */
    module.exports = options => new RikaFirenet(options);
} else {
    // otherwise start the instance directly
    new RikaFirenet();
}
