/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 * Similar to jimp.blit but without alpha processing. Byte copy of the given rectangle
 *
 * @param sourceJimp
 * @param targetJimp
 * @param targetX
 * @param targetY
 * @param sourceX
 * @param sourceY
 * @param width
 * @param height
 */
export function copyPixels(
    targetJimp,
    sourceJimp,
    targetX, targetY,
    sourceX, sourceY,
    sourceWidth, sourceHeight,

) {
    // SOURCE: https://github.com/oliver-moran/jimp/blob/e4d6af032fdabdb4b8a4368ec957dec8ea426ef4/packages/plugin-blit/src/index.js
    const x = Math.round(targetX);
    const y = Math.round(targetY);
    const srcx = Math.round(sourceX);
    const srcy = Math.round(sourceY);
    const srcw = Math.round(sourceWidth);
    const srch = Math.round(sourceHeight);
    const maxWidth = targetJimp.bitmap.width;
    const maxHeight = targetJimp.bitmap.height;
    const baseImage = targetJimp;
    sourceJimp.scanQuiet(srcx, srcy, srcw, srch, function(sx, sy, idx) {
        const xOffset = x + sx - srcx;
        const yOffset = y + sy - srcy;
        if (
            xOffset >= 0 &&
            yOffset >= 0 &&
            maxWidth - xOffset > 0 &&
            maxHeight - yOffset > 0
        ) {
            const dstIdx = baseImage.getPixelIndex(xOffset, yOffset);
            baseImage.bitmap.data[dstIdx + 0] = sourceJimp.bitmap.data[idx + 0];
            baseImage.bitmap.data[dstIdx + 1] = sourceJimp.bitmap.data[idx + 1];
            baseImage.bitmap.data[dstIdx + 2] = sourceJimp.bitmap.data[idx + 2];
            baseImage.bitmap.data[dstIdx + 3] = sourceJimp.bitmap.data[idx + 3];
        }
    });
}
