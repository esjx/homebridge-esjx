import {InputAccessory} from "./input";
import {EsjRPi} from "../platform";
import {CharacteristicValue, PlatformAccessory} from "homebridge";
import {Device} from "../config";

export class OccupancySensorAccessory extends InputAccessory {

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
    ) {

        super(platform, accessory, config, 'OccupancySensor', {
            OccupancyDetected: 0,
        });

    }

    // noinspection JSUnusedGlobalSymbols
    async getOccupancyDetected(): Promise<CharacteristicValue> {

        return this.characteristic.OccupancyDetected;

    }

    async onChange(level: number, tick: number) {

        this.platform.log.debug(`OccupancySensor changed to ${level} at ${tick}`);

        this.characteristic.OccupancyDetected = level;

        this.service.setCharacteristic(this.platform.Characteristic.OccupancyDetected, level);

    }

}