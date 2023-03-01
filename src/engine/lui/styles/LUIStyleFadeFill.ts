/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {Color} from "@tsjs/engine/tt2d/Color";
import {LUIStyleElement} from "@tsjs/engine/lui/LUIStyle";
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUIRect} from "@tsjs/engine/lui/LUIRect";


export class LUIStyleFadeFill  extends LUIStyleElement {

    public colorTopLeft:Color = new Color();
    public colorBottomLeft:Color = new Color();
    public colorTopRight:Color = new Color();
    public colorBottomRight:Color = new Color();

    

    /*
    public static createVerticalFade(top:Color, bottom:Color):LUIFadeFill {
        const out = new LUIFadeFill();
        out.colorTopLeft = top;
        out.colorBottomLeft = bottom;
        out.colorTopRight = top;
        out.colorBottomRight = bottom;
        return out;
    }

    public static createHorizontalFade(left:Color, right:Color):LUIFadeFill {
        const out = new LUIFadeFill();
        out.colorTopLeft = left;
        out.colorBottomLeft = left;
        out.colorTopRight = right;
        out.colorBottomRight = right;
        return out;
    }
    */

    internRender(e: LUIElement, renderer: FatRenderer, rect:LUIRect) {
        const ctx = renderer;

        renderer.directDrawRect(
            rect.getX(),
            rect.getY(),
            rect.getWidth(),
            rect.getHeight(),
            this.colorTopLeft,
            this.colorBottomLeft,
            this.colorTopRight,
            this.colorBottomRight,
        )
    }
}

