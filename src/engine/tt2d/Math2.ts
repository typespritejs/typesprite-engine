/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 *
 * @param val
 * @param pixelSize
 */
export function scaleFloor(val:number, pixelSize:number) {
    return Math.floor(val * pixelSize) / pixelSize;
}


export function nextPowerOfTwo(val:number) {

    // FIX translate this to JS
    // https://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2

    if (val <=     2) return     2;
    if (val <=     4) return     4;
    if (val <=     8) return     8;
    if (val <=    16) return    16;
    if (val <=    32) return    32;
    if (val <=    64) return    64;
    if (val <=   128) return   128;
    if (val <=   256) return   256;
    if (val <=   512) return   512;
    if (val <=  1024) return  1024;
    if (val <=  2048) return  2048;
    if (val <=  4096) return  4096;
    if (val <=  8192) return  8192;
    if (val <= 16384) return 16384;
    if (val <= 32768) return 32768;

    console.error("Cannot determine next power of two for:", val);
    return 2;
}

/**
 * the wonders of clamp
 *
 * @param v
 * @param min default 0
 * @param max default 1
 */
export function clamp(v, min = 0, max = 1) {
    return v > max ? max: (v < min ? min : v);
}

/**
 * converts integer (number) into RGBA values
 *
 * @param outCol needs to be an array of 4. null is also okay
 */
export function colorToRGBA(num:number, outCol?:Array<number>) {

    outCol = outCol || [0,0,0,0];

    num >>>= 0;
    outCol[0] = num & 0xFF;
    outCol[1] = (num & 0xFF00) >>> 8;
    outCol[2] = (num & 0xFF0000) >>> 16;
    outCol[3] = (num & 0xFF000000) >>> 24;

    return outCol;
}

export function colorToRGBAVal(num:number, outCol?:Array<number>) {

    outCol = colorToRGBA(num, outCol);
    outCol[0] /= 255;
    outCol[1] /= 255;
    outCol[2] /= 255;
    outCol[3] /= 255;

    return outCol;
}

export function smoothStep(current, target, t) {
    // Scale, bias and saturate x to 0..1 range
    t = clamp((t - current) / (target - current));
    // Evaluate polynomial
    return t * t * (3 - 2 * t);
}


export const RAD_TO_DEG:number = 180 / Math.PI;
export const DEG_TO_RAD:number = Math.PI / 180;

export function sin01(v:number):number {
    return (1 + Math.sin(v)) * 0.5;
}

export function randomRange(min:number, max:number) {
    const rnd = Math.random();
    return min < max ? (max-min)*rnd + min : (min-max)*rnd + max;
}

export function closeNumber(a:number, b:number, error:number=0.01):boolean {

    // abs(100.0 - 100.1) < 0.01
    // abs(-0.1) < 0.01
    // 0.1 < 0.01
    // => false

    // abs(100.0 - 100.001) < 0.01
    // abs(-0.001) < 0.01
    // 0.001 < 0.01
    // => true


    return (Math.abs(a - b) < error)
}