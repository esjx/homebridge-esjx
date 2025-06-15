import Timeout = NodeJS.Timeout;
import {OutputAccessory} from "./output";
import {EsjRPi} from "../platform";
import {CharacteristicValue, PlatformAccessory} from "homebridge";
import {Device} from "../config";

export class ValveAccessory extends OutputAccessory {

    private timeout?: Timeout;
    private startTime?: number;

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
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

        } else {

            this.service.setCharacteristic(this.platform.Characteristic.RemainingDuration, 0);

        }

    }

    // noinspection JSUnusedGlobalSymbols
    async setSetDuration(value: CharacteristicValue) {

        this.characteristic.SetDuration = value as number;

        this.startTimeout();

    }

    // noinspection JSUnusedGlobalSymbols
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
