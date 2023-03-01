/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIContainerLayouter} from "../LayoutUI";
import {LUIElement} from "../LUIElement";


/**
 * All children will simply have the same size as the parent.
 *
 * Two main design purposes here:
 *
 * 1. Multiple glass panes
 * One can stack many layers ontop of each other and they
 * can share the screen.
 *
 * 2. Tabbar Panel
 * Think of a tab bar with multiple panels containing the content
 * of the tabs. Using `LUIStackLayout.focusChild` we can switch from one content
 * to another (by making use of the visibility).
 */
export class LUIStackLayout implements LUIContainerLayouter {


    perform(e: LUIElement): void {
        const width = e.getWidth();
        const height = e.getHeight();
        let xx = e.getLeft();
        let yy = e.getTop();

        // const restXLayouts:any[] = null;
        // const restYLayouts:any[] = null;

        for (let i=0; i<e.getNumChildren(); i++) {
            const child = e.getChildAt(i);
            if (!child.isVisible())
                continue;

            if (width <= 0 || height <= 0) {
                child.getPosition().setAll(0);
                continue;
            }

            child.getPosition()
                .setX(xx)
                .setY(yy)
                .setWidth(width)
                .setHeight(height)
            ;
        }
    }

    /**
     * Sets the given child to visible and hides
     * all others.
     *
     * This is meant to be used for things like:
     * tab-bar-content. Think of multiple children
     * all cover the same space. Only one is visible
     * and when a user selects a tab this function
     * will make the tab-content visible.
     */
    public static focusChild(parent:LUIElement, child:LUIElement):void {
        for (let i=0; i<parent.getNumChildren(); i++) {
            const ch = parent.getChildAt(i);
            if (ch == child) {
                ch.setVisible(true);
            }
            else {
                ch.setVisible(false);
            }
        }
    }

}


