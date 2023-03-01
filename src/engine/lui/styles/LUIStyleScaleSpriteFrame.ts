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
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUIRect} from "@tsjs/engine/lui/LUIRect";



export class LUIStyleScaleSpriteFrame extends LUIStyleElement {

    public alignX:ScaleAlign = ScaleAlign.Fill;
    public alignY:ScaleAlign = ScaleAlign.Fill;
    public frame:SpriteSheetFrame;
    public offsetX:number = 0;
    public offsetY:number = 0;

    private color:Color = Color.White.copy();

    set alpha(v:number) {
        this.color.a = v;
    }

    get alpha():number {
        return this.color.a;
    }


    internRender(e: LUIElement, renderer: FatRenderer, rect: LUIRect) {

        if (!this.frame)
            return;

        let ww = this.frame.textureRect.width;
        let hh = this.frame.textureRect.height;

        let xx = 0;
        let yy = 0;


        switch(this.alignX) {
            case ScaleAlign.Start: // LEFT
            xx = rect.getX();
            break;
            case ScaleAlign.Center:
                xx = rect.getX() + Math.round(rect.getWidth() * 0.5) - Math.round(ww*0.5);
                break;
                case ScaleAlign.End:
                    xx = rect.getX() + rect.getWidth() - ww;
                    break;
                    case ScaleAlign.Fill:
                        xx = rect.getX();
                        ww = rect.getWidth();
                        break;
        }

        switch(this.alignY) {
            case ScaleAlign.Start: // TOP
            yy = rect.getY();
            break;
            case ScaleAlign.Center:
                yy = rect.getY() + Math.round(rect.getHeight() * 0.5) - Math.round(hh*0.5);
                break;
                case ScaleAlign.End:
                    yy = rect.getY() + rect.getHeight() - hh;
                    break;
                    case ScaleAlign.Fill:
                        yy = rect.getY();
                        hh = rect.getHeight();
                        break;
        }

        renderer.directDraw(
                this.frame.texture,
                this.frame.textureRect.x,
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


