/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIContainerLayouter} from "../LayoutUI";
import {LUIElement} from "../LUIElement";


/**
 * Consumes the entire space of the parent.
 *
 * Each child can consume a varying amount of it's parent's space.
 * This is highly order dependent.
 *
 * ```
 * Child-Layout-Properties:
 *
 *  - dir:string    // "left", "right", "top", "bottom"
 *  - size:number   // amount of space the element wants to consume
 *  - rest: string  // "x" or "y"
 *
 * space:
 *   0              // 0 pixel
 *   0.5            // 50% of the space
 *   1              // 1 pixel
 *   10             // 10 pixel
 * ```
 *
 */
export class LUISpaceLayout implements LUIContainerLayouter {

    public static readonly DirRight:string = "right";
    public static readonly DirLeft:string = "left";
    public static readonly DirTop:string = "top";
    public static readonly DirBottom:string = "bottom";
    public static readonly AxisX:string = "x";
    public static readonly AxisY:string = "y";

    public static readonly PropDir:string = "dir";
    public static readonly PropSize:string = "size";
    public static readonly PropRest:string = "rest";

    constructor() {

    }

    private isXAxis(dir:any) {
        if (dir == LUISpaceLayout.DirRight ||
            dir == LUISpaceLayout.DirLeft) {
            return true;
        }
    }

    private isYAxis(dir:any) {
        if (dir == LUISpaceLayout.DirTop ||
            dir == LUISpaceLayout.DirBottom) {
            return true;
        }
    }

    perform(e: LUIElement): void {
        const width = e.getWidth();
        const height = e.getHeight();
        let restWidth = width;
        let restHeight = height;
        let xx = e.getLeft();
        let yy = e.getTop();

        const restXLayouts:any[] = null;
        const restYLayouts:any[] = null;

        for (let i=0; i<e.getNumChildren(); i++) {
            const child = e.getChildAt(i);
            if (!child.isVisible())
                continue;

            if (restWidth <= 0 || restHeight <= 0) {
                child.getPosition().setAll(0);
                continue;
            }

            const dir = child.getLayoutProperty("dir");
            const size = child.getLayoutProperty("size");
            const rest = child.getLayoutProperty("rest");

            if (!rest && (!size && size !== 0 || !dir)) {
                console.error("LUISpaceLayout Missing property. On child: " + child.getName());
                child.getPosition().setAll(0);
                continue;
            }

            if (rest == LUISpaceLayout.AxisX) {
                const rl = restXLayouts || [];
                rl.push(e);
                child.getPosition()
                    .setX(xx)
                    .setY(yy)
                    .setWidth(restWidth)
                    .setHeight(restHeight)
                ;
            }
            else if (rest == LUISpaceLayout.AxisY) {
                const rl = restYLayouts || [];
                rl.push(e);
                child.getPosition()
                    .setX(xx)
                    .setY(yy)
                    .setWidth(restWidth)
                    .setHeight(restHeight)
                ;
            }
            else {

                let effectiveSize = size;
                if (size > 0 && size < 1) {
                    effectiveSize = this.isXAxis(dir)
                        ? Math.round(size * width)
                        : Math.round(size * height);
                }

                let childX = xx;
                let childY = yy;
                let childW = restWidth;
                let childH = restHeight;

                if (dir == LUISpaceLayout.DirRight) {
                    childX = xx + restWidth - effectiveSize;
                    childW = effectiveSize;
                    restWidth -= effectiveSize;
                }
                else if (dir == LUISpaceLayout.DirLeft) {
                    childW = effectiveSize;
                    restWidth -= effectiveSize;
                    xx += effectiveSize;
                }
                else if (dir == LUISpaceLayout.DirTop) {
                    childH = effectiveSize;
                    restHeight -= effectiveSize;
                    yy += effectiveSize;
                }
                else if (dir == LUISpaceLayout.DirBottom) {
                    childY = yy + restHeight - effectiveSize;
                    childH = effectiveSize;
                    restHeight -= effectiveSize;
                }
                else {
                    childX = 0; // invalid direction
                    childY = 0;
                    childW = 0;
                    childH = 0;
                }
                child.getPosition()
                    .setX(childX)
                    .setY(childY)
                    .setWidth(childW)
                    .setHeight(childH)
                ;
            }
        }



        const numRestX = restXLayouts == null ? 0 : restXLayouts.length;
        if (numRestX > 0) {
            if (restWidth <= 0)
            {
                for (let i=0; i<numRestX; i++) {
                    (restXLayouts[i] as LUIElement)
                        .getPosition()
                        .setWidth(0);
                }
            }
            else {
                for (let i=0; i<numRestX; i++) {
                    const restSpacePart = restWidth / numRestX;
                    (restXLayouts[i] as LUIElement)
                        .getPosition()
                        .setWidth(Math.round(restSpacePart));
                }
            }
        }


        const numRestY = restYLayouts == null ? 0 : restYLayouts.length;
        if (numRestY > 0) {
            if (restHeight <= 0)
            {
                for (let i=0; i<numRestY; i++) {
                    (restYLayouts[i] as LUIElement)
                        .getPosition()
                        .setHeight(0);
                }
            }
            else {
                const restSpacePart = restHeight / numRestY;
                for (let i=0; i<numRestY; i++) {
                    (restYLayouts[i] as LUIElement)
                        .getPosition()
                        .setHeight(Math.round(restSpacePart));
                }
            }
        }
    }

    public static setLayoutRight(e:LUIElement, size:number):void {
        e.setLayoutProperty(this.PropDir, this.DirRight);
        e.setLayoutProperty(LUISpaceLayout.PropSize, size);
    }

    public static setLayoutTop(e:LUIElement, size:number):void {
        e.setLayoutProperty(this.PropDir, this.DirTop);
        e.setLayoutProperty(LUISpaceLayout.PropSize, size);
    }

    public static setLayoutBottom(e:LUIElement, size:number):void {
        e.setLayoutProperty(this.PropDir, this.DirBottom);
        e.setLayoutProperty(LUISpaceLayout.PropSize, size);
    }

    public static setLayoutLeft(e:LUIElement, size:number):void {
        e.setLayoutProperty(this.PropDir, this.DirLeft);
        e.setLayoutProperty(LUISpaceLayout.PropSize, size);
    }

    /** @deprecated */
    public static setLayoutRestX(e:LUIElement):void {
        e.setLayoutProperty(this.PropRest, this.AxisX);
    }

    /** @deprecated */
    public static setLayoutRestY(e:LUIElement):void {
        e.setLayoutProperty(this.PropRest, this.AxisY);
    }

    public static setLayoutRest(e:LUIElement):void {
        e.setLayoutProperty(this.PropRest, this.AxisX);
    }

}


