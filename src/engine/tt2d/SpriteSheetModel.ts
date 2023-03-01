/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 * JSON format of a SpriteSheet
 */
export interface SpriteSheetModel {
    format: string,
    version: number,
    textures: Texture[],
    origins: Origin[],
    frames: Frame[],
    fonts:Record<string, Font>,
    fontMetrics:Record<string, FontMetric>,
    slices:Record<string, number>,
    ninePatches:Record<string, NineSlice>,
    animations:Record<string, Animation>
}

interface Texture {
    file:string,
    width:number,
    height:number,
}

interface Origin {
    origin:string,
    width:number,
    height:number,
}

type TextureRect = [
    number, number, // x, y
    number, number, // width, height,
    number, number, // pivot, pivot
    number          // index
];

interface Frame {
    src: TextureRect,
    tex: TextureRect,
}

type NineSlice = [
    number,          // frame
    number, number,  // x, y  (within frame)
    number, number   // w, h
]

type Font = Record<string, number>;

interface FontMetric {
    lineHeight: number,
    base: number,
    letter: Record<string, FontLetterMetric>
}

interface FontLetterMetric {
    xoffset:number,
    yoffset:number,
    xadvance:number,
    kerning:Record<string, number>,
}

interface Animation {
    loop:boolean,
    frames:AnimFrame[],
}
type AnimFrame = [
    number,         // frame-id
    number,         // duration
];