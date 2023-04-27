/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElementConsume, LUILayerConsume, LUIMouseState} from "./LayoutUI";
import {LUIElement} from "./LUIElement";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {LUIRect} from "./LUIRect";
import {LUILayer} from "./elements/LUILayer";
import {Rect} from "@tsjs/engine/tt2d/Rect";


/**
 *
 * ```
 *  .____     ____ ___.___
 *  |    |   |    |   \   |
 *  |    |   |    |   /   |
 *  |    |___|    |  /|   |
 *  |_______ \______/ |___|
 *          \/
 *  Layout User Interface
 * ```
 *
 * LUIManager
 *
 * The core object for the entire LUI.
 *
 * It's a tree structure but on the root element
 * you can only create "named" layers. Those layers always
 * consume the entire root space and appear in the order of
 * creation.
 *
 *** Example part 1: manager
 *
 * ```
 * const lui = new LUIManager();
 * lui.setRootSize(800, 600);
 * const l1 = lui.createLayer("l1");
 * const l2 = lui.createLayer("l2");
 * ```
 *
 * // Here l1 and l2 both consume the entire space of 800x600.
 * // l1 is behind l2 and therefore l2 get events first (as one would expect).
 *
 *** Example part 2: container layout
 *
 * ```
 * const child1 = new LUIElement();
 * const child2 = new LUIElement();
 * l1.setContainerLayout(new LUISpaceLayout());
 * l1.addChild(child1);
 * l1.addChild(child2);
 *
 * // Here we add a child and define a layout for l1.
 * // l1 itself will consume the entire root-space. However, it's
 * // children won't. The parent layer (l1) need to set a container-layout
 * // so it can tell the children how to layout them self into the parent.
 *
 * child1.setLayoutProperty("dir", "top");
 * child1.setLayoutProperty("size", 20);
 * LUISpaceLayout.setLayoutTop(child2, 40); // helper method
 *
 * // Depending on the parents container-layout-object-type
 * // we can define properties to adjust the layout. For each container layouter
 * // there are different properties for the children available.
 *
 * // NOTE: Setting the child's layout parameter only effects how the
 * // child is placed. If we put a child into child1 we have to set everything
 * // again but this time for child1 as the parent (as one would expect in a tree).
 *
 * ```
 *** Example part 3: rendering
 *
 * ```
 * // LUIElements won't render anything unless a LUIStyle object is attached.
 * // A LUIStyle is a group of render instructions that are processed in the
 * // order of attachment. Multiple LUIElement can share the same instance of
 * // LUIStyle so they can be reused. But that is not enforced and depends
 * // on real-world-needs.
 *
 * // A LUIStyle is composed of LUIStyleElements. They do the actual drawing
 * // work and can more or less do what they want. Layout is already performed
 * // and a rendering object is provided to draw stuff to the screen.
 * ```
 *
 */
export class LUIManager {

    private _layer:LUILayer[] = [];
    private _listener:any = {};
    private _dirty:number = 0;
    private _rootSpace:LUIRect = new LUIRect();
    private _activeElement:LUIElement = null;
    private _downElement:LUIElement = null;
    private _time:number = 0;
    private _messageTemplate:{ message:string, eventData:any, source:LUIElement} = {
        message:"",
        eventData:null,
        source:null,
    };
    private lastElapsed:number = 0;
    private _pixelSize:number = 1;

    public getLayerAt(i:number):LUILayer {
        return this._layer[i];
    }

    public getLastElapsed():number {
        return this.lastElapsed;
    }

    public getRootSpace():LUIRect {
        return this._rootSpace;
    }

    getPixelSize(): number {
        return this._pixelSize;
    }

    setPixelSize(value: number) {
        this._pixelSize = value;
    }

    public getLayer(name:string):LUILayer {
        for (let i=0; i<this._layer.length; i++) {
            const l = this._layer[i];
            if (l.getName() == name)
                return l;
        }
        return null;
    }

    public getNumLayer():number {
        return this._layer.length;
    }

    public createLayer(name:string):LUILayer  {
        const l = new LUILayer(this);
        l.setName(name);
        this._layer.push(l);
        l.getPosition().setValues(this._rootSpace);
        this._dirty ++;
        return l;
    }

    public removeLayer(name:string):void {
        for (let i=0; i<this._layer.length; i++) {
            if (this._layer[i].getName() == name) {
                this._layer.splice(i, 1);
                break;
            }
        }
    }

    public getLayerByName(name:string):LUIElement {
        for (let i=0; i<this._layer.length; i++) {
            if (this._layer[i].getName() == name) {
                return this._layer[i];
            }
        }
        return null;
    }


    public makeDirty() {
        this._dirty ++;
    }

    public addListener(event: string, listener: any) {
        const events = this._listener[event] || [];
        events.push(listener);
        this._listener[event] = events;
    }

    public removeAllListener():void {
        this._listener = {};
    }

    public removeListener(event: string, listener: any) {
        const events = this._listener[event] as [];
        if (!events)
            return;
        for (let i=0; i<events.length; ) {
            if (events[i] == listener) {
                events.splice(i, 1);
            }
            else {
                i++;
            }
        }
    }

    public notifyEvent(event:string, eventData?:any) {
        const events = this._listener[event];
        if (!events)
            return;
        for (let i=0; i<events.length; i++) {
            events[i](eventData);
        }
    }

    public setRootSize(w:number, h:number) {
        this._rootSpace.setSize(w, h);
        for (let i=0; i<this.getNumLayer(); i++) {
            this._layer[i].getPosition().setValues(this._rootSpace);
        }
        this.makeDirty();
    }

    public updateLayout(force:boolean = false) {
        if (!force && this._dirty == 0)
            return;
        const subDirty = this._dirty;
        for (let i=0; i<this._layer.length; i++) {
            this._layer[i].doLayout();
        }
        this._dirty -= subDirty;
        this.notifyEvent("layout");
    }

    public renderToCanvas(elapsed:number, gfx:FatRenderer) {
        this.lastElapsed = elapsed;
        gfx.beginDirectDraw();
        this._time += elapsed;
        for (let i=0; i<this._layer.length; i++) {
            this._layer[i].drawToCanvas(gfx, 0);
        }
        gfx.endDirectDraw();
    }

    /** returns the UI time */
    public getTime():number {
        return this._time;
    }

    public getActiveElement():LUIElement {
        return this._activeElement;
    }

    public getDownElement():LUIElement {
        return this._downElement;
    }

    public sendMessage(source:LUIElement, message:string, eventData?:any) {

        this._messageTemplate.source = source;
        this._messageTemplate.eventData = eventData;
        this._messageTemplate.message = message;

        this.notifyEvent('message', this._messageTemplate);
    }

    public logStructure() {
        const log = (e:LUIElement, depth) => {
            console.log(depth + "." + e.getName());
            for (let i=0; i<e.getNumChildren(); i++) {
                const child = e.getChildAt(i);
                log(child, depth + "." + e.getName());
            }
        };
        for (let i=0; i<this._layer.length; i++) {
            log(this._layer[i], '');
        }
    }

    public handleKeyDown(key:string):void {
        this.notifyEvent('key', {key, isDown: true});
    }

    public handleKeyUp(key:string):void {
        this.notifyEvent('key', {key, isDown: false});
    }

    public handleMouseDown(x:number, y:number):boolean {
        // this.logStructure();

        let downElement:LUIElement = null;
        let consumed = false;
        for (let i=this._layer.length-1; i>=0; i--) {
            const layer = this._layer[i];
            const consumes = layer.getConsumes();
            if (consumes == LUILayerConsume.None) // simply ingore this
                continue;
            if (!layer.isVisible()) // ignore hidden layer
                continue;

            const elements:LUIElement[] = [];
            layer.collectElementsAt(x, y, elements);


            // for (let e=0; e<elements.length; e++) {
            //     const el = elements[e];
            //     const parents = [];
            //     el.getParentList(parents);
            //     let outStr = "";
            //     for (let p of parents) {
            //         outStr = (outStr ? outStr  + "." : outStr) +  p.getName();
            //     }
            //
            //     console.log("UNDER MOUSE:", outStr);
            // }



            for (let e=0; e<elements.length; e++) {
                const candidate = elements[e];
                if (candidate == layer)
                    break; // layer itself cannot

                const consume = candidate.getElementConsumeBehavior();
                if (consume == LUIElementConsume.None)
                    continue;

                if (consume == LUIElementConsume.OnElement) {
                    downElement = candidate;
                    downElement.onMouseDown(x, y);
                    consumed = true;
                }
                else if (consume == LUIElementConsume.Active) {
                    downElement = candidate;
                    this._activeElement = candidate;
                    downElement.onMouseDown(x, y);
                    consumed = true;
                }
                break;
            }
            if (consumed)
                break;
            if (consumes == LUILayerConsume.All) {
                consumed = true;
                break;
            }
        }

        if (downElement) {
            const parents = [];
            downElement.getParentList(parents);
            let outStr = "";
            for (let p of parents) {
                outStr = (outStr ? outStr  + "." : outStr) +  p.getName();
            }

            console.log("MOUSE DOWN:", outStr);

            downElement.setMouseState(LUIMouseState.DownOnElement);
            this._downElement = downElement;
        }
        return consumed;
    }

    public handleMouseMove(x:number, y:number, isDown:boolean):boolean {
        if (!isDown)
            return true;

        if (this._activeElement) {
            const isOnElement = this._activeElement.isOnElement(x, y);
            if (!isOnElement) {
                this._downElement.onMouseMove(x, y, false);
                this._activeElement.setMouseState(LUIMouseState.DownNotOnElement);
            }
            else {
                this._downElement.onMouseMove(x, y, true);
                this._activeElement.setMouseState(LUIMouseState.DownOnElement);
            }
            return true;
        }

        if (this._downElement) {
            const isOnElement = this._downElement.isOnElement(x, y);
            if (!isOnElement) {
                this._downElement.onMouseMove(x, y, false);
                this._downElement.setMouseState(LUIMouseState.None);
                this._downElement = null;
            }
        }

        if (!this._downElement) {

            let consumed = false;
            for (let i=this._layer.length-1; i>=0; i--) {
                const layer = this._layer[i];
                const consumes = layer.getConsumes();
                if (consumes == LUILayerConsume.None) // simply ingore this
                    continue;
                if (!layer.isVisible()) // ignore hidden layer
                    continue;

                const elements:LUIElement[] = [];
                layer.collectElementsAt(x, y, elements);

                for (let e=0; e<elements.length; e++) {
                    const candidate = elements[e];
                    if (candidate == layer)
                        break; // layer itself cannot

                    const consume = candidate.getElementConsumeBehavior();
                    if (consume == LUIElementConsume.None)
                        continue;

                    if (consume == LUIElementConsume.OnElement) {
                        consumed = true;
                        candidate.onMouseMove(x, y, true);
                        this._downElement = candidate;
                    }
                    else if (consume == LUIElementConsume.Active) {
                        consumed = true;
                    }
                    break;
                }
                if (consumed)
                    break;
                if (consumes == LUILayerConsume.All) {
                    consumed = true;
                    break;
                }
            }

            if (!consumed) {
                return false;
            }
        }
        return true;
    }

    public handleMouseUp(x:number, y:number):boolean {
        if (this._activeElement) {
            this._activeElement.onMouseUp(x, y);
            this._activeElement.setMouseState(LUIMouseState.None);
            this._activeElement = null;
            this._downElement = null;
            return true;
        }

        if (this._downElement) {
            this._downElement.onMouseUp(x, y);
            this._downElement.setMouseState(LUIMouseState.None);
            this._downElement = null;
            return true;
        }

        let consumed = false;
        for (let i=this._layer.length-1; i>=0; i--) {
            const layer = this._layer[i];
            const consumes = layer.getConsumes();
            if (consumes == LUILayerConsume.None) // simply ingore this
                continue;
            if (!layer.isVisible()) // ignore hidden layer
                continue;

            const elements:LUIElement[] = [];
            layer.collectElementsAt(x, y, elements);

            for (let e=0; e<elements.length; e++) {
                const candidate = elements[e];
                if (candidate == layer)
                    break; // layer itself cannot

                const consume = candidate.getElementConsumeBehavior();
                if (consume == LUIElementConsume.None)
                    continue;

                if (consume == LUIElementConsume.OnElement) {
                    consumed = true;
                }
                else if (consume == LUIElementConsume.Active) {
                    consumed = true;
                }
                break;
            }
            if (consumed)
                break;
            if (consumes == LUILayerConsume.All) {
                consumed = true;
                break;
            }
        }

        if (!consumed) {
            return false;
        }

        return true;
    }


}
