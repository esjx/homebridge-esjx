import {Service, PlatformAccessory, CharacteristicValue} from 'homebridge';

import { EsjRPi } from './platform';

const TWEEN = require('@tweenjs/tween.js')

setInterval(() => {
  TWEEN.update();
}, 25);

abstract class Accessory {

  protected service: Service;

  public initialized = false;

  protected constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
      protected type,
      protected characteristic,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
        .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.Service[this.type]) || this.accessory.addService(this.platform.Service[this.type]);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    Object.entries(this.characteristic).forEach(([key, value]) => {

      this.startCharacteristic(key, value as CharacteristicValue);

    });

  }

  triggerAlarm() {

    if (typeof this.config.alarm !== 'undefined' && typeof this.platform.alarm !== 'undefined') {

      let trigger = new ConfigAlarmTrigger();

      if (typeof this.config.alarm.home !== 'undefined') {
        trigger.home = this.config.alarm.home;
      }

      if (typeof this.config.alarm.away !== 'undefined') {
        trigger.away = this.config.alarm.away;
      }

      if (typeof this.config.alarm.night !== 'undefined') {
        trigger.night = this.config.alarm.night;
      }

      this.platform.alarm.trigger(trigger, this.config.displayName);

    }

  }

  startCharacteristic(key: string, value: CharacteristicValue) {

    const me = this;

    me.service.setCharacteristic(me.platform.Characteristic[key], value);

    if (typeof me['set' + key] === 'function') {
      me.service.getCharacteristic(me.platform.Characteristic[key])
          .onSet(me['set' + key].bind(me));
    }

    if (typeof me['get' + key] === 'function') {
      me.service.getCharacteristic(me.platform.Characteristic[key])
          .onGet(me['get' + key].bind(me));
    }

  }

  async wait(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

  }

  async init() {

    this.initialized = true;

  }

}

/* Acessórios de saída (GPIO ou I2C) */

abstract class OutputAccessory extends Accessory {

  protected gpio;

  async init() {

    if (typeof this.config.gpio !== 'undefined') {

      this.platform.log.debug(this.type + ' connected on GPIO:', this.config.gpio);

      this.gpio = this.platform.pigpio.gpio(this.config.gpio);
      await this.gpio.modeSet('output');
      await this.gpio.pullUpDown(this.config.pullUpDown);

    } else if (typeof this.config.i2cAddress !== 'undefined' && typeof this.config.i2cBit !== 'undefined') {

      // Inicializar a i2c?

    } else {

      this.platform.log.error('Error', this.type, this.config);

    }

    Object.entries(this.characteristic).forEach(([key, value]) => {
      if (value !== null && typeof this['set' + key] === 'function') {
        this['set' + key](value);
      }
    });

    this.initialized = true;

  }

  async onChange(value: boolean) {}

  async output(value: boolean) {

    if (typeof this.config.gpio !== 'undefined') {

      this.gpio.write((value) ? 0 : 1);

    } else if (typeof this.config.i2cAddress !== 'undefined' && typeof this.config.i2cBit !== 'undefined') {

      await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBit, !value);

      await this.platform.i2cApply(this.config.i2cAddress);

    }

    await this.onChange(value);

  }

  async setOn(value: CharacteristicValue) {

    if (value !== this.characteristic.On) {

      this.characteristic.On = value as boolean;

      this.platform.log.debug('Set Characteristic On ->', value);

      return this.output(this.characteristic.On);

    }

  }

  async getOn(): Promise<CharacteristicValue> {

    return this.characteristic.On;

  }

  async setActive(value: CharacteristicValue) {

    if (value !== this.characteristic.Active) {

      this.characteristic.Active = value as number;

      this.platform.log.debug('Set Characteristic Active ->', value);

      return this.output((this.characteristic.Active === 1));

    }

  }

  async getActive(): Promise<CharacteristicValue> {

    return this.characteristic.Active;

  }

  async toggle(): Promise<CharacteristicValue> {

    if (typeof this.characteristic.On !== 'undefined') {

      await this.setOn(!this.characteristic.On);

      this.service.setCharacteristic(this.platform.Characteristic.On, this.characteristic.On);

      return this.characteristic.On;

    } else {

      await this.setActive((this.characteristic.Active === 1) ? 0 : 1);

      this.service.setCharacteristic(this.platform.Characteristic.Active, this.characteristic.Active);

      return this.characteristic.Active;

    }

  }

}

export class DefaultOutputAccessory extends OutputAccessory {

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
      protected type,
      protected characteristic,
  ) {

    super(platform, accessory, config, type, characteristic);

  }

}

export class ValveAccessory extends OutputAccessory {

  private timeout;
  private startTime?: number;

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'Valve', {
      Active: 0,
      SetDuration: 300,
      RemainingDuration: 0,
    });

    this.service.setCharacteristic(this.platform.Characteristic.InUse, this.platform.Characteristic.InUse.NOT_IN_USE);

    if (typeof this.config.subtype !== 'undefined') {

      this.service.setCharacteristic(this.platform.Characteristic.ValveType, this.config.subtype);

    }

    if (typeof this.config.time !== 'undefined' && this.config.time > 0) {

      this.characteristic.SetDuration = this.config.time;
      this.service.setCharacteristic(this.platform.Characteristic.SetDuration, this.characteristic.SetDuration);

    }

  }

  async onChange(value: boolean) {

    this.service.setCharacteristic(this.platform.Characteristic.InUse, this.characteristic.Active);

    this.startTimeout();

  }

  startTimeout() {

    const me = this;

    if (me.timeout) {
      clearTimeout(me.timeout);
    }

    if (this.characteristic.Active === 1 && this.characteristic.SetDuration > 0) {

      me.startTime = Date.now();

      this.service.setCharacteristic(this.platform.Characteristic.RemainingDuration, this.characteristic.SetDuration);

      me.timeout = setTimeout(() => {
        me.setActive(0).then(() => {
          me.service.setCharacteristic(this.platform.Characteristic.Active, 0);
        });
      }, me.characteristic.SetDuration * 1000);

    } else {

      this.service.setCharacteristic(this.platform.Characteristic.RemainingDuration, 0);

    }

  }

  async setSetDuration(value: CharacteristicValue) {

    this.characteristic.SetDuration = value as number;

    this.startTimeout();

  }

  getRemainingDuration(): CharacteristicValue {

    let time = 0;

    if (this.characteristic.Active === 1 && this.startTime) {

      time = this.characteristic.SetDuration - (Date.now() - this.startTime) / 1000;

      if (time < 0) {
        time = 0;
      }

    }

    return time;

  }

}

class ConfigAlarmTrigger {
  public home = false;
  public away = false;
  public night = false;
}

export class SecuritySystemAccessory extends OutputAccessory {

  private timeoutState;
  private timeoutTrigger;
  private time = 10;

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'SecuritySystem', {
      SecuritySystemTargetState: 3,
      SecuritySystemCurrentState: 3
    });

    this.accessory.category = this.platform.api.hap.Categories.ALARM_SYSTEM;

    if (typeof this.config.time !== 'undefined') {
      this.time = this.config.time;
    }

  }

  stateName(state): string {

    let out = String(state);

    switch (state) {

      case 0:
        out = 'Armado (Em casa)';
        break;

      case 1:
        out = 'Armado (Ausente)';
        break;

      case 2:
        out = 'Armado (Noite)';
        break;

      case 3:
        out = 'Desarmado';
        break;

      case 4:
        out = 'Disparado!!!';
        break;

    }

    return out;

  }

  async setSecuritySystemTargetState(value: CharacteristicValue) {

    const me = this;

    me.characteristic.SecuritySystemTargetState = value as number;

    if (me.characteristic.SecuritySystemTargetState != me.characteristic.SecuritySystemCurrentState) {

      me.platform.log.info('Estado Alterado...', me.stateName(me.characteristic.SecuritySystemTargetState));

      me.startTimeoutState();

    }

  }

  changeState() {

    const me = this;

    me.characteristic.SecuritySystemCurrentState = me.characteristic.SecuritySystemTargetState;
    me.platform.log.warn('Estado Alterado!', me.stateName(me.characteristic.SecuritySystemCurrentState));
    me.service.setCharacteristic(me.platform.Characteristic.SecuritySystemCurrentState, me.characteristic.SecuritySystemCurrentState);

  }

  startTimeoutState() {

    const me = this;

    if (me.timeoutState) {
      clearTimeout(me.timeoutState);
    }

    if (me.timeoutTrigger) {
      clearTimeout(me.timeoutTrigger);
    }

    if (me.characteristic.SecuritySystemTargetState == me.platform.Characteristic.SecuritySystemTargetState.DISARM) {

      me.changeState();

    } else {

      me.timeoutState = setTimeout(() => {
        me.changeState();
      }, me.time * 1000);

    }

  }

  trigger(config: ConfigAlarmTrigger, name: string) {

    const me = this;

    let detected = false;

    if (config.home && me.characteristic.SecuritySystemCurrentState == me.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM) {
      detected = true;
    }

    if (config.away && me.characteristic.SecuritySystemCurrentState == me.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM) {
      detected = true;
    }

    if (config.night && me.characteristic.SecuritySystemCurrentState == me.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM) {
      detected = true;
    }

    if (detected) {
      me.platform.log.warn('Movimento Detectado!', name);
      me.startTimeoutTrigger();
    }

  }

  startTimeoutTrigger() {

    const me = this;

    me.timeoutTrigger = setTimeout(() => {
      me.service.setCharacteristic(me.platform.Characteristic.SecuritySystemCurrentState, me.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
      me.platform.log.error('Alarme Disparado!');
    }, me.time * 1000);

  }

  async getSecuritySystemTargetState(): Promise<CharacteristicValue> {

    return this.characteristic.SecuritySystemTargetState;

  }

  async toggle(): Promise<CharacteristicValue> {

    this.platform.log.warn('Toggle Security System');

    return this.characteristic.SecuritySystemTargetState;

  }

}

export class LightRgbAccessory extends Accessory {

  protected gpioR;
  protected gpioG;
  protected gpioB;

  protected tween;

  protected characteristic2;

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'Lightbulb', {
      On: false,
      Hue: 0,
      Saturation: 75,
      Brightness: 100,
    });

    this.characteristic2 = {
      Hue: 0,
      Saturation: 75,
      Brightness: 100,
    };

  }

  async init() {

    const me = this;

    if (typeof this.config.gpioR !== 'undefined') {

      this.platform.log.debug(this.type + ' connected on GPIO:', this.config.gpioR, this.config.gpioG, this.config.gpioB);

      this.gpioR = this.platform.pigpio.gpio(this.config.gpioR);
      await this.gpioR.modeSet('output');
      await this.gpioR.pullUpDown(1);

      this.gpioG = this.platform.pigpio.gpio(this.config.gpioG);
      await this.gpioG.modeSet('output');
      await this.gpioG.pullUpDown(1);

      this.gpioB = this.platform.pigpio.gpio(this.config.gpioB);
      await this.gpioB.modeSet('output');
      await this.gpioB.pullUpDown(1);

    } else {

      this.platform.log.error('Error', this.type, this.config);

    }

    Object.entries(this.characteristic).forEach(([key, value]) => {
      if (value !== null && typeof this['set' + key] === 'function') {
        this['set' + key](value);
      }
    });

    this.initialized = true;

  }

  startTween(h, s, b) {

    const me = this;

    if (typeof me.tween !== 'undefined') {
      me.tween.stop();
    }

    me.characteristic2.Hue = me.characteristic2.Hue % 360;

    if (Math.abs(h - me.characteristic2.Hue) > 180) {

      if (h > me.characteristic2.Hue) {
        me.characteristic2.Hue += 360;
      } else {
        h += 360;
      }

    }

    me.tween = new TWEEN.Tween(me.characteristic2)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          me.output();
        })
        .to({Hue: h, Saturation: s, Brightness: b}, 500)
        .start();

  }

  async setOn(value: CharacteristicValue) {

    if (value !== this.characteristic.On) {

      this.characteristic.On = value as boolean;

      this.platform.log.debug('Set Characteristic On ->', value);

      if (value) {
        this.characteristic2.Brightness = 0;
      }

      this.startTween(this.characteristic.Hue, this.characteristic.Saturation, (this.characteristic.On) ? this.characteristic.Brightness : 0);

    }

  }

  async getOn(): Promise<CharacteristicValue> {

    return this.characteristic.On;

  }

  async setBrightness(value: CharacteristicValue) {

    if (value !== this.characteristic.Brightness) {

      this.characteristic.Brightness = value as number;

      this.platform.log.debug('Set Characteristic Brightness ->', value);

      this.startTween(this.characteristic.Hue, this.characteristic.Saturation, (this.characteristic.On) ? this.characteristic.Brightness : 0);

    }

  }

  async getBrightness(): Promise<CharacteristicValue> {

    return this.characteristic.Brightness;

  }

  async setHue(value: CharacteristicValue) {

    if (value !== this.characteristic.Hue) {

      this.characteristic.Hue = value as number;

      this.platform.log.debug('Set Characteristic Hue ->', value);

      this.startTween(this.characteristic.Hue, this.characteristic.Saturation, (this.characteristic.On) ? this.characteristic.Brightness : 0);

    }

  }

  async getHue(): Promise<CharacteristicValue> {

    return this.characteristic.Hue;

  }

  async setSaturation(value: CharacteristicValue) {

    if (value !== this.characteristic.Saturation) {

      this.characteristic.Saturation = value as number;

      this.platform.log.debug('Set Characteristic Saturation ->', value);

      this.startTween(this.characteristic.Hue, this.characteristic.Saturation, (this.characteristic.On) ? this.characteristic.Brightness : 0);

    }

  }

  async getSaturation(): Promise<CharacteristicValue> {

    return this.characteristic.Saturation;

  }

  output() {

    if (typeof this.config.gpioR !== 'undefined') {

      if (this.characteristic2.Brightness > 0) {

        let rgb = this.rgbFromHSV(this.characteristic2.Hue % 360, this.characteristic2.Saturation / 100, this.characteristic2.Brightness / 100);

        this.gpioR.analogWrite(rgb[0]);
        this.gpioG.analogWrite(rgb[1]);
        this.gpioB.analogWrite(rgb[2]);

      } else {

        this.gpioR.write(0);
        this.gpioG.write(0);
        this.gpioB.write(0);

      }

    }

  }

  rgbFromHSV(h,s,v) {

    const i = h / 60;
    const c = v * s;
    const x = c * (1 - Math.abs(i % 2 - 1));
    const m = v - c;

    let r, g, b;

    if (!i) {r = 0; g = 0; b = 0; }
    if (i >= 0 && i < 1) { r = c; g = x; b = 0}
    if (i >= 1 && i < 2) { r = x; g = c; b = 0}
    if (i >= 2 && i < 3) { r = 0; g = c; b = x}
    if (i >= 3 && i < 4) { r = 0; g = x; b = c}
    if (i >= 4 && i < 5) { r = x; g = 0; b = c}
    if (i >= 5 && i < 6) { r = c; g = 0; b = x}

    r = Math.round( (r + m)* 255);
    g = Math.round( (g + m)* 255);
    b = Math.round( (b + m)* 255);

    return [r, g, b]

  }

}

/* Acessórios de entrada (GPIO) */

abstract class InputAccessory extends Accessory {

  protected gpio;
  protected glitchTime = 10;

  protected constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
      protected type,
      protected characteristic,
  ) {

    super(platform, accessory, config, type, characteristic);

  }

  async onChange(level, tick) {}

  async init() {

    const me = this;

    if (typeof this.config.gpio !== 'undefined') {

      this.platform.log.debug(this.type + ' connected on GPIO:', this.config.gpio);

      this.gpio = this.platform.pigpio.gpio(this.config.gpio);
      await this.gpio.modeSet('input');
      await this.gpio.pullUpDown(this.config.pullUpDown);
      await this.gpio.glitchSet(this.glitchTime * 1000);

      this.gpio.notify((level, tick) => {

        if (level === 1) {

          this.triggerAlarm();

        }

        me.onChange(level, tick);

      });

    } else {

      this.platform.log.error('Error', this.type, this.config);

    }

    this.initialized = true;

  }

}

export class ButtonAccessory extends InputAccessory {

  private pressedTick;

  private singlePressTimeout;
  private doublePressTime = 500;
  private longPressTime = 800;

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'StatelessProgrammableSwitch', {
      ProgrammableSwitchEvent: null,
    });

  }

  getProgrammableSwitchEvent() {

    return null;

  }

  toggle(type) {

    if (typeof this.config[type] !== 'undefined') {

      const device = this.platform.generateUuid(this.config[type]);

      if (typeof this.platform.links[device] !== 'undefined') {

        this.platform.links[device].toggle();
        this.platform.log.debug('Toggle State', this.config[type]);

      } else {

        this.platform.log.error('Toggle Device Not Found', this.config[type]);

      }

    }

  }

  async onChange(level, tick) {

    if (level === 1) {

      const timePressed = (tick - this.pressedTick) / 1000;

      this.platform.log.debug('timePressed: ' + timePressed);

      if (timePressed >= this.longPressTime) {

        clearInterval(this.singlePressTimeout);
        this.singlePressTimeout = null;
        this.platform.log.debug('Longo');

        this.toggle('long');

        this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);

      } else {

        if (this.singlePressTimeout) {

          clearInterval(this.singlePressTimeout);
          this.singlePressTimeout = null;
          this.platform.log.debug('Duplo');

          this.toggle('double');

          this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);

        } else {

          this.singlePressTimeout = setTimeout(() => {

            this.singlePressTimeout = null;
            this.platform.log.debug('Simples');

            this.toggle('single');

            this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);

          }, this.doublePressTime);

        }

      }

    } else {

      this.pressedTick = tick;

    }

  }

}

export class ContactSensorAccessory extends InputAccessory {

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'ContactSensor', {
      ContactSensorState: 0,
    });

  }

  async getContactSensorState(): Promise<CharacteristicValue> {

    return this.characteristic.ContactSensorState;

  }

  async onChange(level, tick) {

    this.platform.log.debug(`ContactSensor changed to ${level} at ${tick} usec`);

    this.characteristic.ContactSensorState = level;

    this.service.setCharacteristic(this.platform.Characteristic.ContactSensorState, level);

  }

}

export class OccupancySensorAccessory extends InputAccessory {

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'OccupancySensor', {
      OccupancyDetected: 0,
    });

  }

  async getOccupancyDetected(): Promise<CharacteristicValue> {

    return this.characteristic.OccupancyDetected;

  }

  async onChange(level, tick) {

    this.platform.log.debug(`OccupancySensor changed to ${level} at ${tick} usec`);

    this.characteristic.OccupancyDetected = level;

    this.service.setCharacteristic(this.platform.Characteristic.OccupancyDetected, level);

  }

}

export class MotionSensorAccessory extends InputAccessory {

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'MotionSensor', {
      MotionDetected: 0,
    });

  }

  async getMotionDetected(): Promise<CharacteristicValue> {

    return this.characteristic.MotionDetected;

  }

  async onChange(level, tick) {

    this.platform.log.debug(`MotionSensor changed to ${level} at ${tick} usec`);

    this.characteristic.MotionDetected = level;

    this.service.setCharacteristic(this.platform.Characteristic.MotionDetected, level);

  }

}

/* Em desenvolvimento */

export class GarageDoorAccessory extends InputAccessory {

  private tick;

  protected gpioOpen;
  protected gpioClose;

  protected detected = true;

  private pulse = 500;

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'GarageDoorOpener', {
      CurrentDoorState: 1,
      TargetDoorState: 1,
      ObstructionDetected: false,
    });

    this.accessory.category = this.platform.api.hap.Categories.GARAGE_DOOR_OPENER;

    this.service.setCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.UNSECURED);

  }

  async getCurrentDoorState(): Promise<CharacteristicValue> {

    this.platform.log.debug('Get Characteristic CurrentDoorState ->', this.characteristic.CurrentDoorState);

    return this.characteristic.CurrentDoorState;

  }

  async getTargetDoorState(): Promise<CharacteristicValue> {

    this.platform.log.debug('Get Characteristic TargetDoorState ->', this.characteristic.TargetDoorState);

    return this.characteristic.TargetDoorState;

  }

  async setTargetDoorState(value: CharacteristicValue) {

    this.characteristic.TargetDoorState = value as number;

    if (!this.detected) {

      this.platform.log.error('Acionando botoeira!!!');

      await this.gpio.write(0);
      await this.wait(this.pulse);
      await this.gpio.write(1);

    }

    this.detected = false;

  }

  async getObstructionDetected(): Promise<CharacteristicValue> {

    this.platform.log.debug('Get Characteristic ObstructionDetected ->', this.characteristic.ObstructionDetected);

    return this.characteristic.ObstructionDetected;

  }

  async init() {

    this.platform.log.debug(this.type + ' connected on GPIO:', this.config.gpio);

    this.gpio = this.platform.pigpio.gpio(this.config.gpio);
    await this.gpio.modeSet('output');
    await this.gpio.pullUpDown(this.config.pullUpDown);

    this.gpioOpen = this.platform.pigpio.gpio(this.config.gpioOpen);
    await this.gpioOpen.modeSet('input');
    await this.gpioOpen.pullUpDown(this.config.pullUpDown);
    await this.gpioOpen.glitchSet(this.glitchTime * 1000);

    this.gpioOpen.notify((level, tick)=> {

      this.platform.log.debug(`Garage Open changed to ${level} at ${tick} usec`);

      this.detected = true;

      if (level == 1) {

        this.tick = tick;

        this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.CLOSED;
        this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.CLOSING;

        this.service.setCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.CLOSED);
        this.service.setCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.CLOSING);

        this.platform.log.info('Closing...');

      } else {

        let time = (tick - this.tick) / 1000000;

        this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.OPEN;
        this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.OPEN;

        this.service.setCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.OPEN);
        this.service.setCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.OPEN);

        this.platform.log.info('Open!', Math.round(time * 10) / 10, 'seconds');

      }

    });

    this.gpioClose = this.platform.pigpio.gpio(this.config.gpioClose);
    await this.gpioClose.modeSet('input');
    await this.gpioClose.pullUpDown(this.config.pullUpDown);
    await this.gpioClose.glitchSet(this.glitchTime * 1000);

    this.gpioClose.notify((level, tick)=> {

      this.platform.log.debug(`Garage Close changed to ${level} at ${tick} usec`);

      this.detected = true;

      if (level == 1) {

        this.tick = tick;

        this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.OPEN;
        this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.OPENING;

        this.service.setCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.OPEN);
        this.service.setCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.OPENING);

        this.triggerAlarm();

        this.platform.log.info('Opening...');

      } else {

        let time = (tick - this.tick) / 1000000;

        this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.CLOSED;
        this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.CLOSED;

        this.service.setCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.CLOSED);
        this.service.setCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.CLOSED);

        this.platform.log.info('Closed!', Math.round(time * 10) / 10, 'seconds');

      }

    });

    const valueOpen = await this.gpioOpen.read();

    if (valueOpen == 0) {
      this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.OPEN;
      this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.OPEN;
    } else {
      this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.CLOSED;
      this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.CLOSED;
    }

    Object.entries(this.characteristic).forEach(([key, value]) => {
      if (value !== null && typeof this['set' + key] === 'function') {
        this['set' + key](value);
      }
    });

    this.initialized = true;

  }

}

export class FanAccessory extends OutputAccessory {

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'Fan', {
      On: false,
      RotationDirection: 0,
      RotationSpeed: 35,
    });

    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).setProps({
      maxValue: 100,
      minValue: 0,
      minStep: 10
    });

  }

  async update() {

    await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBit, !this.characteristic.On);

    if (!this.characteristic.On) {

      await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBitA, true);
      await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBitB, true);
      await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBitC, true);

    } else {

      await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBitA, this.characteristic.RotationSpeed < 35);
      await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBitB, this.characteristic.RotationSpeed < 70);
      await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBitC, this.characteristic.RotationDirection === 0);

    }

    await this.platform.i2cApply(this.config.i2cAddress);

  }

  async setOn(value: CharacteristicValue) {

    if (value !== this.characteristic.On) {

      this.characteristic.On = value as boolean;

      this.platform.log.debug('Set Characteristic On ->', value);

      await this.update();

    }

  }

  async setRotationDirection(value: CharacteristicValue) {

    this.characteristic.RotationDirection = value as number;

    this.platform.log.debug('Set Characteristic RotationDirection ->', value);

    await this.update();

  }

  async getRotationDirection(): Promise<CharacteristicValue> {

    return this.characteristic.RotationDirection;

  }

  async setRotationSpeed(value: CharacteristicValue) {

    this.characteristic.RotationSpeed = value as number;

    this.platform.log.debug('Set Characteristic RotationSpeed ->', value);

    await this.update();

  }

  async getRotationSpeed(): Promise<CharacteristicValue> {

    return this.characteristic.RotationSpeed;

  }

}

export class SpeakerAccessory extends Accessory {

  protected service2: Service;

  constructor(
      protected readonly platform: EsjRPi,
      protected readonly accessory: PlatformAccessory,
      protected config,
  ) {

    super(platform, accessory, config, 'SmartSpeaker', {
      CurrentMediaState: 3,
      TargetMediaState: 3,
      Mute: false,
      Volume: 30,
    });

    this.service2 = this.accessory.getService(this.platform.Service.AudioStreamManagement) || this.accessory.addService(this.platform.Service.AudioStreamManagement);

  }

  async getCurrentMediaState(): Promise<CharacteristicValue> {

    return this.characteristic.CurrentMediaState;

  }

  async getTargetMediaState(): Promise<CharacteristicValue> {

    return this.characteristic.TargetMediaState;

  }

  async getMute(): Promise<CharacteristicValue> {

    return this.characteristic.Mute;

  }

  async getVolume(): Promise<CharacteristicValue> {

    return this.characteristic.Volume;

  }

  async setTargetMediaState(value: CharacteristicValue) {

    this.characteristic.CurrentMediaState = value as number;
    this.characteristic.TargetMediaState = value as number;

    setTimeout(() => {
      this.service.setCharacteristic(this.platform.Characteristic.CurrentMediaState, this.characteristic.CurrentMediaState);
    }, 100);

  }

  async setMute(value: CharacteristicValue) {

    this.characteristic.Mute = value as boolean;

  }

  async setVolume(value: CharacteristicValue) {

    this.characteristic.Volume = value as number;

  }

}