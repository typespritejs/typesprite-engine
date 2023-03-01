/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUIElementConsume} from "@tsjs/engine/lui/LayoutUI";



/**
 * Meant to consume all mouse/touch events on this element and pass it along
 * to the given listener. The coordinates are translated to local space
 * so positions are relative to the layouted rectangle of LUIElement.
 *
 * @see LUICaptureTouchListener
 */
export class LUICaptureTouch extends LUIElement {

    constructor(private captureTouch:LUICaptureTouchListener) {
        super();
        this.setName("CaptureTouch");
        this.setElementConsumeBehavior(LUIElementConsume.Active)
    }

    public onMouseDown(x:number, y:number) {
        const xx = x - this.getPosition().getX() - this.getPadding().getLeft();
        const yy = y - this.getPosition().getY() - this.getPadding().getTop();
        this.captureTouch.onMouseDown(xx, yy);
    }
    public onMouseMove(x:number, y:number, isOnElement:boolean) {
        const xx = x - this.getPosition().getX() - this.getPadding().getLeft();
        const yy = y - this.getPosition().getY() - this.getPadding().getTop();
        this.captureTouch.onMouseMove(xx, yy, isOnElement);
    }
    public onMouseUp(x:number, y:number) {
        const xx = x - this.getPosition().getX() - this.getPadding().getLeft();
        const yy = y - this.getPosition().getY() - this.getPadding().getTop();
        this.captureTouch.onMouseUp(xx, yy);
    }
}

/**
 * Target interface for LUICaptureTouch and allows receiveing of touch input
 *
 * @see LUICaptureTouch
 */
export interface LUICaptureTouchListener {
    /**
     * Mouse/Touch down
     *
     * @param x 0 means left on the retangle
     * @param y 0 means top on the retangle
     */
    onMouseDown(x: number, y: number);
    /**
     * Mouse/Touch down
     *
     * @param x 0 means left on the retangle
     * @param y 0 means top on the retangle
     */
    onMouseMove(x: number, y: number, isOnElement: boolean);
    /**
     * Mouse/Touch down
     *
     * @param x 0 means left on the retangle
     * @param y 0 means top on the retangle
     */
    onMouseUp(x: number, y: number);
}