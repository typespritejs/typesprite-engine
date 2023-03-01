/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUIElementConsume} from "@tsjs/engine/lui/LayoutUI";


/**
 * A clickable LUIElement that fires ElementClicked_${name} messages.
 *
 * ```
 * export class MyGUI extends Component {
 *     @link("GraphicsEngine:typesprite")
 *     private graphics:GraphicsEngine;
 *
 *     onInit() {
 *       const ec = new LUIClickElement().setName("ExitSpace");
 *       //                                        ^^^^^^^^^
 *       this.graphics.gui.addChild(ec);
 *     }
 *
 *     onMessage_ElementClicked_ExitSpace() {
 *         //                   ^^^^^^^^^
 *         console.log("click-element was clicked! :-)");
 *     }
 * }
 * ```
 *
 * * NOTE, this uses the offset property the element by default.
 *
 * ---
 *
 * ⚠️ experimental
 */
export class LUIClickElement extends LUIElement {

    private _isDown:boolean = false;
    public messageData:any;
    public clickOffset = 1;


    constructor() {
        super();
        this.setElementConsumeBehavior(LUIElementConsume.Active);
    }

    getMessageData(): any {
        return this.messageData;
    }

    setMessageData(value: any):this {
        this.messageData = value;
        return this;
    }

    getClickOffset(): number {
        return this.clickOffset;
    }

    setClickOffset(value: number):this {
        this.clickOffset = value;
        return this;
    }

    public onMouseDown(x:number, y:number) {
        this._isDown = true;
        this.getOffset().setY(this.clickOffset);
        this.doLayout();
    }

    public onMouseMove(x:number, y:number, isOnElement:boolean) {
        if (isOnElement != this._isDown) {
            this._isDown = isOnElement;
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
