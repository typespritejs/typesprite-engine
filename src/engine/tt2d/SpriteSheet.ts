/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Rect} from "./Rect";
import {ManagedTexture} from "./ManagedTexture";
import {Vector2} from "@tsjs/engine/tt2d/Vector";
import {SpriteSheetModel} from "@tsjs/engine/tt2d/SpriteSheetModel";


/**
 * The core building block in terms of optimized 2D batch rendering.
 *
 * **Create a SpriteSheet:**
 *
 * ```
 * assets/gui.sheet.json              // create an empty json with '{}'
 * assets/gui/logo.single.png         // Insert as many source files you need.
 * assets/gui/title.single.png        // Useful naming convention avoids configuration
 * assets/gui/buttons.slices.aseprite // Nice format support (*)
 *
 * *) Aseprite requires typesprite.config.mjs
 * ```
 *
 * Learn more about the Sprite Sheet generation: FIX: LINK!
 *
 * **Load a SpriteSheet:**
 *
 * ```
 * export class MyComponent extends Component {
 *
 *   @res('sheet', 'assets/gui.sheet.json)
 *   private guiSheet:SpriteSheeet;
 *
 *   onInit() {
 *       const logoFrame = this.guiSheet.slices["logo"];
 *   }
 * }
 * ```
 *
 */
export class SpriteSheet {

    /**
     * Use SpriteSheetLoader or if needed: SpriteSheet.createFromXXX() methods.
     */
    private constructor(
        public readonly animations: Record<string, SpriteSheetAnimation>,
        public readonly slices: Record<string, SpriteSheetFrame>,
        public readonly ninePatches: Record<string, SpriteSheetNinePatch>,
        public readonly fonts: Record<string, SpriteSheetFont>,
        public readonly frames: SpriteSheetFrame[],
    ) {
    }


    getAnimationNumFrames(animation:string):number {
        const anim = this.animations[animation];
        return anim
            ? anim.frames.length
            : 0
    }

    /**
     * Returns the requested frame of the given animation.
     * For legacy support this will also search slices if the frameIndex is 0
     *
     * @deprecated use slices or animations
     */
    getAnimationFrame(animation: string, frameIndex: number = 0): SpriteSheetFrame | null {
        const anim = this.animations[animation];
        if (!anim && !frameIndex) {
            const slice = this.slices[animation];
            if (slice)
                return slice;
        }
        return anim && frameIndex < anim.frames.length
            ? anim.frames[frameIndex]
            : null
    }

    /**
     * @deprecated use frames instead.
     */
    getFrame(frameIndex:number):SpriteSheetFrame|null {
        return frameIndex < this.frames.length
            ?  this.frames[frameIndex]
            : null
    }

    /**
     * @deprecated use getAnimationNumFrames() instead.
     */
    getNumFrames(animation:string):number {
        return this.getAnimationNumFrames(animation);
    }

    /**
     * @deprecated use animations directly instead.
     */
    getAnimation(name:string):SpriteSheetAnimation|undefined {
        return this.animations[name];
    }

    /**
     * @deprecated use animations directly instead.
     */
    getAnimations():Record<string, SpriteSheetAnimation> {
        return this.animations;
    }

    /**
     * **New to TypeSprite?:**
     *
     * If you're not an advaned user you very likely don't want this.
     *
     * Try this instead:
     * ```
     * export class MyComponent extends Component {
     *
     *   @res('sheet', 'path/to/my.sheet.json)
     *   private sheet:SpriteSheeet;
     *
     *   // use this.sheet
     * }
     * ```
     *
     * **For advanced devs:**
     *
     * Create an instance from SpriteSheetModel
     */
    static createFromModel(
        textures:ManagedTexture[],
        model:SpriteSheetModel,
    ):SpriteSheet {


        // ORIGINS
        //
        const origins:SpriteSheetFrameOrigin[] = [];
        for (const modelOrigin of model.origins) {
            const origin = new SpriteSheetFrameOrigin(
                modelOrigin.origin,
                modelOrigin.width,
                modelOrigin.height
            );
            origins.push(origin);
        }

        // FRAMES
        //
        const frames:SpriteSheetFrame[] = [];
        for (const modelFrame of model.frames) {
            const frame = new SpriteSheetFrame(
                // tex
                textures[modelFrame.tex[_texRect_TEX_ID]],
                modelRectToRect(modelFrame.tex),
                modelPivotToVector(modelFrame.tex),
                // src
                origins[modelFrame.src[_texRect_TEX_ID]],
                modelRectToRect(modelFrame.src),
                modelPivotToVector(modelFrame.src)
            )
            frames.push(frame);
        }

        // SLICES
        //
        const slices:Record<string, SpriteSheetFrame> = {};
        for (const modelSliceName of Object.keys(model.slices)) {
            const frameId = model.slices[modelSliceName];
            slices[modelSliceName] = frames[frameId];
        }

        // NINE PATCH
        //
        const ninePatches:Record<string, SpriteSheetNinePatch> = {};
        for (const modelSliceName of Object.keys(model.ninePatches)) {
            const modelNineSlice = model.ninePatches[modelSliceName];
            const ninePatch = new SpriteSheetNinePatch(
                frames[modelNineSlice[_9p_FRAME_ID]],
                new Rect(
                    modelNineSlice[_9p_X],
                    modelNineSlice[_9p_Y],
                    modelNineSlice[_9p_W],
                    modelNineSlice[_9p_H]
                )
            );
            ninePatches[modelSliceName] = ninePatch;
        }

        // FONTS
        //
        const fonts:Record<string, SpriteSheetFont> = {};
        for (const modelFontName of Object.keys(model.fonts)) {
            const modelFont = model.fonts[modelFontName];
            const metrics = model.fontMetrics ? model.fontMetrics[modelFontName] : null;
            const letters:Record<string, SpriteSheetFontLetter> = {};
            for (const charName of Object.keys(modelFont)) {
                const letterMetrics = metrics ? metrics.letter[charName] : undefined;
                letters[charName] = new SpriteSheetFontLetter(
                    frames[modelFont[charName]],
                    letterMetrics
                );
            }
            fonts[modelFontName] = new SpriteSheetFont(letters)
        }

        // ANIMATIONS
        //
        const animations:Record<string, SpriteSheetAnimation> = {};
        for (const modelAnimationName of Object.keys(model.animations)) {
            const modelAnimation = model.animations[modelAnimationName];
            const animFrames = [];
            const animDurations = [];
            for (const modelFrame of modelAnimation.frames) {
                const frameIndex = modelFrame[0];
                const duration = modelFrame[1];
                animFrames.push(frames[frameIndex]);
                animDurations.push(duration / 1000);
            }
            const anim = new SpriteSheetAnimation(
                animFrames,
                animDurations,
                modelAnimationName,
                modelAnimation.loop,
                null,
                1
            );
            animations[modelAnimationName] = anim;
        }

        // build the stuff
        return new SpriteSheet(
            animations,
            slices,
            ninePatches,
            fonts,
            frames
        );
    }
}

// ---------------------------------------------------------------------------------------------------------------------


export class SpriteSheetFrameOrigin {

    static RUNTIME:SpriteSheetFrameOrigin = new SpriteSheetFrameOrigin(
        "RUNTIME",
        2,
        2,
    );

    constructor(
        public readonly origin:string,
        public readonly width:number,
        public readonly height:number,
    ) {
    }
}

export class SpriteSheetFrame {
    /**
     * Utility function to quickly create a single SpriteSheetFrame.
     *
     * 💡 Create proper SpritSheets check  FIX: website LINK
     *
     *
     * @see SpriteSheet
     */
    static createFromTexture(
        tex: ManagedTexture,
        frameX?:number,
        frameY?:number,
        frameW?:number,
        frameH?:number,
        pivotX?:number,
        pivotY?:number,
    ): SpriteSheetFrame {
        const rect = new Rect(frameX||0, frameY||0, tex.width, tex.height);
        const pivot = new Vector2(pivotX||0, pivotY||0);
        if (frameW)
            rect.width = frameW;
        if (frameH)
            rect.height = frameH;
        return new SpriteSheetFrame(
            tex,
            rect,
            pivot,
            SpriteSheetFrameOrigin.RUNTIME,
            rect.clone(),
            pivot.copy(),
        );
    }


    /**
     * Utility function to quickly create a list of SpriteSheetFrames from a packed texture
     * for demos.
     *
     * 💡 Create proper SpritSheets check  FIX: website LINK
     *
     * @param texture
     * @param frameWidth in pixel
     * @param frameHeight in pixel
     * @param pivotX rotation/scale anchir X in pixel
     * @param pivotY rotation/scale anchir Y in pixel
     * @param spacing spacing between frames. only between frames (compatible with Aseprite export).
     * @param border top/left/right/bottom border space (compatible with Aseprite export).
     * @param numX manually set number of frames in a row
     * @param numY manually set number of frames in a column
     * @see SpriteSheet
     */
    static createFromMatrixTexture(
        texture: ManagedTexture,
        frameWidth,
        frameHeight,
        pivotX:number=0,
        pivotY:number=0,
        spacing:number=0,
        border:number=0,
        numX:number=0,
        numY:number=0,
    ): SpriteSheetFrame[] {
        const out = [];
        let countX = numX || Math.floor((texture.width - border*2 + spacing)  / (frameWidth + spacing));
        let countY = numY || Math.floor((texture.height - border*2 + spacing) / (frameHeight + spacing));
        const pivot = new Vector2(pivotX, pivotY);
        let yy = border;
        for (let y=0; y<countY; y++) {
            let xx = border;
            for (let x=0; x<countX; x++) {
                const rect = new Rect(xx, yy, frameWidth, frameHeight);
                xx += frameWidth + spacing;
                const f = new SpriteSheetFrame(
                    texture,
                    rect,
                    pivot.copy(),
                    SpriteSheetFrameOrigin.RUNTIME,
                    rect.clone(),
                    pivot.copy(),
                )
                out.push(f);
            }
            yy += frameHeight + spacing
        }
        return out;
    }

    copy():SpriteSheetFrame {
        return new SpriteSheetFrame(
            this.texture,
            this.textureRect.clone(),
            this.texturePivot.copy(),
            this.source,
            this.sourceRect.clone(),
            this.sourcePivot.copy()
        );
    }

    constructor(
        /**
         * The texture used for rendering.
         *
         * Owned by parent's SpriteSheet.
         */
        public readonly texture: ManagedTexture,
        /**
         * Frame-rect on the texture. This is likely to be trimmed.
         * To get width/height of the frame as it was defined in the graphics
         * program see sourceRect.width/height.
         */
        public readonly textureRect: Rect,
        /**
         * The pivot for the frame, calculated in a way that works on the texture
         * during rendering.
         */
        public readonly texturePivot: Vector2,
        /**
         * Mostly for debugging to understand where the frame is from.
         */
        public readonly source:SpriteSheetFrameOrigin,
        /**
         * The rectangle on the source (as defined in the graphics program). For the
         * developers mental model this is likely the width/height one expects.
         * However, for shading/rendering use textureRect's values.
         */
        public readonly sourceRect:Rect,
        /**
         * Original pivot on the source.
         */
        public readonly sourcePivot:Vector2,
    ) {
    }

    /** @deprecated */
    public get rect():Rect {
        return this.sourceRect;
    }

    /** @deprecated */
    public get regX(): number {
        return this.sourcePivot.x;
    };

    /** @deprecated */
    public get regY(): number {
        return this.sourcePivot.y;
    };
}

export class SpriteSheetNinePatch {

    constructor(
        public readonly frame: SpriteSheetFrame,
        public readonly rect: Rect,
    ) {
    }

    /** @deprecated legacy */
    get texture(): ManagedTexture {
        return this.frame.texture;
    }
}

interface SpriteSheetFontLetterMetric {
    xoffset:number,
    yoffset:number,
    xadvance:number,
    kerning:Record<string, number>,
}

export class SpriteSheetFontLetter {
    public readonly xadvance:number = 0;
    constructor(
        public readonly frame:SpriteSheetFrame,
        public readonly metrics?:SpriteSheetFontLetterMetric,
    ) {
        this.xadvance = metrics ?
            metrics.xadvance :
            frame.sourceRect.width
    }
}

export class SpriteSheetFont {
    constructor(
        public readonly letter: Record<string, SpriteSheetFontLetter>,
    ) {
    }

    /**
     * Use to create manually fonts from a texture.
     *
     * letters = {
     *     "a": [x, y, width, height, pivotX, pivotY],
     *     "b": [x, y, width, height],
     * }
     */
    static createFromTexture(
        tex:ManagedTexture,
        letters:Record<string, number[]>
    ):SpriteSheetFont {
        const letterFrames:Record<string, SpriteSheetFontLetter> = {};
         Object.keys(letters).forEach(letterName => {
            const rect = letters[letterName];
            const frame = new SpriteSheetFrame(
                tex,
                new Rect(rect[0], rect[1], rect[2], rect[3]),
                new Vector2(rect[4]||0, rect[5]||0),
                SpriteSheetFrameOrigin.RUNTIME,
                new Rect(rect[0], rect[1], rect[2], rect[3]),
                new Vector2(rect[4]||0, rect[5]||0),
            )
            letterFrames[letterName] = new SpriteSheetFontLetter(frame);
        })
        const font = new SpriteSheetFont(letterFrames);
        return font;
    }
}

export class SpriteSheetAnimation {
    constructor(
        public readonly frames: SpriteSheetFrame[],
        public readonly duration: number[],
        public readonly name: string,
        public readonly loop:boolean,
        public readonly next: string | null,
        public readonly speed: number = 1,
    ) {
    }
}

export class SpriteSheetAnimationGroup {
    constructor(
        public readonly animations:Record<string, SpriteSheetAnimation>,
    ) {
    }
}



// ---------------------------------------------------------------------------------------------------------------------


const _texRect_X = 0;
const _texRect_Y = 1;
const _texRect_W = 2;
const _texRect_H = 3;
const _texRect_PX = 4;
const _texRect_PY = 5;
const _texRect_TEX_ID = 6;

function modelRectToRect(modelRect:number[]):Rect {
    return new Rect(
        modelRect[_texRect_X],
        modelRect[_texRect_Y],
        modelRect[_texRect_W],
        modelRect[_texRect_H]
    )
}

function modelPivotToVector(modelRect:number[]):Vector2 {
    return new Vector2(
        modelRect[_texRect_PX],
        modelRect[_texRect_PY]
    )
}

const _9p_X = 0;
const _9p_Y = 1;
const _9p_W = 2;
const _9p_H = 3;
const _9p_FRAME_ID = 4;






















