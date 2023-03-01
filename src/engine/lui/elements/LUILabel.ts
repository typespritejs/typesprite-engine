/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUITextBox} from "@tsjs/engine/lui/LUITextBox";
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUIStyle} from "@tsjs/engine/lui/LUIStyle";
import {SpriteSheet, SpriteSheetFont} from "@tsjs/engine/tt2d/SpriteSheet";
import {LUIElementConsume} from "@tsjs/engine/lui/LayoutUI";
import {LUIStyleText} from "@tsjs/engine/lui/styles/LUIStyleText";

/**
 * ⚠️ experimental
 *
 * This is an example implementation
 */
export class LUILabel extends LUIElement {

    private _textBox:LUITextBox;
    private _textStyle:LUIStyleText;
    private _elementStyle:LUIStyle;


    constructor(
        fontSheet:SpriteSheet|SpriteSheetFont,
        fontName:string = null
    ) {
        super();
        const style = new LUIStyle();
        const normalText = new LUIStyleText();
        const label = new LUITextBox();
        label.setFont(fontSheet, fontName)
        this._textStyle = normalText;
        style.addElement(normalText);
        this.setStyle(style)
        this.setLayoutProperty("label", label);
        this.setElementConsumeBehavior(LUIElementConsume.None);
        this._textBox = label;
        this._elementStyle = style;
    }

    public putTextOntop() {
        const elems = this._elementStyle.getElementList();
        if (elems.length <= 1)
            return;
        for (let i=0; i<elems.length; i++) {
            if (elems[i] instanceof LUIStyleText) {
                const txt = elems[i];
                elems.splice(i, 1);
                elems.push(txt);
            }
        }
    }

    /**
     * access to text content
     */
    public getTextBox():LUITextBox {
        return this._textBox;
    }

    public getTextStyle():LUIStyleText {
        return this._textStyle;
    }

}
