/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 * Transforms:
 *
 * "a/b/c" => "a/b"
 * "a/b/c/" => "a/b"
 * "a/b/file.txt" => "a/b"
 * "" => ""
 * "/" => ""
 * "file.txt" => "file.txt"
 */
export function dirname(path:string):string {
    if (typeof path !== "string")
        throw new Error(`Invalid type of ${typeof path} for basename`)
    path = path.trim();
    // 'a/b/'
    //     ^
    //     remove
    path = path.endsWith("/") ? path.substr(0, path.length-1) : path;
    if (!path)
        return path;

    const sep = path.lastIndexOf('/');
    if (sep === -1)
        return path;
    return path.substring(0, sep);
}

