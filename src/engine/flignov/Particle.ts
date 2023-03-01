import {SpriteSheetFrame} from "@tsjs/engine/tt2d/SpriteSheet";
import {Color} from "@tsjs/engine/tt2d/Color";
import {BlendMode} from "@tsjs/engine/tt2d/BlendMode";


interface Point {
    x:number;
    y:number;
}

/**
 * @see Flignov
 */
export class Particle {

    public readonly mixColor:Color = new Color();
    public scale:Point;
    public position:Point;
    public lastPosition:Point;
    public velocity:Point;

    public mass:number = 1;
    public lifetime:number = 0;
    public age:number=0;
    public energy:number = 1;
    public isDead:boolean = false;
    public rotation:number = 0;
    public rotVelocity:number = 0;
    public collisionRadius:number = 1;
    public sortValue:number = 0;
    public sprite:any = null;
    public blendMode = BlendMode.BM_NORMAL;

    public animFrames:SpriteSheetFrame[] = null;
    public animTime:number = 0;
    public animSpeed:number = 1;


    constructor() {
        this.scale = {x: 1, y: 1};
        this.position = {x: 0, y:0};
        this.lastPosition = {x: 0, y:0};
        this.velocity = {x: 0, y:0};

        this.reset();
    }

    reset() {
        this.mixColor.r = 1;
        this.mixColor.g = 1;
        this.mixColor.b = 1;
        this.mixColor.a = 1;
        this.scale.x = 1;
        this.scale.y = 1;
        this.position.x = 0;
        this.position.y = 0;
        this.lastPosition.x = 0;
        this.lastPosition.y = 0;
        this.velocity.x = 0;
        this.velocity.y = 0;

        this.mass = 1;
        this.lifetime = 0;
        this.age=0;
        this.energy = 1;
        this.isDead = false;
        this.rotation = 0;
        this.rotVelocity = 0;
        this.collisionRadius = 1;
        this.sortValue = 0;
        this.sprite = null;
        this.blendMode = BlendMode.BM_NORMAL;
    }

    getInertia():number {
        return this.mass * this.collisionRadius * this.collisionRadius * 0.5;
    }
}

