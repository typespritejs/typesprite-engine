/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {SchnackChunk, SchnackChunkType} from "./SchnackChunk";
import {splitTrimmed} from "@tsjs/engine/schnack/SchnackUtil";


/**
 *
 * @see SchnackInterpreter
 */
export class SchnackParser {

    /** source code of the file */
    public source:any;
    /**
     * id of the schnack-script.
     * the id is e
     */
    public schnackId:any;
    /**  the readposition for readNextLine */
    public readPosition = 0;
    /** saved position for resetLine */
    public savedLine = 0;
    /** current lineposition */
    public linePos = 0;
    /** always the last chunk */
    public savedChunk:any;
    /** */
    public useLastChunk = false;

    /** tmp variable to simulate c++ refs */
    public _refString:any = {ref: ""};

    constructor(fileName, source) {
        /** source code of the file */
        this.source = source || "";
        /**
         * id of the schnack-script.
         * the id is e
         */
        this.schnackId = this.parseSchnackId(fileName||"");
        /**  the readposition for readNextLine */
        this.readPosition = 0;
        /** saved position for resetLine */
        this.savedLine = 0;
        /** current lineposition */
        this.linePos = 0;
        /** always the last chunk */
        this.savedChunk = new SchnackChunk(SchnackChunkType.CHUNK_UNK);
        /** */
        this.useLastChunk = false;

        /** tmp variable to simulate c++ refs */
        this._refString = {ref: ""};
    }
    
    resetLine() {
        if (this.readPosition == this.savedLine) {
            return;
        }
        this.linePos--;
        this.readPosition = this.savedLine;
    }
    
    readNextLine(outLine) {
        outLine.ref = "";
        if (this.readPosition >= this.source.length) {
            return false;
        }
        this.savedLine = this.readPosition;
        while(this.readPosition < this.source.length) {
            const c = this.source[this.readPosition++];
            if (c == "\r")
                continue;
            if (c == "\n") {
                this.linePos++;
                break;
            }
            outLine.ref += c;
        }
        outLine.ref = outLine.ref.trim();
        return true;
    }
    parseSchnackId(fileNameWithPath) {
        const p = fileNameWithPath.lastIndexOf("/") + 1;
        const fileName = fileNameWithPath.substring(p);
        const dot = fileName.indexOf(".");
        const r = fileName.toLowerCase().substring(0, dot > 0 ? dot : undefined);
        return r;
    }
    parseTextChunk(firstLine, chunk) {
        let text = "";
        if (firstLine[0] == '[') {
            const speaker = firstLine.substring(1, firstLine.length-1);
            chunk.addToken(speaker);
        }
        else {
            chunk.addToken("");
            text =  firstLine;
        }

        let isMore = false;
        let line = "";
        while(true) {
            isMore = this.readNextLine(this._refString);
            line = this._refString.ref;
            if (!isMore) {
                break;
            }
            if (!line) {
                // if we are currently reading a text
                // we add a \n for each line.
                // BUT we do it only once. Multiple \n's won't
                // be recognized.
                if (text && text[text.length - 1] != '\n') {
                    text += '\n';
                }
                continue;
            }
            let route = line[0];
            switch(route) {
                case '#':
                    continue;
                case '[':
                    if (text)
                        chunk.addToken(text);
                    text = "";
                    chunk.addToken(line.substring(1, line.length-1));
                    break;
                case '@':
                    if (text) {
                        chunk.addToken(text);
                    }
                    this.resetLine();
                    return;
                default:
                    if (!text)
                        text = line;
                    else
                        text += '\n' + line;
                    break;
            }
        }
        if (text) {
            chunk.addToken(text);
        }
    }
    parseInstructionChunk(instruction, chunk) {

        // something like @message music mute
        if (instruction.startsWith("@message")) {
            const pos = instruction.indexOf(' ');
            if (pos == -1)
            {
                console.error("parseInstructionChunk()" + "[line:" + this.linePos + "] Invalid command: " + instruction + ". At least one Parameter is required!");
                return;
            }

            chunk.addToken(instruction.substring(0, pos));
            const paramPart = instruction.substring(pos);
            const parts = paramPart.split(',');
            for (let i=0; i<parts.length; i++) {
                const trimmedPart = parts[i].trim();
                if (trimmedPart) {
                    chunk.addToken(trimmedPart);
                }
            }
        }
        else if (   instruction == "@else" ||
                    instruction == "@end" ||
                    instruction == "@endif") {
            chunk.addToken(instruction);
        }
        else if (instruction.startsWith("@set")) {
            this.parseHelperAssign(instruction, chunk);
        }
        else if (instruction.startsWith("@elseif") || instruction.startsWith("@if")){
            this.parseHelperCondition(instruction, chunk);
        }
        else if (instruction == "@select") {
            chunk.addToken(instruction);
            let line = "";
            while(true) {
                let isMore = this.readNextLine(this._refString);
                const line = this._refString.ref;
                if (!isMore) {
                    console.error("parseInstructionChunk()" + "[line:" + this.linePos + "] @select without @endselect!");
                    return;
                }
                if (line && line[0] == '@' && line != "@endselect")
                {
                    console.error("parseInstructionChunk()" + "[line:" + this.linePos + "] @select expects @endselect!");
                    return;
                }
                if (!line || line[0] == "#") {
                    continue;
                }
                if (line == "@endselect") {
                    break;
                }

                const parts = splitTrimmed(line, ':', false, 2);
                if (parts.length == 0) {
                    console.error("parseInstructionChunk()" + "[line:" + this.linePos + "] @select expects a list of possible answers line and semicolon seperated!");
                    return;
                }
                chunk.addToken(parts);
            }
        }
        else if (instruction == "@endselect") {
            console.error("parseInstructionChunk()" + "[line:" + this.linePos + "] Unexpected @endselect");
            return;
        }
        else {
            console.error("parseInstructionChunk()" + "[line:" + this.linePos + "] Unknown instruction: " + instruction);
            return;
        }
    }
    parseHelperAssign(instruction, chunk) {
        const parts = splitTrimmed(instruction, ' ', true, 4);
        chunk.addToken(parts);
    }
    parseHelperCondition(instruction, chunk) {
        const parts = splitTrimmed(instruction, ' ', true, 4);
        chunk.addToken(parts);
    }
    getSchnackId() {
        return this.schnackId;
    }
    parseNextChunk() {
        if (this.useLastChunk) {
            this.useLastChunk = false;
            return this.savedChunk;
        }

        let lastLinePos = 0;
        let isMore = false;
        let line = "";

        while(true) {
            lastLinePos = this.linePos;
            isMore = this.readNextLine(this._refString);
            line = this._refString.ref;
            if (!isMore) {
                const c = new SchnackChunk(SchnackChunkType.CHUNK_END);
                c.linePos = lastLinePos;
                return c;
            }

            if (line) {
                if (line[0] == '#') {
                    continue;
                }
                else {
                    break;
                }
            }
        }

        if (line[0] == '@') {
            const ret = new SchnackChunk(SchnackChunkType.CHUNK_INSTRUCTION);
            ret.linePos = lastLinePos;
            ret.firstChunkLine = line;
            this.parseInstructionChunk(line, ret);
            this.savedChunk = ret;
            return ret;
        }
        else {
            const ret = new SchnackChunk(SchnackChunkType.CHUNK_TEXT);
            ret.linePos = lastLinePos;
            ret.firstChunkLine = line;
            this.parseTextChunk(line, ret);
            this.savedChunk = ret;
            return ret;
        }
    }
    restoreLastChunk() {
        this.useLastChunk = true;
    }
}