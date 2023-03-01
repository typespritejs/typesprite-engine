/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Emitter, EmitterModifier, Modifier} from "./Emitter";
import {DEG_TO_RAD} from "@tsjs/engine/tt2d/Math2";



export class EmitterRotate implements EmitterModifier {

    private radius:number = 0;
    private pixelPerSecond:number = 0;
    private startAngle:number = 0;
    // private pixelToAngle = 0;
    private lastAngle:number = 0;

    constructor(props) {
        const {
            radius = 100,
            pixelPerSecond = 10,
            startAngle = 0,
        } = props;

        this.radius = radius;
        this.pixelPerSecond = pixelPerSecond;
        this.startAngle = startAngle;
    }

    init(e: Emitter): void {
        const a = this.startAngle*DEG_TO_RAD;
        e.position.x = Math.cos(a) * this.radius;
        e.position.y = Math.sin(a) * this.radius;
        this.lastAngle = a;
    }

    update(e: Emitter, elapsed: number): void {
        const aa = elapsed * this.pixelPerSecond / this.radius;
        const a = this.lastAngle + aa;
        e.position.x = Math.cos(a) * this.radius;
        e.position.y = Math.sin(a) * this.radius;
        this.lastAngle = a;
    }

}

