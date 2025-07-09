import Timeout = NodeJS.Timeout;
import {EsjRPi} from "../platform";
import {CharacteristicValue, PlatformAccessory} from "homebridge";
import {Alarm, Device} from "../config";
import {OutputAccessory} from "./output";
import {Accessory} from "./accessory";

export class SecuritySystemAccessory extends OutputAccessory {

    protected timeoutState?: Timeout;
    protected timeoutTrigger?: Timeout;
    protected time: number = 10;

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
    ) {

        super(platform, accessory, config, 'SecuritySystem', {
            SecuritySystemTargetState: 3,
            SecuritySystemCurrentState: 3
        });

        this.accessory.category = this.platform.api.hap.Categories.ALARM_SYSTEM;

        this.time = this.config.time ?? this.time;

    }

    stateName(state: number): string {

        let out = String(state);

        switch (state) {

            case 0:
                out = 'Armed (Home)';
                break;

            case 1:
                out = 'Armed (Away)';
                break;

            case 2:
                out = 'Armed (Night)';
                break;

            case 3:
                out = 'Disarmed';
                break;

            case 4:
                out = 'Triggered!!!';
                break;

        }

        return out;

    }

    // noinspection JSUnusedGlobalSymbols
    async setSecuritySystemTargetState(value: CharacteristicValue) {

        this.characteristic.SecuritySystemTargetState = value as number;

        if (this.characteristic.SecuritySystemTargetState != this.characteristic.SecuritySystemCurrentState) {

            this.platform.log.info('setSecuritySystemTargetState -> ', this.stateName(this.characteristic.SecuritySystemTargetState));

            this.startTimeoutState();

        }

    }

    changeState() {

        this.characteristic.SecuritySystemCurrentState = this.characteristic.SecuritySystemTargetState;
        this.platform.log.warn('changeState -> ', this.stateName(this.characteristic.SecuritySystemCurrentState));
        this.service.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, this.characteristic.SecuritySystemCurrentState);

    }

    startTimeoutState() {

        if (this.timeoutState) {
            clearTimeout(this.timeoutState);
        }

        if (this.timeoutTrigger) {
            clearTimeout(this.timeoutTrigger);
        }

        if (this.characteristic.SecuritySystemTargetState == this.platform.Characteristic.SecuritySystemTargetState.DISARM) {

            this.changeState();

        } else {

            this.timeoutState = setTimeout(() => {
                this.changeState();
            }, this.time * 1000);

        }

    }

    trigger(config: Alarm, name: string) {

        let detected = false;

        if (config.home && this.characteristic.SecuritySystemCurrentState == this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM) {
            detected = true;
        }

        if (config.away && this.characteristic.SecuritySystemCurrentState == this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM) {
            detected = true;
        }

        if (config.night && this.characteristic.SecuritySystemCurrentState == this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM) {
            detected = true;
        }

        if (detected) {
            this.platform.log.warn('Movement detected!', name);
            this.startTimeoutTrigger();
        }

    }

    startTimeoutTrigger() {

        this.timeoutTrigger = setTimeout(() => {
            this.service.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
            this.platform.log.error('Alarm triggered!');
        }, this.time * 1000);

    }

    // noinspection JSUnusedGlobalSymbols
    async getSecuritySystemTargetState(): Promise<CharacteristicValue> {

        return this.characteristic.SecuritySystemTargetState;

    }

    async toggle(): Promise<CharacteristicValue> {

        this.platform.log.warn('Toggle Security System');

        return this.characteristic.SecuritySystemTargetState;

    }

}

export class AlarmTriggerAccessory extends Accessory {

    private timeout?: Timeout;

    constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
    ) {

        super(platform, accessory, config, 'Switch', {
            On: false,
        });

    }

    // noinspection JSUnusedGlobalSymbols
    async setOn(value: CharacteristicValue) {

        this.characteristic.On = value as boolean;

        this.platform.log.warn('Button pressed!');

        if (typeof this.timeout != undefined) {
            clearTimeout(this.timeout as Timeout);
        }

        if (this.characteristic.On) {

            this.triggerAlarm();

            this.timeout = setTimeout(() => {
                this.characteristic.On = false;
                this.service.updateCharacteristic(this.platform.Characteristic.On, this.characteristic.On);
            }, 3000);

        }

    }

    // noinspection JSUnusedGlobalSymbols
    async getOn(): Promise<CharacteristicValue> {

        return this.characteristic.On;

    }

}
