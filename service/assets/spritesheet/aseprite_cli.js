/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {run} from './cli.js';


/**
 * @param verStr string
 * @returns {null|{app: string, main: number, mid: number, min: (number|string)}}
 */
export function parseVersion(verStr) {
    const result = /^(?<app>\w*)\s(?<main>\d+)\.(?<mid>\d+)(?:\.(?<min>\d+)|-(?<min2>\w+))(-(?<arch>\w+))?$/.exec(verStr.trim());
    if (!result)
        return null;
    return {
        app: `${result.groups["app"]}`,
        main: Number(result.groups["main"]),
        mid: Number(result.groups["mid"]),
        min: result.groups["min"] ? Number(result.groups["min"]) : `${result.groups["min2"]}`,
    }
}

export function ensureVersionString(verStr) {
    const ver = parseVersion(verStr);
    if (!ver) {
        throw new Error("CheckVersion(): Unknown Application: " + verStr + " => " + JSON.stringify(ver));
    }
    const {app, main, mid} = ver;
    if (app.toLowerCase() != "aseprite")
        throw new Error("CheckVersion(): Unknown Application: " + app + " of " + verStr);

    let versionOkay = (
        (main >= 1 && mid >= 2) || main > 1
    );

    if (!versionOkay)
        throw new Error("CheckVersion(): Need at least: 1.29. Found: " + verStr);
}


export async function ensureVersion(asepriteBin) {
    const verStr = await run([asepriteBin, '--version']);
    ensureVersionString(verStr);
}

