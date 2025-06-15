import {PlatformConfig} from "homebridge";

export class Alarm {
    home?: boolean = false;
    away?: boolean = false;
    night?: boolean = false;
}

export type Device = {
    id?: string;
    displayName: string;
    type: string;
    subtype?: number;
    gpio: number;
    gpioA?: number;
    gpioB?: number;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    alarm?: Alarm;
    time?: number;
    double?: boolean;
};

export type Options = {
    name: string;
    host: string;
    devices: Device[];
    platform: string;
};

export type CustomPlatformConfig = PlatformConfig & Options;