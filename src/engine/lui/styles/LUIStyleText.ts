/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIStyleElement} from "../LUIStyle";
import {Align} from "../LayoutUI";
import {LUIElement} from "../LUIElement";
import {LUITextBox} from "../LUITextBox";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {LUIRect} from "../LUIRect";
import {Color} from "@tsjs/engine/tt2d/Color";
import {BlendMode} from "@tsjs/engine/tt2d/BlendMode";
import {SpriteSheet, SpriteSheetFont} from "@tsjs/engine/tt2d/SpriteSheet";


export type RenderAllText = (
    label:LUITextBox,
    renderer:FatRenderer,
    //sheet:SpriteSheet,
    font:SpriteSheetFont,
    rect:LUIRect,
    startY:number,
    blendMode:BlendMode,
    offsetX:number,
    offsetY:number,
    /**
     * If not null it represents a DropShadow or Outline color.
     * It is called "forced" as it normally should overwrite (with force) the normal color
     */
    forceColor:Color,
) => void;


export class LUIStyleText extends LUIStyleElement {

    public textOffsetX:number = 0;
    public textOffsetY:number = 0;
    public mixColor:Color = new Color(1, 1, 1, 1);
    /**
     * if not null => text is rendered with an outline.
     *
     * The result is the standard simple pixel-art outline (no fancy options atm).
     */
    public pixelOutlineColor:Color = null;
    public pixelOutlineOffset:number = 1;
    /** if not null => text is rendered twice first with shadow color, second with mixColor */
    public pixelShadowColor:Color = null;
    public pixelShadowDistanceX:number = 1;
    public pixelShadowDistanceY:number = 1;
    public blendMode:BlendMode = BlendMode.BM_NORMAL;
    public onDrawBefore:(renderer: FatRenderer, rect:LUIRect, x:number, y:number, width:number, height:number) => void;
    public onDrawAfter:(renderer: FatRenderer, rect:LUIRect, x:number, y:number, width:number, height:number) => void;

    public setPixelShadow(color:Color, distX:number=1, distY:number=1) {
        this.pixelOutlineColor = null;
        this.pixelShadowColor = color;
        this.pixelShadowDistanceX = distX;
        this.pixelShadowDistanceY = distY;
    }

    public replaceRenderFunction(drawer:RenderAllText) {
        this.drawLetterLines = drawer;
    }

    internRender(e: LUIElement, renderer: FatRenderer, rect:LUIRect) {
        const label = e.getLayoutProperty("label") as LUITextBox;
        if (!(label instanceof LUITextBox))
            return;
        this.directDraw(label, renderer, rect, this.blendMode);
    }

    public directDraw(label:LUITextBox, renderer: FatRenderer, rect:LUIRect, blendMode:BlendMode) {
        label.setMaxWidth(rect.getWidth());
        label.ensureLayout();
        const textBox = label.getTextBorder();
        const textBoxWidth = textBox.getRight() - textBox.getLeft();
        const textBoxHeight = textBox.getBottom() - textBox.getTop();
        const numLetters = label.getLetterCount();
        const font = label.getFont();
        // const sheet = label.getSpriteSheet();

        if (textBoxWidth <= 0 || textBoxHeight  <= 0 || numLetters <= 0 || !font)
            return;

        const width = rect.getWidth();
        const height = rect.getHeight();

        let xx = 0;
        let yy = 0;

        switch(label.getAlignX()) {
            case Align.Start: // LEFT
                xx = rect.getX();
                break;
            case Align.Center:
                xx = rect.getX() + Math.round(width * 0.5) - Math.round(textBoxWidth*0.5);
                break;
            case Align.End:
                xx = rect.getX() + width - textBoxWidth;
                break;
        }

        switch(label.getAlignY()) {
            case Align.Start: // TOP
                yy = rect.getY();
                break;
            case Align.Center:
                yy = rect.getY() + Math.round(height * 0.5) - Math.round(textBoxHeight*0.5);
                break;
            case Align.End:
                yy = rect.getY() + height - textBoxHeight;
                break;
        }

        if (this.onDrawBefore)
            this.onDrawBefore(renderer, rect, xx + this.textOffsetX, yy + this.textOffsetY, textBoxWidth, textBoxHeight);

        if (this.pixelShadowColor) {
            this.drawLetterLines(
                label,
                renderer,
                font,
                rect,
                yy,
                blendMode,
                this.pixelShadowDistanceX,
                this.pixelShadowDistanceY,
                this.pixelShadowColor
            )
        }

        if (this.pixelOutlineColor) {
            this.drawLetterLines(
                label,
                renderer,
                font,
                rect,
                yy,
                blendMode,
                -this.pixelOutlineOffset,
                0,
                this.pixelOutlineColor
            )
            this.drawLetterLines(
                label,
                renderer,
                font,
                rect,
                yy,
                blendMode,
                this.pixelOutlineOffset,
                0,
                this.pixelOutlineColor
            )
            this.drawLetterLines(
                label,
                renderer,
                font,
                rect,
                yy,
                blendMode,
                0,
                -this.pixelOutlineOffset,
                this.pixelOutlineColor
            )
            this.drawLetterLines(
                label,
                renderer,
                font,
                rect,
                yy,
                blendMode,
                0,
                this.pixelOutlineOffset,
                this.pixelOutlineColor
            )
        }

        this.drawLetterLines(
            label,
            renderer,
            font,
            rect,
            yy,
            blendMode,
            0,
            0,
            null
        )

        // // DEBUG Zum Render der Box
        // renderer.directDrawRect(
        //     xx+this.textOffsetX,
        //     yy+this.textOffsetY,
        //     textBoxWidth,
        //     textBoxHeight,
        //     Color.fromHash("#0f0").copyWithAlpha(0.3)
        // )

        if (this.onDrawAfter)
            this.onDrawAfter(renderer, rect, xx + this.textOffsetX, yy + this.textOffsetY, textBoxWidth, textBoxHeight);
    }

    private drawLetterLines(
        label:LUITextBox,
        renderer:FatRenderer,
        // sheet:SpriteSheet,
        font:SpriteSheetFont,
        rect:LUIRect,
        startY:number,
        blendMode:BlendMode,
        offsetX:number,
        offsetY:number,
        forceColor:Color
    ) {
        const textBox = label.getTextBorder();
        const lines = label.getLines();
        const width = rect.getWidth();
        let color:Color = this.mixColor;

        for (let l=0; l<lines.length; l++) {
            const line = lines[l];
            const end = line.startLetterIndex + line.definedLetters;
            if (line.empty)
                continue;

            const lineBoxWidth = line.renderedTextSize.getRight() - line.renderedTextSize.getLeft();
            let xx = 0;
            switch(label.getAlignX()) {
                case Align.Start: // LEFT
                    xx = rect.getX();
                    break;
                case Align.Center:
                    xx = rect.getX() + Math.round(width * 0.5) - Math.round(lineBoxWidth*0.5);
                    break;
                case Align.End:
                    xx = rect.getX() + width - lineBoxWidth;
                    break;
            }

            for (let i=line.startLetterIndex; i<end; i++) {
                const letter = label.getLetterByIndex(i);
                const frame = letter.charFrame; //sheet.getFrame(letter.frameIndex);
                const img = frame.texture;
                color = letter.color || this.mixColor;

                renderer.directDraw(
                    img,
                    frame.textureRect.x,
                    frame.textureRect.y,
                    frame.textureRect.width,
                    frame.textureRect.height,
                    xx + letter.x + this.textOffsetX - textBox.getLeft() + offsetX,
                    startY + letter.y + this.textOffsetY - textBox.getTop() + offsetY,
                    frame.textureRect.width,
                    frame.textureRect.height,
                    forceColor ? forceColor : color,
                    blendMode
                );
            }
        }
    }
}


