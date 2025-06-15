import {InputAccessory} from "./input";
import {EsjRPi} from "../platform";
import {CharacteristicValue, PlatformAccessory} from "homebridge";
import {Device} from "../config";

export class ContactSensorAccessory extends InputAccessory {

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
    ) {

        super(platform, accessory, config, 'ContactSensor', {
            ContactSensorState: 0,
        });

    }

    async init(): Promise<void> {
        await super.init();
        await this.refresh();
    }

    // noinspection JSUnusedGlobalSymbols
    async getContactSensorState(): Promise<CharacteristicValue> {

        return this.characteristic.ContactSensorState;

    }

    async onChange(level: number, tick: number) {

        this.platform.log.debug(`ContactSensor changed to ${level} at ${tick}`);

        this.characteristic.ContactSensorState = level;

        this.service.updateCharacteristic(this.platform.Characteristic.ContactSensorState, level);

    }

    async refresh() {

        let me = this;

        let value = await this.gpio?.read();

        if (value && value != this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState).value) {
            await this.onChange(value, 0);
        }

        setTimeout(() => {
            me.refresh();
        }, 5000);

    }

}
