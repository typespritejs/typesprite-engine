/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {readJson} from './files.js';
import path from 'node:path';
import Jimp from 'jimp';


/**
 *
 * @param model SpriteComposeModel
 * @param job { {fullPath:string, name:string, type:string, fileType:string}}
 * @param fileCacheDir string
 * @returns {Promise<void>}
 */
export async function composeAnim(model, job, fileCacheDir) {

    const sourceFileName = path.basename(job.fullPath);
    const data = await readJson(`${fileCacheDir}/${job.name}.json`);
    const image = await Jimp.read(`${fileCacheDir}/${job.name}.png`);
    const imgW = image.bitmap.width;
    const imgH = image.bitmap.height;
    const originId = model.addOrigin(sourceFileName, imgW, imgH);


    const hasFrames = data.frames && data.frames.length > 0;
    const hasTagFrames = data.meta && data.meta.frameTags && data.meta.frameTags.length > 0;

    if (!hasFrames) {
        console.warn(`No animation frames found on: ${sourceFileName}`);
        return;
    }


    // -----------------------------------------------------------------------------------------------------------------
    // Folgende Punkte:
    //
    // - Es gibt einmal die Haupt-Frame-Sequenz (also alle Frames von 0-N)
    // - Es gibt zusätzlich Tags welche (bezogen auf der Haupt-Frame-Sequenz) Sub-Sequenzen abbilden
    // - Duplikate:
    //   - Sind die Pixeldaten eines Frames identisch verweist ASE auf dasselbe Zielrechteck
    //   - Es schreibt jedoch Kopien heraus
    //   - Die Animations-Definition kennen kein Konzept für Duplikate
    //   - Es kann sein, dass zwei Frames auf dieselben Pixel zeigen aber unterschiedliche Duration haben
    // - Tag-Namens-Konvention:
    //   - `<name>:[<L>],<pivot-x>x<pivot-y>!`
    //   - Endet der Name mit: ! dann gilt vom letzten `:` aus:
    //   - L = loop: true, andernfalls: loop = false,
    //   - Taucht ein `x` auf werden die Zahlen als pivot-x und pivot-y verstanden (bezogen auf die Bild-Gesamt-Größe)
    //
    // Konsequenzen:
    //
    // - anim-frames != pixel-frames, wegen der Duplikate
    // - Sind tags vorhanden, werden NUR diese exportiert - andernfalls nur die Haupt-Frame-Sequenz
    //   - Hintergrund: wenn man tags einsetzt, kann es gut vorkommen, dass man optische Trenn-Frames macht.
    //     Damit diese nicht, bei aufwendigen Tag-Animationen, mit im Sheet landen wird die Haupt-Sequenz nur
    //     als ganzes exportiert, wenn keine Tag-Informationen vorliegen.
    // -----------------------------------------------------------------------------------------------------------------


    // anims
    const anims = [];
    {
        if (!hasTagFrames) {
            const animFrames = [];
            const mapHashToId = {};
            for (let i=0; i<data.frames.length; i++) {
                const frame = data.frames[i];
                const hash = frameHash(frame);
                if (!mapHashToId[hash]) {
                    const frameId = model.addFrameSource(
                        image,
                        frame.frame.x,
                        frame.frame.y,
                        frame.frame.w,
                        frame.frame.h,
                        0, 0, // pattern!?
                        originId,
                    );
                    mapHashToId[hash] = frameId;
                }
                const frameId = mapHashToId[hash];
                animFrames.push({
                    frameId,
                    duration: frame.duration,
                })
            }
            anims.push({
                name: "default",
                loop: false,
                frames: animFrames
            });
        }
        else {

            // can for meta tags
            let pivotX = 0;
            let pivotY = 0;
            for (const animTag of data.meta.frameTags) {
                const {name} = animTag;
                const pivotMatch = /^pivot:(\d+)x(\d+)$/.exec(name);
                if (pivotMatch) {
                    pivotX = Number(pivotMatch[1]);
                    pivotY = Number(pivotMatch[2]);
                }
            }

            const mapHashToId = {};
            for (const animTag of data.meta.frameTags) {
                let {name, from, to, direction} = animTag;
                const nameLower = name.toLowerCase();
                let loop = false;
                if (nameLower.startsWith("pivot:"))
                    continue;
                if (nameLower.endsWith(":l")) {
                    loop = true
                    name = name.substring(0, name.length-2);
                }
                const animFrames = [];
                for (let i=from; i<=to; i++) {
                    const frame = data.frames[i];
                    const hash = frameHash(frame);
                    if (!mapHashToId[hash]) {
                        const frameId = model.addFrameSource(
                            image,
                            frame.frame.x,
                            frame.frame.y,
                            frame.frame.w,
                            frame.frame.h,
                            pivotX,
                            pivotY,
                            originId,
                        );
                        mapHashToId[hash] = frameId;
                    }
                    const frameId = mapHashToId[hash];
                    animFrames.push({
                        frameId,
                        duration: frame.duration,
                    })
                }
                anims.push({
                    name,
                    loop,
                    frames: animFrames,
                });
                // console.log("=>", animFrames)
            }
        }
    }

    // store meta data in model
    model.addAnimation(job.name, anims);
}



function propHash(object, keyName) {
    let out = "";
    const val = object[keyName];
    if (Array.isArray(val)) {
        throw new Error("Array's not supported atm")
    }
    const type = typeof val
    if (type  === "object") {
        out += "{";
        Object.keys(val).sort().forEach(key => { // sorting does the trick!
            out += "," + propHash(val, key);
        });
        out += "}";
    }
    else if (type === "number") {
        out += `{${val}}`;
    }
    else if (type === "string") {
        out += `{"${val}"}`;
    }
    else if (type === "boolean") {
        out += `{${val}}`;
    }
    else {
        throw new Error("Unsupported type: " + type + " of value: " + val)
    }
    return out;
}

function selectPropHash(object, keyList) {
    let out = "";
    for (const key of keyList) {
        out += propHash(object, key);
    }
    return out;
}

function frameHash(frameData) {
    return selectPropHash(
        frameData,
        [
            "frame",
            "rotated",
            "trimmed",
            "spriteSourceSize",
            "sourceSize"
        ]
    );
}


