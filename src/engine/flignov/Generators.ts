/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Emitter, Generator} from "./Emitter";


// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Steady implements Generator {

    private _timeToNext:number = 0;
    private _rateInv:number;
    private _rate:number;

    constructor(props) {
        const {
            rate = 1,
        } = props;
        this._rate = rate;
        this._rateInv = rate > 0 ? 1 / rate : 0;
    }

    startEmitter(e):number {
        this._timeToNext = this._rateInv;
        return 0;
    }

    spawnParticles(e, elapsed:number):number {
        if (this._rateInv <= 0)
            return 0;

        let count = 0;
        this._timeToNext -= elapsed;
        while(this._timeToNext <= 0 ) {
            ++count;
            this._timeToNext += this._rateInv;
        }
        return count;
    }

    setRate(rate:number):void {
        this._rate = rate;
        this._rateInv = rate > 0 ? 1 / rate : 0;
    }

    blast() {
        // nothing to do here
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Blast implements Generator {

    public countStart:number;
    public countEnd:number;
    private pendingBlast:boolean = false;

    constructor(props) {
        const {
            countStart = 1,
            countEnd = countStart,
            autoBlast = false,
        } = props;

        this.countStart = countStart;
        this.countEnd = countEnd;
        this.pendingBlast = autoBlast;
    }

    startEmitter(e):number {
        return 0;
    }

    spawnParticles(e:Emitter, elapsed:number):number {
        if (this.pendingBlast) {
            this.pendingBlast = false;
            const count = this.countStart + (this.countEnd - this.countStart) * Math.random();
            e.onBlast(count);
            return count;
        }
        return 0;
    }

    blast() {
        this.pendingBlast = true;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Pulse implements Generator {

    private countStart:number;
    private countEnd:number;
    private interval:number;
    private timeToNext:number = 0;
    private startWithPulse:boolean;

    constructor(props) {
        const {
            interval = 1,
            countStart = 10,
            countEnd = countStart,
            startWithPulse = true,
        } = props;

        this.interval = interval;
        this.countStart = countStart;
        this.countEnd = countEnd;
        this.startWithPulse = startWithPulse;
        this.timeToNext = this.interval;
    }

    startEmitter(e):number {
        return this.startWithPulse ? (this.countEnd - this.countStart) * Math.random() * this.countStart : 0;
    }

    spawnParticles(e, elapsed:number):number {
        if (this.interval <= 0) { // makes no sense
            return 0;
        }

        let count = 0;
        this.timeToNext -= elapsed;
        while(this.timeToNext <= 0 )
        {
            count += (this.countEnd - this.countStart) * Math.random() * this.countStart;
            this.timeToNext += this.interval;
        }
        return count;
    }

    blast() {
    }

}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class SteadyRandom implements Generator {

    private rateStart:number;
    private rateEnd:number;
    private timeToNext:number;

    constructor(props) {
        const {
            rateStart = 0,
            rateEnd = 10,
        } = props;

        this.rateStart = rateStart;
        this.rateEnd = rateEnd;
    }

    private newTimeToNext() {
        const rate = Math.random() * ( this.rateEnd - this.rateStart ) + this.rateStart;
        return rate == 0 ? 0 : 1 / rate;
    }

    startEmitter(e):number {
        this.timeToNext = this.newTimeToNext();
        return 0;
    }

    spawnParticles(e, elapsed:number):number {
        let count = 0;
        this.timeToNext -= elapsed;
        while(this.timeToNext <= 0 )
        {
            ++count;
            const rate = this.newTimeToNext();
            if (rate == 0)
                break;
            this.timeToNext += rate;
        }
        return count;
    }

    blast() {

    }
}

// ---------------------------------------------------------------------------------------------------------------------
