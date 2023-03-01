/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 *
 */
export async function doJobs(jobs, maxParallel = 8) {
    const pending = [...jobs];
    while(pending.length > 0) {
        const next = [];
        for (let i=0; i<maxParallel && pending.length > 0; i++) {
            next.push(pending.shift())
        }
        await Promise.all(
            next
        );
    }
}