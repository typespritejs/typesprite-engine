/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 * Does this:
 *
 * splitTrimmed(" a; b; c; d; ", ";")
 *  => ["a", "b", "c", "d"]
 *
 * splitTrimmed(" a; b; c; d; ", ";", true)
 *  => ["a", "b", "c", "d", ""]
 *
 * splitTrimmed(" a; b; c; d; ", ";", true, 2)
 *  => ["a", "b; c; d;"]
 *
 */
export function splitTrimmed(inn:string, divider:string, includeAlways:boolean = false, maxParts:number = -1):string[] {
    let count = 0;
    const res = [];
    while(true) {
        count++;
        if (maxParts > 0 && count >= maxParts) {
            res.push(inn.trim());
            break;
        }

        const pos = inn.indexOf(divider);
        if (pos == -1) {
            if (res.length > 0 || includeAlways) {
                res.push(inn.trim());
            }
            break;
        }
        res.push(inn.substring(0, pos));
        inn = inn.substring(pos + 1);
    }
    return res;
}

