/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {cmp, link, prop} from "@tsjs/entity/decorate/ComponentDecorators";
import {CollisionEngine, CollisionEngineDebugDrawer, DebugSettings} from "@tsjs/engine/collision/collision";
import {GraphicsEngine} from "@tsjs/runtime/GraphicsEngine";
import {QuadElement, RenderElement} from "@tsjs/engine/tt2d/RenderTree";
import {Color} from "@tsjs/engine/tt2d/Color";
import {Component} from "@tsjs/entity/Component";


/**
 * ## CollisionDebug-Component
 *
 * Attach this to a GraphicsEngine entity to debug/observe collisions.
 *
 * This is for debugging/utility only. Keep in mind that it puts additional
 * load on the calculations.
 */
export class CollisionDebug extends Component implements CollisionEngineDebugDrawer {


    @cmp("GraphicsEngine:typesprite", false)
    private gfx:GraphicsEngine;
    @prop('number', 9999)
    private drawLimit:number;
    @prop('bool', true)
    private printLimitWarning:boolean

    private poolQuads:QuadElement[] = [];
    private poolQuadsUsed:number = 0;
    private debugLayer:RenderElement;
    private _engine:CollisionEngine|null = null;
    private _limitReached = false;

    onInit() {
        this.debugLayer = new RenderElement();
        let gfx:GraphicsEngine = this.gfx;
        gfx.gameLayer.addChild(this.debugLayer);
    }

    set engine(v:CollisionEngine) {
        this._engine = v;
        this.engine.setDebugDrawer(true);
    }
    get engine():CollisionEngine {
        return this._engine;
    }

    onRender(elapsed: number): void {
        if (this.engine) {
            this.debugLayer.removeAllChildren();
            this.poolQuadsUsed = 0;
            this._limitReached = false;
            this.engine.debugDraw(this);
            if (this._limitReached && this.printLimitWarning) {
                console.warn("CollisionDebug(): reached draw-limit");
            }
        }
    }

    private getQuad():QuadElement|null {
        if (this.poolQuadsUsed >= this.poolQuads.length) {
            if (this.poolQuads.length >= this.drawLimit) {
                return null;
            }
            const q = new QuadElement(0, 0);
            this.poolQuadsUsed++;
            this.poolQuads.push(q);
            this.debugLayer.addChild(q);
            return q;
        }
        else {
            const q = this.poolQuads[this.poolQuadsUsed]
            this.poolQuadsUsed++;
            this.debugLayer.addChild(q);
            return q;
        }
    }

    drawLine(x: number, y: number, x2: number, y2: number, c: Color) {
        const q = this.getQuad();
        if (!q) {
            this._limitReached = true;
            return;
        }

        q.setAsLine(x, y, x2, y2, 1);
        q.setColor(c);
    }

    drawPoint(x: number, y: number, c: Color) {
        const q = this.getQuad();
        if (!q) {
            this._limitReached = true;
            return;
        }

        q.setAsLine(x-2, y-2, x+2, y+2, 1);
        q.setColor(c);

        const q2 = this.getQuad();
        if (!q2) {
            this._limitReached = true;
            return;
        }
        q2.setAsLine(x+2, y-2, x-2, y+2, 1);
        q2.setColor(c);
    }

}
