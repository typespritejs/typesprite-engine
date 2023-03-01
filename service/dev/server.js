/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import express from 'express';
import errorHandler from 'errorhandler';
import * as path from 'node:path';
import {writeFile, watch, mkdir} from 'node:fs/promises'
import {scanDirectoryForEDFComponents, buildGameImportFile} from '../assets/edf.js';
import {parseGameConfig, parseGamePackage} from './config.js';
import {checkForFile, dirExists, fileExists, readFileIfExists} from "../utils/files.js";
import { buildSingleSheet } from '../assets/spritesheet/toolkit.js';
import {createCodeServer, makeTsConfig} from "./serve-esbuild.js";
import {writeJson} from "../assets/spritesheet/files.js";
import {http} from "../quirks/ts_quirks.cjs";
// import {makeSourceRequestHandler} from "./sources.js";

import {createInterface} from 'node:readline';




let runningServer;
let oldServer = null;
let codeServer = null;
let debouncedRestarter = null;

export const server = async function(gameDir, engineDir, watchConfig = false) {
    runningServer = await startServer(gameDir, engineDir);
    // if (watchConfig) {
    //     enableConfigFileWatcher(gameDir, engineDir);
    // }
}

function enableConfigFileWatcher(gameDir, engineDir) {
    const jsFile = 'typesprite.config.js';
    const mjsFile = 'typesprite.config.mjs';
    const jsFilePath = path.join(gameDir, jsFile);
    const mjsFilePath = path.join(gameDir, mjsFile);

    const ac = new AbortController();
    startConfigWatcher(mjsFilePath, ac, gameDir, engineDir);
    // startConfigWatcher(jsFilePath, ac, gameDir, engineDir);
}

function startConfigWatcher(filePath, abortController, gameDir, engineDir) {
    (async () => {
        try {
            const watcher = watch(filePath, { signal: abortController.signal });
            for await (const event of watcher) {
                // console.log(event);
                if (debouncedRestarter) {
                    clearTimeout(debouncedRestarter);
                    debouncedRestarter = null;
                }
                debouncedRestarter = setTimeout(() => {
                    debouncedRestarter = null;
                    restartServer(gameDir, engineDir).catch(err => err);
                }, 100);
            }
        } catch (err) {
            if (err.name === 'AbortError')
                return;
            throw err;
        }
    })();
}

async function restartServer(gameDir, engineDir) {
    if (!runningServer) {
        console.error("Cannot restart server. No running server found.");
        return;
    }
    console.log("Close Server... (for restart)");
    oldServer = runningServer;
    runningServer = null;
    await oldServer.close();
    oldServer = null;
    console.log("Restart Server...");
    runningServer = await startServer(gameDir, engineDir);
    console.log("Restarted!");
}


async function ensureMainFolders(config) {



    const gameSearchFolders = [
        'node_modules'
    ]
    if (config.gameConfig.assetPaths && config.gameConfig.assetPaths.length > 0) {
        for (const path of config.gameConfig.assetPaths) {
            gameSearchFolders.push(path);
        }
    }

    const missingAssets = [];
    for (const gameSearchFolder of gameSearchFolders) {
        const p = path.join(config.gameDir, gameSearchFolder);
        if (!await dirExists(p)) {
            missingAssets.push(p);
        }
    }

    const cachePath = path.join(config.gameDir, ".cache");
    const missingCache = !await dirExists(cachePath);
    // if (!await dirExists(cachePath)) {
    //     missingAssets.push(cachePath);
    // }

    if (missingCache || missingAssets.length > 0) {
        const readline = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const lines = [];
        lines.push(`------------------`)
        lines.push(`🤔 NEW PROJECT?`)
        lines.push(`------------------`)
        lines.push(`Some asset-folders and the ./cache folders are missing.`)


        console.log(lines.join("\n"));
        //
        // ask for might... I mean permission for creation
        let decision = "?"
        let times = 3;
        while(decision != "y" && decision != "n" && times-- > 0) {
            if (decision != "?") {
                console.log("Please use 'y' or 'n'. Pick 'q' to quit\n");
            }
            await new Promise((ok, bad) => {
                readline.question("❓ Shall TypeSprite create missing folders? (Y/n)", dec => {
                    decision = dec;
                    ok();
                });
            })
        }
        readline.close();
        if (decision != "y") {
            lines.length = 0;
            if (missingAssets.length > 0) {
                lines.push(`Asset directories:`)
                for (const p of missingAssets) {
                    lines.push(`➡️ ${p}`);
                }
            }
            if (missingCache) {
                if (missingAssets.length > 0) {
                    lines.push('');
                }
                lines.push(`Asset .cache/ directory:`)
                lines.push(`➡️ ${cachePath}`);
            }
            console.log("\nTypeSprite Dev-Server stopped.\n\n❌ Missing folder(s):\n" + lines.join("\n"));
            process.exit(0);
            return;
        }

        if (missingCache) {
            await mkdir(cachePath, {recursive: true});
        }
        for (const p of missingAssets) {
            await mkdir(p, {recursive: true});
        }
    }

    //throw new Error(`❌ Asset directory not found: '${gameSearchFolder}'. 👀 Please make sure all Asset directories exist. Searched here: ${p}`);


    return gameSearchFolders;
}

const startServer = async function(gameDir, engineDir) {
    let app = express()
    const config = await parseGameConfig('serve', gameDir, engineDir);
    
    config.serve = {
        port: config.gameConfig.servePort || 5001,
    }

    app.use(express.json());
    if ('development' === app.get('env')) {
        app.use(errorHandler());
    }

    // const gameSearchFolders = [
    //     'node_modules'
    // ]
    // if (config.gameConfig.assetPaths && config.gameConfig.assetPaths.length > 0) {
    //     for (const path of config.gameConfig.assetPaths) {
    //         gameSearchFolders.push(path);
    //     }
    // }
    //
    // for (const gameSearchFolder of gameSearchFolders) {
    //     const p = path.join(config.gameDir, gameSearchFolder);
    //     if (!await dirExists(p)) {
    //         throw new Error(`❌ Asset directory not found: '${gameSearchFolder}'. 👀 Please make sure all Asset directories exist. Searched here: ${p}`);
    //     }
    // }

    const gameSearchFolders = await ensureMainFolders(config);

    // @type {string[]}
    // const gameMainJs = await searchMainFile(config)
    const gameSearchPaths = gameSearchFolders
        .map(p => path.join(config.gameDir, p));

    // ---------------------------------------------------------------------------------------------------------------------

    app.get('/', async (req, res) => {
        const indexPath = path.join(gameDir, 'index.html');
        console.log(indexPath);
        const indexHtmlStr = await readFileIfExists(indexPath);
        if (typeof indexHtmlStr === "string") {
            return res.send(indexHtmlStr );
        }
        const welcomePath = path.join(engineDir, 'service', 'www', 'welcome.html');
        const welcomeHtmlStr = await readFileIfExists(welcomePath);
        return res.send(welcomeHtmlStr||"typesprite/welcome.html not found :-(");
    });

    app.get('/welcome', async (req, res) => {
        const welcomePath = path.join(engineDir, 'service', 'www', 'welcome.html');
        const welcomeHtmlStr = await readFileIfExists(welcomePath);
        return res.send(welcomeHtmlStr||"typesprite/welcome.html not found :-(");
    });

    app.get('/game.json', async(req, res) => {
        const gamePackageJson = await parseGamePackage(gameDir);
        return res.send({
            title: gamePackageJson.displayName,
            version: gamePackageJson.version,
            package: gamePackageJson.name,
        });
    });

    app.get('/play', async (req, res) => {
        const {gameConfig} = config;
        if (typeof (gameConfig||{}).run === "string") {
            if (!await fileExists(path.join(gameDir, gameConfig.run))) {
                let places = gameConfig.run;
                places += "<br>"
                return res.send(`Main file not found.<br><br>Searched for:` + places);
            }
        }
        const playPath = await fileExists(path.join(gameDir, "play.html"))
            ? path.join(gameDir, "play.html")
            : path.join(engineDir, 'service', 'www', 'play.html');
        let playStr = await readFileIfExists(playPath);
        return res.send(playStr||"typesprite/play.html not found :-(");
    });

    app.get('/debug/edf', async (req, res) => {
        const out = await scanDirectoryForEDFComponents(gameSearchPaths);
        res.send(out)
    })

    app.get('/debug/edf/cmps', async (req, res) => {
        const out = await scanDirectoryForEDFComponents(gameSearchPaths);
        res.send(out.components)
    })

    app.get('/debug/edf/issues', async (req, res) => {
        const out = await scanDirectoryForEDFComponents(gameSearchPaths);
        res.send(out.issues)
    })

    app.get('/debug/edf/issues', async (req, res) => {
        const out = await scanDirectoryForEDFComponents(gameSearchPaths);
        res.send(out.issues)
    })

    gameSearchFolders.forEach((folder, i) => {
        const reg = new RegExp(`${folder}\\/.+.sheet.json\$`)
        // app.get(/assets\/.+.sheet.json$/, (req, res) => {
        app.get(reg, (req, res) => {
            (async function() {
                // if (!config.gameConfig.asepritePath) {
                //     return res.status(409).send('Aseprite not found. Please provide a path in typesprite.config.');
                // }
                const file = path.basename(req.path);
                if (!await fileExists(path.join(gameDir, `.${req.path}`))) {
                    console.log({file: req.path})
                    return res.status(404).send('sheet-config-file does not exist');
                }

                const filePath = req.path.substring(0, req.path.lastIndexOf(file));
                const sheetName = file.substring(0, file.length - ".sheet.json".length);
                const metaFilePath = path.join(path.dirname(path.resolve(path.join(gameDir, `.${req.path}`))), sheetName + ".sheet.meta.json");
                const sheetPath = path.join(gameDir, filePath, sheetName)
                await buildSingleSheet(sheetPath, path.join(gameDir, ".cache"), config.gameConfig.asepritePath)
                if (!await fileExists(metaFilePath)) {
                    return res.status(409).send('SpriteSheet not generated. Check TypeSprite server log for details.');
                }
                return res.sendFile(metaFilePath);
                // return res.send('SP => ' + sheetPath);
            })().catch(err => {
                console.error(err);
                return res.status(500).send('Failed: ' + err.message);
            });
        });
    })

    app.get('/game.js.map', async (req, res) => {
        // if (!gameMainJs) {
        //     return res.status(404).send("NoMainJs");
        // }
        // FIX this an issue?
        if (!codeServer) {
            return res.status(404).send("NoCodeServer");
        }

        const code = await new Promise((ok, bad) => {
            http.get(`${codeServer.codeRequestUrl}.map`, resp => {
                let data = '';
                resp.on('data', (chunk) => data += chunk);
                resp.on('end', () => ok({content: data, status: resp.statusCode}));
            }).on('error', err => {
                bad(err);
            })
        })

        if (code.status != 200) {
            return res.status(code.status).send(code.content);
        }

        return res.send(code.content);
    });

    app.get('/inspect-game.js', async (req, res) => {
        // if (!gameMainJs) {
        //     return res.status(404);
        // }

        const importGameCode = await buildGameImportFile(
            config,
            gameSearchPaths,
            true
        );
        res.writeHead(200, {
            'content-type': 'text/javascript; charset=utf-8'
        });
        res.write(importGameCode);
        res.end();
    })

    app.get('/game.js', async (req, res) => {
        // if (!gameMainJs) {
        //     return res.status(404);
        // }

        // let relativeMainGameJS = gameMainJs.substring(gameDir.length + 1);
        // if (relativeMainGameJS.toLocaleLowerCase().endsWith('.ts'))
        //     relativeMainGameJS = relativeMainGameJS.substring(0, relativeMainGameJS.length - 3) + ".js"
        if (!codeServer) {
            codeServer = await createCodeServer(config);
        }
        const importGameCode = await buildGameImportFile(
            config,
            gameSearchPaths,
            true
        );
        await writeJson(codeServer.tmpTsConfigPath, makeTsConfig(config));
        await writeFile(codeServer.tmpEntryFilePath, importGameCode, {encoding: "utf8"});
        await codeServer.refresh()

        const code = await new Promise((ok, bad) => {
            http.get(codeServer.codeRequestUrl, resp => {
                let data = '';
                resp.on('data', (chunk) => data += chunk);
                resp.on('end', () => ok({content: data, status: resp.statusCode}));
            }).on('error', err => {
                bad(err);
            })
        })

        let outJS = "";
        if (code.status != 200) {
            outJS = `
// Failed 
const error = \`
${code.content}\`; 

// --------------------------------------------------------

alert(error);
            `
        }
        else {
            outJS = code.content;
        }
        res.writeHead(200, {
            'content-type': 'text/javascript; charset=utf-8'
        });
        res.write(outJS);
        res.end();
    })
    console.log("engineDir:", engineDir + "/docs");
    app.use("/docs", express.static(engineDir + "/docs") );
    app.use("/", express.static(gameDir + ""));
    console.log("starting...");
    const runApp = app.listen(config.serve.port, () => {
        console.log("------------------------------");
        console.log("⭐️", config.gamePackageJson.displayName);
        console.log("⭐️ http://localhost:" + config.serve.port + "");
        console.log("------------------------------");
    });
    return runApp;
}



