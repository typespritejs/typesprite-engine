/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {DirectRenderElement, RenderElement} from "@tsjs/engine/tt2d/RenderTree";
import {AffineMatrix} from "@tsjs/engine/tt2d/AffineMatrix";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {LUIRect} from "@tsjs/engine/lui/LUIRect";
import {ManagedTexture} from "@tsjs/engine/tt2d/ManagedTexture";
import {SpriteSheet, SpriteSheetFont, SpriteSheetNinePatch} from "@tsjs/engine/tt2d/SpriteSheet";
import {Flignov} from "@tsjs/engine/flignov/Flignov";
import {renderParticlesDirect} from "@tsjs/engine/flignov/RenderFatParticles";

import {LUITextBox} from "@tsjs/engine/lui/LUITextBox";
import {BlendMode} from "@tsjs/engine/tt2d/BlendMode";
import {Color} from "@tsjs/engine/tt2d/Color";
import {LUIStyleNinePatch} from "@tsjs/engine/lui/styles/LUIStyleNinePatch";
import {LUIStyleText} from "@tsjs/engine/lui/styles/LUIStyleText";


// ---------------------------------------------------------------------------------------------------------------------

/**
 * Render NinePatch image to game scene.
 *
 * Note that the pivot-information of SpriteSheetNinePatch has no effect.
 * Due to the nature of the 9-patch it simply makes no sense to support that here.
 *
 * Use regX/regY for specific pivot-like rotation/scale effects.
 */
export class NinePatchElement extends DirectRenderElement {

    private readonly renderStyle:LUIStyleNinePatch;
    private readonly drawRect:LUIRect;

    constructor() {
        super();

        this.renderStyle = new LUIStyleNinePatch();
        this.drawRect = new LUIRect();
    }

    setNinePatch(ninePatch:SpriteSheetNinePatch):NinePatchElement {
        this.renderStyle.setNinePatch(ninePatch)
        return this;
    }

    /**
     * @deprecated legacy. Please use setNinePatch()
     */
    setFromSpriteSheet(ninePatchName:string, sheet:SpriteSheet):NinePatchElement {
        this.renderStyle.setFromSpriteSheet(ninePatchName, sheet);
        return this;
    }

    setSize(w:number, h:number):NinePatchElement {
        this.drawRect.setSize(w, h);
        return this;
    }

    get image():ManagedTexture {
        return this.renderStyle.getImage();
    }

    get width():number {
        return this.drawRect.getWidth();
    }

    get height():number {
        return this.drawRect.getHeight();
    }

    set width(v:number) {
        this.drawRect.setWidth(v);
    }

    set height(v:number) {
        this.drawRect.setHeight(v);
    }

    get mixColor():Color {
        return this.renderStyle.mixColor;
    }

    renderDirect(renderer: FatRenderer, parentMatrix: AffineMatrix) {
        renderer.getRootMatrix().translate(-this.regX, -this.regY);
        this.renderStyle.directDraw(renderer, this.drawRect, this.blendMode);
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export class ParticleRenderElement extends DirectRenderElement {

    private _flignov:Flignov;

    get flignov(): Flignov {
        return this._flignov;
    }

    set flignov(value: Flignov) {
        this._flignov = value;
    }

    set blendMode(value: BlendMode) {
        console.error("blendMode must be set in flignov")
    }

    addChild(child: RenderElement) {
        throw new Error("Particles cannot have children");
    }

    renderDirect(renderer: FatRenderer, parentMatrix: AffineMatrix) {
        if (this._flignov) {
            if (this.name == "debugger")
                debugger;

            renderer.getRootMatrix().translate(-this.regX, -this.regY);
            this._flignov.update(renderer.animationElapsed);
            renderParticlesDirect(renderer, this._flignov)
        }
    }
}


// ---------------------------------------------------------------------------------------------------------------------

export class TextElement extends DirectRenderElement {

    private readonly _renderStyle:LUIStyleText = new LUIStyleText();
    private readonly _textbox:LUITextBox = new LUITextBox();
    private readonly drawRect:LUIRect = new LUIRect();

    constructor() {
        super();
        this.drawRect.setSize(1, 1);
    }

    // /**
    //  * This supports 2 concepts:
    //  *
    //  * 1: setting a all-fonts-sheet (where the animations directly map to the letters)
    //  * 2: setting a sheet with a subfont (letters are prefixed)
    //  *
    //  * setFont(myBitmapFont); << (1)
    //  * setFont(mySprites, "sprite-font-name"); (2)
    //  *
    //  */
    // setFont(sheet:SpriteSheet, fontName?:string):TextElement {
    //     this.textbox.setSpriteSheet(sheet).setSheetFont(fontName);
    //     return this;
    // }

    /**
     * setFont(mySheet, "BetterPixels");
     * setFont(mySheet.fonts["BetterPixels"]);
     *
     * @param font
     */
    setFont(font:SpriteSheetFont|SpriteSheet, fontName?:string):TextElement {
        this.textbox.setFont(
            fontName
                ? (font as SpriteSheet).fonts[fontName]
                : font as SpriteSheetFont
        );
        return this;
    }

    get text():string {
        return this.textbox.getText();
    }

    set text(v:string) {
        this.textbox.setText(v);
    }

    get width():number {
        return this.drawRect.getWidth();
    }

    get height():number {
        return this.drawRect.getHeight();
    }

    set width(v:number) {
        this.drawRect.setWidth(v);
    }

    set height(v:number) {
        this.drawRect.setHeight(v);
    }

    get mixColor():Color {
        return this._renderStyle.mixColor;
    }

    set mixColor(v:Color) {
        this._renderStyle.mixColor.copyValues(v);
    }

    get textbox():LUITextBox {
        return this._textbox;
    }

    get style():LUIStyleText {
        return this._renderStyle;
    }

    renderDirect(renderer: FatRenderer, parentMatrix: AffineMatrix) {


        this._renderStyle.directDraw(this._textbox, renderer, this.drawRect, this.blendMode);
    }

}


// ---------------------------------------------------------------------------------------------------------------------