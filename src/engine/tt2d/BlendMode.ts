/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {EngineContext} from "./EngineContext";

export enum BlendMode {
    /// normal alpha blending
    BM_NORMAL,
    /// additive (nice for some effects)
    BM_ADDITIVE,
    /// multiply
    BM_MULTILPLY,
    /// Masks only the alpha channel (for debug stuff)
    BM_ALPHA_CHANNEL,
    /// MixColor, allows you to manipulate the color factor
    //BM_MIX_COLOR,
    /// Like multiply but negative
    BM_NEGATIVE_MULTIPLY,
    /// performs a merge copy (in photoshop its called "ineinander kopieren"
    BM_MERGE_COPY,
    /// This is very close to an "invert" operation.
    /// It is exactely what photoshop calls "Ausschließen"
    BM_LIKE_DIFFERENCE,
    /// no color blending
    BM_NO_BLEND,

    BM_LIKE_COLOR_DODGE,

    /// hack to have the blend mode numbers
    BM_NUM_BLENDMODES
}

// const GL_ZERO = 0;
// const GL_ONE = 1;
// const GL_SRC_ALPHA = 0x0302;
// const GL_ONE_MINUS_SRC_ALPHA = 0x0303;
// const GL_DST_COLOR = 0x0306;
// const GL_SRC_COLOR = 0x0300;
// const GL_ONE_MINUS_DST_COLOR = 0x0307;
// const GL_DST_ALPHA = 0x80CA;
// const GL_ONE_MINUS_SRC_COLOR = 0x0301;


const BLEND_ENABLE = 1;
const BLEND_DISABLE = 0;


let BlendModeData = null;

function getBlendModeData(gl:WebGLRenderingContext) {
    const BlendModeData = [

        // "normal"
        [
            [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, BLEND_ENABLE],
            [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, BLEND_ENABLE]
        ],

        // "additive"
        [
            [gl.SRC_ALPHA, gl.ONE, BLEND_ENABLE],
            [gl.ONE, gl.ONE, BLEND_ENABLE]
        ],
        // "Multiply"
        [
            [gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, BLEND_ENABLE],
            [gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, BLEND_ENABLE]
        ],
        // "AlphaChannel"
        [
            [gl.ZERO, gl.ONE_MINUS_SRC_ALPHA, BLEND_ENABLE],
            [gl.ZERO, gl.ONE_MINUS_SRC_ALPHA, BLEND_ENABLE]
        ],
        // "Negative Multiplizieren"
        [
            [gl.SRC_COLOR, gl.DST_ALPHA, BLEND_ENABLE],
            [gl.SRC_COLOR, gl.DST_ALPHA, BLEND_ENABLE]
        ],
        // "Ineinander kopieren"
        [
            [gl.DST_COLOR, gl.DST_ALPHA, BLEND_ENABLE],
            [gl.DST_COLOR, gl.DST_ALPHA, BLEND_ENABLE]
        ],
        // "invert"
        [
            [gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_COLOR, BLEND_ENABLE],
            [gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_COLOR, BLEND_ENABLE]
        ],
        // "none"
        [
            [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, BLEND_DISABLE],
            [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, BLEND_DISABLE]
        ],
        // "color dodge"
        [
            [gl.DST_COLOR, gl.ONE, BLEND_ENABLE],
            [gl.DST_COLOR, gl.ONE, BLEND_ENABLE]
        ]
    ];
    return BlendModeData;
}


export function applyBlendMode(ec:EngineContext, bm:BlendMode, forPremod:boolean) {

    BlendModeData = BlendModeData || getBlendModeData(ec.gl);

    const premodIndex = forPremod ? 1 : 0;
    const blendSrc:any = BlendModeData[bm][premodIndex][0];
    const blendDst:any = BlendModeData[bm][premodIndex][1];
    const blendEnable:any = BlendModeData[bm][premodIndex][2];

    if (ec.currentBlendEnabled !== blendEnable) {
        if (blendEnable)
            ec.gl.enable(ec.gl.BLEND);
        else
            ec.gl.disable(ec.gl.BLEND);
        ec.currentBlendEnabled = blendEnable;
    }

    if (ec.currentBlendFuncSrc !== blendSrc ||
        ec.currentBlendFuncSrc !== blendDst) {
        ec.gl.blendFunc(blendSrc, blendDst);
        ec.currentBlendFuncSrc = blendSrc;
        ec.currentBlendFuncDst = blendDst;
    }
}


export function applyBlendModeForce(ec:EngineContext, bm:BlendMode, forPremod:boolean) {

    BlendModeData = BlendModeData || getBlendModeData(ec.gl);

    const premodIndex = forPremod ? 1 : 0;
    const blendSrc:any = BlendModeData[bm][premodIndex][0];
    const blendDst:any = BlendModeData[bm][premodIndex][1];
    const blendEnable:any = BlendModeData[bm][premodIndex][2];

    if (blendEnable)
        ec.gl.enable(ec.gl.BLEND);
    else
        ec.gl.disable(ec.gl.BLEND);
    ec.currentBlendEnabled = blendEnable;

    ec.gl.blendFunc(blendSrc, blendDst);
    ec.currentBlendFuncSrc = blendSrc;
    ec.currentBlendFuncDst = blendDst;
}
