import {OutputAccessory} from "./output";
import {EsjRPi} from "../platform";
import {CharacteristicValue, PlatformAccessory} from "homebridge";
import {Device} from "../config";
import {EsjInputGPIO, EsjPiGPIOState} from "../pigpio";

export class LockMechanismAccessory extends OutputAccessory {

    protected gpioOpen?: EsjInputGPIO;

    protected detected = true;

    protected pulse = 500;
    protected times = 3;

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
    ) {

        super(platform, accessory, config, 'LockMechanism', {
            LockCurrentState: 1,
            LockTargetState: 1
        });

        this.pulse = config.time ?? this.pulse;

    }

    // noinspection JSUnusedGlobalSymbols
    async getLockCurrentState(): Promise<CharacteristicValue> {

        this.platform.log.debug('Get Characteristic LockCurrentState ->', this.characteristic.LockCurrentState);

        return this.characteristic.LockCurrentState;

    }

    // noinspection JSUnusedGlobalSymbols
    async getLockTargetState(): Promise<CharacteristicValue> {

        this.platform.log.debug('Get Characteristic LockTargetState ->', this.characteristic.LockTargetState);

        return this.characteristic.LockTargetState;

    }

    // noinspection JSUnusedGlobalSymbols
    async setLockTargetState(value: CharacteristicValue) {

        this.characteristic.LockTargetState = value as number;

        if (!this.detected) {

            if (value == this.platform.Characteristic.LockCurrentState.UNSECURED) {

                this.platform.log.warn('Unlocking!!!');

                if (this.gpio) {

                    for (let i = 0; i < this.times; i++) {

                        await this.gpio.write(EsjPiGPIOState.ON);
                        await this.wait(this.pulse);
                        await this.gpio.write(EsjPiGPIOState.OFF);
                        await this.wait(this.pulse);

                    }

                }

                this.characteristic.LockCurrentState = this.platform.Characteristic.LockCurrentState.UNSECURED;
                this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.UNSECURED);

            } else {

                this.platform.log.warn('Locking!!!');

                await this.wait(this.pulse);

                this.characteristic.LockCurrentState = this.platform.Characteristic.LockCurrentState.SECURED;
                this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.SECURED);

            }

        }

        this.detected = false;

    }

    // noinspection JSUnusedGlobalSymbols
    async refresh() {

        const valueOpen = await this.gpioOpen?.read();

        if (valueOpen == 1) {

            this.characteristic.LockTargetState = this.platform.Characteristic.LockTargetState.UNSECURED;
            this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.platform.Characteristic.LockTargetState.UNSECURED);

            this.characteristic.LockCurrentState = this.platform.Characteristic.LockCurrentState.UNSECURED;
            this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.UNSECURED);

        }

    }

    virtualControl(value: any) {

        if (value) {

            this.characteristic.LockTargetState = this.platform.Characteristic.LockTargetState.UNSECURED;
            this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.platform.Characteristic.LockTargetState.UNSECURED);

            this.characteristic.LockCurrentState = this.platform.Characteristic.LockCurrentState.UNSECURED;
            this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.UNSECURED);

        }

        else {

            this.characteristic.LockTargetState = this.platform.Characteristic.LockTargetState.SECURED;
            this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.platform.Characteristic.LockTargetState.SECURED);

            this.characteristic.LockCurrentState = this.platform.Characteristic.LockCurrentState.SECURED;
            this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.SECURED);

        }

    }

}
