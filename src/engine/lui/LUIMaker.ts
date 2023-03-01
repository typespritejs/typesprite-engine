import {Color} from "@tsjs/engine/tt2d/Color";
import {SpriteSheetFrame, SpriteSheetNinePatch} from "@tsjs/engine/tt2d/SpriteSheet";
import {ManagedTexture} from "@tsjs/engine/tt2d/ManagedTexture";
import {LUIStyle, LUIStyleElement} from "@tsjs/engine/lui/LUIStyle";
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {LUIStyleFill} from "@tsjs/engine/lui/styles/LUIStyleFill";
import {LUIStyleFadeFill} from "@tsjs/engine/lui/styles/LUIStyleFadeFill";
import {Align, LUIContainerLayouter, LUIElementConsume, LUILayerConsume, ScaleAlign} from "@tsjs/engine/lui/LayoutUI";
import {LUIStyleSpriteFrame} from "@tsjs/engine/lui/styles/LUIStyleSpriteFrame";
import {LUIStyleScaleSpriteFrame} from "@tsjs/engine/lui/styles/LUIStyleScaleSpriteFrame";
import {AxisRepeat, LUIStyleRepeatSpriteFrame} from "@tsjs/engine/lui/styles/LUIStyleRepeatSpriteFrame";
import {ExplicitNinePatchDesc, LUIStyleNinePatch} from "@tsjs/engine/lui/styles/LUIStyleNinePatch";
import {Rect} from "@tsjs/engine/tt2d/Rect";
import {LUILineLayout} from "@tsjs/engine/lui/layouts/LUILineLayout";
import {LUISpaceLayout} from "@tsjs/engine/lui/layouts/LUISpaceLayout";
import {LUILayer} from "@tsjs/engine/lui/elements/LUILayer";
import {LUIManager} from "@tsjs/engine/lui/LUIManager";
import {LUIFreeStackLayout} from "@tsjs/engine/lui/layouts/LUIFreeStackLayout";
import {LUIStackLayout} from "@tsjs/engine/lui/layouts/LUIStackLayout";


type ColorProp = string|Color;


function toFrame(frameOrImage:SpriteSheetFrame|ManagedTexture):SpriteSheetFrame {
    if (frameOrImage instanceof SpriteSheetFrame)
        return frameOrImage

    return SpriteSheetFrame.createFromTexture(frameOrImage);
}

class LUIStyleMaker {

    private target:LUIStyle = new LUIStyle();

    constructor(
            attachTo:LUIElement = null,
            ) {
        if (attachTo)
            attachTo.setStyle(this.target);
    }

    setName(s:string):this {
        this.target.setName(s);
        return this;
    }

    addStyleElement(e:LUIStyleElement):this {
        this.target.addElement(e);
        return this;
    }

    /**
     * full fill by color or string
     */
    fill(color:ColorProp, alpha?:number, onPaddingSpace:boolean=false):this {
        const fill = new LUIStyleFill()
        if (typeof color == "string")
            fill.color.setFromHash(color)
        else
            fill.color.copyValues(color)

        if (alpha !== undefined) {
            fill.color.setAlpha(alpha);
        }

        fill.onPaddingSpace = onPaddingSpace;
        this.target.addElement(fill)
        return this;
    }

    fadeFill(topLeftColor:ColorProp,
             topRightColor:ColorProp,
             bottomLeftColor:ColorProp,
             bottomRightColor:ColorProp,
             alpha?:number,
             onPaddingSpace:boolean=false):this {
        const fill = new LUIStyleFadeFill()

        if (typeof topLeftColor == "string")
            fill.colorTopLeft.setFromHash(topLeftColor);
        else
            fill.colorTopLeft.copyValues(topLeftColor);

        if (typeof topRightColor == "string")
            fill.colorTopRight.setFromHash(topRightColor);
        else
            fill.colorTopRight.copyValues(topRightColor);

        if (typeof bottomLeftColor == "string")
            fill.colorBottomLeft.setFromHash(bottomLeftColor);
        else
            fill.colorBottomLeft.copyValues(bottomLeftColor);

        if (typeof bottomRightColor == "string")
            fill.colorBottomRight.setFromHash(bottomRightColor);
        else
            fill.colorBottomRight.copyValues(bottomRightColor);

        if (alpha !== undefined) {
            fill.colorTopLeft.setAlpha(alpha);
            fill.colorBottomLeft.setAlpha(alpha);
            fill.colorBottomRight.setAlpha(alpha);
            fill.colorTopRight.setAlpha(alpha);
        }

        fill.onPaddingSpace = onPaddingSpace;
        this.target.addElement(fill)
        return this;
    }

    image(
        frameOrTex:SpriteSheetFrame|ManagedTexture,
        alignX:Align = Align.Center,
        alignY:Align = Align.Center,
        onPaddingSpace:boolean=false,
    ):this {
        const fill = new LUIStyleSpriteFrame();
        fill.frame = toFrame(frameOrTex);
        fill.alignX = alignX;
        fill.alignY = alignY;
        fill.onPaddingSpace = onPaddingSpace;
        this.target.addElement(fill);
        return this;
    }

    imageScaled(
        frameOrTex:SpriteSheetFrame|ManagedTexture,
        alignX:ScaleAlign = ScaleAlign.Fill,
        alignY:ScaleAlign = ScaleAlign.Fill,
        onPaddingSpace:boolean=false,
    ):this {
        const fill = new LUIStyleScaleSpriteFrame();
        fill.frame = toFrame(frameOrTex);
        fill.alignX = alignX;
        fill.alignY = alignY;
        fill.onPaddingSpace = onPaddingSpace;
        this.target.addElement(fill);
        return this;
    }

    imageRepeated(
        frameOrTex:SpriteSheetFrame|ManagedTexture,
        alignX:Align = Align.Center,
        alignY:Align = Align.Center,
        repeat:AxisRepeat = AxisRepeat.RepeatBoth,
        offsetX:number=0,
        offsetY:number=0,
        onPaddingSpace:boolean=false,
    ):this {
        const fill = new LUIStyleRepeatSpriteFrame();
        fill.setFrame(toFrame(frameOrTex));
        fill.setAlignX(alignX)
        fill.setAlignY(alignY)
        fill.setRepeat(repeat)
        fill.setOffsetX(offsetX)
        fill.setOffsetY(offsetY)
        fill.onPaddingSpace = onPaddingSpace;
        this.target.addElement(fill);
        return this;
    }

    ninePatch(
        np:SpriteSheetNinePatch,
        onPaddingSpace:boolean=false,
    ):this {
        const fill = new LUIStyleNinePatch();
        fill.setNinePatch(np);
        fill.onPaddingSpace = onPaddingSpace;
        return this;
    }

    ninePatchFromTexture(
        image: ManagedTexture,
        ninePatch: Rect | number[] | ExplicitNinePatchDesc,
        onPaddingSpace:boolean=false,
    ):this {
        const fill = new LUIStyleNinePatch();
        fill.setNinePatchWithTexture(image, ninePatch);
        fill.onPaddingSpace = onPaddingSpace;
        return this;
    }

    get done():LUIStyle {
        return this.target;
    }
}

class LUIElementStyleMaker extends LUIStyleMaker {

    constructor(
        attachTo:LUIElement,
        protected parent:LUIElementMaker
    ) {
        super(attachTo);
    }

    get endStyle():LUIElementMaker {
        return this.parent;
    }

}


class LUIElementMaker {

    private styleMaker:LUIElementStyleMaker = null;

    private children:LUIElementMaker[] = [];

    constructor(
        private parent:LUIElementMaker,
        private target:LUIElement = new LUIElement()
    ) {
    }

    styleAddElement(customStyle:LUIStyleElement):this {
        this.style.addStyleElement(customStyle);
        return this;
    }

    styleFill(color:ColorProp, alpha?:number, onPaddingSpace:boolean=false):this {
        this.style.fill(color, alpha, onPaddingSpace)
        return this;
    }

    styleFadeFill(topLeftColor:ColorProp,
             topRightColor:ColorProp,
             bottomLeftColor:ColorProp,
             bottomRightColor:ColorProp,
             alpha?:number,
             onPaddingSpace:boolean=false):this {
        this.style.fadeFill(
                topLeftColor,
                topRightColor,
                bottomLeftColor,
                bottomRightColor,
                alpha,
                onPaddingSpace
        );
        return this;
    }

    styleImage(
            frameOrTex:SpriteSheetFrame|ManagedTexture,
            alignX:Align = Align.Center,
            alignY:Align = Align.Center,
            onPaddingSpace:boolean=false,
            ):this {
        this.style.image(frameOrTex, alignX, alignY, onPaddingSpace)
        return this;
    }

    styleImageScaled(
            frameOrTex:SpriteSheetFrame|ManagedTexture,
            alignX:ScaleAlign = ScaleAlign.Fill,
            alignY:ScaleAlign = ScaleAlign.Fill,
            onPaddingSpace:boolean=false,
            ):this {

        this.style.imageScaled(
            frameOrTex,
            alignX,
            alignY,
            onPaddingSpace
        );
        return this;
    }

    styleImageRepeated(
        frameOrTex:SpriteSheetFrame|ManagedTexture,
        alignX:Align = Align.Center,
        alignY:Align = Align.Center,
        repeat:AxisRepeat = AxisRepeat.RepeatBoth,
        offsetX:number=0,
        offsetY:number=0,
        onPaddingSpace:boolean=false,
        ):this {
        this.style.imageRepeated(
            frameOrTex,
            alignX,
            alignY,
            repeat,
            offsetX,
            offsetY,
            onPaddingSpace
        );
        return this;
    }

    styleNinePatch(
        np:SpriteSheetNinePatch,
        onPaddingSpace:boolean=false,
    ):this {
        this.style.ninePatch(np, onPaddingSpace)
        return this;
    }

    styleNinePatchFromTexture(
        image: ManagedTexture,
        ninePatch: Rect | number[] | ExplicitNinePatchDesc,
        onPaddingSpace:boolean=false,
    ):this {
        this.style.ninePatchFromTexture(image, ninePatch, onPaddingSpace)
        return this;
    }

    setName(s:string):this {
        this.target.setName(s);
        return this;
    }

    private get style():LUIElementStyleMaker {
        const s = this.styleMaker ? this.styleMaker : new LUIElementStyleMaker(this.target, this);
        this.styleMaker = s;
        return s;
    }

    layoutProp(name:string, val:any):this {
        this.target.setLayoutProperty(name, val);
        return this;
    }

    consumeNoInput():this {
        this.target.setElementConsumeBehavior(LUIElementConsume.None);
        return this;
    }

    consumeInputOnElement():this {
        this.target.setElementConsumeBehavior(LUIElementConsume.OnElement);
        return this;
    }

    consumeInputOnElementAndActive():this {
        this.target.setElementConsumeBehavior(LUIElementConsume.Active);
        return this;
    }

    layoutFreeStack(layout:{top?:number,left?:number,right?:number,bottom?:number,width?:number,height?:number}):this {
        LUIFreeStackLayout.layout(this.target, layout);
        return this;
    }

    get childrenLayoutFreeStack():this {
        const l = new LUIFreeStackLayout();
        this.target.setContainerLayout(l); // typescript has no friends
        return this;
    }

    get childrenLayoutStack():this {
        const l = new LUIStackLayout();
        this.target.setContainerLayout(l); // typescript has no friends
        return this;
    }

    get childrenLayoutSpace():this {
        const l = new LUISpaceLayout();
        this.target.setContainerLayout(l); // typescript has no friends
        return this;
    }

    childrenLayoutXAligned(elemSize:number, space?:number):this {
        const l = LUILineLayout.createXAligned(elemSize, space)
        this.target.setContainerLayout(l); // typescript has no friends
        return this;
    }

    childrenLayoutYAligned(elemSize:number, space?:number):this {
        const l = LUILineLayout.createYAligned(elemSize, space)
        this.target.setContainerLayout(l); // typescript has no friends
        return this;
    }

    childrenLayoutCustom(l: LUIContainerLayouter):this {
        this.target.setContainerLayout(l); // typescript has no friends
        return this;
    }

    setStyle(e:LUIStyle):this {
        this.target.setStyle(e);
        return this;
    }



    addChild(e:LUIElement):LUIElementMaker {
        const s = new LUIElementMaker(this, e);
        this.target.addChild((s as any).target);
        this.children.push(s);
        return s;
    }

    get newChild():LUIElementMaker {
        const s = new LUIElementMaker(this);
        this.target.addChild((s as any).target);
        this.children.push(s);
        return s;
    }

    get endChild():LUIElementMaker {
        if (!this.parent) {
            throw new Error("too many endChild calls");
        }
        this.injectDefaultsAtTheEnd();
        return this.parent;
    }

    get done():LUIElement {
        if (this.parent) {
            throw new Error("done can only be called on the last element");
        }
        this.injectDefaultsAtTheEnd();
        return this.target;
    }

    padding(topOrAll:number, right?:number, bottom?:number, left?:number):this {
        if (left === undefined) {
            this.target.getPadding().setAll(topOrAll)
        }
        else {
            this.target.getPadding()
            .setTop(topOrAll)
            .setLeft(left)
            .setRight(right)
            .setBottom(bottom)
        }
        return this;
    }

    private injectDefaultsAtTheEnd() {
        if (!this.target.getContainerLayout() && this.target.getNumChildren() > 0) {
            this.childrenLayoutFreeStack;
        }
        /*
        for (const c of this.children) {
            c.injectDefaultsAtTheEnd();
        }
        */
    }

}

export class LUILayerMaker extends LUIElementMaker {

    constructor(
        private layer:LUILayer
    ) {
        super(null, layer);
    }

    get consumeAllInputOnLayer():this {
        this.layer.setConsumes(LUILayerConsume.All);
        return this;
    }

    get consumeNoInputOnLayer():this {
        this.layer.setConsumes(LUILayerConsume.None);
        return this;
    }

    get consumeDefaultOnLayer():this {
        this.layer.setConsumes(LUILayerConsume.OnElement);
        return this;
    }

    get remove():null {
        this.layer.getManager().removeLayer(this.layer.getName());
        return null;
    }
}


interface LuiMaker {
    (e:LUIElement):LUIElementMaker;
    ():LUIElementMaker;
    (lui:LUIManager, layerName:string):LUILayerMaker;
    get elem():LUIElementMaker;
    get style():LUIStyleMaker;
}

export const $ui = function(e:LUIElement|LUIManager, layerName?:string) {
    if (e instanceof LUIManager) {
        if (!layerName)
            throw new Error("$ui(lui, ...) requires a layerName");
        const layer = e.getLayer(layerName) || e.createLayer(layerName);
        const out = new LUILayerMaker(layer);
        return out;
    }

    const out = new LUIElementMaker(null, e);
    return out;
} as LuiMaker;


Object.defineProperty($ui, "elem", {
    get: function () {
        return new LUIElementMaker(null);;
    },
});

Object.defineProperty($ui, "style", {
    get: function () {
        return new LUIStyleMaker();
    },
});



