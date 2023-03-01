/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {SpriteSheetFrame} from "@tsjs/engine/tt2d/SpriteSheet";
import {isArray} from "@tsjs/util/utils";

/**
 * Animation:
 *
 *   0     1       2      3    4       << INDEX
 * [----][--][---------][--][----]     << Timline
 *  4     2   9          2   4         << Duration in MS
 *                 ^
 *                 |
 *                 allTime
 *
 * allDuration: 4+2+9+2+4 = 21
 * allTime: 16
 *
 * allTime is the time the animation is played here.
 * It can be bigger than 21
 *
 *
 */
export class FrameAnimationPlayer {

    private readonly animSlices:number[] = [];
    private readonly allDuration:number = 0;

    constructor(
        public readonly frames:SpriteSheetFrame[],
        public readonly frameDuration:number[]|number,
    ) {
        const durations = isArray(frameDuration) ? frameDuration as number[] : [frameDuration as number];
        
        this.animSlices.length = frames.length;
        let allDur:number = 0;
        for (let i=0; i<this.frames.length; i++) {
            const dur = durations[i%durations.length];
            allDur += dur;
            this.animSlices[i] = allDur;
        }
        this.allDuration = allDur;
    }

    getFrameIndex(allTime:number, withLoop:boolean):number {
        if (!withLoop && allTime >= this.allDuration) {
            return this.frames.length-1;
        }
        const localTime = allTime % this.allDuration;
        for (let i=0; i<this.frames.length; i++) {
            if (localTime < this.animSlices[i]) {
                return i;
            }
        }
        return this.frames.length-1;
    }

    /**
     *
     * @param allTime the elapsed time in seconds.
     * @param withLoop
     */
    getFrame(allTime:number, withLoop:boolean):SpriteSheetFrame {
        if (!withLoop && allTime >= this.allDuration) {
            return this.frames[this.frames.length-1];
        }
        const localTime = allTime % this.allDuration;
        for (let i=0; i<this.frames.length; i++) {
            if (localTime < this.animSlices[i]) {
                return this.frames[i];
            }
        }
        return this.frames[this.frames.length-1];
    }

    isLastFrame(allTime:number, withLoop:boolean):boolean {
        const i = this.getFrameIndex(allTime, withLoop);
        return i == this.frames.length-1;
    }
}