/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {fileExists, readAllDirectories, readAllDirectoriesAndFiles} from "../utils/files.js";
import {readFile} from 'node:fs/promises';
import {parseEDF} from '../../dist/index.js';
import path from 'node:path'

export async function scanDirectoryForEDFComponents(rootDir) {
    const {files, dirs} = await readAllDirectoriesAndFiles(rootDir);
    const edfs = files.filter(f => f.endsWith(".edf"));
    const tsMap = {};

    files.filter(f => f.endsWith(".ts"))
        .forEach(f => {
            // console.log(f);
            // const tsInfo = {
            //     path: path.dirname(f),
            //     file: ,
            // }
            const file = path.basename(f);
            tsMap[file] = tsMap[file]||[];
            tsMap[file].push(f);
        });

    const issues = [];
    const cmps = new Set();
    for (const edfPath of edfs) {
        const edfRaw = await readFile(edfPath, {"encoding": "utf-8"});
        let unlinkedEDFs = null;
        try {
            unlinkedEDFs = parseEDF(edfRaw, true);
        }
        catch(err) {
            //console.error("cannot parse:", edfPath);
            issues.push(`Cannot parse: ${edfPath}. Reason: ${err.message}`)
            continue;
        }
        for (const ed of unlinkedEDFs.entries) {
            for (const cmp of ed.components) {
                const candidates = tsMap[`${cmp}.ts`];
                if (candidates && candidates.length > 0) {
                    if (candidates.length > 1) {
                        // conflict
                        issues.push(`Conflict: found more than one candidate: for ${cmp}. Options: ${candidates}`);
                    }
                    cmps.add(candidates[0])
                }
                else {
                    if (cmp.indexOf(":") > -1) {
                        cmps.add(cmp)
                    }
                }
            }
        }
    }
    return {
        components: [...cmps],
        issues: [...issues],
        edfs: edfs,
    } 
}


/**
 * Generates the source code for the root file of the game.
 *
 * @param config {any}
 * @param gameSearchPaths {string[]}
 * @param gameStartPath {string}
 * @return {Promise<string>}
 */
export async function buildGameImportFile(config, gameSearchPaths,  subDir, forceJS = true) {
    // FIX think about error reporting here. console.log might be bad!
    const {gameDir} = config;
    const {components, edfs} = await scanDirectoryForEDFComponents(gameSearchPaths);
    const dots = subDir ? '..' : '.'
    const lines = [];
    const afterLines = [];
    let clsIndex = 1;

    lines.push(`import {registerComponent} from 'typesprite'`);
    for (const cmp of components) {
        let cmpPath = cmp.substring(gameDir.length);

        if (forceJS && cmpPath.toLowerCase().endsWith(".ts")) {
            cmpPath = cmpPath.substring(0, cmpPath.length-3) + ".js";
        }
        if (cmp.indexOf(":") > -1) {
            const [cmpName, pkg] = cmp.split(":", 2);
            const clzName = `${cmpName}_${pkg.replaceAll(/\/|\-/g, '_')}`
            lines.push(`import {${cmpName} as ${clzName}} from '${pkg}'`)
            afterLines.push(`registerComponent({'${cmp}':${clzName}});`);
        }
        else {
            const cmpFile = path.basename(cmp);
            const cmpName = cmpFile.substring(0, cmpFile.length-3);
            lines.push(`import {${cmpName}} from '${dots}${cmpPath}'`)
            afterLines.push(`registerComponent({'${cmpName}':${cmpName}});`);
        }
    }
    const run = config.gameConfig.run;
    const runType = typeof run;
    switch(runType) {
        case "string":
            afterLines.push(`import '${dots}/${run}'`);
            break;
        case "object":
            await injectGameRunnerCode(edfs, dots, config, run, lines, afterLines);
            break;
        case "undefined":
            const defaultRun = {
                startWorlds: edfs.map(edfPath => {
                    const edfAssetPath = path.relative(gameDir, edfPath);
                    const edfFileName = path.basename(edfAssetPath);
                    const worldName = edfFileName.substring(0, edfFileName.length-".edf".length);
                    if (worldName.startsWith("_") || worldName.endsWith("_"))
                        return null;
                    return worldName
                }).filter(name => name !== null)
            };
            afterLines.push(`console.log('👉🏻 typesprite.config::run not found. Start World(s): ${defaultRun.startWorlds}')`)
            await injectGameRunnerCode(
                edfs,
                dots,
                config,
                defaultRun,
                lines,
                afterLines);
            // afterLines.push(`console.error("typesprite.config.mjs::run not set!")`);
            break;
        default:
            afterLines.push(`console.error("typesprite.config.mjs::run has a bad type")`);
            break;
    }

    const out = lines.join('\n') + '\n' + afterLines.join('\n');
    return out;
}

/**
 *
 * @param config {}
 * @param runConfig {RunConfig}
 * @param lines {string[]}
 * @param afterLines {string[]}
 */
export async function injectGameRunnerCode(edfs, dots, config, runConfig, lines, afterLines) {

    const {gameDir} = config;
    let clsIndex = 1;
    afterLines.push(`const config = {} as any`);
    lines.push(`import {GameRunner} from 'typesprite'`);

    const simpleProps = [
        "flags",
        "startWorlds",
        "mainloopType",
        "fixedMainloopFps",
        "noStandardPropertyParser",
        "noStandardResourceLoader",
        "noAutostart",
        "maxFps",
        "maxBlurredFps",
        "canvasType",
        "canvasSelector",
        "resourcePathPrefix",
    ];

    for (const prop of simpleProps) {
        const val = runConfig[prop];
        if (val === undefined)
            continue;
        afterLines.push(`config.${prop} = ${JSON.stringify(val)}`);
    }
    //
    // world activators
    //
    const activatorMap = {};
    if (typeof runConfig.activator === "object") {
        for (const worldName of Object.keys(runConfig.activator)) {
            const activatorPath = runConfig.activator[worldName];
            const [result, moduleOrPath, importName] = await resolveImportFile(activatorPath, gameDir);
            const clzName = `${importName}_${clsIndex++}`
            switch(result) {
                case "file":
                    lines.push(`import {${importName} as ${clzName}} from '${dots}/${moduleOrPath}'`)
                    break;
                case "package":
                    lines.push(`import {${importName} as ${clzName}} from '${moduleOrPath}'`)
                    break;
                default:
                case "not_found":
                    afterLines.push(`console.error("typesprite.config.mjs::run.activator not found: ${activatorPath}")`);
                    continue;
            }
            activatorMap[worldName] = `() => new ${clzName}()`;
        }
    }
    else if (runConfig.activator === undefined) {
        // ignore
    }
    else {
        afterLines.push(`console.error("typesprite.config.mjs::run.activator has a bad type: ${typeof runConfig.activator}")`);
    }
    //
    // default activator
    //
    let defaultActivator = ``;
    if (typeof runConfig.defaultActivator === "string") {
        const activatorPath = runConfig.defaultActivator;
        const [result, moduleOrPath, importName] = await resolveImportFile(activatorPath, gameDir);
        const clzName = `${importName}_${clsIndex++}`
        switch(result) {
            case "file":
                lines.push(`import {${importName} as ${clzName}} from '${dots}/${moduleOrPath}'`)
                defaultActivator = `() => new ${clzName}()`
                break;
            case "package":
                lines.push(`import {${importName} as ${clzName}} from '${moduleOrPath}'`)
                defaultActivator = `() => new ${clzName}()`
                break;
            default:
            case "not_found":
                afterLines.push(`console.error("typesprite.config.mjs::run.defaultActivator not found: ${activatorPath}")`);
                break;
        }
    }
    if (!defaultActivator) {
        const clzName = `ManualActivator_${clsIndex++}`;
        lines.push(`import {ManualActivator as ${clzName}} from 'typesprite'`)
        defaultActivator = `() => new ${clzName}()`
    }
    //
    // resource loader
    //
    if (Array.isArray(runConfig.resourceLoader)) {
        const loaderRegisterLines = [];
        for (const loaderPath of runConfig.resourceLoader) {
            const [result, moduleOrPath, importName] = await resolveImportFile(loaderPath, gameDir);
            const clzName = `${importName}_${clsIndex++}`
            switch(result) {
                case "file":
                    loaderRegisterLines.push([
                        `import {${importName} as ${clzName}} from '${dots}/${moduleOrPath}'`,
                        `new ${clzName}()`,
                    ]);
                    break;
                case "package":
                    loaderRegisterLines.push([
                        `import {${importName} as ${clzName}} from '${moduleOrPath}'`,
                        `new ${clzName}()`,
                    ]);
                    break;
                default:
                case "not_found":
                    afterLines.push(`console.error("typesprite.config.mjs::run.resourceLoader not found: ${loaderPath}")`);
                    break;
            }
        }
        if (loaderRegisterLines.length > 0) {
            afterLines.push(`const resLoader = []`)
            for (const [line, afterLine] of loaderRegisterLines) {
                lines.push(line);
                afterLines.push(`resLoader.push(${afterLine})`);
            }
            afterLines.push(`config.resourceLoader = resLoader;`)
        }
    }
    else if (runConfig.resourceLoader) {
        console.warn(`Unrecognized type for 'resourceLoader' in the run config. Expected string[] found: ${typeof runConfig.resourceLoader}`);
    }
    //
    // edf-worlds
    //
    afterLines.push(`config.worlds = []`);
    for (const edfPath of edfs) {
        const edfAssetPath = path.relative(gameDir, edfPath);
        const edfFileName = path.basename(edfAssetPath);
        const worldName = edfFileName.substring(0, edfFileName.length-".edf".length);
        if (worldName.startsWith("_") || worldName.endsWith("_")) {
            console.log(`Skip world: ${edfAssetPath} due to ignore-pattern.`);
            afterLines.push(`console.log("Skip world: ${edfAssetPath} due to ignore-pattern.");`);
            continue;
        }
afterLines.push(`config.worlds.push({
    name:"${worldName}", 
    edfPath:"${edfAssetPath.replaceAll('\\', '/')}", 
    activatorFactory: ${activatorMap[worldName]||defaultActivator},
})`);
    }
    //
    // let the games begin :-)
    //
    if (config.gameConfig.bundleAsESMRun) {
        afterLines.push("export default function() {")
        afterLines.push(`  config.finishCallback = () => { console.log('⭐️ GameRunner\\nCONFIG:', config) }`);
        afterLines.push(`  const game = new GameRunner(config)`);
        afterLines.push(`  return game;`);
        afterLines.push(`}`);
    }
    else {
        afterLines.push(`config.finishCallback = () => { console.log('⭐️ GameRunner\\nCONFIG:', config) }`);
        afterLines.push(`const game = new GameRunner(config)`);
    }
}


/**
 * Tries to make sense of a given path.
 *
 * ```
 *  given: path/to/someFile
 *   test: path/to/someFile.ts
 *   test: path/to/someFile.js (when found)
 * result: ["file", "path/to/someFile.js", "someFile"]
 *
 *  given: path/to/someFile.js
 *   test: path/to/someFile.js
 * result: ["file", "path/to/someFile.js", "someFile"]
 *
 *  given: package:SomeClass
 *   test: none
 * result: ["package", "package", "SomeClass"]
 *
 *  given: package/dist:SomeClass
 *   test: none
 * result: ["package", "package/dist", "SomeClass"]
 *
 * // NOT FOUND:
 *
 * result: ["not_found", "", ""]
 *
 * ```
 *
 * @returns {[boolean, string, string]} success: true, fullPath, importName | failed: false, error desc, null
 */
export async function resolveImportFile(filePath, basePath = null) {
    //
    // package (not a path)
    //
    const packageSplit = filePath.indexOf(":")
    if (packageSplit > -1) {
        const className = filePath.substring(packageSplit + 1);
        const packageName = filePath.substring(0, packageSplit);
        return ["package", packageName, className];
    }
    //
    // path with file ending
    //
    let pathWithEnding = "";
    const fullPath = basePath ? path.join(basePath, filePath) : filePath;
    const lowerPath = fullPath.toLowerCase();
    if (lowerPath.endsWith(".ts") || lowerPath.endsWith(".js")) {
        if (!await fileExists(fullPath)) {
            return ["not_found", "file not found"]
        }
        pathWithEnding = fullPath;
    }
    else {
        const jsExists = await fileExists(fullPath + ".js");
        const tsExists = await fileExists(fullPath + ".ts");
        if (!jsExists && !tsExists) {
            return ["not_found", "file not found"]
        }
        pathWithEnding = tsExists ? fullPath + ".ts" : fullPath + ".js"
    }
    //
    // file found. let's split it
    //
    pathWithEnding = basePath ? path.relative(basePath, pathWithEnding) : pathWithEnding;
    const splitPos = pathWithEnding.lastIndexOf(path.sep);
    // const outPath = pathWithEnding.substring(0, splitPos);
    const className = pathWithEnding.substring(splitPos + 1);
    return ["file", pathWithEnding.replaceAll('\\', '/'), className.substring(0, className.length-3).replaceAll('\\', '/')];
}