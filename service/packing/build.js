/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {parseGameConfig} from "../dev/config.js";
import path from "node:path";
import fs from "node:fs/promises";
import {fileExists, readAllDirectoriesAndFiles} from "../utils/files.js";
import {buildSingleSheet} from "../assets/spritesheet/toolkit.js";
import {doJobs} from "./jobs.js";
import {buildFinalGameJS_esbuild} from "./build-esbuild.js";

function readWithFallback(obj, paths, fallback=null, i = 0) {
    if (!obj)
        return fallback;
    if (!paths[i])
        return fallback;
    if (obj[paths[i]] === undefined)
        return fallback;
    if (i === paths.length - 1)
        return obj[paths[i]];
    return readWithFallback(obj[paths[i]], paths, fallback, i + 1);
}


export async function build(gameDir, engineDir, configId="") {
    //
    // fetch config + utils
    //
    console.log("GAME:", gameDir);
    console.log("ENGINE:", engineDir);
    const config = await parseGameConfig('build', gameDir, engineDir);
    //
    // determine the actual build options
    //
    const distDir = path.join(gameDir, readWithFallback(config, ["gameConfig", "build", "dist"], "dist"));
    //
    // make sure dir exists and is clean
    //
    try { await fs.rm(distDir, {force: true, recursive: true}); } catch(err) { }
    await fs.mkdir(distDir, {recursive: true});
    //
    // do the horrors of transpiling
    //
    const sourcemap = readWithFallback(config, ["gameConfig", "build", "sourcemap"], false);
    const minify = readWithFallback(config, ["gameConfig", "build", "minify"], false);
    // await buildFinalGameJS_tsup(config, distDir, sourcemap, minify);
    await buildFinalGameJS_esbuild(config, distDir, sourcemap, minify);
    //
    // handle assets
    //
    console.log("-------------------------------------------\n🎁 Assets\n-------------------------------------------\n")
    await buildFinalGameAssets(config, distDir);
    await copyFinalGameAssets(config, distDir);
    //
    // let the user know
    //
    console.log("\n✅ Build done");
}

async function buildFinalGameAssets(config, distDir) {
    const {gameDir} = config;
    const gameSearchPaths = config.gameConfig.assetPaths.map(p => path.join(gameDir, p));
    const {dirs, files} = await readAllDirectoriesAndFiles(gameSearchPaths);
    const useDevCache = readWithFallback(config, ["gameConfig", "build", "useDevCache"], true);

    const assetCacheDir = useDevCache ? path.join(gameDir, ".cache") : path.join(distDir, ".cache");
    await fs.mkdir(assetCacheDir, {recursive: true});

    //
    // find processable assets
    //
    const jobs = [];
    const ignoreFolders = [];
    for (const file of files) {
        const lowerFile = file.toLowerCase();
        const fileDir = path.dirname(file);
        //
        // make sure SpriteSheets are up-to-date
        //
        if (lowerFile.endsWith(".sheet.json")) {
            const fileName = path.basename(file);
            const sheetName = fileName.substring(0, fileName.length - ".sheet.json".length);
            const sheetPath = path.join(fileDir, sheetName);
            jobs.push(buildSingleSheet(sheetPath, assetCacheDir, config.gameConfig.asepritePath));
        }
    }
    await doJobs(jobs);
}

async function copyFinalGameAssets(config, distDir) {
    const {gameDir, engineDir} = config;
    const gameSearchPaths = config.gameConfig.assetPaths.map(p => path.join(gameDir, p));
    const {dirs, files} = await readAllDirectoriesAndFiles(
        gameSearchPaths
    );
    const copyJobs = [];
    //
    // ignore file types
    //
    const ignoreFileTypes = [
        ".ase",
        ".ts",
        ".js",
        ".js.map",
        ".aseprite",
        ".psd",
        ".sheet.json",
        ".sheet.meta.json",
        '.ds_store',
    ];
    //
    // Collect Ignore-Folder
    //
    const ignoreFolders = [];
    for (const file of files) {
        const lowerFile = file.toLowerCase();
        const fileDir = path.dirname(file);
        //
        // SpriteSheets are based on a subdirectory of source files.
        // Their entry point is always: <NAME>.sheet.json
        //
        // We do not want the source folder so we have to put it
        // on the ignore list.
        //
        if (lowerFile.endsWith(".sheet.json")) {
            // file:      /some/path/main.sheet.json
            // sheetName: main
            // fileDir:   /some/path/
            // => ignore: /some/path/main + /some/path/.main
            const fileName = path.basename(file);
            const sheetName = fileName.substring(0, fileName.length - ".sheet.json".length);
            ignoreFolders.push(
                path.join(fileDir, sheetName) + "/",
                path.join(fileDir, "." + sheetName) + "/"
            );
            //
            // The content <NAME>.sheet.json is not what we need in production.
            // Instead, we need to copy <NAME>.sheet.meta.json as <NAME>.sheet.json.
            //
            const relativeDir = fileDir.substring(gameDir.length);
            copyJobs.push({
                from: path.join(fileDir, `${sheetName}.sheet.meta.json`),
                to: path.join(distDir, relativeDir, `${sheetName}.sheet.json`)
            })
        }
    }
    //
    // Prepare the copy tasks
    //
    nextFile: for (const file of files) {
        const lowerFile = file.toLowerCase();
        const lowerFileName = path.basename(lowerFile);
        //
        // skip all ignore files + ignore folder files
        //
        for (const badEnding of ignoreFileTypes)
            if (lowerFile.endsWith(badEnding))
                continue nextFile;
        for (const ignoreFolder of ignoreFolders)
            if (file.startsWith(ignoreFolder))
                continue nextFile;
        //
        // Files starting with: _ or ending with _
        // won't make it.
        //
        if (lowerFileName.startsWith("_"))
            continue nextFile;
        const dotPos = lowerFileName.indexOf(".");
        if (dotPos > -1) {
            const lowerFileNameNoExt = lowerFileName.substring(0, dotPos);
            if (lowerFileNameNoExt.endsWith("_"))
                continue nextFile;
        }
        //
        // the rest shall be copied
        //
        const relativeFile = file.substring(gameDir.length);
        copyJobs.push({
            from: file,
            to: path.join(distDir, relativeFile)
        })
    }
    //
    // index.html
    //
    let indexHtmlPath = readWithFallback(config,
        ["gameConfig", "build", "indexHtmlPath"],
        false
    );
    indexHtmlPath = indexHtmlPath !== false
        ? path.join(gameDir, indexHtmlPath)
        : false;
    if (indexHtmlPath !== false) {
        if (!await fileExists(indexHtmlPath)) {
            throw new Error(`❌ index-html-path file not found. Searched for: ${indexHtmlPath}`);
        }
        copyJobs.push({
            from: indexHtmlPath,
            to: path.join(distDir, "index.html")
        })
    }
    else {
        const to = path.join(distDir, "index.html");
        copyJobs.push({
            from: path.join(engineDir, "service", "www", "standard-index.html"),
            to,
            afterCopy: async () => {
                let htmlStr = await fs.readFile(to, {encoding: "utf-8"});
                htmlStr = htmlStr.replace("$$GAME$$", config.gamePackageJson.displayName);
                await fs.writeFile(to, htmlStr);
            }
        })
    }
    //
    // actually do the steves
    //
    await doJobs(copyJobs.map(job => {
        if (job.afterCopy) {
            async function combined() {
                await fs.cp(job.from, job.to);
                await job.afterCopy();
            }
            return combined();
        }
        else {
            return fs.cp(job.from, job.to)
        }
    }));
}
