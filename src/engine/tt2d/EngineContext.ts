/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {RenderTarget} from "./RenderTarget";
import RecoverPool from "./RecoverPool";
import ReleasePool from "./ReleasePool";

import {ManagedShader} from "./ManagedShader";
import {ManagedTexture} from "./ManagedTexture";
import {applyBlendModeForce, BlendMode} from "./BlendMode";
import {Rect} from "./Rect";
import {EngineError, EngineErrorType} from "@tsjs/engine/tt2d/EngineError";


export enum ContextState {
    Active,
    Lost,
}


/**
 * An EC is the manager for one webgl-context and it's
 * resources.
 *
 * It holds:
 *
 *   - the pools to organize reference counting
 *     and recover resources.
 *   - it manages the render targets (especially the main target)
 *
 */
export class EngineContext {

    public gl:WebGLRenderingContext;
    public readonly mainRenderTarget:RenderTarget;
    public readonly recoverPool:RecoverPool = new RecoverPool();
    public readonly releasePool:ReleasePool = new ReleasePool();
    private _contextState:ContextState = ContextState.Active;

    public whiteTexture:ManagedTexture = null;

    public currentRenderTarget:RenderTarget;
    public currentBlendEnabled:number = -1;
    public currentBlendFuncSrc:number = -1;
    public currentBlendFuncDst:number = -1;
    public currentShader:ManagedShader = null;
    public currentTexture:any = null;
    public currentBlendMode:BlendMode = BlendMode.BM_NORMAL;
    public currentScissorEnabled:boolean = false;
    public readonly currentScissorRect:Rect = new Rect();

    constructor(
        private canvas:HTMLCanvasElement
    ) {

        const gl = this.setupContext();
        if (!gl) {
            throw new EngineError(EngineErrorType.ERROR_CREATING_CONTEXT);
        }
        this.gl = gl;

        const rt = new RenderTarget(
            this,
            canvas.width,
            canvas.height,
            canvas.width,
            canvas.height,
            gl.getParameter(gl.FRAMEBUFFER_BINDING),
            0
        );
        this.mainRenderTarget = rt;
        this.currentRenderTarget = rt;

        this.whiteTexture = ManagedTexture.fromRawPixels(this, [
            255, 255, 255, 255,    255, 255, 255, 255,
            255, 255, 255, 255,    255, 255, 255, 255,
        ], 2, 2, false);
        this.whiteTexture.retain();

        this.canvas.addEventListener('webglcontextlost', this.handleLostContext, false);
        this.canvas.addEventListener('webglcontextrestored', this.handleRestoreContext, false);
    }

    private setupContext():WebGLRenderingContext {
        const gl = this.canvas.getContext("webgl", {
            alpha: false,
            powerPreference:"high-performance",
            antialias: false,
            depth: false,
            stencil: false,
            // failIfMajorPerformanceCaveat: false,
            // preserveDrawingBuffer: false,
            // desynchronized: false,
            // premultipliedAlpha: true
        });
        return gl;
    }

    public setDefaultGLStates() {
        const gl = this.gl;
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        applyBlendModeForce(this, BlendMode.BM_NORMAL, false);
    }

    get contextState():ContextState {
        return this._contextState;
    }

    private lostext:any;
    public simulateContextLost() {
        this.lostext = this.gl.getExtension('WEBGL_lose_context');
        this.lostext.loseContext();
    }

    public simulateContextRestore() {
        this.lostext.restoreContext();
    }

    private handleLostContext = (e) => {
        // details
        // https://www.khronos.org/webgl/wiki/HandlingContextLost
        // also: https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_lose_context/loseContext
        e.preventDefault();
        this._contextState = ContextState.Lost;
    };

    private handleRestoreContext = () => {

        this.gl = this.setupContext();
        const oldWidth = this.canvas.style.width;
        this.canvas.style.width = '99%';
        setTimeout(() => {
            this.canvas.style.width = oldWidth;
        }, 0);
        if (!this.gl) {
            console.error("Context totally lost!")
        }

        this.recoverPool.onRestoreContext();
        this._contextState = ContextState.Active;

        if (this.currentBlendEnabled)
            this.gl.enable(this.gl.BLEND);
        else
            this.gl.disable(this.gl.BLEND);

        const gl = this.gl;
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        this.gl.blendFunc(this.currentBlendFuncSrc, this.currentBlendFuncDst);

        if (this.currentRenderTarget != this.mainRenderTarget)
            this.currentRenderTarget.apply();
    };


    public finalCleanup():void {
        this.canvas.removeEventListener('webglcontextlost', this.handleLostContext, false);
        this.canvas.removeEventListener('webglcontextrestored', this.handleRestoreContext, false);
    }

    private restoreBlendMode() {
        if (this.currentBlendEnabled)
            this.gl.enable(this.gl.BLEND);
        else
            this.gl.disable(this.gl.BLEND);
        this.gl.blendFunc(this.currentBlendFuncSrc, this.currentBlendFuncDst);
    }

    // public setScissorRect(x:number, y:number, width:number, height:number) {
    //     const gl = this.gl;
    //     const rtHeight = this.currentRenderTarget.height;
    //
    //     if (!this.currentScissorEnabled) {
    //         this.currentScissorEnabled = true;
    //         gl.enable(gl.SCISSOR_TEST);
    //     }
    //
    //     this.currentScissorRect.setValues(x, y, width, height);
    //
    //
    //     const xx = x;
    //     const yy = rtHeight - height - y;
    //     const ww = width;
    //     const hh = height;
    //
    //     gl.scissor(xx, yy, ww, hh);
    // }
    //
    // public getScissorRect():EaselRect {
    //     return this.currentScissorRect;
    // }
    //
    // public unsetScissorRect() {
    //     const gl = this.gl;
    //     if (this.currentScissorEnabled) {
    //         this.currentScissorEnabled = false;
    //         gl.disable(gl.SCISSOR_TEST)
    //     }
    // }

}
