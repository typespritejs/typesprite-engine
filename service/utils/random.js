/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 *
 */
export function randomName() {
    const timestamp = new Date().toISOString().replace(/[-:.]/g,"");
    const random = ("" + Math.random()).substring(2, 8);
    const random_number = timestamp+random;
    return random_number;
}

export function makeUUID() {
    // if we have crypto stuff: let's use that
    if (typeof crypto.getRandomValues == 'function') {
        // @ts-ignore:
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
            return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
        });
    }
    else {
        console.error("🔥 UUID based on Math.random()!")
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}