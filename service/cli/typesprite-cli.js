/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-gameengine/blob/develop/LICENSE.MD
 */
import {server} from "../dev/server.js";
import { readJson } from "../utils/files.js";
import path from 'node:path'
import { fileURLToPath } from 'url';
import {build} from "../packing/build.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const engineDir = path.resolve(__dirname, "..", "..");

export async function cli() {

    if (process.argv.length <= 2) {
        console.log("❌ Please provide a command");
    }
    else if (process.argv[2]) {
        switch(process.argv[2]) {
            case "dev":
                console.log("-----------------------------");
                console.log("⭐️ TypeSpriteJS Game Engine ");
                console.log("-----------------------------");
                process.env.PWD = process.env.PWD || process.cwd();
                console.log("Game Directory: ", process.env.PWD);
                await server(process.env.PWD, engineDir);
                break;
            case "build":
                try {
                    process.env.PWD = process.env.PWD || process.cwd();
                    await build(process.env.PWD, engineDir)
                }
                catch(err) {
                    console.error(err, "\n------------------------\n🔥 Build failed. Sorry.")
                }
                break;
            case "version":
                const tsjsPackageJson = await readJson(path.join(engineDir, 'package.json'));
                console.log("tsjs", tsjsPackageJson.version);
                break;
            default:
                console.log("❌ Unknown command:", process.argv[2]);
                break;
        }
    }
}


