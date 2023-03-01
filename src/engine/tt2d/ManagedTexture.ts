/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {EngineContext} from "./EngineContext";
import {ContextResource} from "./ContextResource";
import {RenderTarget} from "./RenderTarget";
import {RecoverableResource} from "@tsjs/engine/tt2d/RecoverableResource";



export class ManagedTexture extends ContextResource implements RecoverableResource {

    private _textureId:WebGLTexture;
    private _filter:boolean = true;
    private _mipMaps:boolean = false;
    private source:Textureable;
    private seamless:boolean = false;

    private constructor(ec:EngineContext, source:Textureable, filter:boolean, genMimap:boolean) {
        super(ec);
        this.ec = ec;
        this.source = source;
        this._filter = filter;
        this._mipMaps = genMimap;
        this._textureId = this.source.makeTexture(this, this.ec);
        this.ec.recoverPool.addResource(this);
    }


    /**
     * Creates a managed texture around the given Image.
     *
     * NOTE: It's important that the image is loaded. Unloaded images will throw an
     * exception.
     *
     * The image will remain in RAM to allow it to recover from context loss.
     */
    public static fromImage(
        ec:EngineContext,
        img:HTMLImageElement,
        filter:boolean = true,
        genMimap:boolean=false
    ):ManagedTexture {
        const ret = new ManagedTexture(ec, new ImageTextureSource(img), filter, genMimap);
        ret.releaseLater();
        return ret;
    }

    /**
     * Simple creation method to easily generate checker textures etc.
     *
     * const tex = ManagedTexture.fromRawPixels(ec, [
     *    255, 255, 255, 255, // << 1. pixel
     *    192, 192, 192, 255, // << 2. pixel
     *    192, 192, 192, 255, // << 3. pixel
     *    255, 255, 255, 255, // << 4. pixel
     * ], 2, 2);
     */
    public static fromRawPixels(
        ec:EngineContext,
        colorsInBytes:number[],
        w:number,
        h:number,
        filter:boolean = true,
        genMimap:boolean=false
    ):ManagedTexture {
        const ret = new ManagedTexture(ec, new PixelTextureSource(colorsInBytes, w, h), filter, genMimap);
        ret.releaseLater();
        return ret;
    }

    /**
     * Create texture from a canvas (or similar image data)
     *
     * The source object will be retained to have support for context loss.
     *
     *
     *
     * @param ec
     * @param canvas
     */
    public static fromCanvas(
        ec:EngineContext,
        canvas:ImageBitmap|ImageData|HTMLCanvasElement,
        filter:boolean = true,
        genMimap:boolean=false
    ):ManagedTexture {
        const ret = new ManagedTexture(ec, new TextureImgSource(canvas), filter, genMimap);
        ret.releaseLater();
        return ret;
    }

    /**
     * A manager around a render-to-texture texture. Cannot be the main render Target
     *
     * @param ec
     * @param rt
     * @param filter
     */
    public static fromRenderTarget(
        ec:EngineContext,
        rt:RenderTarget,
        filter:boolean = true
    ):ManagedTexture {
        if (rt == ec.mainRenderTarget)
            throw new Error(`Incompatible. Cannot use the main render target as source`);

        const ret = new ManagedTexture(ec, new TextureRenderTargetSource(rt), filter, false);
        ret.releaseLater();
        return ret;
    }

    public get textureId() {
        return this._textureId;
    }

    public get mipMaps():boolean {
        return this._mipMaps;
    }

    public get filter():boolean {
        return this._filter;
    }

    /**
     * For Displacement maps etc.
     */
    public makeSeamless(filter:boolean) {
        const gl = this.ec.gl;
        const old = this.ec.currentTexture;
        this._filter = filter;
        this.seamless = true;

        gl.bindTexture(gl.TEXTURE_2D, this._textureId);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this._filter ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._filter ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_2D, old ? old._textureId : null);

    }

    public get width():number {
        return this.source.w;
    }

    public get height():number {
        return this.source.h;
    }

    /**
     * true => pixel data is pre-modulated
     */
    public get premod():boolean {
        return false;
    }

    freeResource(): void {
        if (this.textureId)
            this.ec.gl.deleteTexture(this.textureId);
        this._textureId = null;
        this.source = null;
        this.ec.recoverPool.removeResource(this);
    }

    onRestoreContext(): void {
        this._textureId = this.source.makeTexture(this, this.ec);

        if (this.seamless)
            this.makeSeamless(this._filter);
    }

    public getTextureSource():Textureable {
        return this.source;
    }

}



// ---------------------------------------------------------------------------------------------------------------------

export interface Textureable {
    makeTexture(mt:ManagedTexture, ec:EngineContext):WebGLTexture;
    w:number;
    h:number;
}

// ---------------------------------------------------------------------------------------------------------------------

class PixelTextureSource implements Textureable {
    private pixels:number[];
    public w:number;
    public h:number;

    constructor(pixels:number[], w:number, h:number) {
        this.pixels = pixels;
        this.w = w;
        this.h = h;
    }


    makeTexture(mt: ManagedTexture, ec: EngineContext):WebGLTexture {
        const gl = ec.gl;

        // A 2x2 pixel texture from a JavaScript array
        const checkerTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, checkerTex);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.w, this.h,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array(this.pixels)
        );
        if (mt.mipMaps)
            gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, !mt.filter ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, !mt.filter ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return checkerTex;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

class ImageTextureSource implements Textureable {

    private img:HTMLImageElement;
    public w:number;
    public h:number;

    constructor(img:HTMLImageElement) {
        this.img = img;

        const isLoaded = img.complete && img.naturalHeight !== 0;
        if (!isLoaded)
            throw new Error(`ImageSource() can only accept `);

        this.w = img.naturalWidth;
        this.h = img.naturalHeight;
    }

    makeTexture(mt: ManagedTexture, ec: EngineContext) :WebGLTexture{

        const gl = ec.gl;

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);
        if (mt.mipMaps)
            gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, !mt.filter ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, !mt.filter ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

class TextureImgSource implements Textureable {

    private img:ImageBitmap | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
    public w:number;
    public h:number;

    constructor(img:ImageBitmap | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) {
        this.img = img;

        this.w = img.width;
        this.h = img.height;
    }

    makeTexture(mt: ManagedTexture, ec: EngineContext):WebGLTexture {
        const gl = ec.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);
        if (mt.mipMaps)
            gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, !mt.filter ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, !mt.filter ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }
}


// ---------------------------------------------------------------------------------------------------------------------

class TextureRenderTargetSource implements Textureable {

    private rt:RenderTarget
    public w:number;
    public h:number;

    constructor(rt:RenderTarget) {
        this.rt = rt;
        this.w = rt.texWidth;
        this.h = rt.texHeight;
    }

    makeTexture(mt: ManagedTexture, ec: EngineContext):WebGLTexture {
        // console.warn("Make sure this works in case of lost device")
        const gl = ec.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.rt.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, !mt.filter ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, !mt.filter ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return this.rt.texture;
    }
}

// ---------------------------------------------------------------------------------------------------------------------