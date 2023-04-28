/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import fs  from 'node:fs/promises';
import path  from 'node:path';
import {ensureVersion}  from './aseprite_cli.js';
import {parseFilePattern, checkModifiedSinceLastTurn, touchModifiedSinceLastTurn, writeJson, readJsonIfExists,
    unlinkIfExists
}  from './files.js';
import {run}  from "./cli.js";
import {SpriteComposeModel}  from "./model.js";
import {bakeModel}  from "./spriteBaker.js";
import {composeSingle}  from "./spriteComposeSingle.js";
import {composeSlices}  from "./spriteComposeSlices.js";
import {composeAnim}  from "./spriteComposeAnim.js";
import {composeFNTFonts}  from "./spriteComposeFNT.js";
import {spriteComposeMSDF}  from "./spriteComposeMSDF.js";
import {composeFonts, composePentacomFonts}  from "./spriteComposeFont.js";
import Jimp  from "jimp";
import {copyAndFilter}  from "./copyAndFilter.js";
import {fileExists} from "../../utils/files.js";
// import generateBMFont  from 'msdf-bmfont-xml';



/**
 * Scans given directory for *.ase files and generates
 * a sprite-sheet out of it.
 *
 * sheetPath: /my/path/sheets/main
 * dir:
 *   /my/path/sheets/main
 *     - a.ase
 *     - b.ase
 *
 * =>
 *   main.json + main0.png + main1.png
 *
 */
export async function buildSingleSheet(sheetPath, cacheDir, asepriteBin) {
    asepriteBin = process.platform === 'win32' ? `"${asepriteBin}"` : asepriteBin;

    // await ensureVersion(asepriteBin);
    const files = await fs.readdir(sheetPath);
    if (files.length === 0) {
        return null;
    }

    // /my/path/sheets/main => sheets
    const sheetDirName = path.basename(path.dirname(sheetPath))
    // /my/path/sheets/main => main
    const sheetName = path.basename(sheetPath)
    // /my/cache/sheets/main
    const sheetCache = path.join(cacheDir, sheetDirName, sheetName)
    await fs.mkdir(sheetCache, { recursive: true});
    const fileCacheDir = `${cacheDir}/${sheetDirName}/${sheetName}`

    // dirty file
    //
    // If a sub-image (*.ase) file changed an we exported a some PNGs + JSON out of it
    // we could simply set the variable compositionDirty = true. However,
    // in an event where the composition afterwards fails, the modification would remain
    // unnoticed in the next run. Therefor we need to make the dirty state persistent
    // in such cases.
    const dirtyFilePath = `${fileCacheDir}/dirty.txt`;
    const compositionJobs = [];

    // config.json
    // It's an optional file that defines options like: sheet-width, trimming etc.
    // If it changed, we need to flag the composition as dirty
    const configFilePath = path.join(path.dirname(sheetPath), `${sheetName}.sheet.json`)
    const configFileModPath = path.join(fileCacheDir, "sheet.json.mod-cache")
    const userConfig = await readJsonIfExists(configFilePath);
    const configExists = userConfig !== false;
    if (configExists) {
        // flag dirty when config has changed
        const wasChanged = await checkModifiedSinceLastTurn(configFilePath, configFileModPath);
        if (wasChanged) {
            await fs.writeFile(dirtyFilePath, "yes");
        }
    }
    else {
        throw new Error(`Failed to open: '${configFilePath}'.`);
    }
    const config = { // default config
        width: userConfig.width || 2048,
        height: userConfig.height || 2048,
        trim: userConfig.trim === false ? false : true,
        alwaysCompose: userConfig.alwaysCompose === true ? true : false,
    }

    // detect copy-workload
    const copyWork = {};
    const copyChanged = {};
    for (const file of files) {
        const candidate = path.join(sheetPath, file);
        const {name:outName, type, issue, fileType} = parseFilePattern(candidate);
        switch (issue) {
            case "IGNORE_PATTERN":
            case "FOREIGN_FILE_TYPE":
            case "UNKNOWN_TYPE":
                continue;
        }
        if (type == "filtercopy") {
            const copyInfo = await readJsonIfExists(candidate) || {};
            const {name, type:originType, fileType, issue} = parseFilePattern(copyInfo.origin);

            switch (issue) {
                case "IGNORE_PATTERN":
                case "FOREIGN_FILE_TYPE":
                case "UNKNOWN_TYPE":
                    continue;
            }

            copyWork[copyInfo.origin] = copyWork[copyInfo.origin] || [];
            copyWork[copyInfo.origin].push({
                name: outName,
                copyInfo,
            });
            const modCacheFile = `${sheetCache}/${file}.mod-cache`;
            const wasChanged = await checkModifiedSinceLastTurn(candidate, modCacheFile);
            if (wasChanged) {
                copyChanged[copyInfo.origin] = true;
            }

            compositionJobs.push({
                fullPath: candidate,
                name: outName,
                type: originType,
                fileType
            })
        }
    }

    // work through files
    for (const file of files) {
        const candidate = path.join(sheetPath, file);

        const {name, type, fileType, issue} = parseFilePattern(candidate);
        switch(issue) {
            case "IGNORE_PATTERN":
            case "FOREIGN_FILE_TYPE":
                continue;
            case "UNKNOWN_TYPE":
                throw new Error(`Incompatible type: ${type} of ${file} in ${sheetPath}`);
        }

        compositionJobs.push({
            fullPath: candidate,
            name,
            type,
            fileType
        })

        const modCacheFile = `${sheetCache}/${file}.mod-cache`;
        const wasChanged = await checkModifiedSinceLastTurn(candidate, modCacheFile) || copyChanged[file];
        if (!wasChanged) {
            continue;
        }
        // MAKE composition dirty
        //
        await fs.writeFile(dirtyFilePath, "yes");
        // generate raw images
        //
        console.log("Modified: " + file);
        if (fileType === "ase" || fileType === "aseprite") {
            switch(type) {
                case "font":
                case "slices":
                    await run([
                        asepriteBin, '-b', candidate,
                        '--list-slices',
                        '--frame-range 0,0',
                        '--save-as', `${fileCacheDir}/${name}.png`, // Speichert Bild (ohne Animation?)
                        '--data', `${fileCacheDir}/${name}.json`,
                    ], );
                    break;
                case "single":
                    await run([
                        asepriteBin, '-b', candidate,
                        '--frame-range 0,0',
                        '--save-as', `${fileCacheDir}/${name}.png`, // Speichert Bild (ohne Animation?)
                    ], );
                    break;
                case "anim":
                    await run([
                        asepriteBin, '-b', candidate,
                        '--sheet-pack',  // makes spriteframe
                        '--list-tags',   // exports animations (tags)
                        //'--list-slices', // for meta stuff
                        '--format', 'json-array', // exports sheet-frames as array
                        '--sheet', `${fileCacheDir}/${name}.png`,
                        '--data', `${fileCacheDir}/${name}.json`,
                    ], );

                    if (copyWork[file]) {
                        for (const {name: outName, copyInfo} of copyWork[file]) {
                            await copyAndFilter(`${fileCacheDir}/${name}.png`, `${fileCacheDir}/${outName}.png`, copyInfo.filter)
                            await fs.copyFile(`${fileCacheDir}/${name}.json`, `${fileCacheDir}/${outName}.json`)
                        }
                    }
                    break;
            }
        
        }
        else if (fileType === "fnt") {
            // Nothing
            //
            // BMFs need no preprocessing
        }
        else if (fileType === "json") {
            switch(type) {
                case "pentacom":
                    const pentacomJson = await readJsonIfExists(candidate);
                    const header = `data:image/png;base64,`;
                    if ((pentacomJson.image||"").startsWith(header)) {
                        const imgB64 = pentacomJson.image.substring(header.length);
                        const jimpImg = await Jimp.read( Buffer.from(imgB64, 'base64'));
                        await jimpImg.writeAsync(`${fileCacheDir}/${name}.png`);
                        delete pentacomJson.image;
                        await writeJson(`${fileCacheDir}/${name}.json`, pentacomJson)
                    }
                    else {
                        throw new Error(`Incompatible format in font-json. Source: ${candidate}`);
                    }
                    break;
                case "filtercopy":
                    // nothing
                    break;
                // disabled for now. depedency due to issues
                // case "msdf":
                //     const msdfConf = await readJsonIfExists(candidate);
                //     const msdfTTFPath = candidate.substring(0, candidate.length - ".msdf.json".length) + ".ttf";
                //     if (!await fileExists(msdfTTFPath)) {
                //         throw new Error(`TTF not found for MSDF. Expected: ${msdfTTFPath}`);
                //     }
                //
                //     // console.log("candidate =>",candidate);
                //
                //     const gen = new Promise((ok, bad) => {
                //         generateBMFont(
                //             //`${process.env.PWD}/LuckiestGuy-Regular.ttf`,
                //             msdfTTFPath,
                //             {
                //                 ...msdfConf,
                //                 outputType: "json",
                //                 fieldType: 'msdf',
                //                 textureSize: [1024, 1024],
                //             },
                //             (error, textures, font) => {
                //                 if (error)
                //                     bad(error);
                //                 else
                //                     ok([textures, font]);
                //             }
                //         );
                //     })
                //
                //     const [textures, font] = await gen;
                //     for (const tex of textures) {
                //         const fileName = path.relative(sheetPath, tex.filename) + `.png`;
                //         const cacheTexPath = path.join(fileCacheDir, fileName);
                //         await fs.writeFile(cacheTexPath, tex.texture);
                //     }
                //
                //     const fileName = path.relative(sheetPath, font.filename);
                //     const cacheJsonPath = path.join(fileCacheDir, fileName);
                //     // await fs.writeFile(cacheJsonPath, fileName);
                //     await fs.writeFile(`${fileCacheDir}/${name}.${type}.json`, font.data, {encoding: "utf-8"});
                //
                //     break;
            }
        }

        // flag as cached
        await touchModifiedSinceLastTurn(candidate, modCacheFile);
    }



    // if file `dirty.txt` exists it means: we need to do the
    // spritesheet composition thing again
    let compositionDirty = config.alwaysCompose;
    try {
        await fs.stat(dirtyFilePath);
        compositionDirty = true;
    }
    catch (err) {
    }

    // do composition if needed
    if (compositionDirty && compositionJobs.length > 0) {
        console.log("Perform composition for:", sheetPath);
        await clean(sheetPath, fileCacheDir);
        await compose(sheetPath, compositionJobs, fileCacheDir, config.width, config.height, config.trim);

        await unlinkIfExists(dirtyFilePath);
        if (configExists)
            await touchModifiedSinceLastTurn(configFilePath, configFileModPath);
    }
}


async function compose (spriteSheetPath, jobs, fileCacheDir, sheetWidth, sheetHeight, allowTrim) {
    const model = new SpriteComposeModel();
    for (const job of jobs) {
        const {type, fileType} = job;

        switch(type) {
            case 'single':
                await composeSingle(model, job, fileCacheDir);
                break;
            case 'slices':
                await composeSlices(model, job, fileCacheDir);
                break;
            case 'anim':
                await composeAnim(model, job, fileCacheDir);
                break;
            case 'font':
                await composeFonts(model, job, fileCacheDir);
                break;
            case 'pentacom':
                await composePentacomFonts(model, job, fileCacheDir);
                break;
            case 'fnt':
                await composeFNTFonts(model, job, fileCacheDir);
                break;
            case 'msdf':
                await spriteComposeMSDF(model, job, fileCacheDir);
                break;
            
        }
    }

    await bakeModel(spriteSheetPath, model, fileCacheDir, sheetWidth, sheetHeight, allowTrim);

    const targetDir = path.dirname(spriteSheetPath);
    const metaFile = `${targetDir}/${path.basename(spriteSheetPath)}.sheet.meta.json`;
    await writeJson(metaFile, model.convertToExportModel());
}

async function clean (sheetPath, fileCachedir) {
    const sheetName = path.basename(sheetPath);
    const parentDir = path.dirname(sheetPath);
    const files = await fs.readdir(parentDir);
    console.log(sheetName, parentDir);

    const nameMatcher = new RegExp(`^${sheetName}_\\d+.png$`);

    for (const file of files) {
        const filePath = path.join(parentDir, file);
        try {
            const fileStats = await fs.stat(filePath);
            if (fileStats.isDirectory())
                continue;
        }
        catch(err) {
            console.error("Failed to read file during cleanup: " + filePath);
            continue;
        }

        const oldFile = nameMatcher.test(file);
        if (oldFile) {
            console.log("🗑 cleanup:", path.basename(parentDir) + "/" + file);
            await fs.unlink(filePath)
        }
    }
}