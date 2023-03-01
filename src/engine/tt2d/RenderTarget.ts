/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {nextPowerOfTwo} from "./Math2";
import {EngineContext} from "./EngineContext";
import {ContextResource} from "./ContextResource";
import {scaling, ortho, identity, multiply} from '@tsjs/lib/twgl_light';
import {RecoverableResource} from "@tsjs/engine/tt2d/RecoverableResource";
import {EngineError, EngineErrorType} from "@tsjs/engine/tt2d/EngineError";


/**
 * A RenderTarget is a texture which we can draw things into.
 *
 * This class represents two kind of them:
 *
 *  1. Main Render Target
 *  2. Texture Render Target
 *
 * For both it provides the projection matrix (+camera) and other information
 * required to be used by high level code (like the targets size in pixel).
 *
 * (1) always exists and is defined by the browser.
 *
 * (2) is created by high level code and surfes as a RenderToTexture manager.
 * We can render stuff into it and then use the attached texture to render
 * that stuff into another RT.
 *
 */
export class RenderTarget extends ContextResource implements
    RecoverableResource {

    public readonly projection:Float32Array = identity();

    public static createEmpty(ec:EngineContext, width:number, height:number):RenderTarget {
        width = Math.floor(width);
        height = Math.floor(height);

        const texW = nextPowerOfTwo(width);
        const texH = nextPowerOfTwo(height);

        const rt = new RenderTarget(
            ec,
            width,
            height,
            texW,
            texH,
            0,
            0
        );
        rt.createFrameBufferTexture(texW, texH);
        rt.releaseLater();
        return rt;
    }

    constructor(
        ec:EngineContext,
        private _width:number,
        private _height:number,
        private _texWidth:number,
        private _texHeight:number,
        private _frameBuffer:WebGLFramebuffer|null,
        private _texture:WebGLTexture|null
    ) {
        super(ec);

        if (this._frameBuffer != null) {
            ec.recoverPool.addResource(this);
            // const correction = twgl.m4.scaling([1, -1, 1]);
            //twgl.m4.translate(correction,[0, this._height, 0], correction);
            const correction = scaling([1, -1, 1]);
            multiply(
                correction,
                ortho(0,
                    // this._width,
                    // this._height,
                    this._width,
                    this._height,
                    0,
                    -1, 1,
                ),
                this.projection
            );
        }
        else {
            ortho(0,
                this._width,
                this._height,
                0,
                -1, 1,
                this.projection
            );
        }
    }

    public apply():void {
        if (this.ec.currentRenderTarget == this)
            return;

        this.ec.gl.bindFramebuffer(this.ec.gl.FRAMEBUFFER, this._frameBuffer);
        this.ec.gl.viewport(0, 0, this._width, this._height);
        this.ec.currentRenderTarget = this;
        this.ec.currentTexture = null;
        this.ec.currentShader = null;
    }

    public onRestoreContext():void {
        if (this._frameBuffer == 0) { // 0 => we are in the main
            return;
        }

        this.createFrameBufferTexture(this._texWidth, this._texHeight);
    }

    private createFrameBufferTexture(width:number, height:number):void {
        const gl = this.ec.gl;

        const stored = gl.getParameter(gl.FRAMEBUFFER_BINDING);

        const fb = gl.createFramebuffer();
        const tex = gl.createTexture();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

        let okay = false;
        switch(gl.checkFramebufferStatus(gl.FRAMEBUFFER)) {
            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.error("Framebuffer: GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.error("Framebuffer: GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                break;
            case gl.FRAMEBUFFER_UNSUPPORTED:
                console.error("Framebuffer: GL_FRAMEBUFFER_UNSUPPORTED");
                break;
            case gl.FRAMEBUFFER_COMPLETE:
                okay = true;
                break;
            default:
                console.error("Framebuffer: someError");
                break;
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, stored);


        if (!okay || !fb || !tex)
            throw new EngineError(EngineErrorType.ERROR_CREATE_FRAMEBUFFER);


        this._texWidth = width;
        this._texHeight = height;
        this._texture = tex;
        this._frameBuffer = fb;
    }

    freeResource(): void {
        if (this._frameBuffer) {
            this.ec.recoverPool.removeResource(this);
            this.ec.gl.deleteFramebuffer(this._frameBuffer);
            this.ec.gl.deleteTexture(this._texture);
            this._frameBuffer = null;
            this._texture = null;
        }
    }

    public onResize(w:number, h:number) {
        if (this._frameBuffer) {
            throw new Error("RenderTarget::onResize() my only be called on the mainRenderTarget");
        }

        this._width = w;
        this._height = h;
        this._texWidth = w;
        this._texHeight = h;
        this.ec.gl.viewport(0, 0, this._width, this._height);
        this.ec.currentShader = null;
        ortho(
            0,
            this._width,
            this._height,
            0,
            -1, 1,
            this.projection
        );
    }

    public get texture():WebGLTexture|null {
        return this._texture;
    }

    public get width() {
        return this._width;
    }

    public get height() {
        return this._height;
    }

    public get texWidth() {
        return this._texWidth;
    }

    public get texHeight() {
        return this._texHeight;
    }

}

