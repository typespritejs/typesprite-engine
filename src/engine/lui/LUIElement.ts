/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIStyle, LUIStyleElement} from "./LUIStyle";
import {LUIBorder, LUIClipBehavior, LUIContainerLayouter, LUIElementConsume, LUIMouseState, LUIPos} from "./LayoutUI";
import {LUIManager} from "./LUIManager";
import {FatRenderer, ScissorMode} from "@tsjs/engine/tt2d/FatRenderer";
import {LUIRect} from "./LUIRect";
import {Rect} from "@tsjs/engine/tt2d/Rect";
import {AffineMatrix} from "@tsjs/engine/tt2d/AffineMatrix";


/**
 * LUIElement serves the following multiple purposes:
 *
 *  - It organizes the UI as parent/child tree
 *  - It represents a Rectangle: getLeft, getTop, getRight, etc.
 *  - It's size is always defined by it's parent LUIContainerLayouter
 *  - Provides Layout-Properties that helps the parent to set the layout.
 *  - Holds styles for rendering
 *
 *  There are 3 main states to consider:
 *
 *** visible
 *
 *  If not visible the object will be ignored in layout and won't
 *  receive any input events (or generate any)
 *
 *** inactive TODO implement this
 *
 *  If inactive the element consumes events but won't notify
 *  any messages (e.g. an inactive button cannot be pressed. but
 *  the events won't be transferred through it - unless configured otherwise ;).
 *
 *  Children too?
 *
 *** noRender TODO implement this
 *
 *  This deactivates the draw-call for this element and it's children.
 *
 *  Children too?
 *
 *
 */
export class LUIElement {

    private static PlaceHolderArray = [];

    /** The current absolute position on screen in pixel */
    private _position:LUIRect = new LUIRect();
    /** Absolute padding on screen in pixel */
    private _padding:LUIBorder = new LUIBorder();
    /** Offset position appended to all position values */
    private _offset:LUIPos = new LUIPos();
    private _parent:LUIElement = null;
    private _children:LUIElement[] = null;
    /** Defines the layout of it's children */
    private _containerLayouter:LUIContainerLayouter = null;
    /**
     * properties to render and layout this element
     */
    private _layoutProps:any = null;
    private _name:string = "";
    private _style:LUIStyle = null;
    private _elementConsume:LUIElementConsume = LUIElementConsume.None;
    private _mouseState:LUIMouseState = LUIMouseState.None;
    private _visible:boolean = true;
    private _inactive:boolean = false;
    private _noRender:boolean = false;
    private _clippingMode:LUIClipBehavior = LUIClipBehavior.None;
    private _tmpScissorRect:Rect = new Rect();
    private _transform:AffineMatrix = null;
    private _transformTmp:AffineMatrix = null;
    private _transformOnPadding:boolean = false;

    public setContainerLayout(layouter:LUIContainerLayouter):void {
        this._containerLayouter = layouter;
        this.makeDirty();
    }

    public setLayoutProperty(name:string, val):LUIElement {
        const props = this._layoutProps || [];
        props[name] = val;
        this._layoutProps = props;
        this.makeDirty();
        return this;
    }

    public unsetLayoutProperty(name:string):LUIElement {
        const props = this._layoutProps || [];
        if (typeof props[name] !== "undefined")
            delete props[name];
        this._layoutProps = props;
        this.makeDirty();
        return this;
    }

    public setStyle(style:LUIStyle):LUIElement {
        if (this._style != style)
            this.makeDirty();
        this._style = style;
        return this;
    }

    public getStyle():LUIStyle {
        return this._style;
    }

    /**
     * Comfort method to append a style element.
     * If no style object is set a new one is created.
     *
     * Be careful, this can cause issues with shared styles
     */
    public addStyleElement(elem:LUIStyleElement):LUIElement {
        this._style = this._style || new LUIStyle();
        this._style.addElement(elem);
        return this;
    }

    /**
     * If set to a not-None value this will ensure that all content and children
     * cannot render outside of the border of this element.
     *
     * LUIClipBehavior.None // No clipping. Pixels are visible in all cases.
     * LUIClipBehavior.ElementBox // Only pixels within the box of the element will be visible
     * LUIClipBehavior.IgnorePaddingBox // Only pixels within the box + padding of the element will be visible
     */
    public setClippingMode(v:LUIClipBehavior):LUIElement {
        this._clippingMode = v;
        return this;
    }

    public getClippingMode():LUIClipBehavior {
        return this._clippingMode;
    }

    public getLayoutProperty(name:string):any {
        return (this._layoutProps || typeof this._layoutProps == "number") ? this._layoutProps[name] : null;
    }

    public getContainerLayout():LUIContainerLayouter {
        return this._containerLayouter;
    }

    public getElementConsumeBehavior():LUIElementConsume {
        return this._elementConsume;
    }

    public setElementConsumeBehavior(v:LUIElementConsume):void {
        this._elementConsume = v;
    }

    public getMouseState():LUIMouseState {
        return this._mouseState;
    }

    public setMouseState(v:LUIMouseState):void {
        this._mouseState = v;
    }

    public isVisible():boolean {
        return this._visible;
    }

    public setVisible(v:boolean):void {
        if (this._visible != v)
            this.makeDirty();
        this._visible = v;
    }

    public setName(v:string):LUIElement {
        this._name = v;
        return this;
    }

    public getName():string {
        return this._name;
    }

    public getChildAt(i:number):LUIElement {
        return this._children == null ? null : this._children[i];
    }

    public getNumChildren():number {
        return this._children == null ? 0 : this._children.length;
    }

    public setChild(index:number, e:LUIElement):LUIElement {
        if (!this._children || index < 0 || index >= this._children.length)
            throw new Error("setChild index out of range.");

        if (e._parent && e._parent != this) {
            e._parent.dropChild(e);
        }

        const old = this._children[index];
        old._parent = null;
        // old._context = null;
        old.onDetach(this);

        e._parent = this;
        // e._context = this._context;
        this.makeDirty();
        this._children[index] = e;
        e.onAttach(this);
        return old;
    }

    /** search for a children's index in this parent. -1 if not present */
    getChildIndexByName(name:string):number {
        const children = this._children||LUIElement.PlaceHolderArray;
        for (let i=0; i<children.length; i++) {
            if (children[i]._name == name)
                return i;
        }
        return -1;
    }

    public addChild(e:LUIElement) {
        if (e == this) {
            debugger
            console.error("myLUIElement.addChild(myLUIElement) not allowed!");
            return;
        }

        if (e._parent) {
            e._parent.dropChild(e);
        }

        const children = this._children||[];
        children.push(e);
        e._parent = this;
        // e._context = this._context;
        e.makeDirty();
        this._children = children;
        e.onAttach(this);
    }


    public dropAllChildren() {
        while(this.getNumChildren() > 0) {
            const child = this.getChildAt(0);
            this.dropChild(child);
        }
    }

    public dropChild(e:LUIElement) {
        const children = this._children||LUIElement.PlaceHolderArray;
        for (let i=0; i<children.length; ) {
            if (children[i] == e) {
                children.splice(i, 1);
                e.onDetach(this);
                this.makeDirty();
            }
            else {
                i++
            }
        }
    }

    public doLayout():void {
        if (!this._visible)
            return;

        if (this._containerLayouter)
            this._containerLayouter.perform(this);
        const children = this._children||LUIElement.PlaceHolderArray;
        for (let i=0; i<children.length; i++) {
            children[i].doLayout();
        }
    }

    public onDetach(oldParent:LUIElement):void {
    }

    public onAttach(newParent:LUIElement):void {
    }

    public getManager():LUIManager {
        if (!this._parent)
            return null;

        return this._parent.getManager();
    }

    public getParent():LUIElement {
        return this._parent;
    }

    public getPosition():LUIRect {
        return this._position;
    }
    public getOffset():LUIPos {
        return this._offset;
    }
    public getPadding():LUIBorder {
        return this._padding;
    }

    public getLeft():number {
        const vv = this._position.getX() + this._padding.getLeft() + this._offset.getX();
        return vv;
    }
    public getTop():number {
        const vv = this._position.getY() + this._padding.getTop() + this._offset.getY();
        return vv;
    }

    public getRight():number {
        const vv = this._position.getX() + this._position.getWidth() - this._padding.getRight() + this._offset.getX();
        return vv;
    }

    public getBottom():number {
        const vv = this._position.getY() + this._position.getHeight() - this._padding.getBottom() + this._offset.getY();
        return vv;
    }

    public getWidth():number {
        return this.getRight() - this.getLeft();
    }

    public getHeight():number {
        return this.getBottom() - this.getTop();
    }

    /** true => the resulting space is negative or zero */
    public isReverse():boolean {
        return this.getWidth() <= 0 || this.getHeight() <= 0;
    }


    public getLeftNoPadding():number {
        const vv = this._position.getX() + this._offset.getX();
        return vv;
    }
    public getTopNoPadding():number {
        const vv = this._position.getY() + this._offset.getY();
        return vv;
    }

    public getRightNoPadding():number {
        const vv = this._position.getX() + this._position.getWidth() + this._offset.getX();
        return vv;
    }

    public getBottomNoPadding():number {
        const vv = this._position.getY() + this._position.getHeight() + this._offset.getY();
        return vv;
    }

    public getWidthNoPadding():number {
        return this.getRightNoPadding() - this.getLeftNoPadding();
    }

    public getHeightNoPadding():number {
        return this.getBottomNoPadding() - this.getTopNoPadding();
    }

    public isReverseNoPadding():boolean {
        return this.getWidthNoPadding() <= 0 || this.getHeightNoPadding() <= 0;
    }

    public makeDirty() {
        if (this.getManager())
            this.getManager().makeDirty();
        // if (this._context)
        //     this._context.makeDirty();
    }

    public drawToCanvas(gfx:FatRenderer, depth:number):void {
        if (!this._visible)
            return;

        if (this._transform) {
            this._transformTmp = this._transformTmp || new AffineMatrix();
            this._transformTmp.copyValues(gfx.getRootMatrix());
            const e = this;
            if (this._transformOnPadding) {
                gfx.getRootMatrix().translate(
                    e.getLeftNoPadding() + e.getWidthNoPadding() * 0.5,
                    e.getTopNoPadding() + e.getHeightNoPadding() * 0.5,
                );
            }
            else {
                gfx.getRootMatrix().translate(
                    e.getLeft() + e.getWidth() * 0.5,
                    e.getTop() + e.getHeight() * 0.5,
                );
            }

            gfx.getRootMatrix().multiply(this._transform);

            if (this._transformOnPadding) {
                gfx.getRootMatrix().translate(
                    -e.getLeftNoPadding() - e.getWidthNoPadding() * 0.5,
                    -e.getTopNoPadding() - e.getHeightNoPadding() * 0.5,
                );
            }
            else {
                gfx.getRootMatrix().translate(
                    -e.getLeft() - e.getWidth() * 0.5,
                    -e.getTop() - e.getHeight() * 0.5,
                );
            }
            this.internDrawToCanvas(gfx, depth);

            gfx.getRootMatrix().copyValues(this._transformTmp);
        }
        else {
            this.internDrawToCanvas(gfx, depth);
        }
    }

    private internDrawToCanvas(gfx:FatRenderer, depth:number):void {
        const clipped = this._clippingMode != LUIClipBehavior.None;
        let wasScissor = false;

        if (clipped) {
            wasScissor = gfx.isScissorModeEnabled();  //gfx.getScissorMode() != ScissorMode.None;// .isScissorModeEnabled();
            this._tmpScissorRect.copy(gfx.getScissorStore());

            const ps = this.getManager().getPixelSize();

            switch(this._clippingMode) {
                case LUIClipBehavior.ElementBox:
                    gfx.setScissorRect(
                        this.getLeft()*ps,
                        this.getTop()*ps,
                        this.getRight()*ps,
                        this.getBottom()*ps,
                    );
                    break;
                case LUIClipBehavior.IgnorePaddingBox:
                    gfx.setScissorRect(
                        this.getLeftNoPadding()*ps,
                        this.getTopNoPadding()*ps,
                        this.getRightNoPadding()*ps,
                        this.getBottomNoPadding()*ps,
                    );
                    break;
            }
        }

        const style = this.getStyle();
        if (style) {
            style.render(this, gfx);
        }

        const children = this._children||LUIElement.PlaceHolderArray;
        for (let i=0; i<children.length; i++) {
            children[i].drawToCanvas(gfx, depth + 1);
        }

        if (clipped) {
            if (wasScissor) {
                gfx.setScissorRect(
                    this._tmpScissorRect.x,
                    this._tmpScissorRect.y,
                    this._tmpScissorRect.width,
                    this._tmpScissorRect.height,
                );
            }
            else {
                gfx.unsetScissorRect();
            }
        }
    }

    /**
     * Fills this LUIElement and all it's parent up to the root
     * into the provided array.
     */
    public getParentList(targetList:LUIElement[]):void {
        if (this._parent)
            this._parent.getParentList(targetList);
        targetList.push(this);
    }

    public debugDraw(gfx:CanvasRenderingContext2D, depth:number, mousePos:LUIPos, withLabel:boolean):void {
        if (!this._visible)
            return;

        this.selfDebugDraw(gfx, depth, mousePos, withLabel);
        const children = this._children||LUIElement.PlaceHolderArray;
        for (let i=0; i<children.length; i++) {
            children[i].debugDraw(gfx, depth + 1, mousePos, withLabel);
        }
    }

    protected selfDebugDraw(gfx:CanvasRenderingContext2D, depth:number, mousePos, withLabel) {

        gfx.fillStyle = "rgba(0, 128, 255, 0.05)";
        gfx.fillRect(
            this.getLeft(),
            this.getTop(),
            this.getWidth(),
            this.getHeight()
        );

        gfx.strokeStyle = "rgba(255, 255, 0, 0.7";
        gfx.strokeRect(
            this.getLeftNoPadding(),
            this.getTopNoPadding(),
            this.getWidthNoPadding(),
            this.getHeightNoPadding()
        );

        gfx.strokeStyle = "rgba(255, 0, 255, 0.3";
        gfx.strokeRect(
            this.getLeft(),
            this.getTop(),
            this.getWidth(),
            this.getHeight()
        );

        if (this._name && this.getWidth() > 0 && withLabel) {
            gfx.fillStyle = "rgba(255, 255, 255, 1)";
            gfx.fillText(this._name, this.getLeft(), this.getTop(), this.getWidth());
        }
    }

    /**
     * Pushes this element and all their children into the
     * "collectedElements" container if they spatially collide with x,y.
     *
     * The top-most element will have the index [0].
     *
     * It is possible (thanks to offsets, etc) that a child is in
     * here while the parent is not.
     */
    public collectElementsAt(x:number, y:number, collectedElements:LUIElement[]):void {

        if (!this.isVisible())
            return;

        const isOnElement = this.isOnElement(x, y);

        const len = this.getNumChildren();
        for (let i=len-1; i>=0; i--) {
            const child = this.getChildAt(i);
            child.collectElementsAt(x, y, collectedElements);
        }

        if (isOnElement)
            collectedElements.push(this);
    }

    public isOnElement(x:number, y:number):boolean {
        if (!this.isVisible())
            return;

        const left = this.getLeft();
        const top = this.getTop();
        const right = this.getRight();
        const bottom = this.getBottom();

        const isOut = (
            x < left ||
            y < top ||
            x > right ||
            y > bottom
        );

        return !isOut;
    }

    public isActiveElement() {
        return this.getManager().getActiveElement() == this;
    }

    public isDownElement() {
        return this.getManager().getDownElement() == this;
    }

    /**
     * Use getTransform() to manipulate the animation matrix.
     *
     * Transform is NOT considered during input. It's animation only
     */
    public setTransformEnable(enable:boolean=true, onPaddingSpace:boolean = false):LUIElement {
        if (enable) {
            if (!this._transform)
                this._transform = new AffineMatrix();
        }
        else {
            this._transform = null;
        }
        this._transformOnPadding = onPaddingSpace;
        return this;
    }

    public getTransform():AffineMatrix {
        return this._transform;
    }

    public onMouseDown(x:number, y:number) {
    }
    public onMouseMove(x:number, y:number, isOnElement:boolean) {
    }
    public onMouseUp(x:number, y:number) {
    }

    public getChildIndex(child:LUIElement) {
        const children = this._children || [];
        let oldIndex = -1;
        for (let i = 0; i < children.length; i++) {
            if (children[i] === child) {
                oldIndex = i;
                break;
            }
        }
        return oldIndex;
    }

    public setChildIndex(child:LUIElement, newIndex:number) {
        const children = this._children || [];
        let oldIndex = this.getChildIndex(child);
        if (oldIndex === -1) {
            console.error("setChildIndex failed. Not a child.");
            return;
        }
        if (oldIndex === newIndex) {
            return;
        }
        if (newIndex < 0 || newIndex >= children.length) {
            console.error("setChildIndex failed. newIndex out of bounds", newIndex, children);
            return;
        }

        children.splice(oldIndex, 1);
        children.splice(newIndex, 0, child);
    }
}