/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import Jimp from 'jimp';



/**
 *
 * @param model SpriteComposeModel
 * @param job { {fullPath:string, name:string, type:string, fileType:string}}
 * @param fileCacheDir string
 * @returns {Promise<void>}
 */
export async function composeFNTFonts(model, job, fileCacheDir) {
    const txt = await fs.readFile(job.fullPath, {encoding: "utf-8"});
    const fileDir = path.dirname(job.fullPath);
    const fontDef = parseDefFile(txt);
    const fontPages = fontDef["page"];
    const mapPageToOriginId = {};
    const mapPageToOrigin = {};
    for (let i=0; i<fontPages.length; i++) {
        const file = fontPages[i].file;
        const id = fontPages[i].id;        
        const loadedImage = ensureWhitePixels(await Jimp.read(`${fileDir}/${file}`));
        const imgW = loadedImage.bitmap.width;
        const imgH = loadedImage.bitmap.height;
        const originId = model.addOrigin(file, imgW, imgH);
        mapPageToOrigin[id] = loadedImage;
        mapPageToOriginId[id] = originId;
    }

    const fontChar = fontDef["char"];
    const lineHeight = fontDef["common"][0].lineHeight;
    const base = fontDef["common"][0].base
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
        metrics.letter[letter] = {
            x, y,
            width, height,
            xoffset, yoffset,
            xadvance,
            kerning: {},
        }
    }

    const fontName = fontDef["info"][0].face;
    model.addFont(fontName, fontObj, metrics);
        
}


/**
 * Makes every none-transparent pixel white.
 */
function ensureWhitePixels(targetImage) {
    targetImage.scan(
        0,
        0,
        targetImage.bitmap.width,
        targetImage.bitmap.height,
        function(x, y, idx) {
            if (this.bitmap.data[idx + 3] > 0) {
                this.bitmap.data[idx + 0]  = 255;
                this.bitmap.data[idx + 1]  = 255;
                this.bitmap.data[idx + 2]  = 255;
            }
        }
    );
    return targetImage;
}



/**
 * the FNT-def file works like this:
 *
 * `<name0> <key0>=<value0> <key1>=<value1> <keyN>=<valueN>ENDOL`
 * `<name1> <key0>=<value0> <key1>=<value1> <keyN>=<valueN>ENDOL`
 * `...`
 *
 * One line of text is grouped by one name. The name, however, is not unique.
 *
 * This function basically just splits the whole thing into peaces so we can
 * make sense of it in later.
 *
 * The returned structure looks like this:
 *
 * {
 *     "name0": [
 *         {
 *             key0: value0,
 *             key1: value1,
 *             keyN: valueN,
 *         },
 *         {
 *             key0: value0,
 *             key1: value1,
 *             keyN: valueN,
 *         }
 *     ],
 *     "name1": [...]
 * }
 *
 */
function parseDefFile(txt) {

    // QUICK & DIRTY (TM)
    // 
    // parses the given fnt file format and tries to make
    // sense of the given types.
    //
    const defData = {};
    const lines = txt.split(/\r?\n/);
    for (const line of lines) {
        let mode = "rootName"
        let rootName = "";
        let currentProp = "";
        let propKey = "";
        let propValue = "";
        const rowEntry = {};
        for (let i=0; i<line.length; ) {
            const c = line[i];
            const nextC = i < line.length ? line[i+1] : "";

            switch(mode) {
                case "rootName":
                    if (c == " ") {
                        mode = "waitProp";
                        defData[rootName] = defData[rootName]||[];
                        defData[rootName].push(rowEntry);
                    }
                    else {
                        rootName += c;
                    }
                    break;
                case "waitProp":
                    if (c != " ") {
                        mode = "readPropName";
                        currentProp = "";
                        propKey = "";
                        propValue = "";
                        continue; // again
                    }
                    break;
                case "readPropName":
                    if (c == "=") {
                        if (nextC == '"') {
                            mode = "readPropValueString";
                            i++;
                        }
                        else
                            mode = "readPropValue";
                        propKey = currentProp;
                        currentProp = "";
                    }
                    else {
                        currentProp += c;
                    }
                    break;
                case "readPropValue":
                    if (c == " ") {
                        mode = "waitProp"
                        propValue = currentProp;
                        rowEntry[propKey] = propValue;
                    }
                    else {
                        currentProp += c;
                    }
                    break;
                case "readPropValueString":
                    if (c == '"') {
                        mode = "waitProp"
                        propValue = currentProp;
                        rowEntry[propKey] = `"${propValue}"`;
                    }
                    else {
                        currentProp += c;
                    }
                    break;
            }

            i++;
        
        }

        // make sense of values
        for (const key of Object.keys(rowEntry)) {
            let value = null;
            let rawValue = rowEntry[key];
            if (rawValue.startsWith("\"")) {
                value = rawValue.substring(1, rawValue.length - 1);
            }
            else if (rawValue.indexOf(",") > -1) { // number array
                const rawNumbers = rawValue.split(",");
                value = [];
                for (let i3=0; i3<rawNumbers.length; i3++) {
                    value.push(Number(rawNumbers[i3]));
                }
            }
            else { // number
                value = Number(rawValue);
            }
            rowEntry[key] = value;
        }
    }
    return defData;
};






