/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import * as path from 'node:path';
import { unlink, copyFile } from 'node:fs/promises';
import {checkForFile, fileExists, readFileIfExists, readJson} from '../utils/files.js';


export async function parseGamePackage(gameDir) {
    const gamePackageJsonPath = path.join(gameDir, 'package.json');
    try {
        const gamePackageJson = await readJson(gamePackageJsonPath);
        return gamePackageJson;
    }
    catch(err) {
        console.error("game/package.json not loaded.", err);
    }
    return;
}

async function importFresh(modulePath) {



    const prefix = process.platform === "win32" ? "file://" : "";
    const cacheBustingModulePath = `${prefix}${modulePath}?update=${Date.now()}`
    return (await import(cacheBustingModulePath))
}

/**
 * 
 * @param {string} command 
 * @param {string} gameDir 
 * @param {string} engineDir 
 * @returns {{gameDir:string, engineDir:string, command:string, gamePackageJson:Record<string, any>, gameConfig:TypeSpriteServiceConfig}}
 */
export async function parseGameConfig(command, gameDir, engineDir) {
    const jsFile = 'typesprite.config.js';
    const mjsFile = 'typesprite.config.mjs';
    const jsExist = await fileExists(path.join(gameDir, jsFile));
    const mjsExist = await fileExists(path.join(gameDir, mjsFile));
    
    let config = {};
    const runContext = {
        gameDir,
        engineDir: engineDir,
        command: command,
        gameConfig: {}
    };

    let tempFile = null;
    try {
        let mjsPath = path.join(gameDir, mjsFile);
        if (!mjsExist && jsExist) {

            console.warn("❌ typesprite.config.js must be named typesprite.config.mjs to be recognized and work properly with tools like node-dev.");

            // tempFile = path.join(gameDir, jsFile + "__NODE_HACK_TEMP.mjs");
            // if (await fileExists(tempFile)) {
            //     await unlink(tempFile);
            // }
            // await copyFile(path.join(gameDir, jsFile), tempFile);
            // mjsPath = tempFile;
        }

        if (!await fileExists(mjsPath)) {
            console.log("SEARCHED", mjsPath);
            console.log("👀 typesprite.config.mjs not found.");
        }
        else {
            const nsObj = await importFresh(mjsPath);
            const configDef = nsObj.default;
            const gameConfig = typeof configDef == "function" 
                ? configDef({command, })
                : configDef;

            if (!gameConfig) {
                console.log("❌ typesprite.config.mjs seems to be empty");
            }
            else {
                console.log("🆗️ typesprite.config.mjs");
                // console.log(gameConfig);
                config = gameConfig;
            }
        }
    }
    catch(err) {
        console.error(err);
    }
    finally {
        try {
            if (tempFile)
                await unlink(tempFile);
        }
        catch(err) {
        }
    }

    if (!config.assetPaths || config.assetPaths.length == 0)
        config.assetPaths = ["game", "assets"];

    const gamePackageJsonPath = path.join(runContext.gameDir, 'package.json');
    try {
        const gamePackageJson = await readJson(gamePackageJsonPath);
        runContext.gamePackageJson = gamePackageJson;
    }
    catch(err) {
        throw new Error(`Cannot load package.json from game. Reason: ${err.message}. Try to read '${pgamePackageJsonPathath}'`);
    }
    
    runContext.gameConfig = config;
    return runContext;
}
