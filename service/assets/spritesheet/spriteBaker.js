/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {MultiBinPacker} from "../../../dist/index.js";
import path from 'node:path';
import Jimp from 'jimp';
import {copyPixels} from "./jimp.js";


/**
 *
 * @param spriteSheetPath string
 * @param model SpriteComposeModel
 * @param fileCacheDir string
 */
export async function bakeModel(spriteSheetPath, model, fileCacheDir, sheetWidth, sheetHeight, allowTrim) {


    console.log(
        "\n---------------- RESULT:\n",
        "frames:", model.frames.length, '\n',
        "origins:", model.origins.length, '\n',
        "ninePatches:", model.ninePatches.length, '\n',
        "slices:", model.slices.length, '\n',
    );


    // const packer = new MultiBinPacker(1024, 1024, 1);
    const packer = new MultiBinPacker(sheetWidth, sheetHeight, 1);

    const frameCollection = []
    for (const [i, frame] of model.frames.entries()) {

        const trimFrame = allowTrim && !model.hasGenFlag(i, "NO_TRIM");

        if (trimFrame) {


            const {sourceImage, sx, sy, sw, sh, spx, spy} = frame;
            const border = {
                left: sw,
                top: sh,
                right: 0,
                bottom: 0,
            }

            // determine trim-border
            sourceImage.scan(
                sx, sy,
                sw, sh,
                function(x, y, idx) {
                    const foundPixel = this.bitmap.data[idx + 3] > 0;
                    const rx = x - sx;
                    const ry = y - sy;
                    if (foundPixel) {
                        if (rx < border.left)
                            border.left = rx;
                        if (rx > border.right)
                            border.right = rx;
                        if (ry < border.top)
                            border.top = ry;
                        if (ry > border.bottom)
                            border.bottom = ry;
                    }
                }
            );

            // empty frame
            if (border.right < border.left ||
                border.bottom < border.top) {

                console.warn("Empty frame on", path.basename(spriteSheetPath));
                // console.log("trim of: ", sx, sy, sw, sh, "=>", border);

                frameCollection.push({
                    frame,
                    trim: {
                        x: sx,
                        y: sy,
                        w: 2, // empty frames being reduced to 2 pixels
                        h: 2,
                    },
                    width: 2, // needed for packer to work
                    height: 2,
                })
            }
            else {
                const trim = {
                    x: border.left,
                    y: border.top,
                    w: border.right - border.left + 1, // +1 => l:1 t:1 r:1 b:1 => x:1,y:1 w:1, h:1
                    h: border.bottom - border.top + 1,
                }
                //console.log("trim of: ", sx, sy, sw, sh, "=>", border, trim);
                frameCollection.push({
                    frame,
                    trim,
                    width: trim.w,
                    height: trim.h,
                })
            }
        }
        else {
            frameCollection.push({
                frame,
                width: frame.sw, // needed for packer to work
                height: frame.sh,
            })
        }
    }
    packer.addArray(frameCollection);

    //
    for (const bin of packer.bins) {
        const pow2Width = nextPowerOfTwo(bin.width);
        const pow2Height = nextPowerOfTwo(bin.height);
        const frames = bin.rects;
        const sheetImg = await new Jimp(pow2Width, pow2Height, 0x00000000);
        const imageId = model.addOutImage(sheetImg, path.basename(spriteSheetPath))

        console.log("Write Sheet:", "Id:", imageId, "Size:", pow2Width+"x"+pow2Height + "px", "Frames:", frames.length);

        for (const frame of frames) {
            const {x, y, width, height} = frame; // from packer

            if (frame.data.trim) {
                const pivotX = frame.data.frame.spx - frame.data.trim.x; // frame.data.frame.spx; // (frame.data.trim.x - frame.data.frame.sx) + frame.data.frame.spx
                const pivotY = frame.data.frame.spy - frame.data.trim.y; // (frame.data.trim.y - frame.data.frame.sy) + frame.data.frame.spy
                model.addPackedFrame(
                    frame.data.frame,
                    x, y, width, height,
                    pivotX, pivotY,
                    imageId,
                )
            }
            else {
                model.addPackedFrame(
                    frame.data.frame,
                    x, y, width, height,
                    frame.data.frame.spx, frame.data.frame.spy,
                    imageId,
                )
            }
        }
    }

    const packedFrameIds = Object.keys(model.packedFrames);
    // if (packedFrameIds.length !== model.frames.length) {
    //     throw new Error("Not every frame was packed!");
    // }

    // copy pixels
    for (const frameId of packedFrameIds) {
        const packedFrame = model.packedFrames[frameId];
        if (!packedFrame) {
            console.warn("Missing frame");
            continue;
        }

        const targetImage = model.outImages[packedFrame.imageIndex].image;
        const dx = packedFrame.sourceFrame.spx - packedFrame.tpx;
        const dy = packedFrame.sourceFrame.spy - packedFrame.tpy;

        copyPixels(
            targetImage,
            packedFrame.sourceFrame.sourceImage,
            packedFrame.tx,
            packedFrame.ty,
            packedFrame.sourceFrame.sx + dx,
            packedFrame.sourceFrame.sy + dy,
            packedFrame.tw,
            packedFrame.th,
        )

        // targetImage.blit(
        //     packedFrame.sourceFrame.sourceImage,
        //     packedFrame.tx,
        //     packedFrame.ty,
        //     packedFrame.sourceFrame.sx + dx,
        //     packedFrame.sourceFrame.sy + dy,
        //     packedFrame.tw,
        //     packedFrame.th,
        // );

        // // DEBUG FRAME
        // targetImage.scan(
        //     packedFrame.tx,
        //     packedFrame.ty,
        //     // packedFrame.sourceFrame.sw,
        //     // packedFrame.sourceFrame.sh,
        //     packedFrame.tw,
        //     packedFrame.th,
        //     function(x, y, idx) {
        //         if (this.bitmap.data[idx + 3] == 0) {
        //             this.bitmap.data[idx + 0]  = 0;
        //             this.bitmap.data[idx + 1]  = 0;
        //             this.bitmap.data[idx + 2]  = 0;
        //             this.bitmap.data[idx + 3]  = 255;
        //         }
        //     }
        // );
    }

    // write PNG files
    const targetDir = path.dirname(spriteSheetPath);
    for (const out of model.outImages) {
        const finalFile = `${targetDir}/${out.name}.png`;
        await out.image.writeAsync(finalFile);
    }
}


/**
 * advanced dust & magic (TM)
 */
function nextPowerOfTwo(val) {

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

    throw new Error("Failed to power-of-two for: " + val )
}