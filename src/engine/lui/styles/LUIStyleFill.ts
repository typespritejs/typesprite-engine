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

export class LUIStyleFill extends LUIStyleElement {

    public color:Color = new Color();

    internRender(e: LUIElement, renderer: FatRenderer, rect:LUIRect) {
        renderer.directDrawRect(
            rect.getX(),
            rect.getY(),
            rect.getWidth(),
            rect.getHeight(),
            this.color
        )
    }
}
