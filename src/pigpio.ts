// noinspection TypeScriptCheckImport
import pigpio from "pigpio-client";
import EventEmitter from "node:events";

export declare const enum EsjPiGPIOEvent {
    CONNECTED = "connected",
    DISCONNECTED = "disconnected",
    ERROR = "error",
    CHANGE = "change"
}

export declare const enum EsjPiGPIOState {
    ON = 0,
    OFF = 1
}

export class EsjPiGPIO extends EventEmitter {

    public client: any;
    public timeout: number = 1000;

    //private i2cHandles = {};
    //public i2cDevices = {};

    constructor(private host: string) {
        super();
    }

    public connect() {

        const me = this;

        me._handleConnect().then(() => {

            me.client.once(EsjPiGPIOEvent.CONNECTED, async (info: any) => {

                me.emit(EsjPiGPIOEvent.CONNECTED, info);

            });

            me.client.once(EsjPiGPIOEvent.ERROR, (error: any) => {

                me.emit(EsjPiGPIOEvent.ERROR, error);

                setTimeout(() => {
                    me._handleConnect().then(() => {});
                }, me.timeout);

            });

            me.client.once(EsjPiGPIOEvent.DISCONNECTED, (reason: any) => {

                setTimeout(() => {
                    me._handleConnect().then(() => {});
                }, me.timeout);

                me.emit(EsjPiGPIOEvent.DISCONNECTED, reason);

            });

        }).catch((error: any) => {

            me.emit('error', error);

            setTimeout(() => {
                me._handleConnect().then(() => {});
            }, me.timeout);

        });

    }

    private async _handleConnect(): Promise<boolean> {

        const me = this;

        //me.i2cHandles = {};
        //me.i2cDevices = {};

        return new Promise((resolve, reject) => {

            try {

                me.client = pigpio.pigpio({host: this.host});
                resolve(true);

            } catch (e) {
                reject((e as Error).message);
            }

        });

    }

    public async end(): Promise<number> {

        return await this.client.end();

    }

}

export class EsjOutputGPIO extends EventEmitter {

    private handler: any;

    constructor(private pigpio: EsjPiGPIO, private gpio: number, private pullUpDown: number = 2) {

        super();

        this.init().then(() => {});

    }

    private async init() {

        this.handler = this.pigpio.client.gpio(this.gpio);
        await this.handler.modeSet('output');
        await this.handler.write(EsjPiGPIOState.OFF);
        await this.handler.pullUpDown(this.pullUpDown);

    }

    public async write(value: number) {

        await this.handler.write(value);

    }

}

export class EsjInputGPIO extends EventEmitter {

    private handler: any;

    constructor(private pigpio: EsjPiGPIO, private gpio?: number, private pullUpDown: number = 2, private glitchTime: number = 1) {

        super();

        this.init().then(() => {});

    }

    private async init() {

        this.handler = this.pigpio.client.gpio(this.gpio);
        await this.handler.modeSet('input');
        await this.handler.pullUpDown(this.pullUpDown);
        await this.handler.glitchSet(this.glitchTime * 1000);

        this.handler.notify((level: number, tick: number) => {

            this.emit(EsjPiGPIOEvent.CHANGE, level, tick);

        });

    }

    // noinspection JSUnusedGlobalSymbols
    public async read(): Promise<number> {

        return await this.handler.read();

    }

}
