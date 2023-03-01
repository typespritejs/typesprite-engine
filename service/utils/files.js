/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import * as path from 'node:path';
import {readdir, stat, readFile} from 'node:fs/promises'



async function readAllDirectoriesIntern(rootDir, allDirs, allFiles, dirIgnorePatter, fileIgnorePattern) {
    const rootDirs = [...(Array.isArray(rootDir) ? rootDir : [rootDir] )];
    for (let rootDir of rootDirs) {
        allDirs.push(rootDir);
        const subDirs = [];
        const files = await readdir(rootDir)
        for (const file of files) {
            const elementPath = path.join(rootDir, file);
            const fileStat = await stat(elementPath);
            if (fileStat) {
                if (fileStat.isDirectory()) {
                    if (!dirIgnorePatter || !dirIgnorePatter.exec(file))
                        subDirs.push(elementPath)
                }
                else if (fileStat.isFile() && Array.isArray(allFiles)) {
                    if (!fileIgnorePattern || !fileIgnorePattern.exec(file)) {
                        allFiles.push(elementPath)
                    }
                }
            }
        }
        await readAllDirectoriesIntern(subDirs, allDirs, allFiles, dirIgnorePatter, fileIgnorePattern)
    }
}

export async function readAllDirectories(rootDir, ignorePatter = null) {
    const out = [];
    await readAllDirectoriesIntern(rootDir, out, null, ignorePatter, null);
    return out;
}

export async function readAllDirectoriesAndFiles(rootDir, dirIgnorePatter = null, fileIgnorePattern = null) {
    const files = [];
    const dirs = [];
    await readAllDirectoriesIntern(rootDir, dirs, files, dirIgnorePatter, fileIgnorePattern);
    return {
        /** @type string[] */
        dirs,
        /** @type string[] */
        files
    }
}

export async function readJson(path) {
    const data = await readFile(path, {encoding: "utf-8"});
    const json = JSON.parse(data);
    return json;
}

export async function readFileIfExists(path) {
    try {
        const data = await readFile(path, {encoding: "utf-8"});
        return data;
    }
    catch(e) {
        return null;
    }
}

export async function fileExists(path) {
    try {
        const statInfo = await stat(path);
        if (statInfo.isFile())
            return true;
    }
    catch(e) {
    }
    return false;
}

export async function dirExists(path) {
    try {
        const statInfo = await stat(path);
        if (statInfo.isDirectory())
            return true;
    }
    catch(e) {
    }
    return false;
}


/**
 * 
 * 
 * @param {string[]} files 
 * @returns {string|null}
 */
export async function checkForFile(files) {
    for (const f of files) {
        if (await fileExists(f))
            return f;
    }
    return null;
}