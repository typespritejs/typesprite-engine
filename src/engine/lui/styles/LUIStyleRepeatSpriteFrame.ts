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


export enum AxisRepeat {
    RepeatBoth,
    RepeatX,
    RepeatY,
}

export class LUIStyleRepeatSpriteFrame extends LUIStyleElement {


    private _alignX:Align = Align.Center;
    private _alignY:Align = Align.Center;
    private _frame:SpriteSheetFrame;
    private _offsetX:number = 0;
    private _offsetY:number = 0;

    private _repeat:AxisRepeat = AxisRepeat.RepeatBoth;
    private _color:Color = Color.White.copy();
    private _blend:BlendMode = BlendMode.BM_NORMAL;

    setAlpha(v:number):this {
        this._color.a = v;
        return this;
    }

    getAlpha():number {
        return this._color.a;
    }

    getMixColor():Color {
        return this._color;
    }

    setFrame(frame:SpriteSheetFrame):this {
        this._frame = frame;
        return this;
    }

    getFrame():SpriteSheetFrame {
        return this._frame;
    }

    setRepeat(r:AxisRepeat):this {
        this._repeat = r;
        return this;
    }

    getRepeat():AxisRepeat {
        return this._repeat;
    }

    setAlignX(r:Align):this {
        this._alignX = r;
        return this;
    }

    getAlignX():Align {
        return this._alignX;
    }

    setAlignY(r:Align):this {
        this._alignY = r;
        return this;
    }

    getAlignY():Align {
        return this._alignY;
    }

    setOffsetX(r:number):this {
        this._offsetX = r;
        return this;
    }

    getOffsetX():number {
        return this._offsetX;
    }

    setOffsetY(r:number):this {
        this._offsetY = r;
        return this;
    }

    getOffsetY():number {
        return this._offsetY;
    }

    setBlendMode(v:BlendMode):this {
        this._blend = v;
        return this;
    }

    getBlendMode():number {
        return this._blend;
    }


    internRender(e: LUIElement, renderer: FatRenderer, rect: LUIRect) {

        if (!this._frame)
            return;

        const ww = rect.getWidth();
        const hh = rect.getHeight();

        const fw = this._frame.textureRect.width||1;
        const fh = this._frame.textureRect.height||1;
        const offX = this._offsetX < 0 ? fw + (this._offsetX % fw) : this._offsetX % fw;
        const offY = this._offsetY < 0 ? fh + (this._offsetY % fh) : this._offsetY % fh;

        let xx = rect.getX() + offX - fw;
        let yy = rect.getY() + offY - fh;
        let numX = Math.ceil(ww / fw) + 1;
        let numY = Math.ceil(hh / fh) + 1;

        if (this._repeat == AxisRepeat.RepeatY) {
            numX = 1;
            xx = rect.getX() + this._offsetX;

            if (this._alignX == Align.Center) {
                xx += -(fw * 0.5) + rect.getWidth() * 0.5
            }
            else if (this._alignX == Align.End) {
                xx += rect.getWidth() - fw
            }
        }
        else if (this._repeat == AxisRepeat.RepeatX) {
            numY = 1;
            yy = rect.getY() + this._offsetY;

            if (this._alignY == Align.Center) {
                yy += -(fh * 0.5) + rect.getHeight() * 0.5
            }
            else if (this._alignY == Align.End) {
                yy += rect.getHeight() - fh
            }
        }

        for (let y=0; y<numY; y++) {
            for (let x=0; x<numX; x++) {
                let drawW = fw;
                let drawH = fh;
                let drawX = xx + x * fw;
                let drawY = yy + y * fh;
                let srcX = this._frame.textureRect.x;
                let srcY = this._frame.textureRect.y;

                if (drawX < rect.getLeft()) {
                    const cut = rect.getLeft() - drawX;
                    drawX += cut;
                    srcX += cut;
                    drawW -= cut;
                }
                if (drawY < rect.getTop()) {
                    const cut = rect.getTop() - drawY;
                    drawY += cut;
                    srcY += cut;
                    drawH -= cut;
                }

                if (drawX + drawW > rect.getRight()) {
                    drawW = drawW - ((drawX + drawW) - rect.getRight());
                }
                if (drawY + drawH > rect.getBottom()) {
                    const bb = rect.getBottom();
                    drawH = drawH - ((drawY + drawH) - bb);
                }

                // rare, but can happen
                if (drawW <= 0 ||
                    drawH <= 0)
                    continue;

                renderer.directDraw(
                    this._frame.texture,
                    srcX,
                    srcY,
                    drawW,
                    drawH,
                    drawX,
                    drawY,
                    drawW,
                    drawH,
                    this._color,
                    this._blend,
                    )
            }
        }
    }
}


