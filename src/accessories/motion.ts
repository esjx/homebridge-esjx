import {InputAccessory} from "./input";
import {EsjRPi} from "../platform";
import {CharacteristicValue, PlatformAccessory} from "homebridge";
import {Device} from "../config";

export class MotionSensorAccessory extends InputAccessory {

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
    ) {

        super(platform, accessory, config, 'MotionSensor', {
            MotionDetected: 0,
        });

    }

    // noinspection JSUnusedGlobalSymbols
    async getMotionDetected(): Promise<CharacteristicValue> {

        return this.characteristic.MotionDetected;

    }

    async onChange(level: number, tick: number) {

        this.platform.log.debug(`MotionSensor changed to ${level} at ${tick}`);

        this.characteristic.MotionDetected = level;

        this.service.setCharacteristic(this.platform.Characteristic.MotionDetected, level);

    }

}