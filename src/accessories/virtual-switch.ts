import {Accessory} from "./accessory";
import {EsjRPi} from "../platform";
import {CharacteristicValue, PlatformAccessory} from "homebridge";
import {Device} from "../config";

export class VirtualSwitch extends Accessory {

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
        protected control_accessory: Accessory
    ) {

        super(platform, accessory, config, 'Switch', {
            On: false,
        });

    }

    // noinspection JSUnusedGlobalSymbols
    async setOn(value: CharacteristicValue) {

        this.characteristic.On = value as boolean;

        this.control_accessory.virtualControl(value);

    }

    // noinspection JSUnusedGlobalSymbols
    async getOn(): Promise<CharacteristicValue> {

        return this.characteristic.On;

    }

}
