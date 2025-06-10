import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

import {

  DefaultOutputAccessory,
  ValveAccessory,
  FanAccessory,

  ButtonAccessory,
  ContactSensorAccessory,
  MotionSensorAccessory,
  OccupancySensorAccessory,

  GarageDoorAccessory,

  SecuritySystemAccessory,
  SpeakerAccessory,
  LightRgbAccessory,
  LockMechanismAccessory,
  TestAccessory,
  AlarmTriggerAccessory, DimmerAccessory,

} from './accessory';

import pigpio from "pigpio-client";

export class EsjRPi implements DynamicPlatformPlugin {

  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  public readonly removedAccessories: PlatformAccessory[] = [];

  private configAccessories: string[] = [];

  public pigpio;
  public tween;

  private i2cHandles = {};
  public i2cDevices = {};

  public alarm?: SecuritySystemAccessory;

  public links = {};

  constructor(
      public readonly log: Logger,
      public readonly config: PlatformConfig,
      public readonly api: API,
  ) {

    this.log.debug('Finished initializing platform:', this.config.name);

    if (typeof this.config.devices !== 'undefined') {

      for (const device of this.config.devices) {

        const uuid = this.generateUuid(device);

        this.configAccessories.push(uuid);

      }

      this.log.debug(JSON.stringify(this.configAccessories));

    } else {

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

    // eslint-disable-next-line @typescript-eslint/no-this-alias
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

  async connect(host): Promise<boolean> {

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this;

    me.i2cHandles = {};
    me.i2cDevices = {};

    return new Promise((resolve, reject) => {

      try {

        me.pigpio = pigpio.pigpio({host: host});

        resolve(true);

      } catch (e) {
        reject((e as Error).message);
      }

    });

  }

  initAccessories() {

    this.log.warn('Initializing all Accessories');

    this.log.warn(this.api.user.storagePath());

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Object.entries(this.links).forEach(([key, value]) => {

      this.links[key].init();

    });

  }

  configureAccessory(accessory: PlatformAccessory) {

    const found = this.configAccessories.indexOf(accessory.UUID);

    if (found >= 0) {

      this.log.info('Loading accessory from cache:', accessory.displayName);

      this.accessories.push(accessory);

    } else {

      this.log.error('Marking accessory for remove:', accessory.displayName);

      this.removedAccessories.push(accessory);

    }

  }

  removeAccessories() {

    if (this.removedAccessories.length > 0) {

      this.log.error('Removing accessories...');

      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.removedAccessories);

      this.removedAccessories.splice(0, this.removedAccessories.length);

    }

  }

  discoverDevices() {

    this.removeAccessories();

    for (const device of this.config.devices) {

      const uuid = this.generateUuid(device);

      let accessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (accessory) {

        this.log.info('Restoring existing accessory from cache:', accessory.displayName);

      } else {

        this.log.warn('Adding new accessory:', device.displayName);

        accessory = new this.api.platformAccessory(device.displayName, uuid);

        accessory.context.device = device;

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

      }

      switch (device.type.toLowerCase()) {

        // Output

        case 'light':
          this.links[uuid] = new DefaultOutputAccessory(this, accessory, device, 'Lightbulb', {
            On: false,
          });
          break;

        case 'switch':
          this.links[uuid] = new DefaultOutputAccessory(this, accessory, device, 'Switch', {
            On: false,
          });
          break;

        case 'outlet':
          this.links[uuid] = new DefaultOutputAccessory(this, accessory, device, 'Outlet', {
            On: false,
          });
          break;

        case 'faucet':
          this.links[uuid] = new DefaultOutputAccessory(this, accessory, device, 'Faucet', {
            Active: 0,
          });
          break;

        case 'valve':
          this.links[uuid] = new ValveAccessory(this, accessory, device);
          break;

        case 'dimmer':
          this.links[uuid] = new DimmerAccessory(this, accessory, device);
          break;

        case 'lock':
          this.links[uuid] = new LockMechanismAccessory(this, accessory, device);
          break;

        // Input

        case 'button':
          this.links[uuid] = new ButtonAccessory(this, accessory, device);
          break;

        case 'contact':
          this.links[uuid] = new ContactSensorAccessory(this, accessory, device);
          break;

        case 'motion':
          this.links[uuid] = new MotionSensorAccessory(this, accessory, device);
          break;

        case 'occupancy':
          this.links[uuid] = new OccupancySensorAccessory(this, accessory, device);
          break;

        // Others

        case 'garage_door':
          this.links[uuid] = new GarageDoorAccessory(this, accessory, device);
          break;

        case 'fan':
          this.links[uuid] = new FanAccessory(this, accessory, device);
          break;

        case 'speaker':
          this.links[uuid] = new SpeakerAccessory(this, accessory, device);
          break;

        case 'rgb':
          this.links[uuid] = new LightRgbAccessory(this, accessory, device);
          break;

        case 'test':
          this.links[uuid] = new TestAccessory(this, accessory, device);
          break;

        // Alarm

        case 'alarm':
          this.links[uuid] = new SecuritySystemAccessory(this, accessory, device);
          this.alarm = this.links[uuid];
          break;

        case 'alarm_trigger':
          this.links[uuid] = new AlarmTriggerAccessory(this, accessory, device);
          break;

        // Error

        default:
          this.log.error(`Device type ${device.type} not supported`);

      }

    }

  }

  public generateUuid(device) {

    let name = device.type;

    if (typeof device.gpioR !== 'undefined') {
      name = name + '_gpioRGB_' + device.gpioR;
    } else if (typeof device.gpio !== 'undefined') {
      name = name + '_gpio_' + device.gpio;
    } else if (typeof device.i2cAddress !== 'undefined') {
      name = name + '_i2c_' + device.i2cAddress + '_' + (device.i2cBit ?? device.i2cChannel);
    } else if (typeof device.id !== 'undefined') {
      name = name + '_id_' + device.id;
    }

    return this.api.hap.uuid.generate(name);

  }

  public bin2dec(v) {
    return parseInt((v + '').replace(/[^01]/gi, ''), 2);
  }

  public dec2bin(v: number, size = 8) {
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

        const arr = String(value).split('');

        this.i2cDevices[address] = arr.reverse();

        this.log.info('Start I2C device:', JSON.stringify(this.i2cDevices));

      }

    } catch (e) {
      this.log.error((e as Error).message);
    }

  }

  async startI2cDeviceDimmer(address) {

    try {

      if (typeof this.i2cHandles[address] === 'undefined') {

        this.i2cHandles[address] = await this.pigpio.i2cOpen(1, address);

        this.log.info('Start I2C device:', address);

      }

    } catch (e) {
      this.log.error((e as Error).message);
    }

  }

  async i2cWriteBit(address, bit, v) {

    const value = (v) ? 1 : 0;

    await this.startI2cDevice(address);

    this.log.debug(address, bit, value);

    this.i2cDevices[address][bit - 1] = value;

  }

  async i2cApply(address) {

    const arr = JSON.parse(JSON.stringify(this.i2cDevices[address]));

    //arr.reverse();

    const bit = arr.reverse().join('');

    this.log.debug('I2C(' + address + '):', bit, this.bin2dec(bit));

    try {

      await this.pigpio.i2cWriteDevice(this.i2cHandles[address], [this.bin2dec(bit)]);

    } catch (e) {
      this.log.error((e as Error).message);
    }

  }

  async i2cWriteDevice(address, data) {

    await this.startI2cDeviceDimmer(address);

    this.log.debug('I2C(' + address + '):', data);

    try {

      await this.pigpio.i2cWriteDevice(this.i2cHandles[address], data);

    } catch (e) {
      this.log.error((e as Error).message);
    }

  }

  limit(value: number, min: number, max: number): number
  {

    if (min < max) {

      if (value < min) {
        return min;
      }

      if (value > max) {
        return max;
      }

    } else {

      if (value < max) {
        return max;
      }

      if (value > min) {
        return min;
      }

    }

    return value;

  }


  doubleRuler(value: number, min: number, max: number, min2: number, max2: number, _limit = true): number
  {

    let out = ((value - min) * (max2 - min2)) / (max - min) + min2;

    if (_limit) {
      out = this.limit(out, min2, max2);
    }

    return out;

  }

}
