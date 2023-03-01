/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Particle} from "./Particle";
import {ParticleFactory} from "./ParticleFactory";
import {ParticleStats} from "./Flignov";

export interface Modifier {

    update(e:Emitter, p:Particle, elapsed:number):void;
}

export interface Initer {
    init(e:Emitter, p:Particle):void;
    /** occurs whenever a blast is executed */
    onBlast(e:Emitter, count:number):void;
}

export interface Generator {
    startEmitter(e:Emitter):number;
    spawnParticles(e:Emitter, elapsed:number):number;
    blast():void;
}

export interface EmitterModifier {
    init(e:Emitter):void;
    update(e:Emitter, elapsed:number):void;
}


export class Emitter {

    private _started:boolean = false;
    private _running:boolean = true;
    private _modifier:Modifier[] = [];
    private _initer:Initer[] = [];
    private _emitterModifer:EmitterModifier[] = [];
    private _factory:ParticleFactory;
    private _generator:Generator;

    public _particles:Particle[] = [];
    public position:{x:number, y:number} = {x: 0, y:0};
    public lastPosition:{x:number, y:number} = {x: 0, y:0};

    constructor(generator:Generator, factory:ParticleFactory) {
        this._generator = generator;
        this._factory = factory;

        if (!generator || !factory)
            throw new Error("Bad Parameter!");
    }

    getIniterOfType(refType:any):Initer {
        for (let i=0; i<this._initer.length; i++) {
            if (this._initer[i] instanceof refType)
                return this._initer[i];
        }
        return null;
    }

    removeIniterOfType(refType:any):Initer {
        for (let i=0; i<this._initer.length; i++) {
            if (this._initer[i] instanceof refType) {
                const removed = this._initer[i];
                this._initer.splice(i, 1);
                return removed;
            }
        }
        return null;
    }

    blast() {
        this._generator.blast();
    }

    getModifiers():Modifier[] {
        return this._modifier;
    }

    getIniter():Initer[] {
        return this._initer;
    }

    getGenerator():Generator {
        return this._generator;
    }

    getEmitterModifier():EmitterModifier[] {
        return this._emitterModifer;
    }

    onBlast(count:number) {
        const len = this._initer.length;
        for (let i=0; i<len; i++) {
            if (this._initer[i].onBlast)
                this._initer[i].onBlast(this, count);
        }
    }

    addModifier(mod:Modifier):Emitter {
        this._modifier.push(mod);
        return this;
    }

    addIniter(ini:Initer):Emitter {
        this._initer.push(ini);
        return this;
    }

    addEmitterModifier(emod:EmitterModifier):Emitter {
        this._emitterModifer.push(emod);
        return this;
    }

    pause():void {
        this._running = false;
    }

    resume():void {
        this._running = true;
    }

    start():void {
        if (this._started)
            return;

        this._started = true;
        this._running = true;

        const len = this._emitterModifer.length;
        for (let i=0; i<len; i++) {
            this._emitterModifer[i].init(this);
        }

        const startParticleCount = this._generator.startEmitter(this);
        for(let i=0; i<startParticleCount; i++)
            this.createParticle();
    }
    private destroyParticle (p):void {
        this._factory.destroyParticle(p);
    }
    private createParticle():void {
        const p = this._factory.create();
        if (p === null) {
            this._running = false;
            return;
        }
        this.onInitParticle(p);

        const len = this._initer.length;
        for (let i=0; i<len; i++) {
            this._initer[i].init(this, p);
        }

        this._particles.push(p);
    }

    onInitParticle(p:Particle) {
        p.position.x = this.position.x;
        p.position.y = this.position.y;
    }

    removeParticles() {
        for (let i=0; i<this._particles.length; i++) {
            this.destroyParticle(this._particles[i]);
        }
        this._particles.length = 0;
    }

    updateOnFrame(elapsed:number, stats:ParticleStats):void {
        if (!this._started)
            return;

        const numNewPartilces = this._generator.spawnParticles(this, elapsed);
        if (this._running) {
            for(let i=0; i<numNewPartilces; i++) {
                this.createParticle();
            }
        }
        stats.numParticles += numNewPartilces;


        let i=0
        let len = this._emitterModifer.length;
        for(;i<len; i++)
            this._emitterModifer[i].update(this, elapsed);

        // update actions
        let p=0;
        let lenP = this._particles.length;
        stats.numParticles += lenP;
        for(;p<lenP; p++) {
            let i=0;
            const len = this._modifier.length;
            for(;i<len; i++) {
                this._modifier[i].update(this, this._particles[p], elapsed);
            }
        }

        // update pos, remove dead
        p=0;
        // lenP = this._particles.length;
        for(;p<this._particles.length;) {
            var it = this._particles[p];
            if (it.isDead) {
                this.destroyParticle(it);

                // TODO rework this to swap out the parent
                this._particles.splice(p, 1);

                stats.numDestroyed ++;
            }
            else {
                p++;
            }
        }
    }
}

