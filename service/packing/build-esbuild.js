/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import path from "node:path";
import fs from "node:fs/promises";
import {buildGameImportFile} from "../assets/edf.js";
import {randomName} from "../utils/random.js";
import {writeJson} from "../assets/spritesheet/files.js";
import esbuild from 'esbuild';



export async function buildFinalGameJS_esbuild(config, distDir, sourcemap, minify) {
    const {gameDir} = config;
    const gameSearchPaths = config.gameConfig.assetPaths.map(p => path.join(config.gameDir, p));

    //const gameMainJs = await searchMainFile(config);
    //let relativeMainGameJS = gameMainJs.substring(gameDir.length + 1);
    let code = await buildGameImportFile(
        config,
        gameSearchPaths,
        false,
        false
    );

    // console.log(code)
    // code += "\nexport const muh = 'muh'"

    const rndName = randomName();
    const tmpGameJsName = path.join(gameDir, `${rndName}.ts`);
    const tmpTsConfig = path.join(gameDir, `${rndName}_tsconfig.json`);
    const tsConfig = {
        "compilerOptions": {
            "target": "es2015",
            "sourceMap": true,
            "removeComments": false,
            "strict": true,
            "forceConsistentCasingInFileNames": false,
            "noImplicitAny": false,
            "noImplicitThis": false,
            "downlevelIteration": true,
            "strictNullChecks": false,
            "baseUrl": ".",
            "noEmitHelpers": true,
            "experimentalDecorators": true,
            "emitDecoratorMetadata": false,
            "moduleResolution": "node",
            "paths": {
            },
            "lib": [
                "dom",
                "es2015"
            ],
        },
    };

    (config.gameConfig.assetPaths||[]).forEach(p =>
        tsConfig.compilerOptions.paths[`@${p}/*`] = [`./${p}/*`]
    )

    try {
        console.log("-------------------------------------------\n📦 Bundle the code using esbuild\n-------------------------------------------")
        await writeJson(tmpTsConfig, tsConfig);
        await fs.writeFile(tmpGameJsName, code, {encoding: "utf-8"});
        const res = await esbuild.build({
            entryPoints: [tmpGameJsName],
            bundle: true,
            minify: minify,
            sourcemap: sourcemap,
            tsconfig: tmpTsConfig,
            absWorkingDir: gameDir,
            format: "esm",
            // treeShaking: true,
            outfile: path.join(gameDir, "dist", "game.js"),
        })
        if (res.errors.length > 0) {
            console.log("-------------------------------------------\n🔥 Bundler found errors. Please check messages above.")
        }
        else if (res.warnings.length > 0) {
            console.log("-------------------------------------------\n🤔 Bundler found warnings. Might be worth checking messages above.")
        }
        else {
            console.log("-------------------------------------------\n🆗️ Looks okay")
        }
    }
    catch(err) {
        throw err
    }
    finally {
        try { await fs.unlink(tmpGameJsName)} catch(err) {}
        try { await fs.unlink(tmpTsConfig)} catch(err) {}
    }
}
