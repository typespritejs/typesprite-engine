/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {AffineMatrix} from "@tsjs/engine/tt2d/AffineMatrix";
import {BlendMode} from "./BlendMode";
import {DEG_TO_RAD, RAD_TO_DEG} from "./Math2";
import {ManagedTexture} from "./ManagedTexture";
import {Color} from "./Color";
import {SpriteSheet, SpriteSheetFrame} from "./SpriteSheet";
import {Rect} from "@tsjs/engine/tt2d/Rect";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {FatMaterial} from "@tsjs/engine/tt2d/Materials";
import {Vector2} from "@tsjs/engine/tt2d/Vector";
import {FrameAnimationPlayer} from "@tsjs/engine/tt2d/FrameAnimationPlayer";


export enum MatrixMode {
    UPDATED,
    DIRTY,
    MANUAL,
}


let nextRenderElementTypeId = 1;
export function makeRenderTypeElementId():number {
    return nextRenderElementTypeId++;
}

// export interface SpriteFrame  {
//     image:HTMLImageElement;
//     rect:{x:number,y:number,width:number,height:number};
//     regX:number,
//     regY:number,
//     texture:ManagedTexture,
// }

// ---------------------------------------------------------------------------------------------------------------------

export class RenderElement {

    // TODO children management:
    // instead of slice we could use index-swapping and a local size variable

    public visible:boolean = true;
    public regX:number = 0;
    public regY:number = 0;
    public name:string = "";
    public _children:RenderElement[];

    private _blendMode:BlendMode = BlendMode.BM_NORMAL;
    private _parent:RenderElement = null;
    private _x:number = 0;
    private _y:number = 0;
    private _rot:number = 0;
    private _scaleX:number = 1;
    private _scaleY:number = 1;
    private _localCache:AffineMatrix = new AffineMatrix();
    private _matrixMode:MatrixMode = MatrixMode.UPDATED;
    private _width:number = 0;
    private _height:number = 0;
    /** GC protection for worldMatrix */
    private _tmpWorldMatrix:AffineMatrix;

    constructor() {
    }

    get height():number {
        return this._height;
    }
    get width():number {
        return this._width;
    }
    public get x():number {
        return this._x;
    }
    public get y():number {
        return this._y;
    }
    public get rotation():number {
        return this._rot;
    }
    public get scaleX():number {
        return this._scaleX;
    }
    public get scaleY():number {
        return this._scaleY;
    }

    /**
     * Changes it like this:
     *
     * manual x true  => manual
     * manual x false => manual
     * dirty  x true  => dirty
     * dirty  x false => dirty
     * okay   x true  => dirty
     * okay   x false => okay
     * ------   -----    -----
     *   ^        ^        ^
     *   |        |        matrix mode after modification
     *   |       modified parameter value
     * current matrixMode
     */
    private _flagDirty(modified) {
        this._matrixMode = this._matrixMode == MatrixMode.MANUAL ?
            MatrixMode.MANUAL :
            modified ?
                MatrixMode.DIRTY :
                this._matrixMode;
    }

    public set blendMode(value: BlendMode) {
        this._blendMode = value;
    }

    public get blendMode(): BlendMode {
        return this._blendMode;
    }

    public set x(v:number) {
        this._flagDirty(this._x != v);
        this._x = v;
    }
    public set y(v:number) {
        this._flagDirty(this._y != v);
        this._y = v;
    }
    public set rotation(v:number) {
        this._flagDirty(this._rot != v);
        this._rot = v;
    }
    public set scaleX(v:number) {
        this._flagDirty(this._scaleX != v);
        this._scaleX = v;
    }
    public set scaleY(v:number) {
        this._flagDirty(this._scaleY != v);
        this._scaleY = v;
    }

    public set scale(v:number) {
        this._flagDirty(this._scaleX != v);
        this._flagDirty(this._scaleY != v);
        this._scaleX = v;
        this._scaleY = v;
    }

    public get scale():number {
        return this._scaleX;
    }

    set width(v:number) {
        this._width = v;
    }
    set height(v:number) {
        this._height = v;
    }

    /**
     * Creates a full world matrix meaning all parent matrices.
     *
     * This is not cached. Use with care.
     */
    public get worldMatrix():AffineMatrix {
        if (!this._parent)
            return this.matrix;
        if (!this._tmpWorldMatrix)
            this._tmpWorldMatrix = new AffineMatrix();
        this._tmpWorldMatrix.copyValues(this._parent.worldMatrix)
        const myMatrix = this.matrix;
        this._tmpWorldMatrix.multiply(myMatrix);
        return this._tmpWorldMatrix;
    }

    /**
     * Returns a matrix representing x,y,rotation, scale.
     *
     * It is also possible to have a manual matrix which ignores those values.
     */
    public get matrix():AffineMatrix {
        if (this._matrixMode == MatrixMode.DIRTY) {
            this._localCache.identity();
            this._localCache.translate(this._x,  this._y);

            if (this._rot != 0)
                this._localCache.rotate(this._rot* DEG_TO_RAD);

            if (this.scaleX != 1 ||
                this.scaleY != 1)
                this._localCache.scale(this._scaleX, this._scaleY);

            this._matrixMode = MatrixMode.UPDATED;
        }
        return this._localCache;
    }

    /**
     * Setting a matrix will disable the usage of: x, y, scaleX, etc.
     * and instead the given matrix will be used.
     *
     * To get back to the usage of the standard behavior use
     * useStandardMatrix().
     */
    public set matrix(v:AffineMatrix) {
        this._matrixMode = MatrixMode.MANUAL;
        this._localCache.copyValues(v);
    }

    /**
     * Switch back from manual mode to standard mode.
     */
    public useStandardMatrix():void {
        if (this._matrixMode == MatrixMode.MANUAL) {
            this._matrixMode = MatrixMode.DIRTY;
        }
    }

    public get parent():RenderElement {
        return this._parent;
    }

    public detachChild(child:RenderElement) {
        if (!this._children)
            return;

        for (let i=0; i<this._children.length; i++) {
            if (this._children[i] === child) {
                this._children.splice(i, 1);
                child._parent = null;
                return;
            }
        }
    }

    public addChild(child:RenderElement) {
        if (child._parent == this)
            return;
        if (child == this) {
            throw new Error(`Tree Rule Violation! ${this.name}.addChild(${child.name}) `);
        }

        if (child._parent)
            child._parent.detachChild(child);

        if (!this._children)
            this._children = [];
        child._parent = this;
        this._children.push(child);
    }

    public getChildAt(index:number):RenderElement {
        return this._children[index];
    }

    public removeChildAt(index:number):RenderElement {
        const child = this._children[index];
        this._children.splice(index, 1);
        child._parent = null;
        return child;
    }

    public removeChild(elem:RenderElement):RenderElement|false {
        for (let i=0; i<this.numChildren; i++) {
            if (this._children[i] == elem) {
                return this.removeChildAt(i);
            }
        }
        return false;
    }

    public removeAllChildren() {
        while (this.numChildren > 0) {
            this.removeChildAt(0);
        }
    }

    public get numChildren():number {
        return this._children ? this._children.length : 0;
    }

    public sortChildren(sorter:(a:RenderElement, b:RenderElement)=>number):void {
        if (this._children)
            this._children.sort(sorter);
    }
}


// ---------------------------------------------------------------------------------------------------------------------

export class QuadElement extends RenderElement {
    /** TOP-LEFT */
    public color1:Color = new Color();
    /** BOTTOM-LEFT */
    public color2:Color = new Color();
    /** TOP-RIGHT */
    public color3:Color = new Color();
    /** BOTTOM-RIGHT */
    public color4:Color = new Color();

    public constructor(w:number, h:number) {
        super();
        this.width = w;
        this.height = h;
    }

    public setColor(c:Color) {
        this.color1.copyValues(c);
        this.color2.copyValues(c);
        this.color3.copyValues(c);
        this.color4.copyValues(c);
    }

    public setAlpha(a:number) {
        this.color1.a = a;
        this.color2.a = a;
        this.color3.a = a;
        this.color4.a = a;
    }

    public setSolidColor(r:number, g:number, b:number, a:number) {
        this.color1.r = r;
        this.color2.r = r;
        this.color3.r = r;
        this.color4.r = r;

        this.color1.g = g;
        this.color2.g = g;
        this.color3.g = g;
        this.color4.g = g;

        this.color1.b = b;
        this.color2.b = b;
        this.color3.b = b;
        this.color4.b = b;

        this.color1.a = a;
        this.color2.a = a;
        this.color3.a = a;
        this.color4.a = a;
    }

    /**
     *
     *
     * <------------->
     * ^             ^
     * |            (r2,g2,b2,a2)
     * (r1,g1,b1,a1)
     *
     */
    public setHorizontalFade(r1:number, g1:number, b1:number, a1:number,
                             r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r1;
        this.color3.r = r2;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g1;
        this.color3.g = g2;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b1;
        this.color3.b = b2;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a1;
        this.color3.a = a2;
        this.color4.a = a2;
    }

    /**
     * ^  <-- (r1,g1,b1,a1)
     * |
     * |
     * |
     * |
     * |
     * v  <-- (r2,g2,b2,a2)
     *
     */
    public setVerticalFade(r1:number, g1:number, b1:number, a1:number,
                           r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r2;
        this.color3.r = r1;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g2;
        this.color3.g = g1;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b2;
        this.color3.b = b1;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a2;
        this.color3.a = a1;
        this.color4.a = a2;
    }


    public setAsLine(
        x:number,
        y:number,
        x2:number,
        y2:number,
        width:number = 1,
    ) {
        const l1 = new Vector2(x, y)
        const delta = l1.copy().subtractXY(x2, y2);
        const len = delta.length();
        const center = l1.copy().add(delta.scale(-0.5));
        this.x = center.x;
        this.y = center.y;
        this.width = len;
        this.height = width; // < this is correct!
        this.regX = len*0.5;
        this.regY = width*0.5;
        this.rotation = -Math.atan2(delta.y, delta.x) * RAD_TO_DEG;
    }

    /**
     * Creates a QuadElement that is aligned like a
     * line element.
     *
     * ```
     * (x,y)-(x2,y2)
     * ```
     *
     * Note: This is a workaround so some rules apply:
     *
     * - The width value is stored in "height".
     * - To update the width use "setLine(...)".
     *
     * @param x
     * @param y
     * @param x2
     * @param y2
     * @param color
     * @param width
     */
    public static createAsLine(
        x:number,
        y:number,
        x2:number,
        y2:number,
        color:Color = Color.Red,
        width:number = 1
    ):QuadElement {
        const q = new QuadElement(width, width);
        q.setAsLine(x, y, x2, y2, width);
        q.setColor(color);
        return q;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Basically a textured QUAD.
 *
 * const bmp = new BitmapElement(someTex);
 * - bmp has width and height of someTex
 *
 * // this is in the coord space of the texture
 * // will not change the RECT of the BitmapElement itself
 * bmp.setSourceRect(0,0, 100, 100);
 *
 * // this will define a new source rect but also
 * // the size.
 * bmp.setSourceRectAndSize(0,0, 100, 100);
 *
 *
 *
 */
export class BitmapElement extends RenderElement {

    /** TOP-LEFT */
    public color1:Color = new Color();
    /** BOTTOM-LEFT */
    public color2:Color = new Color();
    /** TOP-RIGHT */
    public color3:Color = new Color();
    /** BOTTOM-RIGHT */
    public color4:Color = new Color();

    public texture:ManagedTexture;
    public srcX:number = 0;
    public srcY:number = 0;
    public srcW:number = 0;
    public srcH:number = 0;


    constructor(tex:ManagedTexture) {
        super();
        this.texture = tex;
        this.srcW = tex.width;
        this.srcH = tex.height;
        this.width = tex.width;
        this.height = tex.height;
    }


    setSize(w, h) {
        this.width = w;
        this.height = h;
    }

    /**
     * Set's the spatial rect. The texture-subrect will be the same
     */
    setSourceRectWithSize(x:number, y:number, w:number, h:number) {
        this.srcX = x;
        this.srcY = y;
        this.srcW = w;
        this.srcH = h;
        this.width = w;
        this.height = h;
    }

    /**
     * Changes the portion of the texture that will be rendered.
     */
    setSourceRect(x:number, y:number, w:number, h:number) {
        this.srcX = x;
        this.srcY = y;
        this.srcW = w;
        this.srcH = h;
    }

    /**
     * will render the entire texture
     */
    resetSourceRect() {
        this.srcX = 0;
        this.srcY = 0;
        this.srcW = this.texture.width;
        this.srcH = this.texture.height;
    }

    public setSolidColor(r:number, g:number, b:number, a:number) {
        this.color1.r = r;
        this.color2.r = r;
        this.color3.r = r;
        this.color4.r = r;

        this.color1.g = g;
        this.color2.g = g;
        this.color3.g = g;
        this.color4.g = g;

        this.color1.b = b;
        this.color2.b = b;
        this.color3.b = b;
        this.color4.b = b;

        this.color1.a = a;
        this.color2.a = a;
        this.color3.a = a;
        this.color4.a = a;
    }

    /**
     *
     * <------------->
     * ^             ^
     * |            (r2,g2,b2,a2)
     * (r1,g1,b1,a1)
     *
     */
    public setHorizontalFade(r1:number, g1:number, b1:number, a1:number,
                             r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r1;
        this.color3.r = r2;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g1;
        this.color3.g = g2;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b1;
        this.color3.b = b2;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a1;
        this.color3.a = a2;
        this.color4.a = a2;
    }

    /**
     * ^  <-- (r1,g1,b1,a1)
     * |
     * |
     * |
     * |
     * |
     * v  <-- (r2,g2,b2,a2)
     *
     */
    public setVerticalFade(r1:number, g1:number, b1:number, a1:number,
                           r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r2;
        this.color3.r = r1;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g2;
        this.color3.g = g1;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b2;
        this.color3.b = b1;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a2;
        this.color3.a = a1;
        this.color4.a = a2;
    }

}

// ---------------------------------------------------------------------------------------------------------------------


export class AnimationElement extends RenderElement {

    /** TOP-LEFT */
    public color1:Color = new Color();
    /** BOTTOM-LEFT */
    public color2:Color = new Color();
    /** TOP-RIGHT */
    public color3:Color = new Color();
    /** BOTTOM-RIGHT */
    public color4:Color = new Color();

    public frame:SpriteSheetFrame;
    public animSpeed:number = 1;
    public animTime:number = 0;

    private _anim:string = "";
    private _noLoop:boolean = true;
    private _loopCount:number = 0;
    private player:FrameAnimationPlayer;

    constructor() {
        super();
    }

    get loopCount() :number {
        return this._loopCount;
    }


    get animation(): string {
        return this._anim;
    }

    public setAnimation(animName:string, sheet:SpriteSheet):AnimationElement {
        this.player = null;
        const anim = sheet.animations[animName];
        if (!anim) {
            if (sheet.slices[animName]) {
                this.frame = sheet.slices[animName];
                return this;
            }
            console.error(`Cannot find animation: ${animName} in sheet`);
            return this;
        }

        this._anim = animName;
        this._loopCount = 0;
        this._noLoop = anim.next === null;
        if (anim.next && anim.next != animName) {
            console.log("Unsupported animation configruation: " + animName);
        }
        this._noLoop = anim.loop ? false : true;
        this.frame = null;
        this.animTime = 0;
        this.animSpeed = anim.speed;
        this.player = new FrameAnimationPlayer(
            anim.frames,
            anim.duration
        )
        return this;
    }

    public update(elapsed:number) {
        if (!this.player)
            return;
        this.animTime += elapsed * this.animSpeed;
        this.frame = this.player.getFrame(this.animTime, !this._noLoop);
    }

    /**
     * True if the last frame we rendered was the "last" in the animation
     */
    get isLastFrame():boolean {
        if (!this.player)
            return false;
        return this.player.isLastFrame(this.animTime, !this._noLoop);
    }

    public setAlpha(a:number) {
        this.color1.a = a;
        this.color2.a = a;
        this.color3.a = a;
        this.color4.a = a;
    }

    public setColor(c:Color) {
        this.color1.copyValues(c);
        this.color2.copyValues(c);
        this.color3.copyValues(c);
        this.color4.copyValues(c);
    }


    public setSolidColor(r:number, g:number, b:number, a:number) {
        this.color1.r = r;
        this.color2.r = r;
        this.color3.r = r;
        this.color4.r = r;

        this.color1.g = g;
        this.color2.g = g;
        this.color3.g = g;
        this.color4.g = g;

        this.color1.b = b;
        this.color2.b = b;
        this.color3.b = b;
        this.color4.b = b;

        this.color1.a = a;
        this.color2.a = a;
        this.color3.a = a;
        this.color4.a = a;
    }

    /**
     *
     * <------------->
     * ^             ^
     * |            (r2,g2,b2,a2)
     * (r1,g1,b1,a1)
     *
     */
    public setHorizontalFade(r1:number, g1:number, b1:number, a1:number,
                             r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r1;
        this.color3.r = r2;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g1;
        this.color3.g = g2;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b1;
        this.color3.b = b2;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a1;
        this.color3.a = a2;
        this.color4.a = a2;
    }

    /**
     * ^  <-- (r1,g1,b1,a1)
     * |
     * |
     * |
     * |
     * |
     * v  <-- (r2,g2,b2,a2)
     *
     */
    public setVerticalFade(r1:number, g1:number, b1:number, a1:number,
                           r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r2;
        this.color3.r = r1;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g2;
        this.color3.g = g1;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b2;
        this.color3.b = b1;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a2;
        this.color3.a = a1;
        this.color4.a = a2;
    }

}

// ---------------------------------------------------------------------------------------------------------------------

export class SpriteElement extends RenderElement {

    /** TOP-LEFT */
    public color1:Color = new Color();
    /** BOTTOM-LEFT */
    public color2:Color = new Color();
    /** TOP-RIGHT */
    public color3:Color = new Color();
    /** BOTTOM-RIGHT */
    public color4:Color = new Color();

    public frame:SpriteSheetFrame|null = null;


    constructor(frame?:SpriteSheetFrame) {
        super();
        this.frame = frame;
    }

    public setAlpha(a:number) {
        this.color1.a = a;
        this.color2.a = a;
        this.color3.a = a;
        this.color4.a = a;
    }

    public setColor(other:Color) {
        this.color1.copyValues(other);
        this.color2.copyValues(other);
        this.color3.copyValues(other);
        this.color4.copyValues(other);
    }

    public setSolidColor(r:number, g:number, b:number, a:number) {
        this.color1.r = r;
        this.color2.r = r;
        this.color3.r = r;
        this.color4.r = r;

        this.color1.g = g;
        this.color2.g = g;
        this.color3.g = g;
        this.color4.g = g;

        this.color1.b = b;
        this.color2.b = b;
        this.color3.b = b;
        this.color4.b = b;

        this.color1.a = a;
        this.color2.a = a;
        this.color3.a = a;
        this.color4.a = a;
    }

    /**
     *
     * <------------->
     * ^             ^
     * |            (r2,g2,b2,a2)
     * (r1,g1,b1,a1)
     *
     */
    public setHorizontalFade(r1:number, g1:number, b1:number, a1:number,
                             r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r1;
        this.color3.r = r2;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g1;
        this.color3.g = g2;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b1;
        this.color3.b = b2;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a1;
        this.color3.a = a2;
        this.color4.a = a2;
    }

    /**
     * ^  <-- (r1,g1,b1,a1)
     * |
     * |
     * |
     * |
     * |
     * v  <-- (r2,g2,b2,a2)
     *
     */
    public setVerticalFade(r1:number, g1:number, b1:number, a1:number,
                           r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r2;
        this.color3.r = r1;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g2;
        this.color3.g = g1;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b2;
        this.color3.b = b1;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a2;
        this.color3.a = a1;
        this.color4.a = a2;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Inherit from this to do custom stuff using directDraw
 */
export abstract class DirectRenderElement extends RenderElement {

    /**
     * Overwrite here.
     *
     * Note:
     *  - fatRenderer::rootMatrix is already set to parentMatrix
     *  - rootMatrix can be left modified (no need for caching)
     *  - only directXXX calls may be used
     *  - do NOT modify or Cache render here. This will break rendering
     */
    abstract renderDirect(renderer:FatRenderer, parentMatrix:AffineMatrix);

}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * A single Sprite (not animated) rendered using a custom material
 */
export class CustomShadedFrameElement extends DirectRenderElement {


    public material:FatMaterial = null;
    private _frame:SpriteSheetFrame|null = null;
    private _dirty:boolean = true;
    private tex1:Vector2 = new Vector2();
    private tex2:Vector2 = new Vector2();
    private tex3:Vector2 = new Vector2();
    private tex4:Vector2 = new Vector2();

    /** TOP-LEFT */
    public color1:Color = new Color();
    /** BOTTOM-LEFT */
    public color2:Color = new Color();
    /** TOP-RIGHT */
    public color3:Color = new Color();
    /** BOTTOM-RIGHT */
    public color4:Color = new Color();


    public get frame() {
        return this._frame;
    }

    public set frame(v:SpriteSheetFrame) {
        this._frame = v;
        this._dirty = true;
    }

    private prepare() {

        const tfx = 1 / this.frame.texture.width;
        const tfy = 1 / this.frame.texture.height;
        const rx = this.frame.rect.x * tfx;
        const ry = this.frame.rect.y * tfy;
        const rx2 = rx + this.frame.rect.width * tfx;
        const ry2 = ry + this.frame.rect.height * tfy;

        this.tex1.x = rx;
        this.tex1.y = ry;

        this.tex2.x = rx;
        this.tex2.y = ry2;

        this.tex3.x = rx2;
        this.tex3.y = ry;

        this.tex4.x = rx2;
        this.tex4.y = ry2;

        this.material.setTexture1Property("uTex", this.frame.texture);
    }

    renderDirect(renderer:FatRenderer, parentMatrix:AffineMatrix) {
        if (!this.frame || !this.material)
            return;

        if (this._dirty) {
            this.prepare();
            this._dirty = false;
        }

        renderer.directDrawCustomQuad(
            this.material,
            -this.frame.regX,
            -this.frame.regY,
            this.width || this.frame.rect.width,
            this.height || this.frame.rect.height,
            this.tex1,
            this.tex2,
            this.tex3,
            this.tex4,
            this.color1,
            this.color2,
            this.color3,
            this.color4,
            this.blendMode
        );
    }

    public setSolidColor(r:number, g:number, b:number, a:number) {
        this.color1.r = r;
        this.color2.r = r;
        this.color3.r = r;
        this.color4.r = r;

        this.color1.g = g;
        this.color2.g = g;
        this.color3.g = g;
        this.color4.g = g;

        this.color1.b = b;
        this.color2.b = b;
        this.color3.b = b;
        this.color4.b = b;

        this.color1.a = a;
        this.color2.a = a;
        this.color3.a = a;
        this.color4.a = a;
    }

    /**
     *
     * <------------->
     * ^             ^
     * |            (r2,g2,b2,a2)
     * (r1,g1,b1,a1)
     *
     */
    public setHorizontalFade(r1:number, g1:number, b1:number, a1:number,
                             r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r1;
        this.color3.r = r2;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g1;
        this.color3.g = g2;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b1;
        this.color3.b = b2;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a1;
        this.color3.a = a2;
        this.color4.a = a2;
    }

    /**
     * ^  <-- (r1,g1,b1,a1)
     * |
     * |
     * |
     * |
     * |
     * v  <-- (r2,g2,b2,a2)
     *
     */
    public setVerticalFade(r1:number, g1:number, b1:number, a1:number,
                           r2:number, g2:number, b2:number, a2:number) {
        this.color1.r = r1;
        this.color2.r = r2;
        this.color3.r = r1;
        this.color4.r = r2;

        this.color1.g = g1;
        this.color2.g = g2;
        this.color3.g = g1;
        this.color4.g = g2;

        this.color1.b = b1;
        this.color2.b = b2;
        this.color3.b = b1;
        this.color4.b = b2;

        this.color1.a = a1;
        this.color2.a = a2;
        this.color3.a = a1;
        this.color4.a = a2;
    }

}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * A single Quad rendered using a custom material
 */
export class CustomShadedQuadElement extends DirectRenderElement {

    public overwriteMatrix:AffineMatrix = null;
    public material:FatMaterial = null;
    private _dirty:boolean = true;
    public tex1:Vector2 = new Vector2();
    public tex2:Vector2 = new Vector2();
    public tex3:Vector2 = new Vector2();
    public tex4:Vector2 = new Vector2();

    /** TOP-LEFT */
    public color1:Color = new Color();
    /** BOTTOM-LEFT */
    public color2:Color = new Color();
    /** TOP-RIGHT */
    public color3:Color = new Color();
    /** BOTTOM-RIGHT */
    public color4:Color = new Color();


    renderDirect(renderer:FatRenderer, parentMatrix:AffineMatrix) {
        if (!this.material || this.material.isReleased())
            return;

        if(this.overwriteMatrix)
            renderer.setRootMatrix(this.overwriteMatrix);

        renderer.directDrawCustomQuad(
            this.material,
            -this.regX,
            -this.regY,
            this.width,
            this.height,
            this.tex1,
            this.tex2,
            this.tex3,
            this.tex4,
            this.color1,
            this.color2,
            this.color3,
            this.color4,
            this.blendMode
        );
    }

}


// ---------------------------------------------------------------------------------------------------------------------