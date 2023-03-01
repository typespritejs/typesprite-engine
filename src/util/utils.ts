/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

export function isArray(e:any):boolean {
    return Array.isArray(e);
}

export function doLater(what:() => void) {
    setTimeout(() => what(), 0);
}

export function isFunction(candidate:any) {
    return typeof candidate === "function";
}

export function isString(candidate:any) {
    return typeof candidate === "string";
}

export function isPromise(candidate:any) {
    return candidate && typeof candidate === 'object' && typeof candidate.then === 'function'
}

export function arrayContains<T>(bag:T[], candidate:T):boolean {
    for (let i=0; i<bag.length; i++) {
        if (bag[i] == candidate)
            return true;
    }
    return false;
}

export function cloneDeep(a:any):any {



    // FIX here
    throw new Error("TODO replace _.cloneDeep")
    // return _.cloneDeep(a);
}