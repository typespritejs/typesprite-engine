/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 * @see SchnackInterpreter
 */
export enum SchnackChunkType {
    /** unknown */
    CHUNK_UNK,
    /** a collection of text to print out */
    CHUNK_TEXT,
    /**
     * the chunk contains an instruction
     * like if, else, message etc.
     */
    CHUNK_INSTRUCTION,
    /** The parser is finished */
    CHUNK_END,
}


/**
 * A 'Chunk' in schnack-terms is basically an array of strings
 * with a type-constant. It can be either text or instruction.
 *
 * The rest is meta-data to be able to print out proper error messages.
 *
 * @see SchnackInterpreter
 */
export class SchnackChunk {

    /**
     * This array contains the tokens of the
     * chunk. Depending on the type the meaning
     * of the indices can mean different things.
     *
     * CHUNK_TEXT:
     * [0]		=>	Name/id of the speaker
     *				If no speaker is set it'll be an empty
     *				String
     * [1]		=>  Text of the speaker
     * [n-2]	=>  Name/id of the last speaker
     * [n-1]	=>  Text of the last speaker
     *
     * CHUNK_INSTRUCTION
     * [0]		=>	Function/instruction name. EG @if, @set, @message, ...
     * [...]	=>	Parameters depending instruction
     *
     * If the tokenData is empty it can be ignroed
     */
    public tokenData:any[] = [];
    public type:SchnackChunkType;
    public linePos:number;
    public firstChunkLine:string = "";

    constructor(type, linePos?) {

        this.type = type || SchnackChunkType.CHUNK_UNK;
        this.linePos = linePos || 0;
        this.firstChunkLine = "";
    }

    addToken(t) {
        if (Array.isArray(t)) {
            for (let i=0; i<t.length; i++)
            this.tokenData.push(t[i]);
        }
        else
            this.tokenData.push(t);
    }
    getTokenAt(i) {
        return this.tokenData[i];
    }
    getTokenCount() {
        return this.tokenData.length;
    }
    getType() {
        return this.type;
    }
    dumpLog() {
        let out = "CHUNK ";
        switch(this.type) {
            case SchnackChunkType.CHUNK_TEXT:
                out += "TEXT: ";
                break;
            case SchnackChunkType.CHUNK_INSTRUCTION:
                out += "INSTR: ";
                break;
            case SchnackChunkType.CHUNK_END:
                out += "END: ";
                break;
        }
        for (let i=0; i<this.tokenData.length; i++) {
            out += this.tokenData[i] + " | ";
        }
        console.log("Dump: " + out);
    }
    logError() {
        console.error(`Found error [line: ${this.linePos}] near: ${this.firstChunkLine}`);
    }
    getLinePos () {
        return this.linePos;
    }
}




