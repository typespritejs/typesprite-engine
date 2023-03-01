/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIStyleElement} from "../LUIStyle";
import {LUIElement} from "../LUIElement";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {RenderElement} from "@tsjs/engine/tt2d/RenderTree";
import {LUIRect} from "../LUIRect";
import {AffineMatrix} from "@tsjs/engine/tt2d/AffineMatrix";


/**
 * Adds a render-element tree structure to the
 * LUIElement's style.
 *
 * The idea is to have game worlds as part of LUI.
 *
 */
export class LUITreeRenderer extends LUIStyleElement {

    public root:RenderElement;

    private cacheMatrix:AffineMatrix = new AffineMatrix();

    constructor() {
        super();
        this.root = new RenderElement();
    }


    internRender(e: LUIElement, renderer: FatRenderer, rect: LUIRect) {
        if (rect.getHeight() > 0 && rect.getWidth() > 0) {
            renderer.endDirectDraw(); // TODO really needed here?
            //renderer.setMaskRect(0, 0, rect.getWidth(), rect.getHeight());

            this.cacheMatrix.copyValues(renderer.getRootMatrix());

            renderer.getRootMatrix().translate(rect.getX(), rect.getY());
            renderer.render(this.root);

            renderer.setRootMatrix(this.cacheMatrix);

            //renderer.unsetMaskRect();
            renderer.beginDirectDraw();
        }
    }

}


