/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Particle} from "./Particle";

/**
 * Particle Pool Manager
 *
 * @see Flignov
 */
export class Pool {
    private readonly _cache = [];
    private _createdObjects = 0;

    constructor() {

    }
    putBack(p:Particle):void {
        this._cache.push(p);
    }
    takeOut():Particle {
        if (this._cache.length == 0) {
            this._createdObjects++;

            if (this._createdObjects > 10000) {
                console.error("Created more than 10k particle objects. Likely a memory leak.");
                return null;
            }

            return new Particle();
        }
        return this._cache.pop();
    }
}



/**
 * Class to create particles. At some point later we
 * can introduce a cached concept here.
 *
 * @see Flignov
 */
export class ParticleFactory {

    private readonly _pool:Pool;

    constructor(useCache = false) {
        this._pool = useCache ? new Pool() : null;
    }

    create():Particle {
        return this._pool ? this._pool.takeOut() : new Particle();
    }

    destroyParticle(particle:Particle) {
        if (this._pool) {
            if (particle.sprite)
                particle.sprite.reset();
            particle.reset();
            this._pool.putBack(particle);
        }
    }
}
