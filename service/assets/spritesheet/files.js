/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import path from 'node:path';
import fs from 'node:fs/promises';

export async function readJsonIfExists(path) {
    try {
        return await readJson(path);
    }
    catch(err) {
        return false;
    }
}

export async function unlinkIfExists(path) {
    try {
        await fs.unlink(path);
    }
    catch (err) {

    }
}

export async function checkModifiedSinceLastTurn(sourceFile, cacheFilePath)  {
    const sourceFileStat = await fs.stat(sourceFile);

    let cachedMod = 0;
    try {
        const jsonStr = await fs.readFile(cacheFilePath, {encoding: "utf-8"});
        const cache = JSON.parse(jsonStr);
        cachedMod = cache.mtimeMs || 0;
    }
    catch(err) {
    }

    return cachedMod !== sourceFileStat.mtimeMs;
}

export async function touchModifiedSinceLastTurn(sourceFile, cacheFilePath) {
    const sourceFileStat = await fs.stat(sourceFile);
    const cache = {
        mtimeMs: sourceFileStat.mtimeMs,
    }
    try {
        await fs.writeFile(cacheFilePath, JSON.stringify(cache), {encoding: "utf-8"});
    }
    catch(err) {
        throw new Error("cannot write cache file: " + cacheFilePath + " reason:" + err);
    }
}

export async function readJson(path) {
    const jsonStr = await fs.readFile(path, {encoding: "utf-8"});
    return JSON.parse(jsonStr);
}

export async function writeJson(path, json) {
    const jsonStr = typeof json === "string" ? json : JSON.stringify(json, null, 2);
    await fs.writeFile(path, jsonStr, {encoding: "utf-8"});
}

/**
 * some/path/karenfat.font.aseprite => {
 *     name: karenfat,
 *     type: font,
 *     fileType: aseprite
 *     issue: false
 * }
 *
 * @param filePath
 * @returns {{issue: string|boolean, name: string, type: string, fileType: string}}
 */
export function parseFilePattern(filePath) {

    const file = path.basename(filePath);
    const parts = file.split('.');
    const name = parts[0];
    const type = (parts[2] ? parts[1] : "slices");
    const fileType = parts[2] ? parts[2] : parts[1];

    // allows json combinations
    let knownJson = false;
    if (fileType.toLowerCase() == "json") {

        switch (type) {
            case "filtercopy":
            case "pentacom":
            case "msdf":
                knownJson = true;
                break;
            default:
                knownJson = false;
        }
    }

    if (fileType.toLowerCase() !== "ase" &&
        fileType.toLowerCase() !== "aseprite" &&
        fileType.toLowerCase() !== "fnt" &&
        // fileType.toLowerCase() !== "ttf" &&
        !knownJson) {
        return {
            name,
            type,
            fileType,
            issue: "FOREIGN_FILE_TYPE"
        };
    }

    const ignore = (
        name.startsWith("_") || name.endsWith("_")
        || type.startsWith("_") || type.endsWith("_")
    );
    if (ignore) return {
        name,
        type,
        fileType,
        issue: "IGNORE_PATTERN"
    }

    if (fileType == "ase" || fileType == "aseprite") {
        switch(type) {
            case "slices":
            case "font":
            case "anim":
            case "single":
                break;
            default: return {
                name,
                type,
                fileType,
                issue: "UNKNOWN_TYPE"
            }
        }
    }
    else if (fileType == "fnt") {
        return {
            name,
            type: "fnt",
            fileType,
            issue: false
        }
    }
    // else if (fileType == "ttf") {
    //     switch(type) {
    //         case "msdf":
    //             break;
    //         default:
    //             return {
    //                 name,
    //                 type,
    //                 fileType,
    //                 issue: "UNKNOWN_TYPE"
    //             }
    //     }
    // }
    else if (fileType == "json") {
        switch(type) {
            case "filtercopy":
            case "pentacom":
            case "msdf":
                break;
            default:
                return {
                    name,
                    type,
                    fileType,
                    issue: "UNKNOWN_TYPE"
                }
        }
    }

    return {
        name,
        type,
        fileType,
        issue: false
    }
}