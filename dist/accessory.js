"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecuritySystemAccessory = exports.I2cValveAccessory = exports.I2cFaucetAccessory = exports.I2cFanAccessory = exports.I2cOutletAccessory = exports.I2cSwitchAccessory = exports.I2cLightAccessory = exports.GpioMotionSensorAccessory = exports.GpioOccupancySensorAccessory = exports.GpioContactSensorAccessory = exports.GpioButtonAccessory = exports.GpioFanAccessory = exports.GpioOutletAccessory = exports.GpioSwitchAccessory = exports.GpioLightAccessory = exports.Accessory = void 0;
class Accessory {
    constructor(platform, accessory, config, type, characteristic) {
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.type = type;
        this.characteristic = characteristic;
        this.initialized = false;
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
            .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');
        this.service = this.accessory.getService(this.platform.Service[this.type]) || this.accessory.addService(this.platform.Service[this.type]);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);
        Object.entries(this.characteristic).forEach(([key, value]) => {
            this.service.setCharacteristic(this.platform.Characteristic[key], value);
            if (typeof this['set' + key] === 'function') {
                this.service.getCharacteristic(this.platform.Characteristic[key])
                    .onSet(this['set' + key].bind(this));
            }
            if (typeof this['get' + key] === 'function') {
                this.service.getCharacteristic(this.platform.Characteristic[key])
                    .onGet(this['get' + key].bind(this));
            }
        });
    }
    async init() {
        this.initialized = true;
    }
}
exports.Accessory = Accessory;
class GpioOutputAccessory extends Accessory {
    async init() {
        this.platform.log.debug(this.type + ' connected on GPIO:', this.config.gpio);
        this.gpio = this.platform.pigpio.gpio(this.config.gpio);
        await this.gpio.modeSet('output');
        await this.gpio.pullUpDown(this.config.pullUpDown);
        Object.entries(this.characteristic).forEach(([key, value]) => {
            if (value !== null && typeof this['set' + key] === 'function') {
                this['set' + key](value);
            }
        });
        this.initialized = true;
    }
    async setOn(value) {
        if (value !== this.characteristic.On) {
            this.characteristic.On = value;
            this.platform.log.info('Set Characteristic On ->', value);
            this.gpio.write((this.characteristic.On) ? 0 : 1);
        }
    }
    async getOn() {
        const isOn = this.characteristic.On;
        this.platform.log.info('Get Characteristic On ->', isOn);
        return isOn;
    }
    async setActive(value) {
        if (value !== this.characteristic.Active) {
            this.characteristic.Active = value;
            this.platform.log.info('Set Characteristic Active ->', value);
            this.gpio.write((this.characteristic.Active === 1) ? 0 : 1);
        }
    }
    async getActive() {
        const isOn = this.characteristic.Active;
        this.platform.log.info('Get Characteristic On ->', isOn);
        return isOn;
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
class GpioLightAccessory extends GpioOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Lightbulb', {
            On: false,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
}
exports.GpioLightAccessory = GpioLightAccessory;
class GpioSwitchAccessory extends GpioOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Switch', {
            On: false,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
}
exports.GpioSwitchAccessory = GpioSwitchAccessory;
class GpioOutletAccessory extends GpioOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Outlet', {
            On: false,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
}
exports.GpioOutletAccessory = GpioOutletAccessory;
class GpioFanAccessory extends GpioOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Fan', {
            On: false,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
}
exports.GpioFanAccessory = GpioFanAccessory;
class GpioInputAccessory extends Accessory {
    constructor(platform, accessory, config, type, characteristic) {
        super(platform, accessory, config, type, characteristic);
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.type = type;
        this.characteristic = characteristic;
        this.released = 1;
    }
}
class GpioButtonAccessory extends GpioInputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'StatelessProgrammableSwitch', {
            ProgrammableSwitchEvent: null,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.doublePressTime = 500;
        this.longPressTime = 800;
        this.glitchTime = 10;
    }
    getProgrammableSwitchEvent() {
        this.platform.log.debug('Triggered GET ProgrammableSwitchEvent');
        const currentValue = this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
        return currentValue;
    }
    toggle(type) {
        if (typeof this.config[type] !== 'undefined') {
            const device = this.platform.generateUuid(this.config[type]);
            if (typeof this.platform.links[device] !== 'undefined') {
                this.platform.links[device].toggle();
                this.platform.log.info('Toggle State', this.config[type]);
            }
            else {
                this.platform.log.error('Toggle Device Not Found', this.config[type]);
            }
        }
    }
    async init() {
        this.platform.log.info(this.type + ' connected on GPIO:', this.config.gpio);
        this.gpio = this.platform.pigpio.gpio(this.config.gpio);
        await this.gpio.modeSet('input');
        await this.gpio.pullUpDown(this.config.pullUpDown);
        await this.gpio.glitchSet(this.glitchTime * 1000);
        this.gpio.notify((level, tick) => {
            //this.platform.log.debug(`Button changed to ${level} at ${tick} usec`);
            if (level === this.released) {
                const timePressed = (tick - this.pressedTick) / 1000;
                this.platform.log.debug('timePressed: ' + timePressed);
                if (timePressed >= this.longPressTime) {
                    clearInterval(this.singlePressTimeout);
                    this.singlePressTimeout = null;
                    this.platform.log.info('Longo');
                    this.toggle('long');
                    this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
                }
                else {
                    if (this.singlePressTimeout) {
                        clearInterval(this.singlePressTimeout);
                        this.singlePressTimeout = null;
                        this.platform.log.info('Duplo');
                        this.toggle('double');
                        this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
                    }
                    else {
                        this.singlePressTimeout = setTimeout(() => {
                            this.singlePressTimeout = null;
                            this.platform.log.info('Simples');
                            this.toggle('single');
                            this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
                        }, this.doublePressTime);
                    }
                }
            }
            else {
                this.pressedTick = tick;
            }
        });
        this.initialized = true;
    }
}
exports.GpioButtonAccessory = GpioButtonAccessory;
class GpioContactSensorAccessory extends GpioInputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'ContactSensor', {
            ContactSensorState: 0,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.glitchTime = 10;
    }
    async getContactSensorState() {
        const isOn = this.characteristic.ContactSensorState;
        this.platform.log.info('Get Characteristic ContactSensorState ->', isOn);
        return isOn;
    }
    async init() {
        this.platform.log.info(this.type + ' connected on GPIO:', this.config.gpio);
        this.gpio = this.platform.pigpio.gpio(this.config.gpio);
        await this.gpio.modeSet('input');
        await this.gpio.pullUpDown(this.config.pullUpDown);
        await this.gpio.glitchSet(this.glitchTime * 1000);
        this.gpio.notify((level, tick) => {
            this.platform.log.info(`ContactSensor changed to ${level} at ${tick} usec`);
            this.characteristic.ContactSensorState = level;
            this.service.setCharacteristic(this.platform.Characteristic.ContactSensorState, level);
        });
        this.initialized = true;
    }
}
exports.GpioContactSensorAccessory = GpioContactSensorAccessory;
class GpioOccupancySensorAccessory extends GpioInputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'OccupancySensor', {
            OccupancyDetected: 0,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.glitchTime = 10;
    }
    async getOccupancyDetected() {
        const isOn = this.characteristic.OccupancyDetected;
        this.platform.log.info('Get Characteristic OccupancyDetected ->', isOn);
        return isOn;
    }
    async init() {
        this.platform.log.info(this.type + ' connected on GPIO:', this.config.gpio);
        this.gpio = this.platform.pigpio.gpio(this.config.gpio);
        await this.gpio.modeSet('input');
        await this.gpio.pullUpDown(this.config.pullUpDown);
        await this.gpio.glitchSet(this.glitchTime * 1000);
        this.gpio.notify((level, tick) => {
            this.platform.log.info(`OccupancySensor changed to ${level} at ${tick} usec`);
            this.characteristic.OccupancyDetected = level;
            this.service.setCharacteristic(this.platform.Characteristic.OccupancyDetected, level);
        });
        this.initialized = true;
    }
}
exports.GpioOccupancySensorAccessory = GpioOccupancySensorAccessory;
class GpioMotionSensorAccessory extends GpioInputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'MotionSensor', {
            MotionDetected: 0,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.glitchTime = 10;
    }
    async getMotionDetected() {
        const isOn = this.characteristic.MotionDetected;
        this.platform.log.info('Get Characteristic MotionDetected ->', isOn);
        return isOn;
    }
    async init() {
        this.platform.log.info(this.type + ' connected on GPIO:', this.config.gpio);
        this.gpio = this.platform.pigpio.gpio(this.config.gpio);
        await this.gpio.modeSet('input');
        await this.gpio.pullUpDown(this.config.pullUpDown);
        await this.gpio.glitchSet(this.glitchTime * 1000);
        this.gpio.notify((level, tick) => {
            this.platform.log.info(`MotionSensor changed to ${level} at ${tick} usec`);
            this.characteristic.MotionDetected = level;
            this.service.setCharacteristic(this.platform.Characteristic.MotionDetected, level);
        });
        this.initialized = true;
    }
}
exports.GpioMotionSensorAccessory = GpioMotionSensorAccessory;
class I2cOutputAccessory extends GpioOutputAccessory {
    async init() {
        Object.entries(this.characteristic).forEach(([key, value]) => {
            if (value !== null && typeof this['set' + key] === 'function') {
                this['set' + key](value);
            }
        });
        this.initialized = true;
    }
    async setOn(value) {
        if (value !== this.characteristic.On) {
            this.characteristic.On = value;
            this.platform.log.info('Set Characteristic On ->', value);
            await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBit, !this.characteristic.On);
            await this.platform.i2cApply(this.config.i2cAddress);
        }
    }
    async getOn() {
        const isOn = this.characteristic.On;
        this.platform.log.info('Get Characteristic On ->', isOn);
        return isOn;
    }
    async setActive(value) {
        if (value !== this.characteristic.Active) {
            this.characteristic.Active = value;
            this.platform.log.info('Set Characteristic Active ->', value);
            await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBit, (this.characteristic.Active === 0));
            await this.platform.i2cApply(this.config.i2cAddress);
        }
    }
    async getActive() {
        const isOn = this.characteristic.Active;
        this.platform.log.info('Get Characteristic Active ->', isOn);
        return isOn;
    }
}
class I2cLightAccessory extends I2cOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Lightbulb', {
            On: false,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
}
exports.I2cLightAccessory = I2cLightAccessory;
class I2cSwitchAccessory extends I2cOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Switch', {
            On: false,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
}
exports.I2cSwitchAccessory = I2cSwitchAccessory;
class I2cOutletAccessory extends I2cOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Outlet', {
            On: false,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
}
exports.I2cOutletAccessory = I2cOutletAccessory;
class I2cFanAccessory extends I2cOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Fan', {
            On: false,
            RotationDirection: 0,
            RotationSpeed: 50,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
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
            this.platform.log.info('Set Characteristic On ->', value);
            await this.update();
        }
    }
    async setRotationDirection(value) {
        this.characteristic.RotationDirection = value;
        this.platform.log.info('Set Characteristic RotationDirection ->', value);
        await this.update();
    }
    async getRotationDirection() {
        const v = this.characteristic.RotationDirection;
        this.platform.log.info('Get Characteristic RotationDirection ->', v);
        return v;
    }
    async setRotationSpeed(value) {
        this.characteristic.RotationSpeed = value;
        this.platform.log.info('Set Characteristic RotationSpeed ->', value);
        await this.update();
    }
    async getRotationSpeed() {
        const v = this.characteristic.RotationSpeed;
        this.platform.log.info('Get Characteristic RotationSpeed ->', v);
        return v;
    }
}
exports.I2cFanAccessory = I2cFanAccessory;
class I2cFaucetAccessory extends I2cOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Faucet', {
            Active: 0,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
    }
}
exports.I2cFaucetAccessory = I2cFaucetAccessory;
class I2cValveAccessory extends I2cOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'Valve', {
            Active: 0,
            SetDuration: 300,
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.service.setCharacteristic(this.platform.Characteristic.InUse, this.platform.Characteristic.InUse.NOT_IN_USE);
        this.service.setCharacteristic(this.platform.Characteristic.ValveType, this.config.subtype);
        this.accessory.category = 30 /* SHOWER_HEAD */;
        if (typeof this.config.time !== 'undefined' && this.config.time > 0) {
            this.characteristic.SetDuration = this.config.time;
            this.service.setCharacteristic(this.platform.Characteristic.SetDuration, this.characteristic.SetDuration);
        }
    }
    async setActive(value) {
        this.characteristic.Active = value;
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.service.setCharacteristic(this.platform.Characteristic.RemainingDuration, this.characteristic.SetDuration);
        this.platform.log.info('Set Characteristic Active ->', value);
        await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBit, (this.characteristic.Active === 0));
        await this.platform.i2cApply(this.config.i2cAddress);
        this.service.setCharacteristic(this.platform.Characteristic.InUse, this.characteristic.Active);
        if (this.characteristic.Active === 1) {
            if (this.characteristic.SetDuration > 0) {
                this.service.setCharacteristic(this.platform.Characteristic.RemainingDuration, this.characteristic.SetDuration);
                this.timeout = setTimeout(() => {
                    this.setActive(0);
                    this.service.setCharacteristic(this.platform.Characteristic.RemainingDuration, 0);
                    this.service.setCharacteristic(this.platform.Characteristic.Active, 0);
                }, this.characteristic.SetDuration * 1000 - 500);
            }
        }
    }
    async setSetDuration(value) {
        this.characteristic.SetDuration = value;
    }
}
exports.I2cValveAccessory = I2cValveAccessory;
class SecuritySystemAccessory extends GpioOutputAccessory {
    constructor(platform, accessory, config) {
        super(platform, accessory, config, 'SecuritySystem', {
            SecuritySystemTargetState: 3
        });
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.service.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, this.characteristic.SecuritySystemTargetState);
    }
    async setSecuritySystemTargetState(value) {
        this.characteristic.SecuritySystemTargetState = value;
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.service.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, this.characteristic.SecuritySystemTargetState);
        if (value == 0) {
            this.timeout = setTimeout(() => {
                this.service.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, 4);
            }, 60000);
        }
    }
    async getSecuritySystemTargetState() {
        const isOn = this.characteristic.SecuritySystemTargetState;
        this.platform.log.info('Get Characteristic SecuritySystemTargetState ->', isOn);
        return isOn;
    }
    async toggle() {
        this.platform.log.warn('Toggle Security System');
        return this.characteristic.SecuritySystemTargetState;
    }
}
exports.SecuritySystemAccessory = SecuritySystemAccessory;
//# sourceMappingURL=accessory.js.map