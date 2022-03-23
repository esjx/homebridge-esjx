import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { EsjRPi } from './platform';
export declare abstract class Accessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    protected type: any;
    protected characteristic: any;
    protected service: Service;
    initialized: boolean;
    protected constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any, type: any, characteristic: any);
    init(): Promise<void>;
}
declare abstract class GpioOutputAccessory extends Accessory {
    protected gpio: any;
    init(): Promise<void>;
    setOn(value: CharacteristicValue): Promise<void>;
    getOn(): Promise<CharacteristicValue>;
    setActive(value: CharacteristicValue): Promise<void>;
    getActive(): Promise<CharacteristicValue>;
    toggle(): Promise<CharacteristicValue>;
}
export declare class GpioLightAccessory extends GpioOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
}
export declare class GpioSwitchAccessory extends GpioOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
}
export declare class GpioOutletAccessory extends GpioOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
}
export declare class GpioFanAccessory extends GpioOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
}
declare abstract class GpioInputAccessory extends Accessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    protected type: any;
    protected characteristic: any;
    protected gpio: any;
    protected released: number;
    protected constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any, type: any, characteristic: any);
}
export declare class GpioButtonAccessory extends GpioInputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private pressedTick;
    private singlePressTimeout;
    private doublePressTime;
    private longPressTime;
    private glitchTime;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getProgrammableSwitchEvent(): number;
    toggle(type: any): void;
    init(): Promise<void>;
}
export declare class GpioContactSensorAccessory extends GpioInputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private glitchTime;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getContactSensorState(): Promise<CharacteristicValue>;
    init(): Promise<void>;
}
export declare class GpioOccupancySensorAccessory extends GpioInputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private glitchTime;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getOccupancyDetected(): Promise<CharacteristicValue>;
    init(): Promise<void>;
}
export declare class GpioMotionSensorAccessory extends GpioInputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private glitchTime;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getMotionDetected(): Promise<CharacteristicValue>;
    init(): Promise<void>;
}
declare abstract class I2cOutputAccessory extends GpioOutputAccessory {
    init(): Promise<void>;
    setOn(value: CharacteristicValue): Promise<void>;
    getOn(): Promise<CharacteristicValue>;
    setActive(value: CharacteristicValue): Promise<void>;
    getActive(): Promise<CharacteristicValue>;
}
export declare class I2cLightAccessory extends I2cOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
}
export declare class I2cSwitchAccessory extends I2cOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
}
export declare class I2cOutletAccessory extends I2cOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
}
export declare class I2cFanAccessory extends I2cOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    update(): Promise<void>;
    setOn(value: CharacteristicValue): Promise<void>;
    setRotationDirection(value: CharacteristicValue): Promise<void>;
    getRotationDirection(): Promise<CharacteristicValue>;
    setRotationSpeed(value: CharacteristicValue): Promise<void>;
    getRotationSpeed(): Promise<CharacteristicValue>;
}
export declare class I2cFaucetAccessory extends I2cOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
}
export declare class I2cValveAccessory extends I2cOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private timeout;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    setActive(value: CharacteristicValue): Promise<void>;
    setSetDuration(value: CharacteristicValue): Promise<void>;
}
export declare class SecuritySystemAccessory extends GpioOutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private timeout;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    setSecuritySystemTargetState(value: CharacteristicValue): Promise<void>;
    getSecuritySystemTargetState(): Promise<CharacteristicValue>;
    toggle(): Promise<CharacteristicValue>;
}
export {};
//# sourceMappingURL=accessory.d.ts.map