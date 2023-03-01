/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


const STATE_TEXT = 0;
const STATE_SYMBOL = 1;


/**
 * @see SchnackInterpreter
 */
export enum SchnackFormatEvent {
    START = "start",
    END = "end",
    ERR = "error",
}


/**
 * Can parse this:
 *
 * 111{a:222{b:333}444}555
 *     ^     ^
 *     |     second symbol: "b"
 *     first Symbol: "a"
 *
 * NOTE: Potentially puts heavy load on GC
 *
 * const cb = (typ, symbol, stack, raw, rawIndex) => {
 *      console.log(typ, symbol, stack, raw, rawIndex);
 * }
 * const txt = parse("a{b:xxx{c:yyy}zzz}", cb);
 * console.log(txt);
 *
 * // output:
 * > start b [ 'b' ] a 1
 * > start c [ 'b', 'c' ] axxx 4
 * > end c [ 'b' ] axxxyyy 7
 * > end b [] axxxyyyzzz 10
 * > axxxyyyzzz
 *
 */
export function parseSchnackFormat(formatedText, callback) {
    let state = STATE_TEXT;
    const symbolStack = [];
    let symbol = "";
    let rawCharIndex = 0;
    let rawText = "";

    for (let i=0; i<formatedText.length; i++) {
        const c = formatedText[i];

        if (state == STATE_SYMBOL) {
            if (c == ':') {
                state = STATE_TEXT;
                symbolStack.push(symbol);
                if (callback)
                    callback(SchnackFormatEvent.START, symbol, symbolStack, rawText, rawCharIndex);
            }
            else {
                symbol += c;
                continue;
            }
        }
        else if (state == STATE_TEXT) {
            if (c == '{' && (i == 0 || formatedText[i - 1] != '\\')) {
                state = STATE_SYMBOL;
                symbol = "";
                continue;
            }
            else if (c == '}' && (i == 0 || formatedText[i - 1] != '\\')) {
                if (symbolStack.length == 0) {
                    if (callback)
                        callback(SchnackFormatEvent.ERR, null, symbolStack, rawText, rawCharIndex);
                }
                else {
                    const popSym = symbolStack.pop();
                    if (callback)
                        callback(SchnackFormatEvent.END, popSym, symbolStack, rawText, rawCharIndex);
                }
            }
            else {

                if (c == '\\') {
                    if (i + 1 < formatedText.length && formatedText[i + 1] != '\\') {
                        // wee want to keep the
                    }
                    else {
                        continue;
                    }
                }

                rawText += c;
                rawCharIndex++;
            }
        }
    }
    return rawText;
}











