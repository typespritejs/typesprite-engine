/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import Jimp from 'jimp';
import {Color} from "../../../dist/index.js";
import fs from'node:fs/promises';


/**
 * creates a copy and applies the given filter(s)
 */
export async function copyAndFilter(sourceImage, outImage, filter) {
    const filterActions = filter.map(f => makeFilter(f)).filter(f => !!f);
    if (filter.length == 0) {
        // no filter? simply copy!
        await fs.copyFile(sourceImage, outImage);
    }
    else {
        const loadedImage = await Jimp.read(sourceImage);
        for (const f of filterActions)
            f(loadedImage);
        await loadedImage.writeAsync(outImage);
    }
}


function makeFilter(filter) {
    if (filter.type == "ReplaceColors") {
        const replace = {};
        Object.keys(filter.replace).forEach(source => {
            const targetColor = Color.fromHash(filter.replace[source]);
            const sourceColor = Color.fromHash(source);
            replace[sourceColor.toNumber()] = targetColor.toIntArray()
        })
        return function (img) {
            img.scan(
                0,
                0,
                img.bitmap.width,
                img.bitmap.height,
                function(x, y, idx) {
                    const cmpPixel = Color.intArrayToNumber([
                        this.bitmap.data[idx + 0],
                        this.bitmap.data[idx + 1],
                        this.bitmap.data[idx + 2],
                        this.bitmap.data[idx + 3],
                    ])
                    const targetReplace = replace[cmpPixel];
                    if (targetReplace) {
                        this.bitmap.data[idx + 0]  = targetReplace[0];
                        this.bitmap.data[idx + 1]  = targetReplace[1];
                        this.bitmap.data[idx + 2]  = targetReplace[2];
                        this.bitmap.data[idx + 3]  = targetReplace[3];
                    }
                }
            );

        }
    }
}




