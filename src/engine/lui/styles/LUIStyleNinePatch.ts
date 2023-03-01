/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {SpriteSheet, SpriteSheetNinePatch} from "@tsjs/engine/tt2d/SpriteSheet";
import {Rect} from "@tsjs/engine/tt2d/Rect";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {ManagedTexture} from "@tsjs/engine/tt2d/ManagedTexture";
import {Color} from "@tsjs/engine/tt2d/Color";
import {BlendMode} from "@tsjs/engine/tt2d/BlendMode";
import {LUIStyleElement} from "@tsjs/engine/lui/LUIStyle";
import {LUIRect} from "@tsjs/engine/lui/LUIRect";
import {LUIElement} from "@tsjs/engine/lui/LUIElement";


/**
 * Nine-Patch
 *
 *  ox     ix   ix2     ox2
 *  v      v      v      v
 *  ---------------------- < oy
 *  |A    |        |     |
 *  |     |        |     |
 *  |     |        |     |
 *  ----------------------
 *  |     |B       |     | < iy
 *  |     |        |     |
 *  |     |       C|     | < iy2
 *  ----------------------
 *  |     |        |     |
 *  |     |        |     |
 *  |     |        |    D|
 *  ---------------------- < oy2
 *
 *
 *  A: Pixel of outerX and outerY
 *     It is the pixel top/left.
 *     On a full image it is 0,0
 *
 *  B: Pixel of innerX and innerY
 *     It is the pixel top/left of the middle part
 *
 *  C: Pixel of innerX2 and innerY2
 *     It is the pixel bottom/right of the middle part
 *     Can be the same as B if the middle part is only one pixel in size
 *
 *  D: Pixel of outerX and outerY
 *     It is the right/bottom pixel of the outer part.
 *     On a full image it is image.width-1, image.height-1
 *
 */
export class LUIStyleNinePatch extends LUIStyleElement {

    private ninePatch = {
        ox: 0,
        oy: 0,
        ix: 0,
        iy: 0,
        ix2: 0,
        iy2: 0,
        ox2: 0,
        oy2: 0,
    }
    private image:ManagedTexture;

    public readonly mixColor:Color = new Color();

    getImage():ManagedTexture {
        return this.image;
    }

    /**
     * @deprecated legacy. Please use setNinePatch()
     */
    setFromSpriteSheet(ninePatchName:string, sheet:SpriteSheet):LUIStyleNinePatch {
        if (sheet.ninePatches[ninePatchName]) {
            this.setNinePatch(sheet.ninePatches[ninePatchName]);
        }
        else {
            console.error("setFromSpriteSheet() 9-patch not found:", ninePatchName);
        }
        return this;
    }

    setNinePatch(np:SpriteSheetNinePatch):LUIStyleNinePatch {
        if (!np) {
            console.error("setNinePatch() provided NinePatch is falsy!");
            return;
        }
        if (!np.frame) {
            console.error("setNinePatch() provided NinePatch has no frame!");
            return;
        }
        const texRc = np.frame.textureRect;
        this.setNinePatchWithTexture(
            np.frame.texture,
            [
                texRc.x,
                texRc.y,                                       // ox, oy

                texRc.x + np.rect.x,                                    // ix
                texRc.y + np.rect.y,                                    // iy

                texRc.x + np.rect.x + np.rect.width - 1,                    // ix2
                texRc.y + np.rect.y + np.rect.height - 1,                   // iy2

                texRc.x + texRc.width,
                texRc.y + texRc.height,          // ox2, oy2
            ]
        );
        return this;
    }

    /**
     * Option1: explicit data (for spritesheet)
     *
     * ninePatch = {
     *     outerX: 1,
     *     outerY: 1,
     *     innerX: 3,
     *     innerY: 3,
     *     innerX2: 6
     *     innerY2: 6,
     *     outerX2: 10,
     *     outerY2: 10
     * }
     *
     *
     * Option2: explicit array (for spritesheet)
     *
     * ninePatch = [
     *     1, 1,   // outer X/Y
     *     3, 3,   // inner X/Y
     *     6, 6,   // inner X2/Y2
     *     10, 10  // outer X2/Y2
     * ]
     *
     *
     * Option3: implicit outer data (for full image)
     *
     * ninePatch = {
     *     innerX: 3,
     *     innerY: 3,
     *     innerX2: 6
     *     innerY2: 6,
     * }
     *
     * outerX/Y will be both 0
     * outerX2 => image.width - 1, outerY2 => image.height - 1
     *
     *
     * Option 4: implicit outer data array (for full image)
     *
     * ninePatch = [
     *     3, 3,   // inner X/Y
     *     6, 6,   // inner X2/Y2
     * ]
     *
     * outerX2 => image.width - 1, outerY2 => image.height - 1
     *
     *
     * Option 5: implicit inner data as easelJS rectangle (to be compatible ScaleBitmap)
     *
     * ninePatch = new Rect(
     *     3, 3, // inner X/Y
     *     3, 3  // inner width, inner height
     * );
     */
    setNinePatchWithTexture(image:ManagedTexture, ninePatch:Rect|number[]|ExplicitNinePatchDesc):void {
        this.ninePatch = {
            ox: 0,
            oy: 0,
            ix: 0,
            iy: 0,
            ix2: 0,
            iy2: 0,
            ox2: 0,
            oy2: 0,
        };

        // compatibility with good old ScaleBitmap
        if (ninePatch instanceof Rect) {
            ninePatch = [
                ninePatch.x,
                ninePatch.y,
                ninePatch.x + ninePatch.width - 1,
                ninePatch.y + ninePatch.height - 1,
            ];
        }

        if (Array.isArray(ninePatch)) {
            if (ninePatch.length == 8) {
                let i = 0;
                this.ninePatch.ox = ninePatch[i++];
                this.ninePatch.oy = ninePatch[i++];
                this.ninePatch.ix = ninePatch[i++];
                this.ninePatch.iy = ninePatch[i++];
                this.ninePatch.ix2 = ninePatch[i++];
                this.ninePatch.iy2 = ninePatch[i++];
                this.ninePatch.ox2 = ninePatch[i++];
                this.ninePatch.oy2 = ninePatch[i++];
            }
            else if (ninePatch.length == 4) {
                let i = 0;
                this.ninePatch.ox = 0;
                this.ninePatch.oy = 0;
                this.ninePatch.ix = ninePatch[i++];
                this.ninePatch.iy = ninePatch[i++];
                this.ninePatch.ix2 = ninePatch[i++];
                this.ninePatch.iy2 = ninePatch[i++];
                this.ninePatch.ox2 = image.width-1;
                this.ninePatch.oy2 = image.height-1;
            }
            else {
                throw "invalid ninepatch-array"
            }
        }
        else {

            this.ninePatch.ox = ninePatch.outerX || 0;
            this.ninePatch.oy = ninePatch.outerY || 0;
            this.ninePatch.ix = ninePatch.innerX || -1;
            this.ninePatch.iy = ninePatch.innerY || -1;
            this.ninePatch.ix2 = ninePatch.innerX2 || -1;
            this.ninePatch.iy2 = ninePatch.innerY2 || -1;
            this.ninePatch.ox2 = ninePatch.outerX2 || image.width-1;
            this.ninePatch.oy2 = ninePatch.outerY2 || image.height-1;

            if (this.ninePatch.ix < 0 ||
                this.ninePatch.iy < 0 ||
                this.ninePatch.ix2 < 0 ||
                this.ninePatch.iy2 < 0) {
                throw "invalid ninepatch-object. inner value is missing"
            }
        }

        // this.drawWidth = this.ninePatch.ox2 - this.ninePatch.ox;
        // this.drawHeight = this.ninePatch.oy2 - this.ninePatch.oy;

        this.image = image;
    };

    internRender(e: LUIElement, renderer: FatRenderer, rect:LUIRect) {
        this.directDraw(renderer, rect, BlendMode.BM_NORMAL);
    }


    public directDraw(renderer: FatRenderer, rect:LUIRect, blendMode:BlendMode) {
        const ctx = renderer;
        if (!this.image)
            return;

        /**
         * Source data:
         *
         *  ox     ix   ix2    ox2
         *  v      v      v     v
         *
         *    L       C       R
         *    |       |       |
         *    v       v       v
         *  ----------------------           < oy
         *  |     |        |     |
         *  |  P1 |   P2   |  P3 |    <- T
         *  |     |        |     |
         *  ----------------------
         *  |     |        |     |           < iy
         *  |  P4 |   P5   |  P6 |    <- M
         *  |     |        |     |           < iy2
         *  ----------------------
         *  |     |        |     |
         *  |  P7 |   P8   |  P9 |    <- B
         *  |     |        |     |
         *  ----------------------           < oy2
         *
         *  Px = Patch
         *
         *  L = left
         *  C = center
         *  R = right
         *
         *  T = top
         *  M = middle
         *  B = bottom
         *
         *  => lw = left width
         *  => th = top height
         *
         */

        // source sizes
        const lw = this.ninePatch.ix - this.ninePatch.ox;
        const cw = this.ninePatch.ix2 - this.ninePatch.ix + 1;
        const rw = this.ninePatch.ox2 - this.ninePatch.ix2;

        const th = this.ninePatch.iy - this.ninePatch.oy;
        const mh = this.ninePatch.iy2 - this.ninePatch.iy + 1;
        const bh = this.ninePatch.oy2 - this.ninePatch.iy2;


        // // sanity
        if (lw < 0 || cw < 0 || rw < 0 ||
            th < 0 || mh < 0 || bh < 0) {
            console.error("9 patch source data makes no sense")
            return;
        }

        // target scaling
        let tar_lw_scale = 1;
        let tar_cw_scale = 1;
        let tar_rw_scale = 1;

        let tar_th_scale = 1;
        let tar_mh_scale = 1;
        let tar_bh_scale = 1;

        const drawWidth = rect.getWidth();
        const drawHeight = rect.getHeight();

        if (drawWidth > lw+rw) {
            tar_cw_scale = (drawWidth - lw - rw) / cw;
        }
        else {
            tar_cw_scale = 0;
            tar_lw_scale = (lw / (lw+rw)) * (drawWidth / lw);
            tar_rw_scale = (rw / (lw+rw)) * (drawWidth / rw);
        }

        if (drawHeight > th+bh) {
            tar_mh_scale = (drawHeight - th - bh) / mh;
        }
        else {
            tar_mh_scale = 0;
            tar_th_scale = (th / (th+bh)) * (drawHeight / th);
            tar_bh_scale = (bh / (th+bh)) * (drawHeight / bh);
        }


        // target sizes
        const tar_lw = lw * tar_lw_scale;
        const tar_cw = cw * tar_cw_scale;
        const tar_rw = rw * tar_rw_scale;

        const tar_th = th * tar_th_scale;
        const tar_mh = mh * tar_mh_scale;
        const tar_bh = bh * tar_bh_scale;

        // target pos
        const xx = rect.getX();
        const yy = rect.getY();

        // P1
        if (tar_lw > 0 &&
            tar_th > 0) {
            ctx.directDraw(
                this.image,
                this.ninePatch.ox, this.ninePatch.oy,
                lw, th,
                xx, yy,
                tar_lw, tar_th,
                this.mixColor,
                blendMode
            );
        }

        // P2
        if (tar_cw > 0 &&
            tar_th > 0) {
            ctx.directDraw(
                this.image,
                this.ninePatch.ix, this.ninePatch.oy,
                cw, th,
                tar_lw+xx, yy,
                tar_cw, tar_th,
                this.mixColor,
                blendMode
            );
        }

        // P3
        if (tar_rw > 0 &&
            tar_th > 0) {
            ctx.directDraw(
                this.image,
                this.ninePatch.ix2, this.ninePatch.oy,
                rw, th,
                tar_lw + tar_cw + xx, yy,
                tar_rw, tar_th,
                this.mixColor,
                blendMode
            );
        }

        // P4
        if (tar_lw > 0 &&
            tar_mh > 0) {
            ctx.directDraw(
                this.image,
                this.ninePatch.ox, this.ninePatch.iy,
                lw, mh,
                xx, tar_th+yy,
                tar_lw, tar_mh,
                this.mixColor,
                blendMode
            );
        }

        // P5
        if (tar_cw > 0 &&
            tar_mh > 0) {
            ctx.directDraw(
                this.image,
                this.ninePatch.ix, this.ninePatch.iy,
                cw, mh,
                tar_lw+xx, tar_th+yy,
                tar_cw, tar_mh,
                this.mixColor,
                blendMode
            );
        }

        // P6
        if (tar_rw > 0 &&
            tar_mh > 0) {
            ctx.directDraw(
                this.image,
                this.ninePatch.ix2, this.ninePatch.iy,
                rw, mh,
                tar_lw + tar_cw + xx, tar_th + yy,
                tar_rw, tar_mh,
                this.mixColor,
                blendMode
            );
        }

        // P7
        if (tar_lw > 0 &&
            tar_bh > 0) {
            ctx.directDraw(
                this.image,
                this.ninePatch.ox, this.ninePatch.iy2,
                lw, bh,
                xx, tar_th + tar_mh + yy,
                tar_lw, tar_bh,
                this.mixColor,
                blendMode
            );
        }

        // P8
        if (tar_cw > 0 &&
            tar_bh > 0) {
            ctx.directDraw(
                this.image,
                this.ninePatch.ix, this.ninePatch.iy2,
                cw, bh,
                tar_lw + xx, tar_th + tar_mh + yy,
                tar_cw, tar_bh,
                this.mixColor,
                blendMode
            );
        }

        // P9
        if (tar_rw > 0 &&
            tar_bh > 0) {
            ctx.directDraw(
                this.image,
                this.ninePatch.ix2, this.ninePatch.iy2,
                rw, bh,
                tar_lw + tar_cw + xx, tar_th + tar_mh + yy,
                tar_rw, tar_bh,
                this.mixColor,
                blendMode
            );
        }
    }
}

export type ExplicitNinePatchDesc = {
    outerX:number,
    outerY:number,
    innerX:number,
    innerY:number,
    innerX2:number,
    innerY2:number,
    outerX2:number,
    outerY2:number,
}