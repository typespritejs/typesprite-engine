/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ContextResource} from "./ContextResource";
import {EngineContext} from "./EngineContext";
import {createShaderFromSource} from "@tsjs/util/WebGL";
import {RecoverableResource} from "@tsjs/engine/tt2d/RecoverableResource";

export class ManagedShader extends ContextResource implements RecoverableResource {


    private readonly uniformLocations:Array<WebGLUniformLocation> = new Array<WebGLUniformLocation>();
    private readonly attributeLocations:Array<GLuint> = new Array<GLuint>();
    private _program:WebGLProgram|null = null;

    public static createFromSource(
        ec:EngineContext,
        vsCode:string,
        fsCode:string,
        attributeNames:Array<string>,
        uniformNames:Array<string>,
    ):ManagedShader|null {

        const ret = new ManagedShader(
            ec,
            vsCode,
            fsCode,
            [...attributeNames],
            [...uniformNames],
        );

        if (!ret.createProgram()) {
            return null;
        }

        ec.recoverPool.addResource(ret);
        ret.releaseLater();
        return ret;
    }

    constructor(
        ec:EngineContext,
        private vsCode:string,
        private fsCode:string,
        readonly attributeNames:Array<string>,
        readonly uniformNames:Array<string>,
    ) {
        super(ec);
    }

    get program():WebGLProgram|null {
        return this._program;
    }

    getUniformNames():string[] {
        return this.uniformNames;
    }

    hasUniform(uniformName:string):boolean {
        return this.uniformNames.find(e => e == uniformName) ? true : false;
    }

    getUniformByIndex(index:number):WebGLUniformLocation {
        return this.uniformLocations[index];
    }

    getUniformLocationByName(name:string):WebGLUniformLocation {
        for (let i=0; i<this.uniformNames.length; i++) {
            if (this.uniformNames[i] == name) {
                return this.uniformLocations[i];
            }
        }
        return -1;
    }

    getAttributeLocationByIndex(index:number):GLuint {
        return this.attributeLocations[index];
    }

    freeResource(): void {
        const gl = this.ec.gl;

        if (this._program) {
            gl.deleteProgram(this._program)
        }
        this._program = null;
        this.ec.recoverPool.removeResource(this);

    }

    onRestoreContext(): void {
        this.createProgram();
    }


    private createProgram():boolean {
        const gl = this.ec.gl;
        try {
            this._program = createShaderFromSource(
                gl,
                this.vsCode, this.fsCode,
            );
        }
        catch(err) {
            console.error(err);
            return false;
        }


        this.uniformLocations.length = 0;
        for (let uniName of this.uniformNames) {
            const uniLoc = gl.getUniformLocation(this._program, uniName);
            if (!uniLoc) {
                console.error("Cannot find uniform location for", uniName);
                if (this._program) {
                    gl.deleteProgram(this._program)
                }
                return false;
            }
            this.uniformLocations.push(uniLoc);
        }

        this.attributeLocations.length = 0;
        for (let attrName of this.attributeNames) {
            const attrLoc = gl.getAttribLocation(this._program, attrName);
            this.attributeLocations.push(attrLoc);
        }

        return true;
    }


}