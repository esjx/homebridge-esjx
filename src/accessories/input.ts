import {Accessory} from "./accessory";
import {EsjRPi} from "../platform";
import {PlatformAccessory} from "homebridge";
import {Device} from "../config";
import {EsjInputGPIO, EsjPiGPIOEvent, EsjPiGPIOState} from "../pigpio";

export abstract class InputAccessory extends Accessory {

    protected gpio?: EsjInputGPIO;

    protected constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
        protected type: any,
        protected characteristic: any,
    ) {

        super(platform, accessory, config, type, characteristic);

    }

    async onChange(level: number, tick: number) {
        this.platform.log.debug('onChange -> ', level, tick);
    }

    async init() {

        if (typeof this.config.gpio !== 'undefined') {

            this.platform.log.info(this.type + ' connected on GPIO:', this.config.gpio);

            this.gpio = new EsjInputGPIO(this.platform.pigpio, this.config.gpio);

            this.gpio.on(EsjPiGPIOEvent.CHANGE, (level: number, tick: number) => {

                if (level === EsjPiGPIOState.OFF) {
                    this.triggerAlarm();
                }

                this.onChange(level, tick);

            });

        }

        else {

            this.platform.log.error('Error', this.type, this.config);

        }

        this.initialized = true;

    }

}
