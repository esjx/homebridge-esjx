"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EsjRPi = void 0;
const settings_1 = require("./settings");
const accessory_1 = require("./accessory");
const pigpio = require('pigpio-client');
class EsjRPi {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.accessories = [];
        this.removedAccessories = [];
        this.configAccessories = [];
        this.i2cHandles = {};
        this.i2cDevices = {};
        this.links = {};
        this.log.debug('Finished initializing platform:', this.config.name);
        if (typeof this.config.devices !== 'undefined') {
            for (const device of this.config.devices) {
                const uuid = this.generateUuid(device);
                this.configAccessories.push(uuid);
            }
            this.log.debug(JSON.stringify(this.configAccessories));
        }
        else {
            this.log.error('Device list not found');
        }
        this.api.on('didFinishLaunching', async () => {
            this.log.debug('Executed didFinishLaunching callback');
            const host = (config.host) ? config.host : 'localhost';
            this.tryConnect(host);
            this.discoverDevices();
        });
    }
    tryConnect(host) {
        const me = this;
        me.connect(host).then(() => {
            me.pigpio.once('connected', async (info) => {
                me.log.debug(info);
                me.initAccessories();
            });
            me.pigpio.once('error', (error) => {
                me.log.warn(error);
                me.log.warn('App reconnecting in 1 sec');
                setTimeout(() => {
                    me.tryConnect(host);
                }, 1000);
            });
            me.pigpio.once('disconnected', (reason) => {
                me.log.warn('App received disconnected event, reason:', reason);
                me.log.warn('App reconnecting in 1 sec');
                setTimeout(() => {
                    me.tryConnect(host);
                }, 1000);
            });
        }).catch((error) => {
            me.log.warn('Pigpio not connected, error:', error);
            me.log.warn('App reconnecting in 1 sec');
            setTimeout(() => {
                me.tryConnect(host);
            }, 1000);
        });
    }
    async connect(host) {
        this.i2cHandles = {};
        this.i2cDevices = {};
        return new Promise((resolve, reject) => {
            try {
                this.pigpio = pigpio.pigpio({ host: host });
                resolve(true);
            }
            catch (e) {
                reject(e.message);
            }
        });
    }
    initAccessories() {
        this.log.warn('Initializing all Accessories');
        Object.entries(this.links).forEach(([key, value]) => {
            this.links[key].init();
        });
    }
    configureAccessory(accessory) {
        const found = this.configAccessories.indexOf(accessory.UUID);
        if (found >= 0) {
            this.log.info('Loading accessory from cache:', accessory.displayName);
            this.accessories.push(accessory);
        }
        else {
            this.log.error('Marking accessory for remove:', accessory.displayName);
            this.removedAccessories.push(accessory);
        }
    }
    removeAccessories() {
        if (this.removedAccessories.length > 0) {
            this.log.error('Removing accessories...');
            this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, this.removedAccessories);
            this.removedAccessories.splice(0, this.removedAccessories.length);
        }
    }
    generateUuid(device) {
        let name = device.type;
        if (typeof device.gpio !== 'undefined') {
            name = name + '_gpio_' + device.gpio;
        }
        else if (typeof device.i2cAddress !== 'undefined') {
            name = name + '_i2c_' + device.i2cAddress + '_' + device.i2cBit;
        }
        return this.api.hap.uuid.generate(name);
    }
    discoverDevices() {
        this.removeAccessories();
        for (const device of this.config.devices) {
            const uuid = this.generateUuid(device);
            let accessory = this.accessories.find(accessory => accessory.UUID === uuid);
            if (accessory) {
                this.log.info('Restoring existing accessory from cache:', accessory.displayName);
            }
            else {
                this.log.warn('Adding new accessory:', device.displayName);
                accessory = new this.api.platformAccessory(device.displayName, uuid);
                accessory.context.device = device;
                this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
            }
            switch (device.type.toLowerCase()) {
                case 'button':
                    if (typeof device.gpio !== 'undefined') {
                        this.links[uuid] = new accessory_1.GpioButtonAccessory(this, accessory, device);
                    }
                    break;
                case 'contact':
                    if (typeof device.gpio !== 'undefined') {
                        this.links[uuid] = new accessory_1.GpioContactSensorAccessory(this, accessory, device);
                    }
                    break;
                case 'motion':
                    if (typeof device.gpio !== 'undefined') {
                        this.links[uuid] = new accessory_1.GpioMotionSensorAccessory(this, accessory, device);
                    }
                    break;
                case 'occupancy':
                    if (typeof device.gpio !== 'undefined') {
                        this.links[uuid] = new accessory_1.GpioOccupancySensorAccessory(this, accessory, device);
                    }
                    break;
                case 'light':
                    if (typeof device.gpio !== 'undefined') {
                        this.links[uuid] = new accessory_1.GpioLightAccessory(this, accessory, device);
                    }
                    else if (typeof device.i2cAddress !== 'undefined') {
                        this.links[uuid] = new accessory_1.I2cLightAccessory(this, accessory, device);
                    }
                    break;
                case 'switch':
                    if (typeof device.gpio !== 'undefined') {
                        this.links[uuid] = new accessory_1.GpioSwitchAccessory(this, accessory, device);
                    }
                    else if (typeof device.i2cAddress !== 'undefined') {
                        this.links[uuid] = new accessory_1.I2cSwitchAccessory(this, accessory, device);
                    }
                    break;
                case 'outlet':
                    if (typeof device.gpio !== 'undefined') {
                        this.links[uuid] = new accessory_1.GpioOutletAccessory(this, accessory, device);
                    }
                    else if (typeof device.i2cAddress !== 'undefined') {
                        this.links[uuid] = new accessory_1.I2cOutletAccessory(this, accessory, device);
                    }
                    break;
                case 'fan':
                    if (typeof device.gpio !== 'undefined') {
                        this.links[uuid] = new accessory_1.GpioFanAccessory(this, accessory, device);
                    }
                    else if (typeof device.i2cAddress !== 'undefined') {
                        this.links[uuid] = new accessory_1.I2cFanAccessory(this, accessory, device);
                    }
                    break;
                case 'faucet':
                    if (typeof device.gpio !== 'undefined') {
                        //this.links[uuid] = new GpioFaucetAccessory(this, accessory, device);
                    }
                    else if (typeof device.i2cAddress !== 'undefined') {
                        this.links[uuid] = new accessory_1.I2cFaucetAccessory(this, accessory, device);
                    }
                    break;
                case 'valve':
                    if (typeof device.gpio !== 'undefined') {
                        //this.links[uuid] = new GpioFaucetAccessory(this, accessory, device);
                    }
                    else if (typeof device.i2cAddress !== 'undefined') {
                        this.links[uuid] = new accessory_1.I2cValveAccessory(this, accessory, device);
                    }
                    break;
                case 'alarm':
                    if (typeof device.gpio !== 'undefined') {
                        this.links[uuid] = new accessory_1.SecuritySystemAccessory(this, accessory, device);
                        this.alarm = this.links[uuid];
                    }
                    break;
                default:
                    this.log.error(`Device type ${device.type} not supported`);
            }
        }
    }
    bin2dec(v) {
        return parseInt((v + '').replace(/[^01]/gi, ''), 2);
    }
    dec2bin(v, size = 8) {
        let r = v.toString(2);
        while (r.length < size) {
            r = '0' + r;
        }
        return r;
    }
    async startI2cDevice(address) {
        const len = 8;
        try {
            if (typeof this.i2cDevices[address] === 'undefined') {
                this.i2cHandles[address] = await this.pigpio.i2cOpen(1, address);
                let value = await this.pigpio.i2cReadDevice(this.i2cHandles[address], 1);
                value = this.dec2bin(value[1], len);
                let arr = String(value).split('');
                arr.reverse();
                this.i2cDevices[address] = arr;
                this.log.info('Start I2C device:', JSON.stringify(this.i2cDevices));
            }
        }
        catch (e) {
            this.log.error(e.message);
        }
    }
    async i2cWriteBit(address, bit, v) {
        const value = (v) ? 1 : 0;
        await this.startI2cDevice(address);
        this.log.debug(address, bit, value);
        this.i2cDevices[address][bit - 1] = value;
    }
    async i2cApply(address) {
        let arr = JSON.parse(JSON.stringify(this.i2cDevices[address]));
        arr.reverse();
        const bit = arr.join('');
        this.log.debug('I2C(' + address + '):', bit, this.bin2dec(bit));
        try {
            await this.pigpio.i2cWriteDevice(this.i2cHandles[address], [this.bin2dec(bit)]);
        }
        catch (e) {
            this.log.error(e.message);
        }
    }
}
exports.EsjRPi = EsjRPi;
//# sourceMappingURL=platform.js.map