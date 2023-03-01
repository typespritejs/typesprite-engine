/**
 * Copyright (c) 2013, Johannes Brosi <mail@jbrosi.de>
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 * Creates and compiles a shader.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} shaderSource The GLSL source code for the shader.
 * @param {number} shaderType The type of shader, VERTEX_SHADER or
 *     FRAGMENT_SHADER.
 * @return {!WebGLShader} The shader.
 */
function compileShader (gl, shaderSource, shaderType) {
    // Create the shader object
    var shader = gl.createShader(shaderType),
        success;

    // Set the shader source code.
    gl.shaderSource(shader, shaderSource);

    // Compile the shader
    gl.compileShader(shader);

    // Check if it compiled
    success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
        // Something went wrong during compilation; get the error
        throw "" + gl.getShaderInfoLog(shader);
    }

    return shader;
}


/**
 * Creates a program from 2 shaders.
 *
 * @param {!WebGLRenderingContext) gl The WebGL context.
 * @param {!WebGLShader} vertexShader A vertex shader.
 * @param {!WebGLShader} fragmentShader A fragment shader.
 * @return {!WebGLProgram} A program.
 */
function createProgram (gl, vertexShader, fragmentShader) {
    // create a program.
    var program = gl.createProgram(),
        success;

    // attach the shaders.
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // link the program.
    gl.linkProgram(program);

    // Check if it linked.
    success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        // something went wrong with the link
        throw ("program filed to link:" + gl.getProgramInfoLog(program));
    }

    return program;
}

function withLines(source:string, err:string):string {
    let out = "";
    let errorLine = -1;
    const details = /^ERROR:\s*(\d+):\s*(\d+)/i.exec(err);
    if (details) {
        errorLine = Number(details[2]);
    }

    const lines = source.split("\n");
    for (let i=0; i<lines.length; i++) {
        const line = lines[i];
        const nmb = i+1 < 10 ? `0${i+1}` : `${i+1}`;
        out += `[${nmb}] ${line}\n`;

        if (errorLine === i+1) {
            out += "^^^^^^^^^^\n";
            out += `${err}\n\n`;
        }

    }

    if (!(errorLine > 0)) {
        out += "---------------------\n";
        out += `${err}\n`;
    }

    return out;
}


export function createShaderFromSource(gl:WebGLRenderingContext, vertexShader:string, fragmentShader:string) {
    let vs;
    let fs;
    try {
        vs = compileShader(gl, vertexShader, gl.VERTEX_SHADER);
    }
    catch(err) {
        console.error("VertexShader Source\n-----------\n"+withLines(vertexShader, `${err}`))
        throw err;
    }

    try {
        fs = compileShader(gl, fragmentShader, gl.FRAGMENT_SHADER);
    }
    catch(err) {
        console.error("FragmentShader Source\n-----------\n"+withLines(fragmentShader, `${err}`))
        throw err;
    }

    return createProgram(gl, vs, fs);
}
