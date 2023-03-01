/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {Color} from "@tsjs/engine/tt2d/Color";
import {SpriteSheetFrame} from "@tsjs/engine/tt2d/SpriteSheet";
import {Align, ScaleAlign} from "@tsjs/engine/lui/LayoutUI";
import {BlendMode} from "@tsjs/engine/tt2d/BlendMode";
import {LUIStyleElement} from "@tsjs/engine/lui/LUIStyle";
import {LUIRect} from "@tsjs/engine/lui/LUIRect";
import {LUIElement} from "@tsjs/engine/lui/LUIElement";



export class LUIStyleSpriteFrame extends LUIStyleElement {


    public alignX:Align = Align.Center;
    public alignY:Align = Align.Center;
    public frame:SpriteSheetFrame;
    public offsetX:number = 0;
    public offsetY:number = 0;
    public scaleX:number = 1;
    public scaleY:number = 1;

    public color:Color = Color.White.copy();

    set alpha(v:number) {
        this.color.a = v;
    }

    get alpha():number {
        return this.color.a;
    }

    set scale(v:number) {
        this.scaleX = v;
        this.scaleY = v;
    }

    get scale():number {
        return this.scaleX;
    }

    internRender(e: LUIElement, renderer: FatRenderer, rect: LUIRect) {

        if (!this.frame)
            return;

        const ww = this.frame.textureRect.width * this.scaleX;
        const hh = this.frame.textureRect.height * this.scaleY;

        let xx = 0;
        let yy = 0;

        const ps = e.getManager().getPixelSize();


        switch(this.alignX) {
            case Align.Start: // LEFT
            xx = rect.getX();
            break;
            case Align.Center:
                xx = this.scaleX == 1
                ? rect.getX() + Math.round(rect.getWidth() * 0.5) - Math.round(ww*0.5)
                : rect.getX() + rect.getWidth() * 0.5 - ww*0.5;
                break;
                case Align.End:
                    xx = rect.getX() + rect.getWidth() - ww;
                    break;
        }

        switch(this.alignY) {
            case Align.Start: // TOP
            yy = rect.getY();
            break;
            case Align.Center:
                yy = this.scaleY == 1
                ? rect.getY() + Math.round(rect.getHeight() * 0.5) - Math.round(hh*0.5)
                : rect.getY() + rect.getHeight() * 0.5 - hh*0.5;
                break;
                case Align.End:
                    yy = rect.getY() + rect.getHeight() - hh;
                    break;
        }

        renderer.directDraw(
                this.frame.texture,
                this.frame.textureRect .x,
                this.frame.textureRect.y,
                this.frame.textureRect.width,
                this.frame.textureRect.height,
                xx + this.offsetX,
                yy + this.offsetY,
                ww,
                hh,
                this.color
                )
    }
}




