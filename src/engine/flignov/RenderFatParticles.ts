/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {Flignov} from "@tsjs/engine/flignov/Flignov";
import {Emitter} from "@tsjs/engine/flignov/Emitter";
import {Particle} from "@tsjs/engine/flignov/Particle";
import {AffineMatrix} from "@tsjs/engine/tt2d/AffineMatrix";
import {DEG_TO_RAD} from "@tsjs/engine/tt2d/Math2";
import {SpriteSheetFrame} from "@tsjs/engine/tt2d/SpriteSheet";


const tmpMatrix = new AffineMatrix();

/**
 * Utility function to render flignov particles to a FatRenderer.
 *
 * @param target
 * @param source
 *
 *
 * @see Flignov
 */
export function renderParticlesDirect(target:FatRenderer, source:Flignov) {
    const ps = source;
    const elapsed = ps.lastElapsed;

    for (let i=0; i<ps.getEmitter().length; i++) {
        const emitter = ps.getEmitter()[i] as Emitter;
        const len = emitter._particles.length;
        if (len == 0)
            continue;

        // const refParticle = emitter._particles[0] as Particle;
        let frame:SpriteSheetFrame = null; //refParticle.animFrames[0];
        for (let pi=0; pi<len; pi++) {
            const p = emitter._particles[pi] as Particle;

            if (p.animFrames.length > 1) {
                const frameStep = elapsed * 60 * p.animSpeed;
                p.animTime += frameStep;
                const frameIndex = Math.floor(p.animTime) % p.animFrames.length;
                frame = p.animFrames[frameIndex];
            }
            else {
                frame = p.animFrames[0];
            }

            if (p.rotation == 0) {
                if (p.scale.x == 1 && p.scale.y == 1) {
                    target.directDraw(
                        frame.texture,
                        frame.textureRect.x,
                        frame.textureRect.y,
                        frame.textureRect.width,
                        frame.textureRect.height,

                        Math.floor(p.position.x - frame.texturePivot.x),
                        Math.floor(p.position.y - frame.texturePivot.y),
                        frame.textureRect.width,
                        frame.textureRect.height,
                        p.mixColor,
                        p.blendMode,
                    )
                }
                else {
                    target.directDraw(
                        frame.texture,
                        frame.textureRect.x,
                        frame.textureRect.y,
                        frame.textureRect.width,
                        frame.textureRect.height,

                        Math.floor(p.position.x - frame.texturePivot.x*p.scale.x),
                        Math.floor(p.position.y - frame.texturePivot.y*p.scale.y),
                        frame.textureRect.width * p.scale.x,
                        frame.textureRect.height * p.scale.y,
                        p.mixColor,
                        p.blendMode,
                    )
                }
            }
            else {
                tmpMatrix.copyValues(target.getRootMatrix());
                target.getRootMatrix().translate(p.position.x, p.position.y);
                target.getRootMatrix().rotate(p.rotation*DEG_TO_RAD);

                target.directDraw(
                    frame.texture,
                    frame.textureRect.x,
                    frame.textureRect.y,
                    frame.textureRect.width,
                    frame.textureRect.height,

                    - frame.texturePivot.x*p.scale.x,
                    - frame.texturePivot.y*p.scale.y,
                    frame.textureRect.width*p.scale.x,
                    frame.textureRect.height*p.scale.y,
                    p.mixColor,
                    p.blendMode,
                )

                target.setRootMatrix(tmpMatrix);
            }
        }
    }
}

