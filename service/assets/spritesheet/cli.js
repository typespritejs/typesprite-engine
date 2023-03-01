/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import { exec } from "node:child_process";

/**
 * Call commandline instruction
 *
 * const lsStr = await run('ls -la');
 * const lsStr = await run(['ls', '-la']);
 *
 * Throws error if exec writes to std-out or OS complains (like cmd-file not found)
 *
 * @param command string|string[]
 * @returns {Promise<string>}
 */
export async function run(command, print=false) {
    if (Array.isArray(command)) {
        command = command.join(' ');
    }
    if (print) {
        console.log("run " + command);
    }
    return await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                reject(error.message);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                reject(stderr);
                return;
            }
            resolve(`${stdout}`);
        });
    })
}

