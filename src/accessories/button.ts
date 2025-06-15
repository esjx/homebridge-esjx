import {InputAccessory} from "./input";
import {EsjRPi} from "../platform";
import {PlatformAccessory} from "homebridge";
import {Device} from "../config";
import Timeout = NodeJS.Timeout;

export class ButtonAccessory extends InputAccessory {

    protected pressedTick: number = 0;

    protected singlePressTimeout?: Timeout;
    protected doublePressTime = 400;
    protected longPressTime = 800;

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
    ) {

        super(platform, accessory, config, 'StatelessProgrammableSwitch', {
            ProgrammableSwitchEvent: null,
        });

        if (typeof this.config.double === 'undefined') {
            this.doublePressTime = 50;
        }

    }

    // noinspection JSUnusedGlobalSymbols
    getProgrammableSwitchEvent() {

        return null;

    }

    toggle(type: any) {

        if (typeof this.config[type] !== 'undefined') {

            const device = this.platform.generateUuid(this.config[type]);

            if (typeof this.platform.links[device] !== 'undefined') {

                this.platform.links[device].toggle();
                this.platform.log.debug('Toggle State', this.config[type]);

            } else {

                this.platform.log.error('Toggle Device Not Found', this.config[type]);

            }

        }

    }

    async onChange(level: number, tick: number) {

        if (level === 1) {

            const timePressed = (tick - this.pressedTick) / 1000;

            this.platform.log.debug('timePressed: ' + timePressed);

            if (timePressed >= this.longPressTime) {

                clearTimeout(this.singlePressTimeout);
                //this.singlePressTimeout = null;
                this.platform.log.debug('Long');

                this.toggle('long');

                this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);

            } else {

                if (this.singlePressTimeout) {

                    clearTimeout(this.singlePressTimeout);
                    //this.singlePressTimeout = null;
                    this.platform.log.debug('Double');

                    this.toggle('double');

                    this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);

                } else {

                    this.singlePressTimeout = setTimeout(() => {

                        //this.singlePressTimeout = null;
                        this.platform.log.debug('Single');

                        this.toggle('single');

                        this.service.setCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);

                    }, this.doublePressTime);

                }

            }

        } else {

            this.pressedTick = tick;

        }

    }

}