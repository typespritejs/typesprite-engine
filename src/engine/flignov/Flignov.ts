/**
 * Inspired by:  https://github.com/richardlord/Flint, Author: Richard Lord, Copyright © Richard Lord 2008-2011
 *
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ParticleFactory} from "./ParticleFactory";
import {Emitter, Generator} from "./Emitter";


/**
 * Flignov Particles
 *
 */
export class ParticleStats {
    public numParticles:number = 0;
    public numCreated:number = 0;
    public numDestroyed:number = 0;

    reset() {
        this.numParticles = 0;
        this.numCreated = 0;
        this.numDestroyed = 0;
    }
}

/**
 * Particle Engine called "flignov"
 *
 * Heavily inspired by 'richardlord/Flint' particles
 */
export class Flignov {

    private readonly _factory:ParticleFactory;
    private readonly _emitter:Emitter[] = [];
    private _time:number = 0;

    public readonly stats:ParticleStats = new ParticleStats();
    public lastElapsed:number = 0;

    constructor(factory:ParticleFactory) {
        this._factory = factory;
    }

    createEmitter(generator:Generator):Emitter {
        const e = new Emitter(generator, this._factory);
        this._emitter.push(e);
        return e;
    }

    blast() {
        for (let i=0; i<this._emitter.length; i++) {
            this._emitter[i].blast();
        }
    }

    getEmitter():Emitter[] {
        return this._emitter;
    }

    getEmitterAtIndex(i:number):Emitter {
        return this._emitter[i];
    }

    getFactory():ParticleFactory {
        return this._factory;
    }


    update(elapsed:number):void {
        this.stats.reset();
        for (let i=0; i<this._emitter.length; i++) {
            this._emitter[i].updateOnFrame(elapsed, this.stats);
        }
        this._time += elapsed;
        this.lastElapsed = elapsed;
    }

    remove():void {
        for (let i=0; i<this._emitter.length; i++) {
            this._emitter[i].removeParticles();
        }
    }

    preswarmNow(duration:number) {
        let pendingTime = duration;
        const elapsed = 1 / 60;
        while(pendingTime >= 0) {
            this.update(elapsed);
            pendingTime -= elapsed;
        }
    }
}


