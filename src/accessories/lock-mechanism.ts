import {OutputAccessory} from "./output";
import {EsjRPi} from "../platform";
import {CharacteristicValue, PlatformAccessory} from "homebridge";
import {Device} from "../config";
import {EsjInputGPIO, EsjPiGPIOEvent, EsjPiGPIOState} from "../pigpio";

export class LockMechanismAccessory extends OutputAccessory {

    protected gpioOpen?: EsjInputGPIO;

    protected unsecured = true;

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

    async init(): Promise<void> {

        await super.init();

        if (typeof this.config.gpioA !== 'undefined') {

            this.platform.log.info(this.type + ' connected on GPIO:', this.config.gpioA);

            this.gpioOpen = new EsjInputGPIO(this.platform.pigpio, this.config.gpioA);

            this.gpioOpen.on(EsjPiGPIOEvent.CHANGE, (level: number) => {

                if (level === EsjPiGPIOState.OFF) {
                    this.triggerAlarm();
                }

                this.update(level);

            });

        }

    }

    update(level: number) {

        // Open
        if (level === EsjPiGPIOState.OFF) {

            this.platform.log.info('Door Open');

            this.setUnsecured();

        }

        // Close
        else if (level === EsjPiGPIOState.ON) {

            this.platform.log.info('Door Close');

            this.unsecured = false;

            this.setSecured();

        }

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

            this.setUnsecured();

        } else {

            this.platform.log.warn('Locking!!!');

            await this.wait(this.pulse);

            if (this.unsecured) {

                this.setUnsecured();

                this.setTargetUnsecured();

            } else {

                this.setSecured();

            }

        }

    }

    // noinspection JSUnusedGlobalSymbols
    async refresh() {

        const valueOpen = await this.gpioOpen?.read();

        if (valueOpen == EsjPiGPIOState.OFF) {

            this.setUnsecured();

            this.setTargetUnsecured();

        }

    }

    setSecured() {

        this.characteristic.LockCurrentState = this.platform.Characteristic.LockCurrentState.SECURED;
        this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.SECURED);

    }

    setUnsecured() {

        this.unsecured = true;

        this.characteristic.LockCurrentState = this.platform.Characteristic.LockCurrentState.UNSECURED;
        this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.UNSECURED);

    }

    setTargetUnsecured() {

        this.characteristic.LockTargetState = this.platform.Characteristic.LockTargetState.UNSECURED;
        this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.platform.Characteristic.LockCurrentState.UNSECURED);

    }

}
