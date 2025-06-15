import {CharacteristicValue, PlatformAccessory, Service} from "homebridge";
import {EsjRPi} from "../platform";
import {Device, Alarm} from "../config";

export abstract class Accessory {

    protected service: Service;

    public initialized: boolean = false;

    protected constructor(
        protected readonly platform: EsjRPi,
        protected readonly accessory: PlatformAccessory,
        protected config: Device,
        protected type: any,
        protected characteristic: any,
    ) {

        this.accessory.getService(this.platform.Service.AccessoryInformation)
            ?.setCharacteristic(this.platform.Characteristic.Manufacturer, config.manufacturer ?? 'Default-Manufacturer')
            .setCharacteristic(this.platform.Characteristic.Model, config.model ?? 'Default-Model')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, config.serial_number ?? 'Default-Serial');

        this.service = this.accessory.getService(this.platform.Service[this.type]) || this.accessory.addService(this.platform.Service[this.type]);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

        Object.entries(this.characteristic).forEach(([key, value]) => {

            this.startCharacteristic(key, value as CharacteristicValue);

        });

    }

    triggerAlarm() {

        if (typeof this.config.alarm !== 'undefined' && typeof this.platform.alarm !== 'undefined') {

            const trigger = new Alarm();

            if (typeof this.config.alarm.home !== 'undefined') {
                trigger.home = this.config.alarm.home;
            }

            if (typeof this.config.alarm.away !== 'undefined') {
                trigger.away = this.config.alarm.away;
            }

            if (typeof this.config.alarm.night !== 'undefined') {
                trigger.night = this.config.alarm.night;
            }

            this.platform.alarm.trigger(trigger, this.config.displayName);

        }

    }

    startCharacteristic(key: string, value: CharacteristicValue) {

        this.service.setCharacteristic(this.platform.Characteristic[key], value);

        if (typeof this['set' + key] === 'function') {
            this.service.getCharacteristic(this.platform.Characteristic[key])
                .onSet(this['set' + key].bind(this));
        }

        if (typeof this['get' + key] === 'function') {
            this.service.getCharacteristic(this.platform.Characteristic[key])
                .onGet(this['get' + key].bind(this));
        }

    }

    async wait(ms: number) {

        return new Promise(resolve => setTimeout(resolve, ms));

    }

    async init() {

        this.initialized = true;

    }

    virtualControl(value: any) {
        this.platform.log.debug('virtualControl', value);
    }

}
