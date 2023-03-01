/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ContextResource} from "@tsjs/engine/tt2d/ContextResource";
import {ManagedShader} from "@tsjs/engine/tt2d/ManagedShader";
import {EngineContext} from "@tsjs/engine/tt2d/EngineContext";
import {Vector2, Vector3, Vector4} from "@tsjs/engine/tt2d/Vector";
import {ScissorMode} from "@tsjs/engine/tt2d/FatRenderer";
import {
    fatRendererFsh,
    fatRendererFsh_Header,
    fatRendererScissorCircleFsh, fatRendererScissorCircleFsh_Discard,
    fatRendererScissorCircleFsh_Header,
    fatRendererScissorCircleVsh,
    fatRendererScissorCircleVsh_Header,
    fatRendererScissorFsh,
    fatRendererScissorFsh_Discard,
    fatRendererScissorFsh_Header,
    fatRendererScissorVsh,
    fatRendererScissorVsh_Header, fatRendererVsh,
    fatRendererVsh_Header
} from "@tsjs/engine/tt2d/StandardShader";
import {ManagedTexture} from "@tsjs/engine/tt2d/ManagedTexture";
import {Color} from "@tsjs/engine/tt2d/Color";
import {RecoverableResource} from "@tsjs/engine/tt2d/RecoverableResource";



enum UniformType {
    Float,
    Vec2,
    Vec3,
    Vec4,

    Tex1,
    Tex2,
    Tex3,

    PixSize1,
    PixSize2,
    PixSize3,
}

class Uniform {
    public name:string;
    public location:WebGLUniformLocation;
    public value:any;
    public type:UniformType;

    public apply(shader:ManagedShader, gl:WebGLRenderingContext) {
        const {type, value, location} = this;
        switch(type) {
            case UniformType.Float:
                gl.uniform1f(location, value);
                break;
            case UniformType.Vec2:
                const v2 = value as Vector2;
                gl.uniform2f(location, v2.x, v2.y);
                break;
            case UniformType.Vec3:
                const v3 = value as Vector3;
                gl.uniform3f(location, v3.x, v3.y, v3.z);
                break;
            case UniformType.Vec4:
                const v4 = value as Vector4;
                gl.uniform4f(location, v4.x, v4.y, v4.z, v4.w);
                break;
            case UniformType.Tex1:
                const tex1 = value as ManagedTexture;
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, tex1.textureId);
                gl.uniform1i(location, 0);
                break;
            case UniformType.Tex2:
                const tex2 = value as ManagedTexture;
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, tex2.textureId);
                gl.uniform1i(location, 1);
                break;
            case UniformType.Tex3:
                const tex3 = value as ManagedTexture;
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, tex3.textureId);
                gl.uniform1i(location, 2);
                break;
            case UniformType.PixSize1:
                const tex1_ = value as ManagedTexture;
                gl.uniform2f(location, 1/tex1_.width, 1/tex1_.height);
                break;
            case UniformType.PixSize2:
                const tex2_ = value as ManagedTexture;
                gl.uniform2f(location, 1/tex2_.width, 1/tex2_.height);
                break;
            case UniformType.PixSize3:
                const tex3_ = value as ManagedTexture;
                gl.uniform2f(location, 1/tex3_.width, 1/tex3_.height);
                break;
        }
    }

    public unapply(gl:WebGLRenderingContext):void {
        // const {type, value, location} = this;
        // switch(type) {
        //     case UniformType.Tex1:
        //         break;
        //     case UniformType.Tex2:
        //         const tex2 = value as ManagedTexture;
        //         gl.activeTexture(gl.TEXTURE1);
        //         gl.bindTexture(gl.TEXTURE_2D, null); // needed, right approach?
        //         break;
        //     case UniformType.Tex3:
        //         const tex3 = value as ManagedTexture;
        //         gl.activeTexture(gl.TEXTURE2);
        //         gl.bindTexture(gl.TEXTURE_2D, null);
        //         break;
        // }
    }

    public copy():Uniform {
        const out = new Uniform();
        const {name, type, value, location} = this;
        out.type = type;
        out.location = -1;
        out.name = name;

        switch(type) {
            case UniformType.Float:
                out.value = value;
                break;
            case UniformType.Vec2:
                out.value = (value as Vector2).copy();
                break;
            case UniformType.Vec3:
                out.value = (value as Vector3).copy();
                break;
            case UniformType.Vec4:
                out.value = (value as Vector4).copy();
                break;
        }
        return out;
    }

}


/**
 * FatMaterial is a shader managing object designed for FatRenderer. It helps build shader
 * and managing uniform (parameter) properties in the FatRendering context.
 *
 * Basically this is a shader (internally a group of shader) which allows one to set various uniforms.
 *
 * It is meant to be used with directDrawCustomXXX(...) functions. Not really meant for batching atm
 */
export class FatMaterial extends ContextResource implements RecoverableResource {


    private shaderNoScissor:ManagedShader;
    private shaderScissorRect:ManagedShader;
    private shaderScissorCircle:ManagedShader;
    private dirty:boolean = true;
    private uniforms:Record<string, Uniform> = {};
    private preparedUniforms:Uniform[] = [];
    private preperationShader:ManagedShader = null;

    private constructor(
        ec:EngineContext,
        shader:ManagedShader,
        shaderScissorRect:ManagedShader,
        shaderScissorCircle:ManagedShader
    ) {
        super(ec);
        this.shaderNoScissor = shader;
        this.shaderScissorRect = shaderScissorRect;
        this.shaderScissorCircle = shaderScissorCircle;
        this.shaderNoScissor.retain();
        this.shaderScissorRect.retain();
        this.shaderScissorCircle.retain();

        ec.recoverPool.addResource(this);
        this.releaseLater();
    }

    public copy():FatMaterial {
        const out = new FatMaterial(
            this.ec,
            this.shaderNoScissor,
            this.shaderScissorRect,
            this.shaderScissorCircle
        );

        Object.keys(this.uniforms).forEach(name => {
            out.uniforms[name] = this.uniforms[name].copy();
        });
        return out;
    }

    /**
     * see docs/materials.md
     *
     * @param ec
     * @param customUniformNames
     * @param fshCode
     * @param vshCode
     */
    public static createFromCode(
        ec:EngineContext,
        customUniformNames:string[],
        fshCode:string = null,
        vshCode:string = null,
    ) {
        const vAttribs = ["aPosition", "aTexCoord", "aColor"];
        const baseUniforms = ["uProj", "uTex"]; // "uScissor"
        let shader:ManagedShader;
        let shaderScissorRect:ManagedShader;
        let shaderScissorCircle:ManagedShader;

        // None-Scissor-Shader
        {
            const uniforms = [...baseUniforms, ...customUniformNames];
            const vsh = vshCode === null
                ? fatRendererVsh
                : vshCode.replace("__FAT_HEADER__", fatRendererVsh_Header);
            const fsh = fshCode === null
                ? fatRendererFsh
                : fshCode
                    .replace("__FAT_HEADER__", fatRendererFsh_Header)
                    .replace("__FAT_SCISSOR__", "");
            shader = ManagedShader.createFromSource(ec, vsh, fsh, vAttribs, uniforms);
        }

        // Rect-Scissor-Shader
        {
            const uniforms = [...baseUniforms, "uScissor", ...customUniformNames];
            const vsh = vshCode === null
                ? fatRendererScissorVsh
                : vshCode
                    .replace("__FAT_HEADER__", fatRendererScissorVsh_Header);
            const fsh = fshCode === null
                ? fatRendererScissorFsh
                : fshCode
                    .replace("__FAT_HEADER__", fatRendererScissorFsh_Header)
                    .replace("__FAT_SCISSOR__", fatRendererScissorFsh_Discard);;
            shaderScissorRect = ManagedShader.createFromSource(ec, vsh, fsh, vAttribs, uniforms);
        }

        // Circle-Scissor-Shader
        {
            const uniforms = [...baseUniforms, "uScissor", ...customUniformNames];
            const vsh = vshCode === null
                ? fatRendererScissorCircleVsh
                : vshCode
                    .replace("__FAT_HEADER__", fatRendererScissorCircleVsh_Header);
            const fsh = fshCode === null
                ? fatRendererScissorCircleFsh
                : fshCode
                    .replace("__FAT_HEADER__", fatRendererScissorCircleFsh_Header)
                    .replace("__FAT_SCISSOR__", fatRendererScissorCircleFsh_Discard);
            shaderScissorCircle = ManagedShader.createFromSource(ec, vsh, fsh, vAttribs, uniforms);
        }

        const out = new FatMaterial(
            ec,
            shader,
            shaderScissorRect,
            shaderScissorCircle
        );
        return out;
    }

    public getShader(scissorMode:ScissorMode):ManagedShader {
        switch(scissorMode) {
            case ScissorMode.None: default:
                return this.shaderNoScissor;
            case ScissorMode.Rectangle:
                return this.shaderScissorRect;
            case ScissorMode.Circle:
                return this.shaderScissorCircle;
        }
    }

    private prepareUniforms(shader:ManagedShader) {
        const names = shader.getUniformNames();
        this.preparedUniforms = [];
        let num = 0;
        for (let i=0; i<names.length; i++) {
            const u = this.uniforms[names[i]];
            if (!u)
                continue;
            u.location = shader.getUniformByIndex(i);
            this.preparedUniforms.push(u);
            num++;
        }
    }

    public applyUniforms(shader:ManagedShader):void {
        if (this.dirty || shader != this.preperationShader) {
            this.prepareUniforms(shader);
            this.dirty = false;
            // Da die "preparedUniforms" sich auf einen der drei spezifischen
            // Shader beziehen müssen wir uns merken welcher für die aktuelle preperation
            // benutzt wurde. Ändert sich der Shader und sind die preparedUniforms mit dem
            // alten shader prepared, müssen wir den alten benutzen.
            this.preperationShader = shader;
        }

        const gl = this.ec.gl;
        for (let i=0; i<this.preparedUniforms.length; i++) {
            const u = this.preparedUniforms[i];
            u.apply(shader, gl);
        }
    }

    public unapplyUniforms():void {
        if (this.dirty)
            return;
        const gl = this.ec.gl;
        for (let i=0; i<this.preparedUniforms.length; i++) {
            const u = this.preparedUniforms[i];
            u.unapply(gl);
        }
    }

    private getOrCreateUniform(name:string, type:UniformType, v:any):Uniform {
        const u = this.uniforms[name];
        if (u) {
            if (u.type !== type) {
                throw new Error(`FatMaterial().setMaterialPropertyXXX mismatched type! Parameter: '${name}' switched from ${UniformType[u.type]} to ${UniformType[type]}!`);
            }
            u.value = v;
            return u;
        }

        const newU = new Uniform();
        newU.name = name;
        newU.type = type;
        newU.value = v;
        newU.location = -1;
        this.dirty = true;
        this.uniforms[name] = newU;
        return newU;
    }

    private getUniformValueOfType(name:string, type:UniformType):any {
        const u = this.uniforms[name];
        if (u) {
            if (u.type !== type) {
                throw new Error(`FatMaterial().getMaterialPropertyXXX mismatched type! Parameter: '${name}' switched from ${UniformType[u.type]} to ${UniformType[type]}!`);
            }
            return u.value;
        }
        return null;
    }

    public setMaterialPropertyFloat(name:string, f1:number):void {
        this.getOrCreateUniform(name, UniformType.Float, f1); // copy per value
    }

    public getMaterialPropertyFloat(name:string):number {
        return this.getUniformValueOfType(name, UniformType.Float);
    }

    public setMaterialPropertyVec2(name:string, v2:Vector2):void {
        this.getOrCreateUniform(name, UniformType.Vec2, v2); // copy by ref
    }

    public getMaterialPropertyVec2(name:string):Vector2 {
        return this.getUniformValueOfType(name, UniformType.Vec2);
    }

    public setMaterialPropertyVec3(name:string, v3:Vector3):void {
        this.getOrCreateUniform(name, UniformType.Vec3, v3);
    }

    public getMaterialPropertyVec3(name:string):Vector3 {
        return this.getUniformValueOfType(name, UniformType.Vec3);
    }

    public setMaterialPropertyVec4(name:string, v4:Vector4):void {
        this.getOrCreateUniform(name, UniformType.Vec4, v4);
    }

    public getMaterialPropertyVec4(name:string):Vector4 {
        return this.getUniformValueOfType(name, UniformType.Vec4);
    }

    public setMaterialPropertyColor(name:string, col:Color):void {
        const u = this.getOrCreateUniform(name, UniformType.Vec4, null);
        if (u.value === null) {
            u.value = new Vector4(col.r, col.g, col.b, col.a);
        }
        else {
            (u.value as Vector4).x = col.r;
            (u.value as Vector4).y = col.g;
            (u.value as Vector4).z = col.b;
            (u.value as Vector4).w = col.a;
        }
    }

    /**
     * IMPORTANT: this won't retain the texture! The caller must ensure that
     * the texture stays alive during rendering.
     *
     * @param name uniform name of the texture
     * @param tex
     */
    public setTexture1Property(name:string, tex:ManagedTexture) {
        if (this.shaderNoScissor.hasUniform("texPixSize1"))
            this.getOrCreateUniform("texPixSize1", UniformType.PixSize1, tex);
        this.getOrCreateUniform(name, UniformType.Tex1, tex);
    }
    public setTexture2Property(name:string, tex:ManagedTexture) {
        if (this.shaderNoScissor.hasUniform("texPixSize2"))
            this.getOrCreateUniform("texPixSize2", UniformType.PixSize2, tex);
        this.getOrCreateUniform(name, UniformType.Tex2, tex);
    }
    public setTexture3Property(name:string, tex:ManagedTexture) {
        if (this.shaderNoScissor.hasUniform("texPixSize3"))
            this.getOrCreateUniform("texPixSize3", UniformType.PixSize3, tex);
        this.getOrCreateUniform(name, UniformType.Tex3, tex);
    }

    freeResource(): void {
        this.shaderNoScissor.release();
        this.shaderScissorRect.release();
        this.shaderScissorCircle.release();
    }


    onRestoreContext():void {
        this.dirty = true;
    }


}

