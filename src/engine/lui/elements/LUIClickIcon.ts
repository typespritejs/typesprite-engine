/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {SpriteSheet} from "@tsjs/engine/tt2d/SpriteSheet";
import {LUIElementConsume} from "@tsjs/engine/lui/LayoutUI";
import {LUIStyleSpriteFrame} from "@tsjs/engine/lui/styles/LUIStyleSpriteFrame";

/**
 * A clickable icon that fires IconClicked_${name} messages.
 *
 * ```
 * export class MyGUI extends Component {
 *     @link("GraphicsEngine:typesprite")
 *     private graphics:GraphicsEngine;
 *
 *     @res("sheet", "path/to/main.sheet.json")
 *     private sheet:SpriteSheet;
 *
 *     onInit() {
 *       const icon = new LUIIconButton(
 *           this.sheet,
 *           "heart"
 *       ).setName("ExitSpace");
 *       //         ^^^^^^^^^
 *       this.graphics.gui.addChild(icon);
 *     }
 *
 *     onMessage_IconClicked_ExitSpace() {
 *         //                ^^^^^^^^^
 *         console.log("click-element was clicked! :-)");
 *     }
 * }
 * ```
 *
 * Compared to LUIIconButton this has no background and the clicking
 *
 * ---
 *
 * ⚠️ experimental
 */
export class LUIClickIcon extends LUIElement {

    private _isDown:boolean = false;
    // private style:LUIStyle = new LUIStyle();
    private iconImage:LUIStyleSpriteFrame;
    public messageData:any;

    constructor(
        private sheet:SpriteSheet,
        private iconAnimation:string,
        private iconClickedAnimation:string = iconAnimation,
    ) {
        super();
        //this.iconImage = //applyAnimation(this, iconAnimation, sheet);
        this.setElementConsumeBehavior(LUIElementConsume.Active);
    }

    public setAnimation(iconAnimation:string, iconClickedAnimation:string = iconAnimation):this {
        this.iconAnimation = iconAnimation;
        this.iconClickedAnimation = iconClickedAnimation;

        this.iconImage.frame = this.sheet.getAnimationFrame(this._isDown ? this.iconClickedAnimation : this.iconAnimation);
        return this;
    }

    public setAlpha(a:number):this {
        this.iconImage.color.a = a;
        return this;
    }

    public getAlpha():number {
        return this.iconImage.color.a;
    }

    getMessageData(): any {
        return this.messageData;
    }

    setMessageData(value: any):this {
        this.messageData = value;
        return this;
    }

    public onMouseDown(x:number, y:number) {
        this._isDown = true;
        this.iconImage.offsetY = 1;
        this.iconImage.frame = this.sheet.getAnimationFrame(this.iconClickedAnimation);
    }

    public onMouseMove(x:number, y:number, isOnElement:boolean) {
        if (isOnElement != this._isDown) {
            this._isDown = isOnElement;
            this.iconImage.offsetY = isOnElement ? 1 : 0;
            this.iconImage.frame = this.sheet.getAnimationFrame(isOnElement ? this.iconClickedAnimation : this.iconAnimation);
        }
    }
    public onMouseUp(x:number, y:number) {
        if (this.isOnElement(x, y)) {
            this.getManager().sendMessage(this, "IconClicked_" + this.getName(), this.messageData);
            this.iconImage.offsetY = 0;
            this.iconImage.frame = this.sheet.getAnimationFrame(this.iconAnimation);
        }
    }
}
