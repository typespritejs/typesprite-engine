/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "./LUIElement";
import {LUIRect} from "./LUIRect";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";


export class LUIStyle {

    private _name:string;
    private _elements:LUIStyleElement[] =  [];
    private static _elementRect:LUIRect = new LUIRect();
    private static _noPaddingElementRect:LUIRect = new LUIRect();

    public constructor() {
    }

    public getName():string {
        return this._name;
    }
    public setName(v:string):void {
        this._name = v;
    }

    public addElementAtIndex(index:number, e:LUIStyleElement):LUIStyle {
        this._elements.splice(index, 0, e);
        return this;
    }

    public addElement(e:LUIStyleElement):LUIStyle {
        this._elements.push(e);
        return this;
    }

    public getNumElements():number {
        return this._elements.length;
    }

    public getStyleElementByIndex(index:number):LUIStyleElement {
        return this._elements[index];
    }

    public getElementList():LUIStyleElement[] {
        return this._elements;
    }

    public render(e:LUIElement, renderer:FatRenderer) {

        LUIStyle._elementRect
        .setX(e.getLeft())
        .setY(e.getTop())
        .setWidth(e.getWidth())
        .setHeight(e.getHeight());

        LUIStyle._noPaddingElementRect
        .setX(e.getLeftNoPadding())
        .setY(e.getTopNoPadding())
        .setWidth(e.getWidthNoPadding())
        .setHeight(e.getHeightNoPadding());

        for (let i=0; i<this._elements.length; i++) {
            if (!this._elements[i].enabled)
                continue;
            this._elements[i].render(
                    e,
                    renderer,
                    LUIStyle._elementRect,
                    LUIStyle._noPaddingElementRect
                    );
        }
    }
}


export abstract class LUIStyleElement {

    /**
    * Set to true so the style will be rendered on Padding space.
    */
    public onPaddingSpace:boolean = false;
    public enabled:boolean = true;

    protected static _globalCacheId:number = 0;
    protected _cacheId:string;


    public constructor() {
        this._cacheId = "" + (++LUIStyleElement._globalCacheId);
    }

    public render(e:LUIElement, renderer:FatRenderer, rect:LUIRect, noPaddingRect:LUIRect) {
        this.internRender(e, renderer, this.onPaddingSpace ? noPaddingRect : rect);
    }

    /**
    * Here one needs to do the actual render part of the style element.
    *
    * @param e is for context. do not use it for layout
    * @param renderer the renderer object. context is already taken care of.
    * @param rect is the layouted rectangle in screen coordinates of the given element. Use this for layout!
    */
    protected abstract internRender(e:LUIElement, renderer:FatRenderer, rect:LUIRect);

}

