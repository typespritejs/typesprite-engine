/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 *
 */
export class SpriteComposeModel {


    constructor() {
        this.frames = [];
        this.packedFrames = {};
        this.outImages = [];
        this.origins = [];
        this.ninePatches = [];
        this.slices = [];
        /** NOTE: groups are removed during export. see convertToExportModel(...) */
        this.animations = [];
        this.genFrameFlags = {};
        this.fonts = {};
        this.fontMetrics = {};
    }

    /**
     * add origin and return id/index
     */
    addOrigin(path, width, height) {
        const id = this.origins.length;
        this.origins.push({
            origin: path,
            width,
            height
        });
        return id;
    }

    addNinePatch(
        name,
        frameId,
        npx, npy,
        npw, nph
    ) {
        const id = this.ninePatches.length;
        this.ninePatches.push({
            name,
            frameId,
            npx, npy,
            npw, nph
        })
        this.setGenFrameFlag(frameId, "NO_TRIM");
        return id;
    }

    /**
     * Flags/hints for packing process
     *
     * NO_TRIM: Frame may not be trimmed because it's used in context where trimming would be an issue
     */
    setGenFrameFlag(frameId, flag) {
        const flagObj = this.genFrameFlags[frameId]||{};
        this.genFrameFlags[frameId] = flagObj;
        flagObj[flag] = true;
    }

    hasGenFlag(frameId, flag) {
        const flagObj = this.genFrameFlags[frameId]||{};
        return flagObj[flag] ? true : false;
    }

    addSlice(
        name,
        frameId
    ) {
        const id = this.slices.length;
        this.slices.push({
            name,
            frameId,
        })
        return id;
    }

    /**
     *
     * @param sourceImage
     * @param sx
     * @param sy
     * @param sw
     * @param sh
     * @param spx pivot x
     * @param spy pivot y
     * @param originId
     */
    addFrameSource(
        sourceImage,    // loaded image container
        sx, sy, sw, sh, // frame source rect
        spx, spy,       // pivot on source
        originId,       // origin data
    ) {
        const id = this.frames.length;
        this.frames.push({
            sourceImage,
            sx, sy, sw, sh,
            spx, spy,
            originId,
            frameId: id,
        })
        return id;
    }

    addOutImage(
        outImage,
        name
    ) {
        const id = this.outImages.length;
        this.outImages.push({
            name: `${name}_${id}`,
            image: outImage,
        })
        return id;
    }

    /**
     * Source Frame and it's target information
     * @param sourceFrame
     * @param tx
     * @param ty
     * @param tw
     * @param th
     * @param tpx
     * @param tpy
     * @param imageIndex
     */
    addPackedFrame(
        sourceFrame,
        tx, ty, tw, th,
        tpx, tpy,
        imageIndex,
    ) {
        this.packedFrames[sourceFrame.frameId] = {
            sourceFrame,
            tx, ty, tw, th,
            tpx, tpy,
            imageIndex
        };
    }

    /**
     *
     * NOTE: Group-Stuff will be removed during export!
     * See: convertToExportModel
     *
     * @param groupName {string}
     * @param animations { {name:string, loop:boolean, frames:{frameId:number, duration:number}[] }[] }
     */
    addAnimation(
        groupName,
        animations
    ) {
        this.animations.push({
            name: groupName,
            animations
        })
    }

    /**
     *
     * @param fontName {string}
     * @param frameIds { Record<string, number> }
     * @param metrics { any }
     */
    addFont(
        fontName,
        frameIds,
        metrics = null,
    ) {
        this.fonts[fontName] = frameIds;
        this.fontMetrics[fontName] = metrics;
    }


    /**
     * returns object that can be stored as json
     */
    convertToExportModel() {

        const out9p = {}
        this.ninePatches.forEach(e => {
            out9p[e.name] = [e.npx, e.npy, e.npw, e.nph, e.frameId];
        })

        const slices = {};
        this.slices.forEach(e => {
            slices[e.name] = e.frameId;
        })

        const anims = {};
        this.animations.forEach(anim => {
            // Groups are removed here:
            //
            // {
            //   "group1": {
            //     "anim1": {...}
            //     "anim2": {...}
            //   }
            //   "group2": {
            //     "anim1": {...}
            //     "anim2": {...}
            //   }
            //   "group3": {
            //     "default": {...}
            //   }
            // }
            //
            // RESULT =>
            // {
            //   "group1:anim1": {...}
            //   "group1:anim2": {...}
            //   "group2:anim1": {...}
            //   "group2:anim2": {...}
            //   "group3": {...}*
            // }
            //
            // *) If a group (aseprite file) has only one animation
            //    and is named default, the default is omitted.
            //    This is for animations that are a simple animation list
            //
            const animGroupName = anim.name;
            anim.animations.forEach(innerAnim => {
                const finalName = innerAnim.name == "default" && anim.animations.length == 1
                    ? `${animGroupName}`
                    : `${animGroupName}:${innerAnim.name}`;
                anims[finalName] = {
                    loop: innerAnim.loop,
                    frames: [...innerAnim.frames.map(pair => {
                        return [pair.frameId, pair.duration]
                    })]
                };
            })
        })

        const out = {
            format: "TypeSpriteSheet",
            version: 1,
            textures: [...this.outImages.map(e => {
                return {
                    file: e.name + ".png",
                    width: e.image.bitmap.width,
                    height: e.image.bitmap.height,
                }
            })],
            origins: [
                ...this.origins
            ],
            ninePatches: out9p,
            slices,
            animations: anims,
            fonts: this.fonts,
            fontMetrics: this.fontMetrics,
            frames: [
                ...this.frames.map((frame, i) => {
                    const packedFrame = this.packedFrames[i];

                    if (!packedFrame) {
                        throw new Error("ExportModel failed: unpacked frame.");
                    }

                    return {
                        src: [frame.sx, frame.sy, frame.sw, frame.sh, frame.spx, frame.spy, frame.originId],
                        tex: [packedFrame.tx, packedFrame.ty, packedFrame.tw, packedFrame.th, packedFrame.tpx, packedFrame.tpy, packedFrame.imageIndex],
                    }
                })
            ]

        }
        return out;
    }



}

