/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "./LUIElement";
import {LUIRect} from "./LUIRect";


/**
 * * A LUIContainerLayouter must answer the following quest:
 *
 * Where exactly are all children placed in the given parent?
 *
 * The parent and children are of LUIElement and can be seen Rectangles with annotation.
 *
 * * Basic Example:
 *
 * ```ts
 * perform(parent:LUIElement):void {
 *   // At this point parent's position is set and can be accessed via: e.getPosition()
 *
 *   // Let's iterate over all children
 *   for (let i=0; i<parent.numChildren(); i++) {
 *     const child = parent.getChildAt(i);
 *
 *     // Yes, you can even decide how to handle
 *     // 'invisible' children,
 *     if (!child.isVisible())
 *       continue;
 *
 *     // With e.getPosition() you can get the position of the
 *     // parent and layout it any way you like.
 *     //
 *     // Here: all children consume the same space as the parent does
 *     child.getPosition().set(
 *       parent.getPosition().getX(),
 *       parent.getPosition().getY(),
 *       parent.getPosition().getWidth(),
 *       parent.getPosition().getHeight(),
 *     )
 *   }
 * }
 * ```
 *
 * * NOTE: `parent.getPosition()` must not be changed.
 * A child cannot force the parent to change it's position.
 * It can only take the parent's position and try to fit in.
 *
 * If the parent needs to resize based on it's parent
 * you need to connect the container-layouts of the parents.
 *
 * * Layout-Properties
 *
 * It's possible to set layout-properties on LUIElements which can be read druing the `perform()` call.
 * There are two categories of properties:
 *
 *   1. parent properties
 *   2. children properties
 *
 * ```
 * class MyLayouter implements LUIContainerLayouter {
 *
 *   public defaultSpace:number = 10; // (1) parent property
 *
 *   // In layout
 *   perform(parent:LUIElement):void {
 *     for (let i=0; i<parent.numChildren(); i++) {
 *       const child = parent.getChildAt(i);
 *       const childSpace = child.getLayoutProperty("space"); // (2) childrens property!
 *       const space = childSpace === undefined ? this.defaultSpace : childSpace;
 *
 *       // now consider space
 *     }
 *   }
 * }
 * ```
 *
 * `Parent Properties` can be set as normal class members during the LUIContainerLayouter implementation.
 * `Children Properties` on the other hand are set using child.setLayoutProperties(..).
 *
 * The idea is that you can annotate the children with information that help the parent's container layout
 * implementation to do it's job.
 *
 * @see LUIFreeStackLayout
 * @see LUILineLayout
 * @see LUISpaceLayout
 * @see LUIStackLayout
 */
export interface LUIContainerLayouter {
    perform(e:LUIElement):void
}

export class LUIPos {
    private _x:number = 0;
    private _y:number = 0;

    public getX() {
        return this._x
    }
    public getY() {
        return this._y
    }

    public setX(v:number):LUIPos {
        this._x = v;
        return this;
    }
    public setY(v:number):LUIPos {
        this._y = v;
        return this;
    }

    public setValues(other:LUIPos):LUIPos {
        this._x = other._x;
        this._y = other._y;
        return this;
    }
}

export class LUIBorder {
    private _t:number = 0;
    private _l:number = 0;
    private _r:number = 0;
    private _b:number = 0;

    public getTop() {
        return this._t;
    }
    public getRight() {
        return this._r;
    }
    public getLeft() {
        return this._l;
    }
    public getBottom() {
        return this._b;
    }

    public setAll(v:number):LUIBorder {
        this._t = v;
        this._l = v;
        this._r = v;
        this._b = v;
        return this;
    }

    public setTop(v:number):LUIBorder {
        this._t = v;
        return this;
    }
    public setLeft(v:number):LUIBorder {
        this._l = v;
        return this;
    }
    public setRightLeft(v:number):LUIBorder {
        this._l = v;
        this._r = v;
        return this;
    }
    public setRight(v:number):LUIBorder {
        this._r = v;
        return this;
    }
    public setBottom(v:number):LUIBorder {
        this._b = v;
        return this;
    }

    public get width() {
        return this._r - this._l;
    }

    public get height() {
        return this._b - this._t;
    }

    public setValues(other:LUIBorder):LUIBorder {
        this._t = other._t;
        this._l = other._l;
        this._b = other._b;
        this._r = other._r;
        return this;
    }
}

export enum ScaleAlign {
    Start,
    Center,
    End,
    Fill,
}

export enum Align {
    Start,
    Center,
    End
}


export function alignSubRect(
    context:LUIRect,
    w:number,
    h:number,
    alignX:Align,
    alignY:Align,
    calcRect:LUIRect
    ) {

    // TODO...


}


export enum LUILayerConsume {
    /**
     * This layer won't consume mouse inputs at all.
     * This will disable all input processing
     */
    None,
    /**
     * This layer consumes mouse inputs only when they are on an
     * element.
     */
    OnElement,
    /**
     * This layer consumes ALL mouse input events. Even if
     * not hit on a button.
     */
    All
}

export enum LUIElementConsume {

    /**
     * Means this element won't get active and does not
     * "block" any input
     */
    None,
    /**
     * Consumes the event but only as long as the
     * mouse is ON the element.
     */
    OnElement,
    /**
     * If this is the case the element will consume
     * a mouse event and switches to active state.
     */
    Active
}

export enum LUIMouseState {
    None,
    DownOnElement,
    DownNotOnElement,
}

export enum LUIClipBehavior {

    /**
     * Children can render outside of this parent
     */
    None,

    /**
     * The normal content area of the box (exclusive padding space)
     */
    ElementBox,

    /**
     * Content area inclusive padding
     */
    IgnorePaddingBox,





}














