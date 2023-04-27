/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {EngineContext} from "./EngineContext";
import {
    AnimationElement,
    BitmapElement,
    DirectRenderElement,
    QuadElement,
    RenderElement,
    SpriteElement
} from "./RenderTree";
import {ManagedShader} from "./ManagedShader";
import {AffineMatrix} from "./AffineMatrix";
import {ContextResource} from "./ContextResource";
import {ManagedTexture} from "./ManagedTexture";
import {applyBlendMode, BlendMode} from "./BlendMode";
import {Color} from "./Color";
import {Rect} from "./Rect";
import {
    fatRendererFsh, fatRendererScissorCircleFsh, fatRendererScissorCircleVsh,
    fatRendererScissorFsh,
    fatRendererScissorVsh,
    fatRendererVsh
} from "@tsjs/engine/tt2d/StandardShader";
import {FatMaterial} from "@tsjs/engine/tt2d/Materials";
import {Vector2} from "@tsjs/engine/tt2d/Vector";
import {RecoverableResource} from "@tsjs/engine/tt2d/RecoverableResource";


// shader
// blend mode

/*


  blend: normal,                 << gl-Attribute  | batch breaker
  tex: Texture                   << gl-Attribute  | batch breaker
  color: rgba(255,255,255,255)   << VERTEX_BUFFER <--|
  transform: matrix,             << VERTEX_BUFFER <- |- batch able
  frame: texcoords,              << VERTEX_BUFFER <--|

 */


/**
 * 2 * float => x,y
 * 2 * float => texture x, texture y
 * 4 * float => color (r,g,b,a)
 * -----------
 * 8 floats per vertex
 */
const VERTEX_STRIDE = 8;
const MAX_DRAW_PER_BATCH = 500;
/**
 * [x,y,tx,ty,cR,cG,cB,cA] << 1 vertex => 8 floats (v1)
 *
 * [v1, v2, v3, v4] <<  1 draw call => 4 vertices => 4*8 floats
 *
 * [v1, v2, v3, v4, v4, v3, v5, v6, v7, v8] << 2 draw calls need 2 * degenerated space of vertices extra
 *                  ------
 *                  ^
 *                  Degenerated triangle
 *
 * [v1, v2, v3, v4, v4, v3, v5, v6, v7, v8, v8, v7, v9, v10, v11, v12] << 3 draw calls need
 *                  ------                  ------                        two degenerated space of vertices extra
 *                  ^                          ^
 *                  Degenerated triangle -------
 *
 *
 */
const VERTEX_BUFFER_SIZE = (VERTEX_STRIDE * (4 + 2)) * MAX_DRAW_PER_BATCH - (VERTEX_STRIDE*2);

const X =0 ;
const Y = 1;
const tempvec2 = [0,0];


export enum ScissorMode {
    None,
    Rectangle,
    Circle,
}

/**
 * FatRenderer is a triangle-strip-renderer with support for batching based on
 * degenerated triangles.
 *
 * It support vertex colors, 1 texture
 *
 *
 *  TRIANGLE STRIP:
 *  classic:
 *
 *  [0]...[2]...[4]
 *   |    ^     ^
 *   |   / |   / |
 *   |  /  |  /  |
 *   v /   v /   v
 *  [1]...[3]...[5]
 *
 *  DEGENERATED
 *
 *  [0]...[2]   [5'][6]...[8]
 *   |    ^          |    ^
 *   |   / |         |   / |
 *   |  /  |         |  /  |
 *   v /   v         v /   v
 *  [1]...[3][4']   [7]...[9]
 *
 *  4' is a copy of 3
 *  5' is a copy of 6
 *
 *  This allows to detach the two triangles and draw them as quads.
 *  FatRenderer uses this to have different elements in one buffer.
 *
 * TODO optimize scissor change by having a dirty flag for changed uniforms (prevents from resetting the same shader again)
 *      when only a uniform requires a change
 *
 */
export class FatRenderer extends ContextResource implements RecoverableResource {

    private fatShader:ManagedShader;
    private fatScissorShader:ManagedShader;
    private fatScissorCircleShader:ManagedShader;
    // private fatShaderPremod:ManagedShader;
    private byteIndex:number = 0;
    private numElements:number = 0;
    private rootMat:AffineMatrix = new AffineMatrix();
    private directDrawing:number = 0;
    private tmpDirectDrawMatrix:AffineMatrix = new AffineMatrix();
    private tmpCustomMatrix:AffineMatrix = new AffineMatrix();
    private scissorMode:ScissorMode = ScissorMode.None;

    private cpuBuffer:Float32Array;

    private readonly scissorStore:Rect = new Rect();
    public animationElapsed:number = 0;
    public numLastDrawCalls:number = 0;
    public numLastElements:number = 0;

    public static create(ec:EngineContext):FatRenderer {
        const ret = new FatRenderer(ec);
        ret.releaseLater();
        ec.recoverPool.addResource(ret);
        return ret;
    }

    private constructor(ec:EngineContext) {
        super(ec);
        this.fatShader = ManagedShader.createFromSource(
            ec,
            fatRendererVsh,
            fatRendererFsh,
            ["aPosition", "aTexCoord", "aColor"],
            ["uProj", "uTex"],
            );
        this.fatScissorShader = ManagedShader.createFromSource(
            ec,
            fatRendererScissorVsh,
            fatRendererScissorFsh,
            ["aPosition", "aTexCoord", "aColor"],
            ["uProj", "uTex", "uScissor"],
        );
        this.fatScissorCircleShader = ManagedShader.createFromSource(
            ec,
            fatRendererScissorCircleVsh,
            fatRendererScissorCircleFsh,
            ["aPosition", "aTexCoord", "aColor"],
            ["uProj", "uTex", "uScissor"],
        );
        // this.fatShaderPremod = ManagedShader.createFromSource(
        //     ec,
        //     fatRendererVsh,
        //     fatRendererPremodFsh,
        //     ["aPosition", "aTexCoord", "aColor"],
        //     ["uProj", "uTex"],
        // );

        this.fatShader.retain();
        this.fatScissorShader.retain();
        this.fatScissorCircleShader.retain();
        // this.fatShaderPremod.retain();

        this.cpuBuffer = new Float32Array(VERTEX_BUFFER_SIZE);
        this.ec = ec;
    }

    public get engineContext():EngineContext {
        return this.ec;
    }

    /**
     * BE AWARE! This is in actual RenderTarget-Pixel-Size!
     */
    public setScissorRect(x:number, y:number, x2:number, y2:number) {

        if (this.numElements > 0)
            this._flushBuffer();

        this.scissorMode = ScissorMode.Rectangle;
        this.scissorStore.x = x;
        this.scissorStore.y = y;
        this.scissorStore.width = x2;
        this.scissorStore.height = y2;

        this.breakNextBatching();
    }

    /**
     * BE AWARE! This is in actual RenderTarget-Pixel-Size!
     *
     * @param inside true means only pixels inside the circles will be drawn, false => outside
     */
    public setScissorCircle(x:number, y:number, radius:number, inside:boolean = true) {
        if (this.numElements > 0)
            this._flushBuffer();

        this.scissorMode = ScissorMode.Circle
        this.scissorStore.x = x;
        this.scissorStore.y = y;
        this.scissorStore.width = radius;
        this.scissorStore.height = inside ? 1 : -1;

        this.breakNextBatching();
    }

    /**
     * The current set of coordinates used to determine the current scissor mode
     *
     * The data is in render-target-coordinates and also means different things
     * with different modes
     *
     */
    public getScissorStore():Rect {
        return this.scissorStore
    }

    public unsetScissorRect() {
        if (this.scissorMode) {
            if (this.numElements > 0)
                this._flushBuffer();
        }
        this.scissorMode = ScissorMode.None;
    }

    public isScissorModeEnabled():boolean {
        return this.scissorMode != ScissorMode.None;
    }

    public getScissorMode():ScissorMode {
        return this.scissorMode;
    }

    private _createAndCopyDataToGpuBuffer():WebGLBuffer {
        const gl = this.ec.gl;
        const gpuBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, gpuBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            this.cpuBuffer,
            // gl.STATIC_DRAW
            gl.STREAM_DRAW
            // gl.DYNAMIC_DRAW
        );
        return gpuBuffer;
    }

    public beginDirectDraw() {
        this.directDrawing++;
        if (this.directDrawing > 1)
            return;

        this.byteIndex = 0;
        this.numElements = 0;
    }

    public endDirectDraw() {
        this.directDrawing--;
        if (this.directDrawing < 0) {
            throw new Error(`FatRenderer::endDirectDraw() does not match beginDirectDraw()`);
        }
        else if (this.directDrawing > 0) {
            return
        }

        // flush if needed
        if (this.numElements > 0) {
            this._flushBuffer();
        }
    }

    public flush() {
        if (this.numElements > 0) {
            this._flushBuffer();
        }
    }

    private breakNextBatching() {
        this.engineContext.currentShader = null;
    }

    private directDrawPrepare(
        shader:ManagedShader,
        texture:ManagedTexture,
        blendMode:BlendMode
    ):boolean {
        const ec = this.ec;
        const gl = ec.gl;

        let needFlush = false;
        if (this.numElements >= MAX_DRAW_PER_BATCH)
            needFlush = true;

        let flushBuffer:boolean = false;

        if (shader != ec.currentShader) {
            flushBuffer = true;
        }
        if (texture != ec.currentTexture) {
            flushBuffer = true;
        }
        if (blendMode != ec.currentBlendMode) {
            flushBuffer = true;
        }

        if ((needFlush || flushBuffer) && this.numElements > 0) {
            this._flushBuffer();
        }

        if (shader != ec.currentShader) {
            ec.currentShader = shader;
            ec.currentTexture = texture;
            ec.currentBlendMode = blendMode;

            gl.useProgram(shader.program);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture.textureId); // really needed?
            gl.uniform1i(shader.getUniformByIndex(UNIFORM_TEX), 0);

            gl.uniformMatrix4fv(
                shader.getUniformByIndex(UNIFORM_PROJ),
                false,
                this.ec.currentRenderTarget.projection
            );
            applyBlendMode(ec, blendMode, texture.premod);
        }
        else { // if shader changes texture changes anyway
            if (texture != ec.currentTexture) {
                ec.currentTexture = texture;
                ec.currentBlendMode = blendMode;
                gl.bindTexture(gl.TEXTURE_2D, texture.textureId);
                applyBlendMode(ec, blendMode, texture.premod);
            }
            else if (blendMode != ec.currentBlendMode) {
                ec.currentBlendMode = blendMode;
                applyBlendMode(ec, blendMode, texture.premod);
            }
        }

        // ** degenerate triangle (when batching)

        if (this.numElements > 0) {
            let bi = this.byteIndex;

            // copy last vertex data
            let obi = bi - VERTEX_STRIDE;
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi];

            this.byteIndex = bi;
            return true;
        }
        return false;
    }



    /**
     *
     * @param x
     * @param y
     * @param w
     * @param h
     * @param col1 top-left (or all)
     * @param col2 bottom-left
     * @param col3 top-right
     * @param col4 bottom-right
     */
    public directDrawRect(
        x:number,
        y:number,
        w:number,
        h:number,
        col1:Color,
        col2?:Color,
        col3?:Color,
        col4?:Color,
        blendMode:BlendMode=BlendMode.BM_NORMAL
    ) {
        if (this.directDrawing <= 0)
            throw new Error(`Missing beginDirectDraw()`);

        const degenerate = this.directDrawPrepare(
            this.scissorAwareShader, //this.scissorMode ? this.fatScissorShader : this.fatShader,
            this.ec.whiteTexture,
            blendMode
        );

        const currentMatrix = this.tmpDirectDrawMatrix;
        currentMatrix.copyValues(this.rootMat);
        currentMatrix.translate(x, y);


        const c1 = col1;
        const c2 = col2 || col1;
        const c3 = col3 || col1;
        const c4 = col4 || col1;

        let bi = this.byteIndex;

        // v1
        tempvec2[X] = 0;
        tempvec2[Y] = 0;
        currentMatrix.multiplyVector(tempvec2);
        let obi = bi;
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = 0; // u
        this.cpuBuffer[bi++] = 0; // v
        this.cpuBuffer[bi++] = c1.r; // r
        this.cpuBuffer[bi++] = c1.g; // g
        this.cpuBuffer[bi++] = c1.b; // b
        this.cpuBuffer[bi++] = c1.a; // a

        // v1' (denerated)
        if (degenerate) {
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
        }

        // v2
        tempvec2[X] = 0;
        tempvec2[Y] = h;
        currentMatrix.multiplyVector(tempvec2);
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = 0; // u
        this.cpuBuffer[bi++] = 1; // v
        this.cpuBuffer[bi++] = c2.r; // r
        this.cpuBuffer[bi++] = c2.g; // g
        this.cpuBuffer[bi++] = c2.b; // b
        this.cpuBuffer[bi++] = c2.a; // a

        // v3
        tempvec2[X] = w;
        tempvec2[Y] = 0;
        currentMatrix.multiplyVector(tempvec2);
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = 1; // u
        this.cpuBuffer[bi++] = 0; // v
        this.cpuBuffer[bi++] = c3.r; // r
        this.cpuBuffer[bi++] = c3.g; // g
        this.cpuBuffer[bi++] = c3.b; // b
        this.cpuBuffer[bi++] = c3.a; // a

        // v4
        tempvec2[X] = w;
        tempvec2[Y] = h;
        currentMatrix.multiplyVector(tempvec2);
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = 1; // u
        this.cpuBuffer[bi++] = 1; // v
        this.cpuBuffer[bi++] = c4.r; // r
        this.cpuBuffer[bi++] = c4.g; // g
        this.cpuBuffer[bi++] = c4.b; // b
        this.cpuBuffer[bi++] = c4.a; // a

        this.numElements++;
        this.byteIndex = bi;
    }


    public directDraw(
        tex:ManagedTexture,
        sx:number,
        sy:number,
        sw:number,
        sh:number,
        dx:number,
        dy:number,
        dw:number,
        dh:number,
        mixColor:Color = Color.White,
        blendMode:BlendMode = BlendMode.BM_NORMAL,
    ) {
        this.directDrawMix(tex, sx, sy, sw, sh, dx, dy, dw, dh, mixColor, mixColor, mixColor, mixColor, blendMode);
    }

    public directDrawMix(
        tex:ManagedTexture,
        sx:number,
        sy:number,
        sw:number,
        sh:number,
        dx:number,
        dy:number,
        dw:number,
        dh:number,
        colTopLeft:Color = Color.White,
        colBottomLeft:Color = colTopLeft,
        colTopRight:Color = colTopLeft,
        colBottomRight:Color = colTopLeft,
        blendMode:BlendMode = BlendMode.BM_NORMAL,
        rotAxis:boolean=false,
    ) {
        if (this.directDrawing <= 0)
            throw new Error(`Missing beginDirectDraw()`);

        const degenerate = this.directDrawPrepare(
            this.scissorAwareShader, // this.scissorMode ? this.fatScissorShader : this.fatShader,
            tex,
            blendMode
        );

        const currentMatrix = this.tmpDirectDrawMatrix;
        currentMatrix.copyValues(this.rootMat);
        currentMatrix.translate(dx, dy);

        let bi = this.byteIndex;

        const tfx = 1 / tex.width;
        const tfy = 1 / tex.height;


        // v1
        tempvec2[X] = 0;
        tempvec2[Y] = 0;
        currentMatrix.multiplyVector(tempvec2);
        let obi = bi;
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = rotAxis ? sy * tfy: sx * tfx; // u
        this.cpuBuffer[bi++] = rotAxis ? sx * tfx: sy * tfy; // v
        this.cpuBuffer[bi++] = colTopLeft.r; // r
        this.cpuBuffer[bi++] = colTopLeft.g; // g
        this.cpuBuffer[bi++] = colTopLeft.b; // b
        this.cpuBuffer[bi++] = colTopLeft.a; // a

        // v1' (denerated)
        if (degenerate) {
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
        }

        // v2
        tempvec2[X] = 0;
        tempvec2[Y] = dh;
        currentMatrix.multiplyVector(tempvec2);
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = rotAxis ? (sy + sh) * tfy: sx * tfx; // u
        this.cpuBuffer[bi++] = rotAxis ? sx * tfx: (sy + sh) * tfy; // v
        this.cpuBuffer[bi++] = colBottomLeft.r; // r
        this.cpuBuffer[bi++] = colBottomLeft.g; // g
        this.cpuBuffer[bi++] = colBottomLeft.b; // b
        this.cpuBuffer[bi++] = colBottomLeft.a; // a

        // v3
        tempvec2[X] = dw; // r.width - re.regX;
        tempvec2[Y] = 0;
        currentMatrix.multiplyVector(tempvec2);
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = rotAxis ? sy * tfy : (sx + sw) * tfx; // u
        this.cpuBuffer[bi++] = rotAxis ? (sx + sw) * tfx :  sy * tfy; // v
        this.cpuBuffer[bi++] = colTopRight.r; // r
        this.cpuBuffer[bi++] = colTopRight.g; // g
        this.cpuBuffer[bi++] = colTopRight.b; // b
        this.cpuBuffer[bi++] = colTopRight.a; // a

        // v4
        tempvec2[X] = dw;
        tempvec2[Y] = dh;
        currentMatrix.multiplyVector(tempvec2);
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = rotAxis ? (sy + sh) * tfy : (sx + sw) * tfx; // u
        this.cpuBuffer[bi++] = rotAxis ? (sx + sw) * tfx : (sy + sh) * tfy; // v
        this.cpuBuffer[bi++] = colBottomRight.r; // r
        this.cpuBuffer[bi++] = colBottomRight.g; // g
        this.cpuBuffer[bi++] = colBottomRight.b; // b
        this.cpuBuffer[bi++] = colBottomRight.a; // a

        this.numElements++;
        this.byteIndex = bi;
    }


    public setRootMatrix(m:AffineMatrix) {
        this.rootMat.copyValues(m);
    }

    public getRootMatrix():AffineMatrix {
        return this.rootMat;
    }

    public render(re:RenderElement):void {

        if (this.directDrawing)
            throw new Error(`FatRenderer cannot render during directDrawSession`);

        const gl = this.ec.gl;
        this.byteIndex = 0;
        this.numElements = 0;

        //gl.bindBuffer(gl.ARRAY_BUFFER, this.gpuBuffer); // also cachen?
        this._internRender(re, this.rootMat);

        // flush if needed
        if (this.numElements > 0) {
            this._flushBuffer();
        }
    }

    private get scissorAwareShader():ManagedShader {
        switch(this.scissorMode) {
            case ScissorMode.None: default:
                return this.fatShader;
            case ScissorMode.Rectangle:
                return this.fatScissorShader;
            case ScissorMode.Circle:
                return this.fatScissorCircleShader;
        }
    }

    private _flushBuffer():void {

        const gl = this.ec.gl;
        const gpuBuffer = this._createAndCopyDataToGpuBuffer();
        const shader = this.ec.currentShader;
        const attrPos = shader.getAttributeLocationByIndex(ATTRIB_POSITION);
        const attrTexCoord = shader.getAttributeLocationByIndex(ATTRIB_TEX);
        const attrColor = shader.getAttributeLocationByIndex(ATTRIB_COLOR);
        gl.enableVertexAttribArray(attrPos);
        gl.vertexAttribPointer(
            attrPos,
            2, gl.FLOAT,  // x,y
            false,
            VERTEX_STRIDE*4, // one vertex 4 floats => stride is 4
            0
        );
        gl.enableVertexAttribArray(attrTexCoord);
        gl.vertexAttribPointer(
            attrTexCoord,
            2, gl.FLOAT, // u, v
            false,
            VERTEX_STRIDE * 4,
            2 * 4
        );
        gl.enableVertexAttribArray(attrColor);
        gl.vertexAttribPointer(
            attrColor,
            4, gl.FLOAT, // r,g,b,a
            false,
            VERTEX_STRIDE * 4,
            4 * 4
        );

        // if (this.scissorMode &&
        //     (this.ec.currentShader == this.fatScissorShader || this.ec.currentShader == this.fatScissorCircleShader)) {
        if (this.scissorMode) {
            gl.uniform4f(
                this.ec.currentShader.getUniformByIndex(UNIFORM_SCISSOR),
                this.scissorStore.x,
                this.scissorStore.y,
                this.scissorStore.width,
                this.scissorStore.height,
            );
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6 * this.numElements  - 2);
        this.numLastElements += this.numElements;
        this.numElements = 0;
        this.byteIndex = 0;
        this.numLastDrawCalls++;

        if (gpuBuffer)
            gl.deleteBuffer(gpuBuffer);
    }


    private _internRender(re:RenderElement, parentMatrix:AffineMatrix):void {
        if (!re || !re.visible)
            return;

        // TODO replace copy with matrix stack (to make it less GC noisy)
        const currentMatrix = parentMatrix.copy().multiply(re.matrix);

        const ec = this.ec;
        const gl = this.ec.gl;
        let shader = null;
        let texture:ManagedTexture  = null;
        let blendMode = null;
        let willDraw = false;
        let degenerate = false;
        let needFlush = false;

        // ** Extract state

        if (re instanceof QuadElement) {
            shader = this.scissorAwareShader; //this.scissorMode ? this.fatScissorShader : this.fatShader; //this.fatShader;
            texture = ec.whiteTexture;
            blendMode = re.blendMode;
            willDraw = true;
        }
        else if (re instanceof BitmapElement) {
            // shader = re.texture.premod ? this.fatShaderPremod : this.fatShader;
            shader = this.scissorAwareShader; //this.scissorMode ? this.fatScissorShader : this.fatShader; //this.fatShader;
            texture =  re.texture;
            blendMode = re.blendMode;
            willDraw = true;
        }
        else if (re instanceof DirectRenderElement) {
            const _tmp = this.tmpCustomMatrix;
            _tmp.copyValues(this.rootMat);
            this.rootMat.copyValues(currentMatrix);
            this.directDrawing++;
            re.renderDirect(this, parentMatrix);
            this.directDrawing--;
            this.rootMat.copyValues(_tmp);
        }
        else if (re instanceof SpriteElement || re instanceof AnimationElement) {

            if (re instanceof AnimationElement) {
                re.update(this.animationElapsed);
            }

            if (re.frame) {
                // shader = re.frame.texture.premod ? this.fatShaderPremod : this.fatShader;
                shader = this.scissorAwareShader; //this.scissorMode ? this.fatScissorShader : this.fatShader; //this.fatShader;
                texture =  re.frame.texture;
                blendMode = re.blendMode;
                willDraw = true;

                if (blendMode === undefined) {debugger}
            }
        }


        // ** RENDER existing data (if any)

        if (this.numElements >= MAX_DRAW_PER_BATCH)
            needFlush = true;

        let flushBuffer:boolean = false;
        if (willDraw || needFlush) {
            if (shader != ec.currentShader) {
                flushBuffer = true;
            }
            if (texture != ec.currentTexture) {
                flushBuffer = true;
            }
            if (blendMode != ec.currentBlendMode) {
                flushBuffer = true;
            }

            if ((needFlush || flushBuffer) && this.numElements > 0) {
                this._flushBuffer();
            }
        }

        let bi = this.byteIndex;

        // ** Apply current state

        if (willDraw) {
            if (shader != ec.currentShader) {
                ec.currentShader = shader;
                ec.currentTexture = texture;

                if (blendMode === undefined) {debugger}

                ec.currentBlendMode = blendMode;

                gl.useProgram(shader.program);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture.textureId); // really needed?
                gl.uniform1i(shader.getUniformByIndex(UNIFORM_TEX), 0);

                gl.uniformMatrix4fv(
                    shader.getUniformByIndex(UNIFORM_PROJ),
                    false,
                    this.ec.currentRenderTarget.projection
                );
                applyBlendMode(ec, blendMode, texture.premod);

            }
            else { // if shader changes texture changes anyway
                if (texture != ec.currentTexture) {
                    ec.currentTexture = texture;
                    ec.currentBlendMode = blendMode;
                    gl.bindTexture(gl.TEXTURE_2D, texture.textureId);
                    applyBlendMode(ec, blendMode, texture.premod);
                }
                else if (blendMode != ec.currentBlendMode) {
                    ec.currentBlendMode = blendMode;
                    applyBlendMode(ec, blendMode, texture.premod);
                }
            }
        }

        // ** degenerate trianlge (when batching)

        if (willDraw && this.numElements > 0) {

            // copy last vertex data
            let obi = bi - VERTEX_STRIDE;
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
            this.cpuBuffer[bi++] = this.cpuBuffer[obi];

            degenerate = true;
        }

        // ** push DATA
        if (willDraw) {
            if ((re instanceof SpriteElement || re instanceof AnimationElement)) {
                const c1 = re.color1;
                const c2 = re.color2;
                const c3 = re.color3;
                const c4 = re.color4;


                const tfx = 1 / re.frame.texture.width;
                const tfy = 1 / re.frame.texture.height;

                const rx = re.frame.textureRect.x * tfx;
                const ry = re.frame.textureRect.y * tfy;
                const rx2 = rx + re.frame.textureRect.width * tfx;
                const ry2 = ry + re.frame.textureRect.height * tfy;
                const rectWidth = re.frame.textureRect.width;
                const rectHeight = re.frame.textureRect.height;

                const regX = -(re.regX + re.frame.texturePivot.x);
                const regY = -(re.regY + re.frame.texturePivot.y);

                // v1
                tempvec2[X] = regX;
                tempvec2[Y] = regY;
                currentMatrix.multiplyVector(tempvec2);
                let obi = bi;
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = rx; // u
                this.cpuBuffer[bi++] = ry; // v
                this.cpuBuffer[bi++] = c1.r; // r
                this.cpuBuffer[bi++] = c1.g; // g
                this.cpuBuffer[bi++] = c1.b; // b
                this.cpuBuffer[bi++] = c1.a; // a

                // v1' (denerated)
                if (degenerate) {
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                }

                // v2
                tempvec2[X] = regX;
                tempvec2[Y] = rectHeight + regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = rx; // u
                this.cpuBuffer[bi++] = ry2; // v
                this.cpuBuffer[bi++] = c2.r; // r
                this.cpuBuffer[bi++] = c2.g; // g
                this.cpuBuffer[bi++] = c2.b; // b
                this.cpuBuffer[bi++] = c2.a; // a

                // v3
                tempvec2[X] = rectWidth + regX;
                tempvec2[Y] = regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = rx2; // u
                this.cpuBuffer[bi++] = ry; // v
                this.cpuBuffer[bi++] = c3.r; // r
                this.cpuBuffer[bi++] = c3.g; // g
                this.cpuBuffer[bi++] = c3.b; // b
                this.cpuBuffer[bi++] = c3.a; // a

                // v4
                tempvec2[X] = rectWidth + regX;
                tempvec2[Y] = rectHeight + regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = rx2; // u
                this.cpuBuffer[bi++] = ry2; // v
                this.cpuBuffer[bi++] = c4.r; // r
                this.cpuBuffer[bi++] = c4.g; // g
                this.cpuBuffer[bi++] = c4.b; // b
                this.cpuBuffer[bi++] = c4.a; // a

                this.numElements++;

            } else if (re instanceof BitmapElement) {
                const r = re as BitmapElement;

                const c1 = re.color1;
                const c2 = re.color2;
                const c3 = re.color3;
                const c4 = re.color4;

                const tfx = 1 / re.texture.width;
                const tfy = 1 / re.texture.height;


                // v1
                tempvec2[X] = -re.regX;
                tempvec2[Y] = -re.regY;
                currentMatrix.multiplyVector(tempvec2);
                let obi = bi;
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = re.srcX * tfx; // u
                this.cpuBuffer[bi++] = re.srcY * tfy; // v
                this.cpuBuffer[bi++] = c1.r; // r
                this.cpuBuffer[bi++] = c1.g; // g
                this.cpuBuffer[bi++] = c1.b; // b
                this.cpuBuffer[bi++] = c1.a; // a

                // v1' (denerated)
                if (degenerate) {
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                }

                // v2
                tempvec2[X] = -re.regX;
                tempvec2[Y] = r.height - re.regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = re.srcX * tfx; // u
                this.cpuBuffer[bi++] = (re.srcY + re.srcH) * tfy; // v
                this.cpuBuffer[bi++] = c2.r; // r
                this.cpuBuffer[bi++] = c2.g; // g
                this.cpuBuffer[bi++] = c2.b; // b
                this.cpuBuffer[bi++] = c2.a; // a

                // v3
                tempvec2[X] = r.width - re.regX;
                tempvec2[Y] = -re.regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = (re.srcX + re.srcW) * tfx; // u
                this.cpuBuffer[bi++] = re.srcY * tfy; // v
                this.cpuBuffer[bi++] = c3.r; // r
                this.cpuBuffer[bi++] = c3.g; // g
                this.cpuBuffer[bi++] = c3.b; // b
                this.cpuBuffer[bi++] = c3.a; // a

                // v4
                tempvec2[X] = r.width - re.regX;
                tempvec2[Y] = r.height - re.regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = (re.srcX + re.srcW) * tfx; // u
                this.cpuBuffer[bi++] = (re.srcY + re.srcH) * tfy; // v
                this.cpuBuffer[bi++] = c4.r; // r
                this.cpuBuffer[bi++] = c4.g; // g
                this.cpuBuffer[bi++] = c4.b; // b
                this.cpuBuffer[bi++] = c4.a; // a

                this.numElements++;
            }
            else if (re instanceof QuadElement) {
                const r = re as QuadElement;

                const c1 = re.color1;
                const c2 = re.color2;
                const c3 = re.color3;
                const c4 = re.color4;


                // v1
                tempvec2[X] = -r.regX;
                tempvec2[Y] = -r.regY;
                currentMatrix.multiplyVector(tempvec2);
                let obi = bi;
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = 0; // u
                this.cpuBuffer[bi++] = 0; // v
                this.cpuBuffer[bi++] = c1.r; // r
                this.cpuBuffer[bi++] = c1.g; // g
                this.cpuBuffer[bi++] = c1.b; // b
                this.cpuBuffer[bi++] = c1.a; // a

                // v1' (denerated)
                if (degenerate) {
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                }

                // v2
                tempvec2[X] =  -r.regX;
                tempvec2[Y] = r.height  -r.regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = 0; // u
                this.cpuBuffer[bi++] = 1; // v
                this.cpuBuffer[bi++] = c2.r; // r
                this.cpuBuffer[bi++] = c2.g; // g
                this.cpuBuffer[bi++] = c2.b; // b
                this.cpuBuffer[bi++] = c2.a; // a

                // v3
                tempvec2[X] = r.width -r.regX;
                tempvec2[Y] = 0 -r.regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = 1; // u
                this.cpuBuffer[bi++] = 0; // v
                this.cpuBuffer[bi++] = c3.r; // r
                this.cpuBuffer[bi++] = c3.g; // g
                this.cpuBuffer[bi++] = c3.b; // b
                this.cpuBuffer[bi++] = c3.a; // a

                // v4
                tempvec2[X] = r.width -r.regX;
                tempvec2[Y] = r.height  -r.regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = 1; // u
                this.cpuBuffer[bi++] = 1; // v
                this.cpuBuffer[bi++] = c4.r; // r
                this.cpuBuffer[bi++] = c4.g; // g
                this.cpuBuffer[bi++] = c4.b; // b
                this.cpuBuffer[bi++] = c4.a; // a

                this.numElements++;
            }
            else if (re instanceof BitmapElement) {
                const r = re as BitmapElement;

                const c1 = re.color1;
                const c2 = re.color2;
                const c3 = re.color3;
                const c4 = re.color4;

                const tfx = 1 / re.texture.width;
                const tfy = 1 / re.texture.height;


                // v1
                tempvec2[X] = -re.regX;
                tempvec2[Y] = -re.regY;
                currentMatrix.multiplyVector(tempvec2);
                let obi = bi;
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = re.srcX * tfx; // u
                this.cpuBuffer[bi++] = re.srcY * tfy; // v
                this.cpuBuffer[bi++] = c1.r; // r
                this.cpuBuffer[bi++] = c1.g; // g
                this.cpuBuffer[bi++] = c1.b; // b
                this.cpuBuffer[bi++] = c1.a; // a

                // v1' (denerated)
                if (degenerate) {
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                    this.cpuBuffer[bi++] = this.cpuBuffer[obi++];
                }

                // v2
                tempvec2[X] = -re.regX;
                tempvec2[Y] = r.height - re.regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = re.srcX * tfx; // u
                this.cpuBuffer[bi++] = (re.srcY + re.srcH) * tfy; // v
                this.cpuBuffer[bi++] = c2.r; // r
                this.cpuBuffer[bi++] = c2.g; // g
                this.cpuBuffer[bi++] = c2.b; // b
                this.cpuBuffer[bi++] = c2.a; // a

                // v3
                tempvec2[X] = r.width - re.regX;
                tempvec2[Y] = -re.regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = (re.srcX + re.srcW) * tfx; // u
                this.cpuBuffer[bi++] = re.srcY * tfy; // v
                this.cpuBuffer[bi++] = c3.r; // r
                this.cpuBuffer[bi++] = c3.g; // g
                this.cpuBuffer[bi++] = c3.b; // b
                this.cpuBuffer[bi++] = c3.a; // a

                // v4
                tempvec2[X] = r.width - re.regX;
                tempvec2[Y] = r.height - re.regY;
                currentMatrix.multiplyVector(tempvec2);
                this.cpuBuffer[bi++] = tempvec2[X];
                this.cpuBuffer[bi++] = tempvec2[Y];
                this.cpuBuffer[bi++] = (re.srcX + re.srcW) * tfx; // u
                this.cpuBuffer[bi++] = (re.srcY + re.srcH) * tfy; // v
                this.cpuBuffer[bi++] = c4.r; // r
                this.cpuBuffer[bi++] = c4.g; // g
                this.cpuBuffer[bi++] = c4.b; // b
                this.cpuBuffer[bi++] = c4.a; // a

                this.numElements++;
            }
        }

        this.byteIndex = bi;
        if (re._children && re._children.length > 0) {
            for (let i=0; i<re._children.length; i++) {
                const child = re._children[i];
                this._internRender(child, currentMatrix);
            }
        }
    }

    // -----------------------------------------------------------------------------------------------------------------

    freeResource(): void {
        if (this.fatShader)
            this.fatShader.release()
        // if (this.fatShaderPremod)
        //     this.fatShaderPremod.release()
        if (this.fatScissorShader)
            this.fatScissorShader.release()
        if (this.fatScissorCircleShader)
            this.fatScissorCircleShader.release()

        this.ec.recoverPool.removeResource(this);

        this.cpuBuffer = null;
        this.fatShader = null;
        // this.fatShaderPremod = null;
        this.fatScissorShader = null;
        this.fatScissorCircleShader = null;
    }

    onRestoreContext(): void {

    }

    // -----------------------------------------------------------------------------------------------------------------


    /**
     * Support for custom shaded Quad.
     *
     * Using the Material object one can highly customize the rendering of that quad,
     * including multi texturing.
     */
    public directDrawCustomQuad(
        mat:FatMaterial,
        x:number,
        y:number,
        w:number,
        h:number,
        tex1:Vector2,
        tex2:Vector2,
        tex3:Vector2,
        tex4:Vector2,
        col1:Color,
        col2:Color,
        col3:Color,
        col4:Color,
        blendMode:BlendMode=BlendMode.BM_NORMAL,
    ) {
        if (this.directDrawing <= 0)
            throw new Error(`Missing beginDirectDraw()`);
        const ec = this.ec;
        const gl = ec.gl;
        const shader = mat.getShader(this.scissorMode);

        if (this.numElements > 0) {
            this._flushBuffer();
        }

        ec.currentShader = shader;
        ec.currentTexture = null;
        ec.currentBlendMode = blendMode;

        gl.useProgram(shader.program);

        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, texture.textureId);
        // gl.uniform1i(shader.getUniformByIndex(UNIFORM_TEX), 0);

        gl.uniformMatrix4fv(
            shader.getUniformByIndex(UNIFORM_PROJ),
            false,
            this.ec.currentRenderTarget.projection
        );

        const err = gl.getError();
        if (err == gl.INVALID_OPERATION) {
            debugger;
        }

        applyBlendMode(ec, blendMode, false);

        // Currently FatRenderer cannot quickly decide if all uniforms are equal to the ones before.
        // Also it's very likely that a custom shader uses different uniform values for each quad.
        //
        // To keep the "normal" render pipeline simple we forefully break the batch here and set the uniforms
        // for each drawcall.
        //
        mat.applyUniforms(shader);

        const currentMatrix = this.tmpDirectDrawMatrix;
        currentMatrix.copyValues(this.rootMat);
        currentMatrix.translate(x, y);


        const c1 = col1;
        const c2 = col2 || col1;
        const c3 = col3 || col1;
        const c4 = col4 || col1;

        let bi = this.byteIndex;

        // v1
        tempvec2[X] = 0;
        tempvec2[Y] = 0;
        currentMatrix.multiplyVector(tempvec2);
        let obi = bi;
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = tex1.x; // u
        this.cpuBuffer[bi++] = tex1.y; // v
        this.cpuBuffer[bi++] = c1.r; // r
        this.cpuBuffer[bi++] = c1.g; // g
        this.cpuBuffer[bi++] = c1.b; // b
        this.cpuBuffer[bi++] = c1.a; // a

        // v2
        tempvec2[X] = 0;
        tempvec2[Y] = h;
        currentMatrix.multiplyVector(tempvec2);
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = tex2.x; // u
        this.cpuBuffer[bi++] = tex2.y; // v
        this.cpuBuffer[bi++] = c2.r; // r
        this.cpuBuffer[bi++] = c2.g; // g
        this.cpuBuffer[bi++] = c2.b; // b
        this.cpuBuffer[bi++] = c2.a; // a

        // v3
        tempvec2[X] = w;
        tempvec2[Y] = 0;
        currentMatrix.multiplyVector(tempvec2);
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = tex3.x; // u
        this.cpuBuffer[bi++] = tex3.y; // v
        this.cpuBuffer[bi++] = c3.r; // r
        this.cpuBuffer[bi++] = c3.g; // g
        this.cpuBuffer[bi++] = c3.b; // b
        this.cpuBuffer[bi++] = c3.a; // a

        // v4
        tempvec2[X] = w;
        tempvec2[Y] = h;
        currentMatrix.multiplyVector(tempvec2);
        this.cpuBuffer[bi++] = tempvec2[X];
        this.cpuBuffer[bi++] = tempvec2[Y];
        this.cpuBuffer[bi++] = tex4.x; // u
        this.cpuBuffer[bi++] = tex4.y; // v
        this.cpuBuffer[bi++] = c4.r; // r
        this.cpuBuffer[bi++] = c4.g; // g
        this.cpuBuffer[bi++] = c4.b; // b
        this.cpuBuffer[bi++] = c4.a; // a

        this.numElements++;
        this.byteIndex = bi;

        this._flushBuffer();

        mat.unapplyUniforms();

    }

}




let uniform = 0;
const UNIFORM_PROJ = uniform++;
const UNIFORM_TEX = uniform++;
const UNIFORM_SCISSOR = uniform++;

let attr = 0;
const ATTRIB_POSITION = attr++;
const ATTRIB_TEX = attr++;
const ATTRIB_COLOR = attr++;

