/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {server} from "../dev/server.js";
import { readJson } from "../utils/files.js";
import path from 'node:path'
import { fileURLToPath } from 'url';
import {build} from "../packing/build.js";
import {CliConfig, parseCli} from './cli-parser.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const engineDir = path.resolve(__dirname, "..", "..");

export async function cli() {

    if (process.argv.length <= 2) {
        console.log("❌ Please provide a command");
        process.exitCode = 2;
    }
    else if (process.argv[2]) {
        switch(process.argv[2]) {
            case "dev":
                const cliProps = parseCommands(
                    new CliConfig()
                        .appendCommand('experimental-reload', 'e-r', `Enables experimental watch of 'typesprite.config.mjs'`)
                        .appendCommand('help', 'h', `Shows all options for the 'dev' part of the cli`)
                );
                if (cliProps === null) {
                    return;
                }
                const propExperimentalReload = cliProps.cliHas('experimental-reload');
                console.log("⭐️ TypeSpriteJS Game Engine ⭐️");
                process.env.PWD = process.env.PWD || process.cwd();
                console.log("Game Directory: ", process.env.PWD);
                await server(process.env.PWD, engineDir, propExperimentalReload);
                break;
            case "build":
                try {
                    process.env.PWD = process.env.PWD || process.cwd();
                    await build(process.env.PWD, engineDir)
                }
                catch(err) {
                    console.error(err, "\n------------------------\n🔥 Build failed. Sorry.")
                    process.exitCode = 1;
                }
                break;
            case "version":
                const tsjsPackageJson = await readJson(path.join(engineDir, 'package.json'));
                console.log("tsjs", tsjsPackageJson.version);
                break;
            default:
                console.log("❌ Unknown command:", process.argv[2]);
                process.exitCode = 2;
                break;
        }
    }
}


function parseCommands(config) {
    const devArgs = [...process.argv];
    devArgs.shift(); // pwd
    devArgs.shift(); // self
    const rootCommand = devArgs.shift(); // e.g. "dev"
    try {
        const res = parseCli(config, devArgs);
        if (res.cliHas('help')) {
            printHelp(rootCommand, config);
            return null;
        }
        return res;
    } catch(err) {
        console.log(`❌ cli issue with '${rootCommand}' command. Issue: ${err.message}`);
    } 
    return null;
} 

/**
 * 
 * @param {*} rootCommand 
 * @param {CliConfig} config 
 */
function printHelp(rootCommand, config) {
    const lines = [];
    lines.push(`All Options for typesprite ${rootCommand}:`);

    for (let cmd of config.commands) {
        lines.push("");
        lines.push(`* ${cmd.name}, --${cmd.name} or -${cmd.short}`);
        lines.push(`details: ${cmd.desc}` );
    }
    
    console.log(lines.join('\n'));
}

