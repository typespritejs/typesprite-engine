/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUIStyle} from "@tsjs/engine/lui/LUIStyle";


/**
 * ⚠️ experimental
 *
 * This is an example implementation
 */
export class LUIIconButton extends LUIElement {

    private _normal:LUIStyle;
    private _pressed:LUIStyle;
    private _disabled:LUIStyle;
    private _isDown:boolean = false;
    private hackyDisabled:boolean = false;

    constructor(
        normal:LUIStyle,
        pressed:LUIStyle,
        disabled:LUIStyle
    ) {
        super();

        this._normal = normal;
        this._pressed = pressed;
        this._disabled = disabled;
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

    public getNormalStyle():LUIStyle {
        return this._normal;
    }

    public getPressedStyle():LUIStyle {
        return this._pressed;
    }

    public getDisabledStyle():LUIStyle {
        return this._disabled;
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
            if (!this.getManager())
                return;
            this.getManager().sendMessage(this, "ButtonClicked_" + this.getName());
            this.setStyle(this._normal);
        }
    }
}
