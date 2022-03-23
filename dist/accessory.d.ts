import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { EsjRPi } from './platform';
declare abstract class Accessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    protected type: any;
    protected characteristic: any;
    protected service: Service;
    initialized: boolean;
    protected constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any, type: any, characteristic: any);
    triggerAlarm(): void;
    startCharacteristic(key: string, value: CharacteristicValue): void;
    wait(ms: any): Promise<unknown>;
    init(): Promise<void>;
}
declare abstract class OutputAccessory extends Accessory {
    protected gpio: any;
    init(): Promise<void>;
    onChange(value: boolean): Promise<void>;
    output(value: boolean): Promise<void>;
    setOn(value: CharacteristicValue): Promise<void>;
    getOn(): Promise<CharacteristicValue>;
    setActive(value: CharacteristicValue): Promise<void>;
    getActive(): Promise<CharacteristicValue>;
    toggle(): Promise<CharacteristicValue>;
}
export declare class DefaultOutputAccessory extends OutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    protected type: any;
    protected characteristic: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any, type: any, characteristic: any);
}
export declare class ValveAccessory extends OutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private timeout;
    private startTime?;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    onChange(value: boolean): Promise<void>;
    startTimeout(): void;
    setSetDuration(value: CharacteristicValue): Promise<void>;
    getRemainingDuration(): CharacteristicValue;
}
declare class ConfigAlarmTrigger {
    home: boolean;
    away: boolean;
    night: boolean;
}
export declare class SecuritySystemAccessory extends OutputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private timeoutState;
    private timeoutTrigger;
    private time;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    stateName(state: any): string;
    setSecuritySystemTargetState(value: CharacteristicValue): Promise<void>;
    changeState(): void;
    startTimeoutState(): void;
    trigger(config: ConfigAlarmTrigger, name: string): void;
    startTimeoutTrigger(): void;
    getSecuritySystemTargetState(): Promise<CharacteristicValue>;
    toggle(): Promise<CharacteristicValue>;
}
export declare class LightRgbAccessory extends Accessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    protected gpioR: any;
    protected gpioG: any;
    protected gpioB: any;
    protected tween: any;
    protected characteristic2: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    init(): Promise<void>;
    startTween(h: any, s: any, b: any): void;
    setOn(value: CharacteristicValue): Promise<void>;
    getOn(): Promise<CharacteristicValue>;
    setBrightness(value: CharacteristicValue): Promise<void>;
    getBrightness(): Promise<CharacteristicValue>;
    setHue(value: CharacteristicValue): Promise<void>;
    getHue(): Promise<CharacteristicValue>;
    setSaturation(value: CharacteristicValue): Promise<void>;
    getSaturation(): Promise<CharacteristicValue>;
    output(): void;
    rgbFromHSV(h: any, s: any, v: any): any[];
}
declare abstract class InputAccessory extends Accessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    protected type: any;
    protected characteristic: any;
    protected gpio: any;
    protected glitchTime: number;
    protected constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any, type: any, characteristic: any);
    onChange(level: any, tick: any): Promise<void>;
    init(): Promise<void>;
}
export declare class ButtonAccessory extends InputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private pressedTick;
    private singlePressTimeout;
    private doublePressTime;
    private longPressTime;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getProgrammableSwitchEvent(): null;
    toggle(type: any): void;
    onChange(level: any, tick: any): Promise<void>;
}
export declare class ContactSensorAccessory extends InputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getContactSensorState(): Promise<CharacteristicValue>;
    onChange(level: any, tick: any): Promise<void>;
}
export declare class OccupancySensorAccessory extends InputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getOccupancyDetected(): Promise<CharacteristicValue>;
    onChange(level: any, tick: any): Promise<void>;
}
export declare class MotionSensorAccessory extends InputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getMotionDetected(): Promise<CharacteristicValue>;
    onChange(level: any, tick: any): Promise<void>;
}
export declare class GarageDoorAccessory extends InputAccessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    private tick;
    protected gpioOpen: any;
    protected gpioClose: any;
    protected detected: boolean;
    private pulse;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getCurrentDoorState(): Promise<CharacteristicValue>;
    getTargetDoorState(): Promise<CharacteristicValue>;
    setTargetDoorState(value: CharacteristicValue): Promise<void>;
    getObstructionDetected(): Promise<CharacteristicValue>;
    init(): Promise<void>;
}
export declare class FanAccessory extends OutputAccessory {
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
export declare class SpeakerAccessory extends Accessory {
    protected readonly platform: EsjRPi;
    protected readonly accessory: PlatformAccessory;
    protected config: any;
    protected service2: Service;
    constructor(platform: EsjRPi, accessory: PlatformAccessory, config: any);
    getCurrentMediaState(): Promise<CharacteristicValue>;
    getTargetMediaState(): Promise<CharacteristicValue>;
    getMute(): Promise<CharacteristicValue>;
    getVolume(): Promise<CharacteristicValue>;
    setTargetMediaState(value: CharacteristicValue): Promise<void>;
    setMute(value: CharacteristicValue): Promise<void>;
    setVolume(value: CharacteristicValue): Promise<void>;
}
export {};
//# sourceMappingURL=accessory.d.ts.map