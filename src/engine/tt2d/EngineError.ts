/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 *
 */
export enum EngineErrorType {
    ERROR_CREATING_CONTEXT,
    ERROR_CREATE_FRAMEBUFFER
}


export class EngineError {
    constructor(private err:EngineErrorType) {
    }
}

