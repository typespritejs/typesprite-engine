/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIContainerLayouter} from "@tsjs/engine/lui/LayoutUI";
import {LUIElement} from "@tsjs/engine/lui/LUIElement";


/**
 * All children will have the same size as the parent.
 *
 * However, we can adjust the inner space a child consumes:
 *
 * ```
 * // Example of utility function "layout"
 * LUIFreeStackLayout.layout(elem, {
 *   top: 10,      // start 10 pixels from top border of the parent
 *   right: 0.3,   // right end is 30% from the right border of the parent
 *   bottom: 10,   // end 10 pixels before bottom border of the parent
 *   width: 0.5,   // let it have a width of 50% of the x axis
 * })
 *
 * // Example of utility function "layout"
 * LUIFreeStackLayout.layout(elem, {
 *   width: 200,   // elem is 200px width and x-centered (bc. right is missing)
 *   top: 0,       // elem is aligned from top
 *   height: 30,   // elem is 30px height
 * }
 * ```
 *
 */
export class LUIFreeStackLayout implements LUIContainerLayouter {


    public static readonly PropLeft = "Left";
    public static readonly PropTop = "Top";
    public static readonly PropBottom = "Bottom";
    public static readonly PropRight = "Right";
    public static readonly PropWidth = "Width";
    public static readonly PropHeight = "Height";

    private outStart:number;
    private outEnd:number;

    private calcAxisValue(axisStart, axisEnd, start, end, size) {
        const startPx = start > 0 && start < 1 ? Math.floor(start * (axisEnd - axisStart)) : start;
        const endPx = end > 0 && end < 1 ? Math.floor(end * (axisEnd - axisStart)) : end;
        const sizePx = size > 0 && size < 1 ? Math.floor(size * (axisEnd - axisStart)) : size;

        this.outStart = axisStart;
        this.outEnd = axisEnd;

        const startExists = typeof start != "undefined";
        const endExists = typeof end != "undefined";
        const sizeExists = typeof size != "undefined";

        // left: 0, right: 0, width: 10
        if (startExists && endExists) {
            this.outStart = axisStart + startPx;
            this.outEnd = axisEnd - endPx;
            // width ignored
        }
        else if (sizeExists) {
            if (!startExists && !endExists) {
                this.outStart = axisStart + (axisEnd - axisStart) * 0.5 - size*0.5;
                this.outEnd = this.outStart + size;
            }
            else {
                if (startExists) {
                    this.outStart = axisStart + startPx;
                    this.outEnd = axisStart + startPx + sizePx;
                }
                if (endExists) {
                    this.outStart = axisEnd - endPx - sizePx;
                    this.outEnd = axisEnd - endPx;
                }
            }
        }
        else {
            if (startExists) {
                this.outStart = axisStart + startPx;
            }
            if (endExists) {
                this.outEnd = axisEnd - endPx;
            }
        }
    }

    perform(e: LUIElement): void {
        const rectLeft = e.getLeft();
        const rectRight = e.getRight();
        const rectTop = e.getTop();
        const rectBottom = e.getBottom();

        for (let i=0; i<e.getNumChildren(); i++) {
            const child = e.getChildAt(i);
            if (!child.isVisible())
                continue;

            if (e.getWidth() <= 0 || e.getHeight() <= 0) {
                child.getPosition().setAll(0);
                continue;
            }

            const left = child.getLayoutProperty(LUIFreeStackLayout.PropLeft);
            const right = child.getLayoutProperty(LUIFreeStackLayout.PropRight);
            const width = child.getLayoutProperty(LUIFreeStackLayout.PropWidth);

            const top = child.getLayoutProperty(LUIFreeStackLayout.PropTop);
            const bottom = child.getLayoutProperty(LUIFreeStackLayout.PropBottom);
            const height = child.getLayoutProperty(LUIFreeStackLayout.PropHeight);

            this.calcAxisValue(
                rectLeft,
                rectRight,
                left,
                right,
                width
            )
            child.getPosition().setX(this.outStart).setWidth(this.outEnd - this.outStart)

            this.calcAxisValue(
                rectTop,
                rectBottom,
                top,
                bottom,
                height
            )
            child.getPosition().setY(this.outStart).setHeight(this.outEnd - this.outStart)

        }
    }

    public static resetLayout(target:LUIElement) {

        target.unsetLayoutProperty(LUIFreeStackLayout.PropTop);
        target.unsetLayoutProperty(LUIFreeStackLayout.PropLeft);
        target.unsetLayoutProperty(LUIFreeStackLayout.PropRight);
        target.unsetLayoutProperty(LUIFreeStackLayout.PropBottom);
        target.unsetLayoutProperty(LUIFreeStackLayout.PropWidth);
        target.unsetLayoutProperty(LUIFreeStackLayout.PropHeight);

    }

    public static layout(target:LUIElement, layoutProps:{top?:number,left?:number,right?:number,bottom?:number,width?:number,height?:number}) {
        if (typeof layoutProps.top !== "undefined")
            target.setLayoutProperty(LUIFreeStackLayout.PropTop, layoutProps.top);
        if (typeof layoutProps.left !== "undefined")
            target.setLayoutProperty(LUIFreeStackLayout.PropLeft, layoutProps.left);
        if (typeof layoutProps.right !== "undefined")
            target.setLayoutProperty(LUIFreeStackLayout.PropRight, layoutProps.right);
        if (typeof layoutProps.bottom !== "undefined")
            target.setLayoutProperty(LUIFreeStackLayout.PropBottom, layoutProps.bottom);
        if (typeof layoutProps.width !== "undefined")
            target.setLayoutProperty(LUIFreeStackLayout.PropWidth, layoutProps.width);
        if (typeof layoutProps.height !== "undefined")
            target.setLayoutProperty(LUIFreeStackLayout.PropHeight, layoutProps.height);
    }

}


