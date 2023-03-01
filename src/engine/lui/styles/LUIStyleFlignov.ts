/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIStyleElement} from "../LUIStyle";
import {LUIElement} from "../LUIElement";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {RenderElement} from "@tsjs/engine/tt2d/RenderTree";
import {LUIRect} from "../LUIRect";
import {AffineMatrix} from "@tsjs/engine/tt2d/AffineMatrix";
import {Flignov} from "@tsjs/engine/flignov/Flignov";
import {renderParticlesDirect} from "@tsjs/engine/flignov/RenderFatParticles";
import {RectPosition} from "@tsjs/engine/flignov/Initers";


/**
 * Renders a Flignov particle system object
 */
export class LUIStyleFlignov extends LUIStyleElement {

    public flignov:Flignov;
    /**
     * true: all RectPosition emitter will be set to the
     *   rect of the component
     */
    public applyEmitterPosition:boolean = false;

    private cacheMatrix:AffineMatrix = new AffineMatrix();

    constructor() {
        super();
    }

    internRender(e: LUIElement, renderer: FatRenderer, rect: LUIRect) {
        if (rect.getHeight() > 0 && rect.getWidth() > 0 && this.flignov) {

            if (this.applyEmitterPosition) {
                const num = this.flignov.getEmitter().length;
                for (let i=0; i<num; i++) {
                    const e = this.flignov.getEmitterAtIndex(i);
                    const rc = e.getIniterOfType(RectPosition) as RectPosition;
                    if (rc) {
                        rc.startX = 0;
                        rc.startY = 0;
                        rc.endX = rect.getWidth();
                        rc.endY = rect.getHeight();
                    }
                }
            }

            this.cacheMatrix.copyValues(renderer.getRootMatrix());
            renderer.getRootMatrix().translate(rect.getX(), rect.getY());
            this.flignov.update(e.getManager().getLastElapsed());
            renderParticlesDirect(renderer, this.flignov);
            renderer.setRootMatrix(this.cacheMatrix);
        }
    }

}


