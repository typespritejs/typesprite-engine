/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUIElementConsume} from "@tsjs/engine/lui/LayoutUI";

/**
 * ...
 */
export class LUIMouseDownElement extends LUIElement {

    private _isDown:boolean = false;
    public messageData:any;
    public clickOffset = 1;

    constructor() {
        super();
        this.setElementConsumeBehavior(LUIElementConsume.OnElement);
    }

    public onMouseDown(x:number, y:number) {
        this._isDown = true;
        this.getManager().sendMessage(this, "ElementDown_" + this.getName(), this.messageData);
        this.getOffset().setY(this.clickOffset);
        this.doLayout();
    }

    public onMouseMove(x:number, y:number, isOnElement:boolean) {
        if (isOnElement != this._isDown) {
            this._isDown = isOnElement;
            if (isOnElement)
                this.getManager().sendMessage(this, "ElementDown_" + this.getName(), this.messageData);
            this.getOffset().setY(isOnElement ? this.clickOffset : 0);
            this.doLayout();
        }
    }
    public onMouseUp(x:number, y:number) {
        if (this.isOnElement(x, y)) {
            this.getManager().sendMessage(this, "ElementClicked_" + this.getName(), this.messageData);
            this.getOffset().setY(0);
            this.doLayout();
        }
    }
}
