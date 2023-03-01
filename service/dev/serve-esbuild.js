/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import path from 'node:path';
import esbuild from 'esbuild';

/**
 * steps:
 *
 * - create tmp-tsconfig file (in .cache)
 * - create tmp-game.js file to support components (in .cache)
 * - start server (store handle)
 * - before each request: update tmp-game.js
 * - if config changes - restart server (watch typesprite.config.mjs?)
 */
export async function createCodeServer(config) {
    const {gameDir} = config;
    const rndName = `devserver_esbuild` //randomName();
    const tmpEntryFilePath = path.join(gameDir, ".cache", `${rndName}-entry.ts`);
    const tmpTsConfigPath = path.join(gameDir, ".cache", `${rndName}-tsconfig.json`);

    const out =  {
        esbuildServe: null,
        codeRequestUrl: null,
        tmpEntryFilePath,
        tmpTsConfigPath,

        async refresh(restart = false) {
            if (restart && out.esbuildServe) {
                await out.esbuildServe.stop();
                out.esbuildServe = null;
            }
            if (out.esbuildServe === null) {
                const res = await esbuild.serve({
                    host: "0.0.0.0",
                    // onRequest: args => {
                    //     console.log("esbuild");
                    // },
                }, {
                    entryPoints: [tmpEntryFilePath],
                    bundle: true,
                    // minify: minify,
                    sourcemap: true,
                    tsconfig: tmpTsConfigPath,
                    absWorkingDir: gameDir,
                    // treeShaking: true,
                    outfile: "game.js",
                    plugins: []
                })
                out.esbuildServe = res;
                out.codeRequestUrl = `http://${res.host}:${res.port}/game.js`;

                console.log("esbuild lang enrty: ", out.codeRequestUrl);
            }
        }
    }
    return out;
}

export function makeTsConfig(config) {

    // FIX make this compatible with build
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
            "baseUrl": "..",
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
    return tsConfig;
}




