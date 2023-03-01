/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUIElementConsume} from "@tsjs/engine/lui/LayoutUI";

/**
 * Baseclass to implement basic click-behavior
 */
abstract class AbstractClickableContainer extends LUIElement {

    protected _isDown:boolean = false;

    protected constructor() {
        super();
        this.setElementConsumeBehavior(LUIElementConsume.Active);
    }

    protected abstract onDown();
    protected abstract onDownMove(isOnElement:boolean);
    protected abstract onClicked();
    protected abstract onAbort();

    public onMouseDown(x:number, y:number) {
        this._isDown = true;
        this.onDown();
    }

    public onMouseMove(x:number, y:number, isOnElement:boolean) {
        if (isOnElement != this._isDown) {
            this._isDown = isOnElement;
            this.onDownMove(isOnElement);
        }
    }

    public onMouseUp(x:number, y:number) {
        if (this.isOnElement(x, y)) {
            // this.getManager().sendMessage(this, `${this.messagePrefix}${this.getName()}`);
            this.onClicked();
        }
        else {
            this.onAbort();
        }
    }
}










