/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import path from 'node:path';
import Jimp from 'jimp';
import {readJson} from "../../utils/files.js";



/**
 *
 * @param model SpriteComposeModel
 * @param job { {fullPath:string, name:string, type:string, fileType:string}}
 * @param fileCacheDir string
 * @returns {Promise<void>}
 */
export async function spriteComposeMSDF(model, job, fileCacheDir) {
    //
    // fileCacheDir:
    // /ttjs-next/repos/mygame/.cache/sheets/main
    //
    // job.fullPath:
    // /ttjs-next/repos/mygame/assets/sheets/main/LuckiestGuy-Regular.msdf.json
    //
    // => LuckiestGuy-Regular.msdf.json
    const msdfJsonFileName = path.basename(job.fullPath);
    const msdfJson = await readJson(path.join(fileCacheDir, msdfJsonFileName));
    //
    // FNT file format (written as json, yay)
    //
    const mapPageToOriginId = {};
    const mapPageToOrigin = {};
    for (let i=0; i<msdfJson.pages.length; i++) {
        const file = msdfJson.pages[i];
        const id = i;
        const loadedImage = await Jimp.read(path.join(fileCacheDir, file));
        const imgW = loadedImage.bitmap.width;
        const imgH = loadedImage.bitmap.height;
        const originId = model.addOrigin(file, imgW, imgH);
        mapPageToOrigin[id] = loadedImage;
        mapPageToOriginId[id] = originId;
    }
    //
    // prepare kerning map
    //
    const kerningMap = {}
    const kerningExists = Array.isArray(msdfJson.kernings) && msdfJson.kernings.length > 0;
    for (let i=0; kerningExists && i<msdfJson.kernings.length; i++) {
        const {first, second, amount} = msdfJson.kernings[i];
        const firstChr = String.fromCharCode(first);
        const secondChr = String.fromCharCode(second);
        kerningMap[firstChr] = kerningMap[firstChr]||{};
        kerningMap[firstChr][secondChr] = amount;
    }
    //
    // letters
    //
    const fontChar = msdfJson.chars;
    const lineHeight = msdfJson.common.lineHeight;
    const base = msdfJson.common.base
    const fontObj = {};
    const metrics = {
        lineHeight: lineHeight,
        base: base,
        letter: {},
    }
    for (let i=0; i<fontChar.length; i++) {
        const charDef = fontChar[i];
        // source data
        const {id, x, y, width, height, page, xoffset, yoffset, xadvance} = charDef;

        // let's create a frame:
        const frameOriginId = mapPageToOriginId[page];
        const frameRegX = -xoffset;
        const frameRegY = lineHeight - yoffset - base;

        const frameId = model.addFrameSource(
            mapPageToOrigin[page],
            x,
            y,
            width,
            height,
            frameRegX,
            frameRegY,
            frameOriginId,
        );

        const letter = String.fromCharCode(id);
        if (typeof letter === 'undefined') {
            console.error("Unsupported or unknown character. Char:", letter);
            continue;
        }
        fontObj[letter] = frameId;
        const letterMetrics = {
            x, y,
            width, height,
            xoffset, yoffset,
            xadvance,
            kerning: kerningMap[letter]||{},
        }
        metrics.letter[letter] = letterMetrics;
    }

    const fontName = msdfJson.info.face;
    model.addFont(fontName, fontObj, metrics);
}

