"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeakerAccessory = exports.FanAccessory = exports.GarageDoorAccessory = exports.MotionSensorAccessory = exports.OccupancySensorAccessory = exports.ContactSensorAccessory = exports.ButtonAccessory = exports.LightRgbAccessory = exports.SecuritySystemAccessory = exports.ValveAccessory = exports.DefaultOutputAccessory = void 0;
const tween_js_1 = __importDefault(require("@tweenjs/tween.js"));
setInterval(() => {
    tween_js_1.default.update();
}, 25);
class Accessory {
    constructor(platform, accessory, config, type, characteristic) {
        var _a;
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.type = type;
        this.characteristic = characteristic;
        this.initialized = false;
        (_a = this.accessory.getService(this.platform.Service.AccessoryInformation)) === null || _a === void 0 ? void 0 : _a.setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer').setCharacteristic(this.platform.Characteristic.Model, 'Default-Model').setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');
        this.service = this.accessory.getService(this.platform.Service[this.type]) || this.accessory.addService(this.platform.Service[this.type]);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);
        Object.entries(this.characteristic).forEach(([key, value]) => {
            this.startCharacteristic(key, value);
        });
    }
    triggerAlarm() {
        if (typeof this.config.alarm !== 'undefined' && typeof this.platform.alarm !== 'undefined') {
            const trigger = new ConfigAlarmTrigger();
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
    startCharacteristic(key, value) {
        this.service.setCharacteristic(this.platform.Characteristic[key], value);
        if (typeof this['set' + key] === 'function') {
            this.service.getCharacteristic(this.platform.Characteristic[key])
                .onSet(this['set' + key].bind(this));
        }
        if (typeof this['get' + key] === 'function') {
            this.service.getCharacteristic(this.platform.Characteristic[key])
                .onGet(this['get' + key].bind(this));
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
class OutputAccessory extends Accessory {
    async init() {
        if (typeof this.config.gpio !== 'undefined') {
            this.platform.log.debug(this.type + ' connected on GPIO:', this.config.gpio);
            this.gpio = this.platform.pigpio.gpio(this.config.gpio);
            await this.gpio.modeSet('output');
            await this.gpio.pullUpDown(this.config.pullUpDown);
        }
        else if (typeof this.config.i2cAddress !== 'undefined' && typeof this.config.i2cBit !== 'undefined') {
            // Inicializar a i2c?
        }
        else {
            this.platform.log.error('Error', this.type, this.config);
        }
        Object.entries(this.characteristic).forEach(([key, value]) => {
            if (value !== null && typeof this['set' + key] === 'function') {
                this['set' + key](value);
            }
        });
        this.initialized = true;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
    async onChange(value) { }
    async output(value) {
        if (typeof this.config.gpio !== 'undefined') {
            this.gpio.write((value) ? 0 : 1);
        }
        else if (typeof this.config.i2cAddress !== 'undefined' && typeof this.config.i2cBit !== 'undefined') {
            await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBit, !value);
            await this.platform.i2cApply(this.config.i2cAddress);
        }
        await this.onChange(value);
    }
    async setOn(value) {
        if (value !== this.characteristic.On) {
            this.characteristic.On = value;
            this.platform.log.debug('Set Characteristic On ->', value);
            return this.output(this.characteristic.On);
        }
    }
    async getOn() {
        return this.characteristic.On;
    }
    async setActive(value) {
        if (value !== this.characteristic.Active) {
            this.characteristic.Active = value;
            this.platform.log.debug('Set Characteristic Active ->', value);
            return this.output((this.characteristic.Active === 1));
        }
    }
    async getActive() {
        return this.characteristic.Active;
    }
    async toggle() {
        if (typeof this.characteristic.On !== 'undefined') {
            await this.setOn(!this.characteristic.On);
            this.service.setCharacteristic(this.platform.Characteristic.On, this.characteristic.On);
            return this.characteristic.On;
        }
        else {
            await this.setActive((this.characteristic.Active === 1) ? 0 : 1);
            this.service.setCharacteristic(this.platform.Characteristic.Active, this.characteristic.Active);
            return this.characteristic.Active;
        }
    }
}
class DefaultOutputAccessory extends OutputAccessory {
    constructor(platform, accessory, config, type, characteristic) {
        super(platform, accessory, config, type, characteristic);
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.type = type;
        this.characteristic = characteristic;
    }
}
exports.DefaultOutputAccessory = DefaultOutputAccessory;
class ValveAccessory extends OutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Valve', {
            Active: 0,
            SetDuration: 300,
            RemainingDuration: 0,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.service.setCharacteristic(this.platform.Characteristic.InUse, this.platform.Characteristic.InUse.NOT_IN_USE);
        if (typeof this.config.subtype !== 'undefined') {
            this.service.setCharacteristic(this.platform.Characteristic.ValveType, this.config.subtype);
        }
        if (typeof this.config.time !== 'undefined' && this.config.time > 0) {
            this.characteristic.SetDuration = this.config.time;
            this.service.setCharacteristic(this.platform.Characteristic.SetDuration, this.characteristic.SetDuration);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onChange(value) {
        this.service.setCharacteristic(this.platform.Characteristic.InUse, this.characteristic.Active);
        this.startTimeout();
    }
    startTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        if (this.characteristic.Active === 1 && this.characteristic.SetDuration > 0) {
            this.startTime = Date.now();
            this.service.setCharacteristic(this.platform.Characteristic.RemainingDuration, this.characteristic.SetDuration);
            this.timeout = setTimeout(() => {
                this.setActive(0).then(() => {
                    this.service.setCharacteristic(this.platform.Characteristic.Active, 0);
                });
            }, this.characteristic.SetDuration * 1000);
        }
        else {
            this.service.setCharacteristic(this.platform.Characteristic.RemainingDuration, 0);
        }
    }
    async setSetDuration(value) {
        this.characteristic.SetDuration = value;
        this.startTimeout();
    }
    getRemainingDuration() {
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
exports.ValveAccessory = ValveAccessory;
class ConfigAlarmTrigger {
    constructor() {
        this.home = false;
        this.away = false;
        this.night = false;
    }
}
class SecuritySystemAccessory extends OutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'SecuritySystem', {
            SecuritySystemTargetState: 3,
            SecuritySystemCurrentState: 3
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.time = 10;
        this.accessory.category = 11 /* ALARM_SYSTEM */;
        if (typeof this.config.time !== 'undefined') {
            this.time = this.config.time;
        }
    }
    stateName(state) {
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
    async setSecuritySystemTargetState(value) {
        this.characteristic.SecuritySystemTargetState = value;
        if (this.characteristic.SecuritySystemTargetState != this.characteristic.SecuritySystemCurrentState) {
            this.platform.log.info('Estado Alterado...', this.stateName(this.characteristic.SecuritySystemTargetState));
            this.startTimeoutState();
        }
    }
    changeState() {
        this.characteristic.SecuritySystemCurrentState = this.characteristic.SecuritySystemTargetState;
        this.platform.log.warn('Estado Alterado!', this.stateName(this.characteristic.SecuritySystemCurrentState));
        this.service.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, this.characteristic.SecuritySystemCurrentState);
    }
    startTimeoutState() {
        if (this.timeoutState) {
            clearTimeout(this.timeoutState);
        }
        if (this.timeoutTrigger) {
            clearTimeout(this.timeoutTrigger);
        }
        if (this.characteristic.SecuritySystemTargetState == this.platform.Characteristic.SecuritySystemTargetState.DISARM) {
            this.changeState();
        }
        else {
            this.timeoutState = setTimeout(() => {
                this.changeState();
            }, this.time * 1000);
        }
    }
    trigger(config, name) {
        let detected = false;
        if (config.home && this.characteristic.SecuritySystemCurrentState == this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM) {
            detected = true;
        }
        if (config.away && this.characteristic.SecuritySystemCurrentState == this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM) {
            detected = true;
        }
        if (config.night && this.characteristic.SecuritySystemCurrentState == this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM) {
            detected = true;
        }
        if (detected) {
            this.platform.log.warn('Movimento Detectado!', name);
            this.startTimeoutTrigger();
        }
    }
    startTimeoutTrigger() {
        this.timeoutTrigger = setTimeout(() => {
            this.service.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
            this.platform.log.error('Alarme Disparado!');
        }, this.time * 1000);
    }
    async getSecuritySystemTargetState() {
        return this.characteristic.SecuritySystemTargetState;
    }
    async toggle() {
        this.platform.log.warn('Toggle Security System');
        return this.characteristic.SecuritySystemTargetState;
    }
}
exports.SecuritySystemAccessory = SecuritySystemAccessory;
class LightRgbAccessory extends Accessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Lightbulb', {
            On: false,
            Hue: 0,
            Saturation: 75,
            Brightness: 100,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.characteristic2 = {
            Hue: 0,
            Saturation: 75,
            Brightness: 100,
        };
    }
    async init() {
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
        }
        else {
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
        if (typeof this.tween !== 'undefined') {
            this.tween.stop();
        }
        this.characteristic2.Hue = this.characteristic2.Hue % 360;
        if (Math.abs(h - this.characteristic2.Hue) > 180) {
            if (h > this.characteristic2.Hue) {
                this.characteristic2.Hue += 360;
            }
            else {
                h += 360;
            }
        }
        this.tween = new tween_js_1.default.Tween(this.characteristic2)
            .easing(tween_js_1.default.Easing.Quadratic.InOut)
            .onUpdate(() => {
            this.output();
        })
            .to({ Hue: h, Saturation: s, Brightness: b }, 500)
            .start();
    }
    async setOn(value) {
        if (value !== this.characteristic.On) {
            this.characteristic.On = value;
            this.platform.log.debug('Set Characteristic On ->', value);
            if (value) {
                this.characteristic2.Brightness = 0;
            }
            this.startTween(this.characteristic.Hue, this.characteristic.Saturation, (this.characteristic.On) ? this.characteristic.Brightness : 0);
        }
    }
    async getOn() {
        return this.characteristic.On;
    }
    async setBrightness(value) {
        if (value !== this.characteristic.Brightness) {
            this.characteristic.Brightness = value;
            this.platform.log.debug('Set Characteristic Brightness ->', value);
            this.startTween(this.characteristic.Hue, this.characteristic.Saturation, (this.characteristic.On) ? this.characteristic.Brightness : 0);
        }
    }
    async getBrightness() {
        return this.characteristic.Brightness;
    }
    async setHue(value) {
        if (value !== this.characteristic.Hue) {
            this.characteristic.Hue = value;
            this.platform.log.debug('Set Characteristic Hue ->', value);
            this.startTween(this.characteristic.Hue, this.characteristic.Saturation, (this.characteristic.On) ? this.characteristic.Brightness : 0);
        }
    }
    async getHue() {
        return this.characteristic.Hue;
    }
    async setSaturation(value) {
        if (value !== this.characteristic.Saturation) {
            this.characteristic.Saturation = value;
            this.platform.log.debug('Set Characteristic Saturation ->', value);
            this.startTween(this.characteristic.Hue, this.characteristic.Saturation, (this.characteristic.On) ? this.characteristic.Brightness : 0);
        }
    }
    async getSaturation() {
        return this.characteristic.Saturation;
    }
    output() {
        if (typeof this.config.gpioR !== 'undefined') {
            if (this.characteristic2.Brightness > 0) {
                const rgb = this.rgbFromHSV(this.characteristic2.Hue % 360, this.characteristic2.Saturation / 100, this.characteristic2.Brightness / 100);
                this.gpioR.analogWrite(rgb[0]);
                this.gpioG.analogWrite(rgb[1]);
                this.gpioB.analogWrite(rgb[2]);
            }
            else {
                this.gpioR.write(0);
                this.gpioG.write(0);
                this.gpioB.write(0);
            }
        }
    }
    rgbFromHSV(h, s, v) {
        const i = h / 60;
        const c = v * s;
        const x = c * (1 - Math.abs(i % 2 - 1));
        const m = v - c;
        let r, g, b;
        if (!i) {
            r = 0;
            g = 0;
            b = 0;
        }
        if (i >= 0 && i < 1) {
            r = c;
            g = x;
            b = 0;
        }
        if (i >= 1 && i < 2) {
            r = x;
            g = c;
            b = 0;
        }
        if (i >= 2 && i < 3) {
            r = 0;
            g = c;
            b = x;
        }
        if (i >= 3 && i < 4) {
            r = 0;
            g = x;
            b = c;
        }
        if (i >= 4 && i < 5) {
            r = x;
            g = 0;
            b = c;
        }
        if (i >= 5 && i < 6) {
            r = c;
            g = 0;
            b = x;
        }
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        return [r, g, b];
    }
}
exports.LightRgbAccessory = LightRgbAccessory;
/* Acessórios de entrada (GPIO) */
class InputAccessory extends Accessory {
    constructor(platform, accessory, config, type, characteristic) {
        super(platform, accessory, config, type, characteristic);
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.type = type;
        this.characteristic = characteristic;
        this.glitchTime = 10;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
    async onChange(level, tick) { }
    async init() {
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
                this.onChange(level, tick);
            });
        }
        else {
            this.platform.log.error('Error', this.type, this.config);
        }
        this.initialized = true;
    }
}
class ButtonAccessory extends InputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'StatelessProgrammableSwitch', {
            ProgrammableSwitchEvent: null,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.doublePressTime = 500;
        this.longPressTime = 800;
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
            }
            else {
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
            }
            else {
                if (this.singlePressTimeout) {
                    clearInterval(this.singlePressTimeout);
                    this.singlePressTimeout = null;
                    this.platform.log.debug('Duplo');
                    this.toggle('double');
                    this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
                }
                else {
                    this.singlePressTimeout = setTimeout(() => {
                        this.singlePressTimeout = null;
                        this.platform.log.debug('Simples');
                        this.toggle('single');
                        this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
                    }, this.doublePressTime);
                }
            }
        }
        else {
            this.pressedTick = tick;
        }
    }
}
exports.ButtonAccessory = ButtonAccessory;
class ContactSensorAccessory extends InputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'ContactSensor', {
            ContactSensorState: 0,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
    async getContactSensorState() {
        return this.characteristic.ContactSensorState;
    }
    async onChange(level, tick) {
        this.platform.log.debug(`ContactSensor changed to ${level} at ${tick} usec`);
        this.characteristic.ContactSensorState = level;
        this.service.setCharacteristic(this.platform.Characteristic.ContactSensorState, level);
    }
}
exports.ContactSensorAccessory = ContactSensorAccessory;
class OccupancySensorAccessory extends InputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'OccupancySensor', {
            OccupancyDetected: 0,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
    async getOccupancyDetected() {
        return this.characteristic.OccupancyDetected;
    }
    async onChange(level, tick) {
        this.platform.log.debug(`OccupancySensor changed to ${level} at ${tick} usec`);
        this.characteristic.OccupancyDetected = level;
        this.service.setCharacteristic(this.platform.Characteristic.OccupancyDetected, level);
    }
}
exports.OccupancySensorAccessory = OccupancySensorAccessory;
class MotionSensorAccessory extends InputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'MotionSensor', {
            MotionDetected: 0,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
    async getMotionDetected() {
        return this.characteristic.MotionDetected;
    }
    async onChange(level, tick) {
        this.platform.log.debug(`MotionSensor changed to ${level} at ${tick} usec`);
        this.characteristic.MotionDetected = level;
        this.service.setCharacteristic(this.platform.Characteristic.MotionDetected, level);
    }
}
exports.MotionSensorAccessory = MotionSensorAccessory;
/* Em desenvolvimento */
class GarageDoorAccessory extends InputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'GarageDoorOpener', {
            CurrentDoorState: 1,
            TargetDoorState: 1,
            ObstructionDetected: false,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.detected = true;
        this.pulse = 500;
        this.accessory.category = 4 /* GARAGE_DOOR_OPENER */;
        this.service.setCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.UNSECURED);
    }
    async getCurrentDoorState() {
        this.platform.log.debug('Get Characteristic CurrentDoorState ->', this.characteristic.CurrentDoorState);
        return this.characteristic.CurrentDoorState;
    }
    async getTargetDoorState() {
        this.platform.log.debug('Get Characteristic TargetDoorState ->', this.characteristic.TargetDoorState);
        return this.characteristic.TargetDoorState;
    }
    async setTargetDoorState(value) {
        this.characteristic.TargetDoorState = value;
        if (!this.detected) {
            this.platform.log.error('Acionando botoeira!!!');
            await this.gpio.write(0);
            await this.wait(this.pulse);
            await this.gpio.write(1);
        }
        this.detected = false;
    }
    async getObstructionDetected() {
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
        this.gpioOpen.notify((level, tick) => {
            this.platform.log.debug(`Garage Open changed to ${level} at ${tick} usec`);
            this.detected = true;
            if (level == 1) {
                this.tick = tick;
                this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.CLOSED;
                this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.CLOSING;
                this.service.setCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.CLOSED);
                this.service.setCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.CLOSING);
                this.platform.log.info('Closing...');
            }
            else {
                const time = (tick - this.tick) / 1000000;
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
        this.gpioClose.notify((level, tick) => {
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
            }
            else {
                const time = (tick - this.tick) / 1000000;
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
        }
        else {
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
exports.GarageDoorAccessory = GarageDoorAccessory;
class FanAccessory extends OutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Fan', {
            On: false,
            RotationDirection: 0,
            RotationSpeed: 35,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
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
        }
        else {
            await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBitA, this.characteristic.RotationSpeed < 35);
            await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBitB, this.characteristic.RotationSpeed < 70);
            await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBitC, this.characteristic.RotationDirection === 0);
        }
        await this.platform.i2cApply(this.config.i2cAddress);
    }
    async setOn(value) {
        if (value !== this.characteristic.On) {
            this.characteristic.On = value;
            this.platform.log.debug('Set Characteristic On ->', value);
            await this.update();
        }
    }
    async setRotationDirection(value) {
        this.characteristic.RotationDirection = value;
        this.platform.log.debug('Set Characteristic RotationDirection ->', value);
        await this.update();
    }
    async getRotationDirection() {
        return this.characteristic.RotationDirection;
    }
    async setRotationSpeed(value) {
        this.characteristic.RotationSpeed = value;
        this.platform.log.debug('Set Characteristic RotationSpeed ->', value);
        await this.update();
    }
    async getRotationSpeed() {
        return this.characteristic.RotationSpeed;
    }
}
exports.FanAccessory = FanAccessory;
class SpeakerAccessory extends Accessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'SmartSpeaker', {
            CurrentMediaState: 3,
            TargetMediaState: 3,
            Mute: false,
            Volume: 30,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.service2 = this.accessory.getService(this.platform.Service.AudioStreamManagement) || this.accessory.addService(this.platform.Service.AudioStreamManagement);
    }
    async getCurrentMediaState() {
        return this.characteristic.CurrentMediaState;
    }
    async getTargetMediaState() {
        return this.characteristic.TargetMediaState;
    }
    async getMute() {
        return this.characteristic.Mute;
    }
    async getVolume() {
        return this.characteristic.Volume;
    }
    async setTargetMediaState(value) {
        this.characteristic.CurrentMediaState = value;
        this.characteristic.TargetMediaState = value;
        setTimeout(() => {
            this.service.setCharacteristic(this.platform.Characteristic.CurrentMediaState, this.characteristic.CurrentMediaState);
        }, 100);
    }
    async setMute(value) {
        this.characteristic.Mute = value;
    }
    async setVolume(value) {
        this.characteristic.Volume = value;
    }
}
exports.SpeakerAccessory = SpeakerAccessory;
//# sourceMappingURL=accessory.js.map