/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import path from 'node:path';
import Jimp from 'jimp';



/**
 * TODO pivot?
 *
 * @param model SpriteComposeModel
 * @param job { {fullPath:string, name:string, type:string, fileType:string}}
 * @param fileCacheDir string
 * @returns {Promise<void>}
 */
export async function composeSingle(model, job, fileCacheDir) {

    const sourceFileName = path.basename(job.fullPath);
    const loadedImage = await Jimp.read(`${fileCacheDir}/${job.name}.png`);
    const imgW = loadedImage.bitmap.width;
    const imgH = loadedImage.bitmap.height;
    const originId = model.addOrigin(sourceFileName, imgW, imgH);

    model.addFrameSource(
        loadedImage,
        0, 0, imgW, imgH,
        0, 0,
        originId
    )
}