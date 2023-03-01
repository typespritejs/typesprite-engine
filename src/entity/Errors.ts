/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 *
 */
export class InitError extends Error {
    public initIssue:string;

    constructor(issue) {
        super(issue);
        this.initIssue = issue;
    }

}