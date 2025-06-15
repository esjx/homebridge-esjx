import {EsjRPi} from "../platform";
import {PlatformAccessory} from "homebridge";
import {OutputAccessory} from "./output";
import {Device} from "../config";

export class DefaultOutputAccessory extends OutputAccessory {

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
        protected type: any,
        protected characteristic: any,
    ) {

        super(platform, accessory, config, type, characteristic);

    }

}
