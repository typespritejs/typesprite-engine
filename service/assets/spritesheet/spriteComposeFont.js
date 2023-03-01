/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import path from 'node:path';
import Jimp from 'jimp';
import {readJson, writeJson} from './files.js';


/**
 *
 * @param model SpriteComposeModel
 * @param job { {fullPath:string, name:string, type:string, fileType:string}}
 * @param fileCacheDir string
 * @returns {Promise<void>}
 */
export async function composeFonts(model, job, fileCacheDir) {
    const sourceFileName = path.basename(job.fullPath);
    const data = await readJson(`${fileCacheDir}/${job.name}.json`);

    if (!data.meta || !data.meta.slices || data.meta.slices.length == 0) {
        console.warn(`No slices on: ${sourceFileName}`);
        return;
    }

    const image = await Jimp.read(`${fileCacheDir}/${job.name}.png`);
    const imgW = image.bitmap.width;
    const imgH = image.bitmap.height;
    const originId = model.addOrigin(sourceFileName, imgW, imgH);

    const fonts = {};


    let multiFontSheet = false;
    for (const slice of data.meta.slices) {
        const name = slice.name;
        if (name.startsWith("font:") ||
            name.startsWith("pentafont")) {
            multiFontSheet = true;
            break;
        }
    }

    for (const slice of data.meta.slices) {
        const {
            name,
            color,
            keys,
        } = slice;

        if (keys.length != 1) {
            console.warn("Unexpected slice data in. Slice contains too many keys:", job.fullPath)
        }

        const useSlice = name.startsWith("font:") || (name.indexOf(':') === -1 && !multiFontSheet);
        if (!useSlice) {
            console.warn("Unused slice in font: " + name + " in " + sourceFileName);
            continue;
        }


        const {
            bounds,
            pivot,
            center,
        } = keys[0];

        const frameId = model.addFrameSource(
            image,
            bounds.x, bounds.y,
            bounds.w, bounds.h,
            pivot ? pivot.x : 0,
            pivot ? pivot.y : 0,
            originId
        )

        if (name.startsWith("font:")) {
            // font:<font-name>:<letter>
            const [, fontName, letter] = name.split(':', 3).map(e => e ? e.trim() : '');
            if (!fontName)
                console.warn("Invalid font name in slice: " + name + " in " + sourceFileName);
            if (!letter)
                console.warn("Invalid letter in slice: " + name + " in " + sourceFileName);
            fonts[fontName] = fonts[fontName] || {};
            fonts[fontName][letter] = frameId;
        }
        else if (name.indexOf(':') === -1 && !multiFontSheet) {
            const fontName = job.name;
            const letter = name;
            console.log("Single Slice Font Letter:", fontName, "@", letter);
            fonts[fontName] = fonts[fontName] || {};
            fonts[fontName][letter] = frameId;
        }
    }

    Object.keys(fonts).forEach(fontName => {
        model.addFont(fontName, fonts[fontName]);
    })

}


// ---------------------------------------------------------------------------------------------------------------------


/**
 *
 * @param model SpriteComposeModel
 * @param job { {fullPath:string, name:string, type:string, fileType:string}}
 * @param fileCacheDir string
 * @returns {Promise<void>}
 */
export async function composePentacomFonts(model, job, fileCacheDir) {
    const sourceFileName = path.basename(job.fullPath);
    const data = await readJson(`${fileCacheDir}/${job.name}.json`);
    const image = await Jimp.read(`${fileCacheDir}/${job.name}.png`);
    const imgW = image.bitmap.width;
    const imgH = image.bitmap.height;
    const originId = model.addOrigin(sourceFileName, imgW, imgH);


    const fontName = job.name;

    // const {
    //     bounds,
    //     pivot,
    //     center,
    // } = keys[0];

    const pentaFontData = data;
    const fontObj = {};
    const refFrame = pentaFontData.frames[0];
    const fontOffsetX = 0;
    const fontOffsetY = 0;
    const refTop = refFrame[2];

    for (let f=0; f<pentaFontData.frames.length; f++) {
        const [
            char,
            srcX,
            srcY,
            frameWidth,
            frameHeight,
            sheetX,
            sheetY,
        ] = pentaFontData.frames[f];

        const frameId = model.addFrameSource(
            image,
            sheetX + fontOffsetX,
            sheetY + fontOffsetY,
            frameWidth,
            frameHeight,
            0,
            refTop-srcY,
            originId
        )
        fontObj[char] = frameId;
    }
    model.addFont(fontName, fontObj);
}
