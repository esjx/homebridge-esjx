import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { SecuritySystemAccessory } from './accessory';
export declare class EsjRPi implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly config: PlatformConfig;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: PlatformAccessory[];
    readonly removedAccessories: PlatformAccessory[];
    private configAccessories;
    pigpio: any;
    private i2cHandles;
    i2cDevices: {};
    alarm?: SecuritySystemAccessory;
    links: {};
    constructor(log: Logger, config: PlatformConfig, api: API);
    tryConnect(host: any): void;
    connect(host: any): Promise<unknown>;
    initAccessories(): void;
    configureAccessory(accessory: PlatformAccessory): void;
    removeAccessories(): void;
    generateUuid(device: any): string;
    discoverDevices(): void;
    bin2dec(v: any): number;
    dec2bin(v: number, size?: number): string;
    startI2cDevice(address: any): Promise<void>;
    i2cWriteBit(address: any, bit: any, v: any): Promise<void>;
    i2cApply(address: any): Promise<void>;
}
//# sourceMappingURL=platform.d.ts.map