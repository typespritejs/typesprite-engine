/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Align, alignSubRect, LUIBorder} from "./LayoutUI";
import {SpriteSheet, SpriteSheetFont, SpriteSheetFontLetter, SpriteSheetFrame} from "@tsjs/engine/tt2d/SpriteSheet";
import {Color} from "@tsjs/engine/tt2d/Color";
import {parseSchnackFormat} from "@tsjs/engine/schnack/SchnackFormatParser";


/**
 * A TextBox is designed to do _A PART_ of the common text rendering
 * task. This class holds all relevant data and also performs
 * the layouting of the single letters for a text box.
 *
 * It is possible to set a MaxWidth and have a "boxed" aware
 * layout of the text. Combined with x-alignment this
 * takes care of all the relevant properties of the letter layout.
 *
 * Each letter position is stored in a "cleverished" cache that
 * defines where exactly each letter is placed.
 *
 * All values are in local space. So one cannot
 *
 * Text rendering is not part of this object.
 *
 * ** Example:
 *
 * text: "Hello I am a Text\nwith two lines"
 * alignX: right
 * maxWidth: 60
 *
 * -----------------------
 * |  -------------------|
 * |  |Hello I am a Text||
 * |  |   with two lines||
 * |  -------------------|
 * -----------------------
 *
 * ** Example:
 *
 * text: "Hello I am a Text\nwith two lines"
 * alignX: left
 * maxWidth: 60
 *
 * -----------------------
 * |-------------------  |
 * ||Hello I am a Text|  |
 * ||with two lines   |  |
 * |-------------------  |
 * -----------------------
 *
 * ** Example:
 *
 * text: "Hello I am a Text\nwith two lines"
 * alignX: center
 * maxWidth: 60
 *
 * -----------------------
 * | ------------------- |
 * | |Hello I am a Text| |
 * | | with two lines  | |
 * | ------------------- |
 * -----------------------
 */
export class LUITextBox {


    private text:string = "";
    private alignX:Align = Align.Center;
    private alignY:Align = Align.Center;

    // private sheet:SpriteSheet;

    private letterSpacing:number = 0;
    private dirty:number = 1;
    private maxWidth:number = Number.MAX_VALUE;
    private letters:LetterDesc[] = [];
    private definedLetters:number = 0;
    private renderedTextSize:LUIBorder = new LUIBorder();

    // private sheetFontName:string = null;
    // private sheetFont:any = null;

    private lineHeightFactor:number = 1;
    private textWrap:TextWrapMode = TextWrapMode.None;
    private lines:LineMeta[] = [];
    private letterColorLookUp:Color[] = [];
    private namedColors:Record<string, Color>;
    private font:SpriteSheetFont = null;

    public wait:boolean = false;


    public LUITextBox() {
    }

    public get updateId():number {
        return this.dirty;
    }

    public setFont(font:SpriteSheetFont|SpriteSheet, fontName?:string):LUITextBox {
        if (this.font === font) {
            return;
        }
        if (fontName) {
            font = (font as SpriteSheet).fonts[fontName];
            if (!font) {
                console.error(`LUITextBox.setFont() font not found: ${fontName}`);
                return;
            }
        }
        else {
            font = font as SpriteSheetFont;
        }

        if (!font) {
            console.error(`LUITextBox.setFont() should not be falsy`);
            return;
        }
        if (!font.letter) {
            console.error(`LUITextBox.setFont() failed. Given object has no letters!`);
            return;
        }

        this.font = font;
        this.dirty++;
        return this;
    }

    public getLines():LineMeta[] {
        return this.lines;
    }

    public setLineHeightFactor(v:number):LUITextBox {
        this.lineHeightFactor = v;
        this.dirty++;
        return this;
    }

    public getLineHeightFactor():number {
        return this.lineHeightFactor;
    }

    /**
     * Returns the left, top, right and buttom
     * values of the text in local pixel space.
     */
    public getTextBorder():LUIBorder {
        return this.renderedTextSize;
    }

    // public getSpriteSheet():SpriteSheet {
    //     return this.sheet;
    // }

    // public setSpriteSheet(v:SpriteSheet):LUITextBox {
    //     if (v == this.sheet)
    //         return this;
    //     this.dirty++;
    //     this.sheet = v;
    //     return this;
    // }

    public setTextWrap(v:TextWrapMode):LUITextBox {
        if (v == this.textWrap)
            return this;
        this.dirty++;
        this.textWrap = v;
        return this;
    }

    public getTextWrap():TextWrapMode {
        return this.textWrap;
    }

    public setText(v:string):LUITextBox {
        if (v == this.text)
            return this;
        if (v === null)
            throw new Error(`Text must never be null`);
        this.dirty++;
        this.text = v;
        return this;
    }

    public getText():string {
        return this.text;
    }

    public setNamedColor(name:string, color:Color) {
        this.namedColors = this.namedColors || {};
        this.namedColors[name] = color;
    }

    public unsetNamedColor(name) {
        if (this.namedColors)
            delete this.namedColors[name];
    }

    /**
     * Use like this:
     * ```
     * box.setColoredText("MainColor, {#f00:Red {#ff0:Yellow}, Red Again} MainColor {#444:Gray!}")
     * ```
     *
     * It is also possible to set "named" colors:
     * ```
     * box.setNamedColor("item", Color.fromHash("#ff0"));
     * ```
     *
     */
    public setColoredText(v:string):void {
        this.namedColors = this.namedColors||{};
        this.letterColorLookUp = [];
        const directColorMap = {}; // {#f00: new Color(...), #ff0: new Color(...)}
        const modList = [];
        const handle = (typ, symbol, stack, raw, rawIndex) => {
            const last = stack[stack.length-1];
            if (typ == "start") {
                let col = this.namedColors[symbol] || directColorMap[symbol];
                if (!col && symbol && symbol.startsWith("#")) {
                    col = Color.fromHash(symbol);
                    directColorMap[symbol] = col;
                }
                modList.push([col, rawIndex])
            }
            else if (typ == "end") {
                let col = this.namedColors[last] || directColorMap[last];
                if (!col && typeof last == "string" && last.startsWith("#")) {
                    col = Color.fromHash(last);
                    directColorMap[last] = col;
                }
                modList.push([col, rawIndex])
            }
        };
        const result = parseSchnackFormat(v, handle);
        for (let i=1; i<modList.length; i++) {
            const curr = modList[i-1];
            const next = modList[i];
            for (let t=curr[1]; t<next[1]; t++) {
                this.letterColorLookUp[t] = curr[0];
            }
        }
        this.setText(result);
    }

    public setAlignX(v:Align):LUITextBox {
        if (v == this.alignX)
            return this;
        this.dirty++;
        this.alignX = v;
        return this;
    }

    public getAlignX():Align {
        return this.alignX;
    }

    /**
     * Changing this will not change the layout.
     * The renderer needs to read this value
     * and make sure to handle this.
     * @param v
     */
    public setAlignY(v:Align):LUITextBox {
        this.alignY = v;
        return this;
    }

    public getAlignY():Align {
        return this.alignY;
    }

    public setLetterSpacing(v:number):LUITextBox {
        if (v == this.letterSpacing)
            return this;
        this.letterSpacing = v;
        this.dirty++;
        return this;
    }

    public getLetterSpacing():number {
        return this.letterSpacing;
    }

    public setMaxWidth(v:number):LUITextBox {
        if (v == this.maxWidth)
            return this;
        this.maxWidth = v;
        this.dirty++; // TODO optimize here by only do this when really needed (maxWidth must be set or text needs to have new lines)
        return this;
    }

    public getMaxWidth():number {
        return this.maxWidth;
    }

    private _ensureLetterSpace(num:number) {
        if (this.letters.length < num) {
            const newNum = num + 10;
            for (let i=this.letters.length; i<newNum; i++) {
                this.letters.push(new LetterDesc());
            }
        }
    }

    public getLetterCount():number {
        return this.definedLetters;
    }

    public getFont():SpriteSheetFont {
        return this.font;
    }

    public getLetterByIndex(i:number):LetterDesc {
        if (i >= this.definedLetters)
            throw new Error("Out of Bounds!");

        return this.letters[i];
    }

    /**
     * Call this before rendering to make sure the letters
     * are in place.
     */
    public ensureLayout():void {
        if (this.dirty <= 0)
            return;
        this.dirty = 0;

        let x=0;
        let y=0;
        // const ss = this.sheet;
        this.definedLetters = 0;
        this.renderedTextSize.setAll(0);

        if (!this.font || this.text.length == 0) { // nothing to do here
            return;
        }

        const hasSpace = !!this.getFrame(" ");
        const spaceW = this.getSpaceWidth();
        const lineH = this.getLineHeight()*this.lineHeightFactor;

        let left = Number.MAX_VALUE;
        let right = Number.MIN_VALUE;
        let top = Number.MAX_VALUE;
        let bottom = Number.MIN_VALUE;

        let lineLetters:number = 0;
        this.lines = [];
        let lineLeft = Number.MAX_VALUE;
        let lineRight = Number.MIN_VALUE;
        let lineTop = Number.MAX_VALUE;
        let lineBottom = Number.MIN_VALUE;

        let numLines = 1;
        let lineStartIndex = 0;
        this._ensureLetterSpace(this.text.length);

        const l = this.text.length;
        let wrapNewLine = false;
        let wrapCountInARow = 0;
        let oneTimeLetterWrap = false;
        let sanity = 5000;
        for(let i = 0; i < l; i++) {
            if (sanity-- < 0) {
                console.error("LUITextBox::ensureLayout() layout-overflow for text:", this.text);
                break;
            }
            const character = this.text.charAt(i);
            let newLine = false;
            if (character == " " && !hasSpace) {
                x += spaceW;
                continue;
            } else if (character=="\n" || character=="\r") {
                if (character=="\r" && this.text.charAt(i+1) == "\n") { // crlf
                    i++;
                }
                newLine = true;
            }
            else if (wrapNewLine) {
                newLine = true;
                wrapCountInARow++;
            }


            if (newLine) {
                x = 0;
                y += character=="\r" ? lineH*1.5:lineH*1;
                numLines++;

                const lm = new LineMeta();
                this.lines.push(lm)
                lm.definedLetters = lineLetters;
                if (lineLetters > 0) {
                    lm.renderedTextSize = new LUIBorder();
                    lm.renderedTextSize.setLeft(lineLeft);
                    lm.renderedTextSize.setTop(lineTop);
                    lm.renderedTextSize.setRight(lineRight);
                    lm.renderedTextSize.setBottom(lineH);
                    lm.startLetterIndex = lineStartIndex;
                }

                lineLeft = Number.MAX_VALUE;
                lineRight = Number.MIN_VALUE;
                lineTop = Number.MAX_VALUE;
                lineBottom = Number.MIN_VALUE;
                lineLetters = 0;
                lineStartIndex = this.definedLetters;

                if (wrapNewLine) {
                    wrapNewLine = false;
                }
                else {
                    continue;
                }
            }

            // const index = this.getFrameIndex(character, ss);

            const letterObj = this.getFontLetter(character);
            const letterFrame = letterObj?.frame;
            if (!letterFrame) {
                // TODO
                //  Hier sollte ein "Platzhalterzeichen" gerendert werden!
                continue;
            }
            // WordWrap support
            if (this.textWrap == TextWrapMode.Letter || oneTimeLetterWrap) {
                if (wrapCountInARow <= 0 &&
                    x + letterFrame.rect.width >= this.maxWidth) {
                    oneTimeLetterWrap = false;
                    i--;
                    wrapNewLine = true;
                    continue;
                }
            }
            else if (this.textWrap == TextWrapMode.FullWord) {
                let wordFits = true;
                let xx = x;
                let i2 = i;
                for (i2=i; i2<l; i2++) {
                    const localCharacter = this.text.charAt(i2);
                    if (localCharacter == " "
                        || localCharacter == "\n"
                        || localCharacter == "\r") {
                        break;
                    }

                    // const localIndex = this.getFrameIndex(localCharacter, ss);
                    // if (localIndex == null)
                    //     continue;
                    // const localLetterFrame = ss.getFrame(localIndex);
                    // const localLetterFrame = this.getFrame(localCharacter);
                    const localLetterFrame = this.getFontLetter(localCharacter);
                    if (!localLetterFrame)
                        continue;
                    if ( xx + localLetterFrame.xadvance >= this.maxWidth) {
                        wordFits = false;
                        // wrapNewLine = true;
                        break;
                    }
                    xx += localLetterFrame.xadvance + this.letterSpacing;
                }

                if (!wordFits) {
                    if (lineLetters == 0) {
                        oneTimeLetterWrap = true;
                    }
                    else if (wrapCountInARow == 0) {
                        i--;
                        wrapNewLine = true;
                        continue;
                    }
                }
            }

            const dl = this.definedLetters++;
            const letter = this.letters[dl]
            lineLetters++;
            letter.char = character;
            letter.x = x - letterFrame.texturePivot.x;
            letter.y = y - letterFrame.texturePivot.y;
            // letter.frameIndex = index;
            letter.charFrame = letterFrame;
            letter.color = this.letterColorLookUp ? this.letterColorLookUp[i] : null;
            wrapCountInARow = 0;

            if (letter.x < left)
                left = letter.x;
            if (letter.x + letterFrame.sourceRect.width > right)
                right = letter.x + letterFrame.sourceRect.width;
            if (letter.y < top)
                top = letter.y;
            if (letter.y + letterFrame.sourceRect.height > bottom)
                bottom = letter.y + letterFrame.sourceRect.height;

            if (letter.x < lineLeft)
                lineLeft = letter.x;
            if (letter.x + letterFrame.sourceRect.width > lineRight)
                lineRight = letter.x + letterFrame.sourceRect.width;
            if (letter.y < lineTop)
                lineTop = letter.y;
            if (letter.y + letterFrame.sourceRect.height > lineBottom)
                lineBottom = letter.y + letterFrame.sourceRect.height;

            x  += letterObj.xadvance + this.letterSpacing;
        }

        if (this.definedLetters > 0) {
            this.renderedTextSize.setLeft(left);
            this.renderedTextSize.setTop(0);
            // this.renderedTextSize.setTop(top);
            this.renderedTextSize.setRight(right);
            this.renderedTextSize.setBottom(lineH*numLines);
        }

        if (lineLetters > 0) {
            const lm = new LineMeta();
            this.lines.push(lm)
            lm.definedLetters = lineLetters;

            lm.renderedTextSize = new LUIBorder();
            lm.renderedTextSize.setLeft(lineLeft);
            lm.renderedTextSize.setTop(lineTop);
            lm.renderedTextSize.setRight(lineRight);
            lm.renderedTextSize.setBottom(lineH);
            lm.startLetterIndex = lineStartIndex;
        }

        // if (this.wait)
        //     debugger;

    }


    // private getFrameIndex(character, spriteSheet):number {
    //     if (this.sheetFontName) {
    //         if (!this.sheetFont) {
    //             this.sheetFont = this.sheet ? this.sheet.fonts[this.sheetFontName] : null;
    //             if (!this.sheetFont) {
    //                 console.error(`Cannot find font: ${this.sheetFontName}. Available Fonts:`, this.sheet.fonts);
    //             }
    //         }
    //         const fontLetters = this.sheetFont;
    //         if (!fontLetters)
    //             return;
    //         const mappedChar = fontLetters[character];
    //         return this.getFrameIndexIntern(mappedChar ? mappedChar : character , spriteSheet);
    //     }
    //     else {
    //         return this.getFrameIndexIntern(character, spriteSheet);
    //     }
    // }
    //
    // private getFrameIndexIntern(character, spriteSheet):number {
    //     let c, o = spriteSheet.getAnimation(character);
    //     if (!o) {
    //         (character != (c = character.toUpperCase())) || (character != (c = character.toLowerCase())) || (c=null);
    //         if (c) { o = spriteSheet.getAnimation(c); }
    //     }
    //     return o && o.frames[0];
    // }

    private getFrame(character:string):SpriteSheetFrame {
        return this.font.letter[character] ? this.font.letter[character].frame : null;
    }

    private getFontLetter(character:string):SpriteSheetFontLetter {
        return this.font.letter[character];
    }

    private getAnyFrame():SpriteSheetFrame {
        const k = Object.keys(this.font.letter)[0];
        return this.font.letter[k].frame;
    }

    private getLineHeight():number {
        const frame = this.getFrame("1") || this.getFrame("T") || this.getFrame("L") ||  this.getAnyFrame();
        return frame ? frame.rect.height : 1;
    }

    private getSpaceWidth():number {
        const frame = this.getFrame("1") || this.getFrame("l") || this.getFrame("e") || this.getFrame("a") || this.getAnyFrame();
        return frame ? frame.rect.width : 1;
    }

}

export class LetterDesc {
    public char:string;
    public x:number;
    public y:number;
    // public frameIndex:number;
    public color:Color = null;
    public charFrame:SpriteSheetFrame;
}

export enum TextWrapMode {
    /** No wrapping performed. Only \n and \r line breaks */
    None,
    /**
     * Breaks on Spaces but never on words (plus: \n and \r). EXCEPTION: if a single word is bigger than the box
     * the word will break (like Letter).
     **/
    FullWord,
    /** Breaks everywhere (plus: \n and \r) */
    Letter,
}

export class LineMeta {
    /** number of actual letters in that line */
    public definedLetters:number = 0;
    /** offset in the global letter-array for this array */
    public startLetterIndex:number = 0;
    public renderedTextSize:LUIBorder;

    public get empty():boolean {
        return this.definedLetters <= 0;
    }
}
