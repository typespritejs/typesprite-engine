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
export async function composeSlices(model, job, fileCacheDir) {

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
    for (const slice of data.meta.slices) {
        const {
            name,
            color,
            keys,
        } = slice;

        if (keys.length != 1) {
            console.warn("Unexpected slice data in. Slice contains too many keys:", job.fullPath)
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

        if (center) { // ninepatch!
            model.addNinePatch(
                name,
                frameId,
                center.x, center.y,
                center.w, center.h
            )
        }
        else {
            if (name.startsWith("font:")) {
                const [, fontName, char] = name.split(':', 3);
                fonts[fontName] = fonts[fontName] || {}
                fonts[fontName][char] = frameId;
            }
            else {
                model.addSlice(
                    name,
                    frameId
                )
            }
        }
    }

    // inject fonts
    Object.keys(fonts).forEach(fontName => {
        const fontData = fonts[fontName];
        model.addFont(fontName, fontData);
    })
}
