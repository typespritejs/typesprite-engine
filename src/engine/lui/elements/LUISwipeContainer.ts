/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {Vector2} from "@tsjs/engine/tt2d/Vector";
import {LUIContainerLayouter, LUIElementConsume} from "@tsjs/engine/lui/LayoutUI";

/**
 * A swipe component
 *
 */
export class LUISwipeContainer extends LUIElement {

    private isDown:boolean = false;
    private scrollOffsetX:number = 0;
    private downX:number  = 0;
    private downScrollOffsetX:number = 0;
    private targetX:number = 0;
    private adjustPowerX:number = 0.12;
    private screenIndex:number = 0;
    private _hideOffscreen:boolean = false;
    private pendingIndexSet:number = -1;
    private downTime:number = 0;
    private downPos:Vector2 = new Vector2();

    constructor() {
        super();
        this.setElementConsumeBehavior(LUIElementConsume.Active);
    }


    public get hideOffscreen() { return this._hideOffscreen; }
    public set hideOffscreen(v:boolean) { this._hideOffscreen = v; }


    setContainerLayout(layouter: LUIContainerLayouter): void {
        throw new Error("LUIManyScreens cannot have a container layout!");
    }

    addChild(e: LUIElement) {
        super.addChild(e);
        this.updateVisibility();
    }

    setChild(index:number, e:LUIElement):LUIElement {
        const out = super.setChild(index, e);
        this.updateVisibility();
        return out;
    }

    public get isAnimating() {
        return (Math.abs(this.targetX - this.scrollOffsetX) < 1.1) ? false : true;
    }

    public get animatedScreenIndex() {
        if (!this.isAnimating)
            return this.screenIndex;
        const dx = (this.scrollOffsetX - this.targetX) / this.getWidth()
        return this.screenIndex + dx;
    }

    private updateVisibility() {
        if (!this._hideOffscreen)
            return;

        const flooredIndex = Math.floor(this.animatedScreenIndex);
        const ceiledIndex = Math.ceil(this.animatedScreenIndex);

        for (let i=0; i<this.getNumChildren(); i++) {
            this.getChildAt(i).setVisible(false);
            if (i == flooredIndex ||
                i == this.screenIndex ||
                i == ceiledIndex) {
                this.getChildAt(i).setVisible(true);
            }
        }
    }

    doLayout(): void {

        if (this.pendingIndexSet > -1) {
            this.screenIndex = this.pendingIndexSet;
            this.targetX = this.getWidth() * this.screenIndex;
            this.scrollOffsetX = this.targetX;
            this.pendingIndexSet  = -1;
        }

        if (!this.isDown) {
            if (Math.floor(this.targetX) != Math.floor(this.scrollOffsetX)) {
                const elapsed = this.getManager().getLastElapsed();
                let remaining = elapsed;
                while(remaining > 0) {
                    const newX = this.targetX * this.adjustPowerX
                        + (1 - this.adjustPowerX) * this.scrollOffsetX;
                    this.scrollOffsetX = newX;
                    remaining -= 1/60;
                }
                if (!this.isAnimating) {
                    this.scrollOffsetX = this.targetX;
                    this.updateVisibility();
                }
                this.makeDirty();
            }
        }

        if (this.isAnimating)
            this.updateVisibility();

        const width = this.getWidth();
        const height = this.getHeight();
        let xx = this.getLeft();
        let yy = this.getTop();
        for (let i=0; i<this.getNumChildren(); i++) {
            const child = this.getChildAt(i);
            if (!child.isVisible())
                continue;

            if (width <= 0 || height <= 0) {
                child.getPosition().setAll(0);
                continue;
            }

            child.getPosition()
                .setX(xx + width*i - this.scrollOffsetX)
                .setY(yy)
                .setWidth(width)
                .setHeight(height)
            ;
        }
        super.doLayout();
    }

    public onMouseDown(x:number, y:number) {
        this.isDown = true;
        this.downX = x;
        this.downScrollOffsetX = this.scrollOffsetX;
        this.downTime = this.getManager().getTime();
        this.downPos.set(x, y);
        this.updateVisibility();
    }

    public onMouseMove(x:number, y:number, isOnElement:boolean) {
        const dx = this.downX - x;
        this.scrollOffsetX = this.downScrollOffsetX + dx;
        this.makeDirty();
    }

    public onMouseUp(x:number, y:number) {
        const dx = this.downX - x;
        this.isDown = false;
        const canWidth = this.getWidth();
        if (Math.abs(dx) >= canWidth * 0.3) {
            this.screenIndex = dx < 0 ? this.screenIndex - 1 : this.screenIndex + 1;
            if (this.screenIndex < 0)
                this.screenIndex = 0;
            if (this.screenIndex > this.getNumChildren()-1)
                this.screenIndex = this.getNumChildren()-1;
        }
        else {
            const deltaTime = this.getManager().getTime() - this.downTime;
            const dist = this.downPos.subtractXY(x, y).length();
            if (deltaTime < 0.5 && dist < 10) {
                const xx = x - this.getLeft();
                const yy = y - this.getTop();
                const resPos = {
                    screenIndex: this.screenIndex,
                    x: xx / this.getWidth(),
                    y: yy / this.getHeight(),
                    width: this.getWidth(),
                    height: this.getHeight(),
                }
                this.getManager().sendMessage(this, "ManyScreenClicked_" + this.getName(), resPos);
            }
        }
        this.targetX = canWidth * this.screenIndex;
        this.makeDirty();
    }

    setStartIndex(i: number):this {
        this.pendingIndexSet = i;
        return this;
    }

    setIndex(i: number) {
        this.screenIndex = i;
        this.updateVisibility();
        this.targetX = this.getWidth() * this.screenIndex;
        this.makeDirty();
    }
}

