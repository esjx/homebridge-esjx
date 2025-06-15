import {EsjInputGPIO, EsjOutputGPIO, EsjPiGPIOEvent, EsjPiGPIOState} from "../pigpio";
import {EsjRPi} from "../platform";
import {CharacteristicValue, PlatformAccessory} from "homebridge";
import {Device} from "../config";
import {OutputAccessory} from "./output";

export class GarageDoorAccessory extends OutputAccessory {

    private tick: number = 0;

    protected gpioOpen?: EsjInputGPIO;
    protected gpioClose?: EsjInputGPIO;

    protected detected = true;

    protected pulse = 500;

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
    ) {

        super(platform, accessory, config, 'GarageDoorOpener', {
            CurrentDoorState: 1,
            TargetDoorState: 1,
            LockCurrentState: 1,
            LockTargetState: 1,
            ObstructionDetected: false,
        });

        this.pulse = config.time ?? this.pulse;

        this.accessory.category = this.platform.api.hap.Categories.GARAGE_DOOR_OPENER;

        //this.service.setCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.UNSECURED);

    }

    // noinspection JSUnusedGlobalSymbols
    async getCurrentDoorState(): Promise<CharacteristicValue> {

        this.platform.log.debug('Get Characteristic CurrentDoorState ->', this.characteristic.CurrentDoorState);

        return this.characteristic.CurrentDoorState;

    }

    // noinspection JSUnusedGlobalSymbols
    async getTargetDoorState(): Promise<CharacteristicValue> {

        this.platform.log.debug('Get Characteristic TargetDoorState ->', this.characteristic.TargetDoorState);

        return this.characteristic.TargetDoorState;

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
    async setTargetDoorState(value: CharacteristicValue) {

        this.characteristic.TargetDoorState = value as number;

        if (!this.detected && this.gpio) {

            this.platform.log.info('Pressing the button!!!');

            await this.gpio.write(0);
            await this.wait(this.pulse);
            await this.gpio.write(1);

        }

        this.detected = false;

    }

    // noinspection JSUnusedGlobalSymbols
    async setLockTargetState(value: CharacteristicValue) {

        this.characteristic.LockTargetState = value as number;

    }

    // noinspection JSUnusedGlobalSymbols
    async getObstructionDetected(): Promise<CharacteristicValue> {

        this.platform.log.debug('Get Characteristic ObstructionDetected ->', this.characteristic.ObstructionDetected);

        return this.characteristic.ObstructionDetected;

    }

    async init() {

        this.platform.log.info(this.type + ' connected on GPIO:', this.config.gpio);

        this.gpio = new EsjOutputGPIO(this.platform.pigpio, this.config.gpio);

        this.gpioOpen = new EsjInputGPIO(this.platform.pigpio, this.config.gpioA);

        this.gpioOpen.on(EsjPiGPIOEvent.CHANGE, (level: number, tick: number) => {

            this.platform.log.debug(`Garage Open changed to ${level} at ${tick}`);

            this.detected = true;

            if (level == 1) {

                this.tick = tick;

                this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.CLOSING;
                this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.CLOSED;

                this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.CLOSING);
                this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.CLOSED);

                this.platform.log.info('Closing...');

            } else {

                const time = (tick - this.tick) / 1000000;

                this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.OPEN;
                this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.OPEN;
                this.characteristic.LockTargetState = this.platform.Characteristic.LockTargetState.UNSECURED;
                this.characteristic.LockCurrentState = this.platform.Characteristic.LockCurrentState.UNSECURED;

                this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.OPEN);
                this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.OPEN);
                this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.platform.Characteristic.LockTargetState.UNSECURED);
                this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.UNSECURED);

                this.platform.log.info('Open!', Math.round(time * 10) / 10, 'seconds');

            }

        });

        this.gpioClose = new EsjInputGPIO(this.platform.pigpio, this.config.gpioB);

        this.gpioClose.on(EsjPiGPIOEvent.CHANGE, (level: number, tick: number) => {

            this.platform.log.debug(`Garage Close changed to ${level} at ${tick}`);

            this.detected = true;

            if (level == 1) {

                this.tick = tick;

                this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.OPENING;
                this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.OPEN;

                this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.OPENING);
                this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.OPEN);

                this.triggerAlarm();

                this.platform.log.info('Opening...');

            } else {

                const time = (tick - this.tick) / 1000000;

                this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.CLOSED;
                this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.CLOSED;
                this.characteristic.LockTargetState = this.platform.Characteristic.LockTargetState.SECURED;
                this.characteristic.LockCurrentState = this.platform.Characteristic.LockCurrentState.SECURED;

                this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.CLOSED);
                this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.CLOSED);
                this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.platform.Characteristic.LockTargetState.SECURED);
                this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.SECURED);

                this.platform.log.info('Closed!', Math.round(time * 10) / 10, 'seconds');

            }

        });

        Object.entries(this.characteristic).forEach(([key, value]) => {
            if (value !== null && typeof this['set' + key] === 'function') {
                this['set' + key](value);
            }
        });

        this.initialized = true;

        await this.refresh();

    }

    async refresh() {

        let me = this;

        const valueOpen = await this.gpioOpen?.read();

        if (valueOpen == EsjPiGPIOState.ON
            && this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState).value != this.platform.Characteristic.CurrentDoorState.OPEN) {

            this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.OPEN;
            this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.OPEN;

            this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.OPEN);
            this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.OPEN);

        }

        const valueClose = await this.gpioClose?.read();

        if (valueClose == EsjPiGPIOState.ON
            && this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState).value != this.platform.Characteristic.CurrentDoorState.CLOSED) {

            this.characteristic.CurrentDoorState = this.platform.Characteristic.CurrentDoorState.CLOSED;
            this.characteristic.TargetDoorState = this.platform.Characteristic.TargetDoorState.CLOSED;

            this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, this.platform.Characteristic.CurrentDoorState.CLOSED);
            this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, this.platform.Characteristic.TargetDoorState.CLOSED);

        }

        setTimeout(() => {
            me.refresh();
        }, 5000);

    }

}
