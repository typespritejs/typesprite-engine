/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ManagedTexture} from "@tsjs/engine/tt2d/ManagedTexture";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {RenderTarget} from "@tsjs/engine/tt2d/RenderTarget";
import {LUIElement} from "@tsjs/engine/lui/LUIElement";
import {EngineContext} from "@tsjs/engine/tt2d/EngineContext";
import {Color} from "@tsjs/engine/tt2d/Color";
import {BlendMode} from "@tsjs/engine/tt2d/BlendMode";


/**
 * This element buffers the rendered content of it's children
 * into a buffer (RenderToTexture).
 *
 * Use this in one of the two cases:
 *
 * 1. You like to compose a complex effect on UI content as if it was
 * a single texture (like reducing layers or smart layers in photo-software).
 *
 * 2. The content is super (duper) expensive to render and you like to cache
 * it.
 *
 * In both situations keep in mind that a LUIBufferedElement always breaks
 * batching and increares draw-counts. Use with care and especially case
 * (2) should be benchmarked before jumping into it.
 *
 * ---
 *
 * DON'T use it when:
 *
 * 1. You simply want to cut overlaping content (clipping). Use
 * `element.setClippingMode(LUIClipBehavior.ElementBox)` instead.
 *
 * ---
 *
 * * Example:
 *
 * ```js
 * const bufferElement = new LUIBufferedElement({
 *     drawBuffer(context:LUIBufferedElement, gfx:FatRenderer, buffer:RenderTarget, bufferTex:ManagedTexture, pixelSize:number) {
 *         // see BufferRenderer for details
 *     }
 * }).enabledBuffering(500, 500);
 *
 * ```
 *
 * NOTE: It's super important to call `disableBuffering()` when the element
 * is not used anymore (e.g. during onDecativate() on a Component). Otherwise
 * GPU memory is leaked.
 *
 * @see BufferRenderer
 * @see RenderTarget
 * @see FatMaterial
 * @see FatRenderer
 *
 */
export class LUIBufferedElement extends LUIElement {

    private buffer:RenderTarget = null;
    private bufferTexture:ManagedTexture = null;
    private bufferWidth:number;
    private bufferHeight:number;
    private bufferEnabled:boolean = false;

    public bufferDrawer:BufferRenderer;

    constructor(bufferDrawer?:BufferRenderer) {
        super();
        this.bufferDrawer = bufferDrawer;
    }

    enabledBuffering(width:number, height:number):this {
        this.bufferEnabled = true;
        this.bufferWidth = width;
        this.bufferHeight = height;
        return this;
    }

    disableBuffering():this {
        if (!this.bufferEnabled)
            return;

        this.bufferEnabled = false;
        this.freeBuffer();
        return this;
    }

    isBufferingEnabled():boolean {
        return this.bufferEnabled;
    }

    drawToCanvas(gfx: FatRenderer, depth: number) {
        if (!this.isVisible())
            return;

        if (this.bufferEnabled) {
            const ec = gfx.engineContext;
            if (!this.buffer ||
                this.buffer.width != this.bufferWidth ||
                this.buffer.height != this.bufferHeight) {
                this.rebuildBuffer(ec);
            }

            const oldBuffer = ec.currentRenderTarget;
            gfx.flush();
            this.buffer.apply();
            super.drawToCanvas(gfx, depth);
            gfx.flush();
            oldBuffer.apply();

            const ps = this.getManager().getPixelSize();

            if (this.bufferDrawer) {
                this.bufferDrawer.drawBuffer(
                    this,
                    gfx,
                    this.buffer,
                    this.bufferTexture,
                    ps,
                )
            }
            else {
                gfx.directDraw(
                    this.bufferTexture,
                    0,
                    0,
                    this.buffer.width,
                    this.buffer.height,
                    0, 0,
                    this.buffer.width / ps,
                    this.buffer.height / ps,
                    Color.White,
                    BlendMode.BM_NO_BLEND
                );
            }
        }
        else {
            super.drawToCanvas(gfx, depth);
        }
    }

    private freeBuffer() {
        if (this.buffer)
            this.buffer.releaseLater();
        if (this.bufferTexture)
            this.bufferTexture.releaseLater();
        this.buffer = null;
        this.bufferTexture = null;
    }

    private rebuildBuffer(ec:EngineContext) {
        console.log("LUIBufferedElement updated!");
        this.freeBuffer();

        this.buffer = RenderTarget.createEmpty(ec, this.bufferWidth, this.bufferHeight);
        this.buffer.retain();
        this.bufferTexture = ManagedTexture.fromRenderTarget(ec, this.buffer, false);
        this.bufferTexture.retain();
    }

}

/**
 * Render-Interface for LUIBufferedElement.
 *
 * * A LUIContainerLayouter must answer the following quest:
 *
 * How to render the buffered result (texture) of a LUIBufferedElement?
 *
 * * Example: simply copy draw the buffered content
 *
 * ```
 * class MyRenderer implements BufferRenderer{
 *
 * drawBuffer(
 *   context: LUIBufferedElement,
 *   gfx: FatRenderer,
 *   buffer: RenderTarget,
 *   bufferTex: ManagedTexture,
 *   pixelSize: number
 * ) {
 *
 *   gfx.directDraw(
 *     bufferTexture,
 *     0,
 *     0,
 *     buffer.width,
 *     buffer.height,
 *     0, 0,
 *     buffer.width / pixelSize,
 *     buffer.height / pixelSize,
 *     Color.White,
 *     BlendMode.BM_NO_BLEND
 *   );
 * }
 * ```
 *
 *
 * @see LUIBufferedElement
 */
export interface BufferRenderer {
    /**
     *
     * @param context the element this call originates from
     * @param renderer use this to perform draw calls
     * @param buffer object that manages the buffered texture.
     * @param bufferTex texture for drawing the buffered content.
     * @param pixelSize LUI can render in high-dpi environments. PixelSize allows you to consider thant when writing shader.
     */
    drawBuffer(context:LUIBufferedElement, renderer:FatRenderer, buffer:RenderTarget, bufferTex:ManagedTexture, pixelSize:number);
}