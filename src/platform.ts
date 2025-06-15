import {API, DynamicPlatformPlugin, Logger, PlatformAccessory, Service, Characteristic, APIEvent} from 'homebridge';
import {PLATFORM_NAME, PLUGIN_NAME} from './settings';
import {EsjPiGPIO, EsjPiGPIOEvent} from "./pigpio";
import {CustomPlatformConfig, Device} from "./config";
import {DefaultOutputAccessory} from "./accessories/default-output";
import {ValveAccessory} from "./accessories/valve";
import {AlarmTriggerAccessory, SecuritySystemAccessory} from "./accessories/security-system";
import {ContactSensorAccessory} from "./accessories/contact";
import {GarageDoorAccessory} from "./accessories/garage-door";
import {LockMechanismAccessory} from "./accessories/lock-mechanism";
import {MotionSensorAccessory} from "./accessories/motion";
import {OccupancySensorAccessory} from "./accessories/occupancy";
import {ButtonAccessory} from "./accessories/button";
import {VirtualSwitch} from "./accessories/virtual-switch";

export class EsjRPi implements DynamicPlatformPlugin {

    public readonly Service: typeof Service = this.api.hap.Service;
    public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

    public readonly accessories: PlatformAccessory[] = [];
    public readonly removedAccessories: PlatformAccessory[] = [];

    private configAccessories: string[] = [];

    public pigpio: EsjPiGPIO;

    public alarm?: SecuritySystemAccessory;

    public links = {};

    constructor(
        public readonly log: Logger,
        public readonly config: CustomPlatformConfig,
        public readonly api: API
    ) {

        this.pigpio = new EsjPiGPIO(config.host ?? 'localhost');

        this.log.debug('Finished initializing platform:', this.config.name);

        if (typeof this.config.devices !== 'undefined') {

            for (const device of this.config.devices) {

                const uuid = this.generateUuid(device);

                this.configAccessories.push(uuid);

            }

            this.log.debug(JSON.stringify(this.configAccessories));

        } else {

            this.log.error('Device list not found');

        }

        this.api.on(APIEvent.DID_FINISH_LAUNCHING, async () => {

            this.log.debug('Executed didFinishLaunching callback');

            this.pigpio.once(EsjPiGPIOEvent.CONNECTED, (info) => {
                this.log.debug(info);
                this.initAccessories();
            });

            this.pigpio.once(EsjPiGPIOEvent.ERROR, (error) => {
                this.log.warn(error);
                this.log.warn('App reconnecting in 1 sec');
            });

            this.pigpio.once(EsjPiGPIOEvent.DISCONNECTED, (reason) => {
                this.log.warn('App received disconnected event, reason:', reason);
                this.log.warn('App reconnecting in 1 sec');
            });

            this.pigpio.connect();

            this.discoverDevices();

        });

        this.api.on(APIEvent.SHUTDOWN, async () => {

            return this.pigpio.end();

        });

    }

    initAccessories() {

        this.log.warn('Initializing all Accessories');

        this.log.warn(this.api.user.storagePath());

        Object.entries(this.links).forEach(([key]: [string, any]): void => {

            this.links[key].init();

        });

    }

    configureAccessory(accessory: PlatformAccessory) {

        const found = this.configAccessories.indexOf(accessory.UUID);

        if (found >= 0) {

            this.log.info('Loading accessory from cache:', accessory.displayName);

            this.accessories.push(accessory);

        } else {

            this.log.error('Marking accessory for remove:', accessory.displayName);

            this.removedAccessories.push(accessory);

        }

    }

    removeAccessories() {

        if (this.removedAccessories.length > 0) {

            this.log.error('Removing accessories...');

            this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.removedAccessories);

            this.removedAccessories.splice(0, this.removedAccessories.length);

        }

    }

    discoverDevices() {

        this.removeAccessories();

        for (const device of this.config.devices) {

            const uuid = this.generateUuid(device);

            const virtual_device: Device = {
                type: device.type + '_virtual_switch',
                displayName: device.displayName,
                gpio: device.gpio
            };

            const uuid2 = this.generateUuid(virtual_device);

            let accessory = this.accessories.find(accessory => accessory.UUID === uuid);

            if (accessory) {

                this.log.info('Restoring existing accessory from cache:', accessory.displayName);

            } else {

                this.log.warn('Adding new accessory:', device.displayName);

                accessory = new this.api.platformAccessory(device.displayName, uuid);

                accessory.context.device = device;

                this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

            }

            switch (device.type.toLowerCase()) {

                // Output

                case 'light':
                    this.links[uuid] = new DefaultOutputAccessory(this, accessory, device, 'Lightbulb', {
                        On: false,
                    });
                    break;

                case 'switch':
                    this.links[uuid] = new DefaultOutputAccessory(this, accessory, device, 'Switch', {
                        On: false,
                    });
                    break;

                case 'outlet':
                    this.links[uuid] = new DefaultOutputAccessory(this, accessory, device, 'Outlet', {
                        On: false,
                    });
                    break;

                case 'faucet':
                    this.links[uuid] = new DefaultOutputAccessory(this, accessory, device, 'Faucet', {
                        Active: 0,
                    });
                    break;

                case 'valve':
                    this.links[uuid] = new ValveAccessory(this, accessory, device);
                    break;

                case 'lock':

                    this.links[uuid] = new LockMechanismAccessory(this, accessory, device);

                    this.links[uuid2] = new VirtualSwitch(this, accessory, device, this.links[uuid]);

                    break;

                // Input

                case 'button':
                    this.links[uuid] = new ButtonAccessory(this, accessory, device);
                    break;

                case 'contact':
                    this.links[uuid] = new ContactSensorAccessory(this, accessory, device);
                    break;

                case 'motion':
                    this.links[uuid] = new MotionSensorAccessory(this, accessory, device);
                    break;

                case 'occupancy':
                    this.links[uuid] = new OccupancySensorAccessory(this, accessory, device);
                    break;

                // Others

                case 'garage_door':
                    this.links[uuid] = new GarageDoorAccessory(this, accessory, device);
                    break;

                /*case 'fan':
                    this.links[uuid] = new FanAccessory(this, accessory, device);
                    break;*/

                // Alarm

                case 'alarm':
                    this.links[uuid] = new SecuritySystemAccessory(this, accessory, device);
                    this.alarm = this.links[uuid];
                    break;

                case 'alarm_trigger':
                    this.links[uuid] = new AlarmTriggerAccessory(this, accessory, device);
                    break;

                // Error

                default:
                    this.log.error(`Device type ${device.type} not supported`);

            }

        }

    }

    public generateUuid(device: Device) {

        let name = device.type;

        if (typeof device.id !== 'undefined') {
            name = name + '_id_' + device.id;
        }

        else if (typeof device.gpio !== 'undefined') {
            name = name + '_gpio_' + device.gpio;
        }

        return this.api.hap.uuid.generate(name);

    }

}
