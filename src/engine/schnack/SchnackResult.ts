/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 * @see SchnackInterpreter
 */
export enum SchnackResultType {
    TEXT,
    SELECT,
    VARCHANGE,
    MSG,
    FINISHED,
    UNEXPECTED_END,
    ERROR,
}


/**
 * @see SchnackInterpreter
 */
export class SchnackResult {

    public resultData:any;
    public type:any;

    constructor(
        data:any,
        type:any
    ) {
        this.type = type;
        this.resultData = data;
    }

    getResultAsVarChange() {
        if (this.type == SchnackResultType.VARCHANGE)
            return this.resultData;
        return null;
    }
    getResultAsSelect() {
        if (this.type == SchnackResultType.SELECT)
            return this.resultData;
        return null;
    }
    getAsSchnackMessage() {
        if (this.type == SchnackResultType.MSG)
            return this.resultData;
        return null;
    }
    getAsSchnackText() {
        if (this.type == SchnackResultType.TEXT)
            return this.resultData;
        return null;
    }
    getType() {
        return this.type;
    }
    getData() {
        return this.resultData;
    }

}