import {CharacteristicValue} from "homebridge";
import {Accessory} from "./accessory";
import {EsjOutputGPIO, EsjPiGPIOState} from "../pigpio";

export abstract class OutputAccessory extends Accessory {

    protected gpio?: EsjOutputGPIO;

    async init() {

        if (typeof this.config.gpio !== 'undefined') {

            this.platform.log.info(this.type + ' connected on GPIO:', this.config.gpio);

            this.gpio = new EsjOutputGPIO(this.platform.pigpio, this.config.gpio);

        }

        /*else if (typeof this.config.i2cAddress !== 'undefined' && typeof this.config.i2cBit !== 'undefined') {

            // Initialize i2c?

        }*/

        else {

            this.platform.log.error('Error', this.type, this.config);

        }

        Object.entries(this.characteristic).forEach(([key, value]) => {
            if (value !== null && typeof this['set' + key] === 'function') {
                this['set' + key](value);
            }
        });

        this.initialized = true;

    }

    async onChange(value: boolean): Promise<void> {
        this.platform.log.debug('onChange ->', value);
    }

    async output(value: boolean): Promise<void> {

        if (typeof this.gpio !== 'undefined') {

            await this.gpio.write((value) ? EsjPiGPIOState.ON : EsjPiGPIOState.OFF);

        }

        /*else if (typeof this.config.i2cAddress !== 'undefined' && typeof this.config.i2cBit !== 'undefined') {

            await this.platform.i2cWriteBit(this.config.i2cAddress, this.config.i2cBit, !value);

            await this.platform.i2cApply(this.config.i2cAddress);

        }*/

        await this.onChange(value);

    }

    async setOn(value: CharacteristicValue) {

        if (value !== this.characteristic.On) {

            this.characteristic.On = value as boolean;

            this.platform.log.debug('Set Characteristic On ->', value);

            return this.output(this.characteristic.On);

        }

    }

    // noinspection JSUnusedGlobalSymbols
    async getOn(): Promise<CharacteristicValue> {

        return this.characteristic.On;

    }

    async setActive(value: CharacteristicValue) {

        if (value !== this.characteristic.Active) {

            this.characteristic.Active = value as number;

            this.platform.log.debug('Set Characteristic Active ->', value);

            return this.output((this.characteristic.Active === 1));

        }

    }

    // noinspection JSUnusedGlobalSymbols
    async getActive(): Promise<CharacteristicValue> {

        return this.characteristic.Active;

    }

    // noinspection JSUnusedGlobalSymbols
    async toggle(): Promise<CharacteristicValue> {

        if (typeof this.characteristic.On !== 'undefined') {

            await this.setOn(!this.characteristic.On);

            this.service.setCharacteristic(this.platform.Characteristic.On, this.characteristic.On);

            return this.characteristic.On;

        } else {

            await this.setActive((this.characteristic.Active === 1) ? EsjPiGPIOState.ON : EsjPiGPIOState.OFF);

            this.service.setCharacteristic(this.platform.Characteristic.Active, this.characteristic.Active);

            return this.characteristic.Active;

        }

    }

}
