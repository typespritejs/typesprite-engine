/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Emitter, Modifier} from "./Emitter";
import {EnergyEasing} from "./EnergyEasing";
import {Particle} from "./Particle";



// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Accelerate implements Modifier {

    private x: number;
    private y: number;

    constructor(props) {
        const {
            x = 10,
            y = 10,
        } = props;

        this.x = x;
        this.y = y;
    }

    update(emitter: Emitter, p: Particle, time: number): void {
        p.velocity.x += time * this.x;
        p.velocity.y += time * this.y;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Friction  implements Modifier {
    private friction: number;

    constructor(props) {
        const {
            friction = 1,
        } = props;
        this.friction = friction;
    }

    update(emitter: Emitter, p: Particle, time: number): void {
        const len2 = p.velocity.x  * p.velocity.x + p.velocity.y  * p.velocity.y;
        if( len2 <= 0 || p.mass == 0)
        {
            return;
        }
        const scale = 1 - (this.friction * time ) / ( Math.sqrt( len2 ) * p.mass );
        if( scale < 0 )
        {
            p.velocity.x = 0
            p.velocity.y = 0
        }
        else
        {
            p.velocity.x = p.velocity.x * scale;
            p.velocity.y = p.velocity.y * scale;
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class RandomDrift implements Modifier {
    private x: number;
    private y: number;

    constructor(props) {
        const {
            x = 10,
            y = 10,
        } = props;

        this.x = x;
        this.y = y;
    }

    update(emitter: Emitter, p: Particle, time: number): void {
        p.velocity.x += (Math.random() - 0.5) * this.x + time;
        p.velocity.y += (Math.random() - 0.5) * this.y + time;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class SortY  implements Modifier {

    private offset:number;

    constructor(props) {
        const {
            offset = 0
        } = props;
        this.offset = offset;
    }

    update(emitter: Emitter, p: Particle, time: number): void {
        p.sortValue = p.position.y + this.offset;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class TargetScale implements Modifier {

    private targetScale;
    private rate;

    constructor(props) {
        const {
            targetScale = 1,
            rate = 0.1
        } = props;

        this.targetScale = targetScale;
        this.rate = rate;
    }

    update(emitter: Emitter, p: Particle, time: number): void {
        p.scale.x += (this.targetScale - p.scale.x ) * this.rate * time;
        p.scale.y += (this.targetScale - p.scale.y ) * this.rate * time;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class TargetVelocity implements Modifier {

    private targetVelocityX:number;
    private targetVelocityY:number;
    private rate;

    constructor(props) {
        const {
            targetVelocityX = 1,
            targetVelocityY = targetVelocityX,
            rate = 0.1
        } = props;

        this.targetVelocityX = targetVelocityX;
        this.targetVelocityY = targetVelocityY;
        this.rate = rate;
    }

    update(emitter: Emitter, p: Particle, time: number): void {
        p.velocity.x += ( this.targetVelocityX - p.velocity.x ) * this.rate * time;
        p.velocity.y += ( this.targetVelocityY - p.velocity.y ) * this.rate * time;
    }
}


// ---------------------------------------------------------------------------------------------------------------------

/**
 *
 *
 * !Fade.startAlpha:, number, default: 0
 *
 * @see Flignov
 */
export class Fade implements Modifier {

    private startAlpha:number;
    private endAlpha:number;
    private diffAlpha:number;

    constructor(props) {
        const {
            alphaStart = 1,
            alphaEnd = 0,
        } = props;

        this.diffAlpha = alphaStart - alphaEnd;
        this.endAlpha = alphaEnd;
        this.startAlpha = alphaStart;
    }

    update(emitter:Emitter, p:Particle, time:number):void {
        p.mixColor.a *= this.endAlpha + this.diffAlpha * p.energy;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Move implements Modifier {

    constructor(props) {
    }

    update(emitter:Emitter, p:Particle, time:number):void {
        p.lastPosition.x = p.position.x;
        p.lastPosition.y = p.position.y;

        p.position.x += p.velocity.x * time;
        p.position.y += p.velocity.y * time;
    }

}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Rotate implements Modifier {

    constructor(props) {
    }

    update(emitter:Emitter, p:Particle, time:number):void {
        p.rotation += p.rotVelocity * time;
    }

}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Age implements Modifier {
    private _easingFunc;

    constructor(props) {
        const {
            energyEasing = EnergyEasing.Linear.easeNone,
        } = props;

        this._easingFunc = energyEasing;
    }

    update(emitter:Emitter, p:Particle, time:number):void {
        p.age += time;
        if (p.age >= p.lifetime) {
            p.energy = 0;
            p.isDead = true;
        }
        else {
            p.energy = this._easingFunc(p.age, p.lifetime);
        }
    }

}
