/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Emitter, Initer} from "./Emitter";
import {Particle} from "./Particle";
import {SpriteSheet, SpriteSheetFrame} from "@tsjs/engine/tt2d/SpriteSheet";
import {BlendMode as TT2DBlendMode} from "@tsjs/engine/tt2d/BlendMode";
import {Color} from "@tsjs/engine/tt2d/Color";
import {DEG_TO_RAD} from "@tsjs/engine/tt2d/Math2";


// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class CirclePosition implements Initer {

    public randX:number;
    public randY:number;
    public ringRadius:number;
    public posX:number;
    public posY:number;
    public startVelocity:number;
    public endVelocity:number;
    public pendingBlastCount:number;
    public lastBlastCount:number;
    public distributeEvenly:boolean;
    public startDistributeRandom:boolean;
    public blastStartAngle:number;

    constructor(props) {

        const {
            randRadiusX = 0,
            randRadiusY = 0,
            ringRadius = 0,
            x = 0,
            y = 0,
            startVelocity = 0,
            endVelocity = startVelocity,
            distributeEvenly = false,
            startDistributeRandom = true,
        } = props;

        this.startVelocity = startVelocity;
        this.endVelocity = endVelocity;

        this.randX = randRadiusX;
        this.randY = randRadiusY || randRadiusX;
        this.ringRadius = ringRadius;
        this.distributeEvenly = distributeEvenly;
        this.startDistributeRandom = startDistributeRandom;

        this.posX = x;
        this.posY = y;
    }

    init(emitter:Emitter, p:Particle):void {

        let angle = 0;
        if (this.distributeEvenly && this.lastBlastCount > 0) {
            const p = this.pendingBlastCount++ / this.lastBlastCount + 1;
            angle = this.blastStartAngle + Math.PI * 2 * p;
        }
        else {
            angle = Math.PI*2*Math.random();
        }

        if (this.startVelocity || this.endVelocity) {
            const velPower = (this.startVelocity + (this.endVelocity - this.startVelocity) * Math.random());
            p.velocity.x += Math.cos(angle) * velPower;
            p.velocity.y += Math.sin(angle) * velPower;
        }

        if (this.ringRadius > 0) {
            p.position.x += this.posX + Math.cos(angle) * this.ringRadius + this.randX * Math.random();
            p.position.y += this.posY + Math.sin(angle) * this.ringRadius + this.randY * Math.random();
        }
        else {
            p.position.x += this.posX + Math.cos(angle) * this.randX * Math.random();
            p.position.y += this.posY + Math.sin(angle) * this.randY * Math.random();
        }
    }

    onBlast(e:Emitter, count:number):void {
        this.pendingBlastCount = 0;
        this.lastBlastCount = Math.round(count);
        this.blastStartAngle = this.startDistributeRandom ? Math.PI*2*Math.random() : 0;
    }
}
// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class RectPosition implements Initer {

    public startX:number = 0;
    public endX:number = 0;
    public startY:number = 0;
    public endY:number = 0;

    constructor(props) {

        const {
            startX = 0,
            startY = 0,
            endX = 0,
            endY = 0,
        } = props;

        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
    }

    init(emitter:Emitter, p:Particle):void {
        p.position.x += this.startX + Math.random() * (this.endX - this.startX);
        p.position.y += this.startY + Math.random() * (this.endY - this.startY);
    }

    onBlast(e:Emitter, count:number):void {

    }
}


// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Alpha implements Initer {

    private alphaStart:number = 0;
    private alphaEnd:number = 0;

    constructor(props) {

        const {
            alphaStart = 0,
            alphaEnd = 1,
        } = props;

        this.alphaStart = alphaStart;
        this.alphaEnd = alphaEnd;


    }

    init(emitter:Emitter, p:Particle):void {
        p.mixColor.a = (this.alphaEnd - this.alphaStart) *  Math.random() + this.alphaStart;
    }

    onBlast(e:Emitter, count:number):void {

    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class BlendModeIniter implements Initer {

    private blendMode:TT2DBlendMode;

    constructor(props) {
        const {
            blendMode = "lighter",
        } = props;

        switch (blendMode) {
            default:
            case "normal":
                this.blendMode = TT2DBlendMode.BM_NORMAL;
                break;
            case "add":
                this.blendMode = TT2DBlendMode.BM_ADDITIVE;
                break;
            case "none":
                this.blendMode = TT2DBlendMode.BM_NO_BLEND;
                break;
            case "neg-multiply":
                this.blendMode = TT2DBlendMode.BM_NEGATIVE_MULTIPLY;
                break;
            case "merge-copy":
                this.blendMode = TT2DBlendMode.BM_MERGE_COPY;
                break;
            case "difference":
                this.blendMode = TT2DBlendMode.BM_LIKE_DIFFERENCE;
                break;
            case "multiply":
                this.blendMode = TT2DBlendMode.BM_MULTILPLY;
                break;
            case "alpha":
                this.blendMode = TT2DBlendMode.BM_ALPHA_CHANNEL;
                break;
        }
    }

    init(emitter:Emitter, p:Particle):void {
        p.blendMode = this.blendMode;
    }

    onBlast(e:Emitter, count:number):void {

    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Velocity implements Initer {

    private startX:number;
    private startY:number;
    private endX:number;
    private endY:number;


    constructor(props) {
        const {
            startX = 0,
            startY = startX,
            endX = 0,
            endY = endX,
        } = props;
        this.startX = startX;
        this.endX = endX;
        this.startY = startY;
        this.endY = endY;
    }

    init(emitter:Emitter, p:Particle):void {
        const xx = (this.endX - this.startX) *  Math.random() + this.startX;
        const yy = (this.endY - this.startY) *  Math.random() + this.startY;

        if (p.rotation == 0) {
            p.velocity.x += xx;
            p.velocity.y += yy;
        }
        else {
            const sinv = Math.sin(p.rotation);
            const cosv = Math.cos(p.rotation);
            p.velocity.x += cosv * xx - sinv * yy;
            p.velocity.y += cosv * yy + sinv * xx;
        }
    }

    onBlast(e:Emitter, count:number):void {

    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class LifeTime implements Initer{

    private s:number;
    private e:number;

    constructor(props) {
        const {
            rangeStart = 1,
            rangeEnd = rangeStart
        } = props;
        this.s = rangeStart;
        this.e = rangeEnd;
    }

    init(emitter:Emitter, p:Particle):void {
        p.lifetime += this.s + Math.random() * (this.e - this.s);
    }

    onBlast(e:Emitter, count:number):void {

    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class RotationVelocity implements Initer{

    private rotVelocityStart:number;
    private rotVelocityEnd:number;

    constructor(props) {
        const {
            rotVelocityStart = 0,
            rotVelocityEnd = 360
        } = props;
        this.rotVelocityStart = rotVelocityStart;
        this.rotVelocityEnd = rotVelocityEnd;
    }

    init(emitter:Emitter, p:Particle):void {
        p.rotVelocity += (this.rotVelocityEnd - this.rotVelocityStart) *  Math.random() + this.rotVelocityStart;
    }

    onBlast(e:Emitter, count:number):void {

    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Rotation implements Initer {

    private rotStart:number;
    private rotEnd:number;

    constructor(props) {
        const {
            rotStart = 1,
            rotEnd = rotStart
        } = props;
        this.rotStart = rotStart;
        this.rotEnd = rotEnd;
    }

    init(emitter:Emitter, p:Particle):void {
        p.rotation += this.rotStart + Math.random() * (this.rotEnd - this.rotStart);
    }

    onBlast(e:Emitter, count:number):void {

    }
}


// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class Scale implements Initer{

    private scaleStart:number;
    private scaleEnd:number;
    private scaleStartY:number;
    private scaleEndY:number;
    private linked:boolean;

    constructor(props) {
        const {
            scaleStart = 1,
            scaleEnd = scaleStart,
            scaleStartY = 1,
            scaleEndY = scaleStartY,
            linked = true
        } = props;
        this.scaleStart = scaleStart;
        this.scaleEnd = scaleEnd;
        this.scaleStartY = scaleStartY;
        this.scaleEndY = scaleEndY;
        this.linked = linked;
    }

    init(emitter:Emitter, p:Particle):void {
        const sx = this.scaleStart + Math.random() * (this.scaleEnd - this.scaleStart);
        const sy = this.linked ? sx : this.scaleStartY + Math.random() * (this.scaleEndY - this.scaleStartY);
        p.scale.x = sx;
        p.scale.y = sy;
    }

    onBlast(e:Emitter, count:number):void {

    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class FrameAnimation implements Initer {

    public frames:SpriteSheetFrame[] = [];
    // public frameIndex:number = 0;
    public animSpeed:number = 1;

    constructor(spriteSheet:SpriteSheet, props) {
        const {
            animName
        } = props;

        if (!spriteSheet) {
            throw new Error("Invalid SpriteSheet");
        }

        const anim = spriteSheet.getAnimation(animName);
        const slice = spriteSheet.slices[animName];
        if (anim) {
            // const frameIds = anim.frames;
            this.animSpeed = anim.speed;
            const frames = spriteSheet.frames
            this.frames = frames ? [...frames] : [];
            // this.frames.length = frameIds.length;
            //
            // for (let i=0; i<frameIds.length; i++) {
            //     this.frames[i] = spriteSheet.getFrame(frameIds[i]);
            // }
        }
        else if (slice) {
            this.animSpeed = 1000;
            // const frames = spriteSheet.frames
            this.frames = [slice];
        }
        else {
            console.error("Cannot find animation with name: " + animName + " for flignov.");
            this.frames = [spriteSheet.getFrame(0)];
        }
    }

    init(emitter:Emitter, p:Particle):void {
        p.animFrames = this.frames;
        p.animSpeed = this.animSpeed;
        //p.frameIndex = this.frameIndex;
        p.animTime = 0;
    }

    onBlast(e:Emitter, count:number):void {

    }
}

// ---------------------------------------------------------------------------------------------------------------------

interface PeparedAnimation {
    frames:SpriteSheetFrame[];
    animSpeed:number;
}

/**
 * @see Flignov
 */
export class RandomFrameAnimation implements Initer {

    public preparedAnims:PeparedAnimation[] = [];
    // public frameIndex:number = 0;
    // public animSpeed:number = 1;

    constructor(spriteSheet:SpriteSheet, props) {
        const {
            randomAnimNames = []
        } = props;

        if (!spriteSheet) {
            throw new Error("Invalid SpriteSheet");
        }

        for (const randomAnimName of randomAnimNames) {
            const anim = spriteSheet.getAnimation(randomAnimName);
            if (anim) {
                // const frameIds = anim.frames;
                const animSpeed = anim.speed;
                // const frames = [];
                // this.animSpeed = anim.speed;
                const frames = spriteSheet.frames
                // frames = frames ? [...frames] : [];
                // frames.length = frameIds.length;
                // for (let i=0; i<frameIds.length; i++) {
                //     frames[i] = spriteSheet.getFrame(frameIds[i]);
                // }
                this.preparedAnims.push({
                    animSpeed,
                    frames: frames ? [...frames] : []
                })
            }
            else {
                console.error("Cannot find animation with name: " + randomAnimName + " for flignov.");
                this.preparedAnims.push({
                    frames: [spriteSheet.getFrame(0)],
                    animSpeed: 1,
                });
            }
        }
    }

    init(emitter:Emitter, p:Particle):void {
        const index = Math.floor(Math.random()*this.preparedAnims.length);
        const pickedAnimation = this.preparedAnims[index];
        p.animFrames = pickedAnimation.frames;
        p.animSpeed = pickedAnimation.animSpeed;
        p.animTime = 0;
    }

    onBlast(e:Emitter, count:number):void {

    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class RandomColor implements Initer {

    private colors:Color[] = [];

    constructor(props) {

        const {
            colors = [],
        } = props;


        for (let i=0; i<colors.length; i++) {
            this.colors.push(Color.fromHash(colors[i]));
        }
    }

    init(emitter:Emitter, p:Particle):void {
        const a = p.mixColor.a;
        const index = Math.floor(Math.random()*this.colors.length);
        p.mixColor.copyValues(this.colors[index]);
        p.mixColor.a *= a;
    }

    onBlast(e:Emitter, count:number):void {

    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * @see Flignov
 */
export class FixedOrderColor implements Initer {

    private colors:Color[] = [];
    private lastIndex:number = 0;

    constructor(props) {

        const {
            colors = [],
        } = props;


        for (let i=0; i<colors.length; i++) {
            this.colors.push(Color.fromHash(colors[i]));
        }
    }

    init(emitter:Emitter, p:Particle):void {
        const a = p.mixColor.a;
        p.mixColor.copyValues(this.colors[this.lastIndex]);
        p.mixColor.a *= a;
        this.lastIndex++;
        if (this.lastIndex >= this.colors.length)
            this.lastIndex = 0;
    }

    onBlast(e:Emitter, count:number):void {

    }
}


// ---------------------------------------------------------------------------------------------------------------------









































