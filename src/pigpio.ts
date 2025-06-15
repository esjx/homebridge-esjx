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
    public timeout = 1000;

    //private i2cHandles = {};
    //public i2cDevices = {};

    constructor(private host: string) {
        super();
    }

    public connect() {

        this._handleConnect().then(() => {

            this.client.once(EsjPiGPIOEvent.CONNECTED, async (info: any) => {

                this.emit(EsjPiGPIOEvent.CONNECTED, info);

            });

            this.client.once(EsjPiGPIOEvent.ERROR, (error: any) => {

                this.emit(EsjPiGPIOEvent.ERROR, error);

                setTimeout(() => {
                    return this._handleConnect();
                }, this.timeout);

            });

            this.client.once(EsjPiGPIOEvent.DISCONNECTED, (reason: any) => {

                setTimeout(() => {
                    return this._handleConnect();
                }, this.timeout);

                this.emit(EsjPiGPIOEvent.DISCONNECTED, reason);

            });

        }).catch((error: any) => {

            this.emit('error', error);

            setTimeout(() => {
                return this._handleConnect();
            }, this.timeout);

        });

    }

    private async _handleConnect(): Promise<boolean> {

        //const me = this;

        //me.i2cHandles = {};
        //me.i2cDevices = {};

        return new Promise((resolve, reject) => {

            try {

                this.client = pigpio.pigpio({host: this.host});
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
    protected initialized?: boolean;

    constructor(private pigpio: EsjPiGPIO, private gpio: number, private pullUpDown: number = 2) {

        super();

        this.init().then(() => {
            this.initialized = true;
        });

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
    protected initialized?: boolean;

    constructor(private pigpio: EsjPiGPIO, private gpio?: number, private pullUpDown: number = 2, private glitchTime: number = 1) {

        super();

        this.init().then(() => {
            this.initialized = true;
        });

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
