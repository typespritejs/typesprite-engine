/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUITextBox} from "@tsjs/engine/lui/LUITextBox";
import {LUIStyle} from "@tsjs/engine/lui/LUIStyle";
import {SpriteSheet} from "@tsjs/engine/tt2d/SpriteSheet";
import {LUIElementConsume} from "@tsjs/engine/lui/LayoutUI";
import {LUIStyleText} from "@tsjs/engine/lui/styles/LUIStyleText";
import {LUIStyleNinePatch} from "@tsjs/engine/lui/styles/LUIStyleNinePatch";

/**
 * ⚠️ experimental
 *
 * This is an example implementation
 */
export class LUILabelButton extends LUIElement {

    private _label:LUITextBox;
    private _normal:LUIStyle;
    private _pressed:LUIStyle;
    private _disabled:LUIStyle;
    private _isDown:boolean = false;
    private eventData:any;
    private hackyDisabled:boolean = false;

    constructor(
        normal:LUIStyle,
        pressed:LUIStyle,
        disabled:LUIStyle,
        fontSheet?:SpriteSheet,
        fontName:string = null
    ) {
        super();

        this._label = new LUITextBox();
        this._normal = normal;
        this._pressed = pressed;
        this._disabled = disabled;
        this.setLayoutProperty("label", this._label);
        this.setElementConsumeBehavior(LUIElementConsume.Active );
        this.setStyle(normal);
        if (fontSheet) {
            this._label.setFont(fontSheet.fonts[fontName]);
        }
    }

    public setEnabled(e:boolean) {
        this.hackyDisabled = !e;
        if (e) {
            this.setStyle(this._normal);
            this._isDown = false;
        }
        else {
            this.setStyle(this._disabled);
            this._isDown = false;
        }
    }

    public setEventData(msg:any):LUILabelButton {
        this.eventData = msg;
        return this;
    }

    /**
     * access to text content
     */
    public getLabel():LUITextBox {
        return this._label;
    }

    public setNormalAlpha(a:number):LUILabelButton {
        (this._normal.getStyleElementByIndex(0) as LUIStyleNinePatch).mixColor.setAlpha(a);
        (this._normal.getStyleElementByIndex(1) as LUIStyleText).mixColor.setAlpha(a);
        return this;
    }

    public getStyleNormal():LUIStyleText {
        return this._normal.getStyleElementByIndex(1) as LUIStyleText;
    }
    public getStylePressed():LUIStyleText {
        return this._pressed.getStyleElementByIndex(1) as LUIStyleText;
    }

    public onMouseDown(x:number, y:number) {
        if (this.hackyDisabled)
            return;

        this.setStyle(this._pressed);
        this._isDown = true;
    }
    public onMouseMove(x:number, y:number, isOnElement:boolean) {
        if (this.hackyDisabled)
            return;

        if (isOnElement != this._isDown) {
            this._isDown = isOnElement;
            this.setStyle(isOnElement ? this._pressed : this._normal);
        }
    }
    public onMouseUp(x:number, y:number) {
        if (this.hackyDisabled)
            return;

        if (this.isOnElement(x, y)) {
            this.getManager().sendMessage(this, "ButtonClicked_" + this.getName(), this.eventData);
            this.setStyle(this._normal);
        }
    }
}
