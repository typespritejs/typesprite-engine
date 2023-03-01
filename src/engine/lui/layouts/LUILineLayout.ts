/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIContainerLayouter} from "../LayoutUI";
import {LUIElement} from "../LUIElement";


/**
 * Aligns all children along the x-axis or y-axis.
 *
 * ```
 * LUILineLayout.createXAligned(...) << Horizontal Layout
 * LUILineLayout.createYAligned(...) << Vertical Layout
 * ```
 *
 * All elements have the same size (per default). The counter-axis size always fills
 * the entire parent.
 *
 */
export class LUILineLayout implements LUIContainerLayouter {

    public static readonly AxisX:string = "x";
    public static readonly AxisY:string = "y";

    // public static readonly PropAxis:string = "axis";
    // public static readonly PropSize:string = "size";



    private constructor(private isX:boolean, private elementSize:number, private space:number) {
    }

    static createXAligned(elementSize:number, space:number = 0) {
        return new LUILineLayout(true, elementSize, space);
    }

    static createYAligned(elementSize:number, space:number = 0) {
        return new LUILineLayout(false, elementSize, space);
    }


    perform(e: LUIElement): void {

        const isX = this.isX;
        const lineAxisSpace = isX ? e.getWidth() : e.getHeight();
        const lineSize = !isX ? e.getWidth() : e.getHeight();
        let elemSize = this.elementSize; // size of each child
        let spaceBetween = 0;

        // ---------------------------------------
        //  |       |       |
        //  |       |       |
        // ---------------------------------------
        //  ^^^^^^^^^^^^^^^^^
        //
        // 1. determine consumedSpace amount of space the children
        //   would consume if not modified
        //
        // 2. collect all active/visible children
        let consumedSpace = 0;
        const consideredChildren = [];
        for (let i=0; i<e.getNumChildren(); i++) {
            const child = e.getChildAt(i);
            if (!child.isVisible())
                continue;
            consumedSpace += elemSize;
            consideredChildren.push(child);
        }

        if (consumedSpace > lineAxisSpace) {
            // all elements combined use more space than we actually have
            // reduced size of the child
            elemSize = lineAxisSpace / consideredChildren.length;
            consumedSpace = lineAxisSpace;
        }
        else {
            // if the content does not require all the space
            // we can grant space-between the elements if/as configured.
            //
            // |     [AAA] [BBB] [CCC]      |
            //            ^     ^
            //            |     Space between
            //            Space between
            //
            // Space-between adds, for every child > 1, one amount of space to the result.
            //
            // We need also to make sure that the result is not larger than the granted
            // parent space. So if a parent shrinks it should first shrink the space
            // between the elements.
            if (this.space > 0 && consideredChildren.length > 1) {
                const numSpaces = consideredChildren.length - 1;
                spaceBetween = this.space;
                if (consumedSpace + numSpaces * spaceBetween > lineAxisSpace) {
                    spaceBetween = (lineAxisSpace - consumedSpace) / numSpaces;
                }
                consumedSpace += spaceBetween*numSpaces;
            }
        }

        const halfElemSize = elemSize * 0.5;
        const pos = !isX ? e.getLeft() : e.getTop();
        let posAxis = (isX ? e.getLeft() : e.getTop()) + lineAxisSpace*0.5 - consumedSpace*0.5 + halfElemSize;


        for (let i=0; i<consideredChildren.length; i++) {
            const child = consideredChildren[i];
            if (!child.isVisible())
                continue;

            if (isX) {
                child.getPosition().set(
                    posAxis - halfElemSize,
                    pos,
                    elemSize,
                    lineSize,
                );
            }
            else {
                child.getPosition().set(
                    pos,
                    posAxis - halfElemSize,
                    lineSize,
                    elemSize,
                );
            }

            posAxis += elemSize + spaceBetween;
        }


    }


}


