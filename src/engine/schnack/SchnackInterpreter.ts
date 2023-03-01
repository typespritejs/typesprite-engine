/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {SchnackParser} from "./SchnackParser";
import {SchnackVar, SchnackVarScope} from "./SchnackVar";
import {SchnackVarValue} from "./SchnackVarValue";
import {SchnackChunk, SchnackChunkType} from "./SchnackChunk";
import {SchnackResult, SchnackResultType} from "./SchnackResult";
import {splitTrimmed} from "@tsjs/engine/schnack/SchnackUtil";

const LEVEL_DEPTH = 8;
const MATCH_NAME = /^[a-zA-Z][a-zA-Z0-9\._]*$/g;


/**
 * SchnackInterpreter allows you to execute schnack-files which
 * is a text format meant to control NPC dialogs.
 *
 * ```ini
 * [Player]
 * Hello!
 *
 * @if count >= 1
 *   [SomeNpc]
 *   Hallo Again!
 * @else
 *   [SomeNpc]
 *   Hallo nice to meet you!
 * @endif
 *
 * @set count ++
 * ```
 *
 * ---
 * ⚠️ experimental
 *
 * Converted from C++ to Javascript to Typescript. No types, no testing => needs work!
 */
export class SchnackInterpreter {

    public currentParser:any = null;
    public storage:any = {};
    public callScope:any = 0;
    public lastFile:any = "";
    public lastFileScope:any = "";
    public ifLevel:any = 0;
    public ifLevelDone:any = [];
    public fileProvider:(file:any)=>string;

    constructor(fileProvider:(file:any)=>string) {
        this.currentParser = null;
        this.storage = {};
        this.callScope = 0;
        this.lastFile = "";
        this.lastFileScope = "";
        this.ifLevel = 0;
        this.ifLevelDone = [];
        this.fileProvider = fileProvider;
    }

    /**
     * Parses the script-file. The results will be handled
     * with the listener.
     * You should
     *
     * NOTE: You can only parse one script at a time.
     * It'll assert if there is already a script
     */
    initScript (file, alternativeScopeName) {
        const scopeName = alternativeScopeName || file;

        this.lastFileScope = scopeName;
        this.lastFile = file;
        this.callScope = 0;
        this.ifLevel = 0;
        this.ifLevelDone = [];
        for (let i=0; i<LEVEL_DEPTH; i++)
            this.ifLevelDone.push(false);

        const _code = this.fileProvider(file);
        this.currentParser = new SchnackParser(scopeName, _code);
    }

    /**  executes a script from a string */
    initScriptFromSource(pseudoFileName, sourceCode) {
        this.lastFile = "";
        this.callScope = 0;
        this.ifLevel = 0;
        this.ifLevelDone = [];
        for (let i=0; i<LEVEL_DEPTH; i++)
            this.ifLevelDone.push(false);
        this.currentParser = new SchnackParser(pseudoFileName, sourceCode);
    }

    /** call this after a selection */
    reinitAfterSelection () {
        if (!this.lastFile)
            return;
        this.initScript(this.lastFile, this.lastFileScope);
    }

    /** executes script-step */
    executeScriptStep() {
        if (!this.currentParser) {
            console.error("parse is null");
            return null;
        }

        let chunk = this.currentParser.parseNextChunk();
        while(this.currentParser != null && chunk.getType() != SchnackChunkType.CHUNK_END) {
            if (chunk.getType() == SchnackChunkType.CHUNK_TEXT)
            {
                const type = SchnackResultType.TEXT;
                const data = [];
                for (let i=0; i<chunk.getTokenCount(); i +=2) {
                    data.push({
                        personId: chunk.getTokenAt(i+0),
                        text: chunk.getTokenAt(i+1),
                    });
                }
                return new SchnackResult(data, type);
            }
            else if (chunk.getType() == SchnackChunkType.CHUNK_INSTRUCTION) {
                const instrToken = chunk.getTokenAt(0);
                if (chunk.getTokenCount() == 0)
                {
                    console.error("Error parsing script  Invalid token");
                    chunk.logError();
                    return new SchnackResult(null, SchnackResultType.ERROR);
                }

                if (instrToken === "@end") {
                    this.currentParser = null;
                    return new SchnackResult(null, SchnackResultType.FINISHED);
                }
                else if (instrToken == "@message") {
                    const data = [];
                    for (let i=1; i<chunk.getTokenCount(); i++) {
                        data.push(chunk.getTokenAt(i));
                    }
                    return new SchnackResult(data, SchnackResultType.MSG);
                }
                else if (instrToken == "@select") {
                    const data:any = {};
                    const rawQuestionVarName = chunk.getTokenAt(1);
                    if (!this.checkVarName(rawQuestionVarName)) {
                        console.error("@select invalid character in question-varname");
                        chunk.logError();
                        return new SchnackResult(null, SchnackResultType.ERROR);
                    }
                    data.questionVar = this.getVarName(rawQuestionVarName);
                    data.question = chunk.getTokenAt(2);
                    data.answerOptions = {};
                    for (let i=3;i<chunk.getTokenCount(); i += 2) {
                        let insert = true;
                        const varNameOrCondition = chunk.getTokenAt(i+0);
                        let varName = "";
                        let conditionIndex = varNameOrCondition.indexOf('(');
                        if (conditionIndex > 0) {
                            varName = varNameOrCondition.substr(0, conditionIndex);
                            const condition = varNameOrCondition.substr(conditionIndex + 1, varNameOrCondition.length - (conditionIndex + 2));
                            const conditionParts = splitTrimmed(condition, ' ', true);

                            const pseudoChunk = new SchnackChunk(SchnackChunkType.CHUNK_INSTRUCTION, chunk.getLinePos());
                            pseudoChunk.addToken("@if");
                            pseudoChunk.addToken(conditionParts);

                            if (!this.checkConditionParameter(pseudoChunk)) {
                                console.error("@select invalid condition in select variable: " + condition);
                                chunk.logError();
                                return new SchnackResult(null, SchnackResultType.ERROR);
                            }

                            if (!this.checkConditionVarName(pseudoChunk)) {
                                console.error("@select invalid varname in selection condition: " + condition);
                                chunk.logError();
                                return new SchnackResult(null, SchnackResultType.ERROR);
                            }

                            if (!this.checkCondition(pseudoChunk)) {
                                insert = false;
                            }
                        }
                        else {
                            varName = varNameOrCondition;
                        }

                        if (!this.checkVarName(varName)) {
                            console.error("@select invalid answer-varname: " + varName);
                            chunk.logError();
                            return new SchnackResult(null, SchnackResultType.ERROR);
                        }

                        if (insert) {
                            data.answerOptions[varName] = chunk.getTokenAt(i+1);
                        }
                    }

                    this.currentParser = null;
                    return new SchnackResult(data, SchnackResultType.SELECT);
                }
                else if (instrToken == "@set") {
                    if (!this.checkSetParameter(chunk) ) {
                        console.error("@set Expects @set <variable> = <value> or @set <variable> ++, -- or @set <variable> +=, -= <value> or @set <variable> .= <value>");
                        chunk.logError();
                        return new SchnackResult(null, SchnackResultType.ERROR);
                    }

                    // let's fetch the target variable
                    const rawVarName = chunk.getTokenAt(1);
                    const isOkay = this.checkVarName(rawVarName);
                    if (!isOkay) {
                        console.error("@set invalid varname");
                        chunk.logError();
                        return new SchnackResult(null, SchnackResultType.ERROR);
                    }
                    const varName = this.getVarName(rawVarName);
                    const vv = this.storage[varName] || false;
                    const v = new SchnackVarValue(vv ? vv.getValue() : null);
                    const operatorToken = chunk.getTokenAt(2);

                    // perform the operation
                    if (chunk.getTokenCount() == 3) {
                        switch(operatorToken) {
                            case "++":
                                v.increment();
                                break;
                            case "--":
                                v.decrement();
                                break;
                            default:
                                chunk.logError();
                                return new SchnackResult(null, SchnackResultType.ERROR);
                        }
                    }
                    else {
                        const varValue = chunk.getTokenAt(3);
                        switch(operatorToken) {
                            case "=":
                                v.setValue(varValue);
                                break;
                            case "+=":
                                v.incrementBy(varValue);
                                break;
                            case "-=":
                                v.decrementBy(varValue);
                                break;
                            case ".=":
                                v.concat(varValue);
                                break;
                            default:
                                chunk.logError();
                                return new SchnackResult(null, SchnackResultType.ERROR);
                        }
                    }

                    // get back data for reporting
                    const scope = this.getScopeByName(varName);
                    const oldVar = vv;
                    const newVar = this.setVar(scope, varName, v);

                    return new SchnackResult({
                        newVar: newVar,
                        oldVar: oldVar,
                        oldVarExist: vv ? true : false,
                    }, SchnackResultType.VARCHANGE);
                }
                else if (instrToken == "@if") {
                    if (!this.checkConditionParameter(chunk)) {
                        console.error("@if Expects @if =, !=, >=, <=, <, > <value>");
                        chunk.logError();
                        return new SchnackResult(null, SchnackResultType.ERROR);
                    }

                    this.ifLevel++;
                    this.ifLevelDone[this.ifLevel] = false;
                    const varNameOkay = this.checkConditionVarName(chunk);
                    if (!varNameOkay) {
                        console.error("@if invalid varname");
                        chunk.logError();
                        return new SchnackResult(null, SchnackResultType.ERROR);
                    }

                    const condition = this.checkCondition(chunk);
                    if (condition) {
                        this.ifLevelDone[this.ifLevel] = true;
                    }
                    else {
                        this.skipTillEndif();
                    }
                }
                else  if (instrToken == "@elseif") {
                    if (this.ifLevel == 0) {
                        console.error("SchnackInterpreter @elseif without if!");
                        chunk.logError();
                        return new SchnackResult(null, SchnackResultType.ERROR);
                    }
                    if (!this.checkConditionParameter(chunk)) {
                        console.error("@elseif expects @elseif =, !=, >=, <=, <, > <value>");
                        chunk.logError();
                        return new SchnackResult(null, SchnackResultType.ERROR);
                    }
                    if (this.ifLevelDone[this.ifLevel]) {
                        // a previous if/elseif already
                        // fulfilled the condition and was executed
                        // so we can just skip it here.
                        this.skipTillEndif();
                    }
                    else {
                        const varNameOkay = this.checkConditionVarName(chunk);
                        if (!varNameOkay) {
                            console.error("@elseif invalid varname");
                            chunk.logError();
                            return new SchnackResult(null, SchnackResultType.ERROR);
                        }
                        const condition = this.checkCondition(chunk);
                        if (condition) {
                            // the block has not been executed
                            // and we fulfill the condition: lets execute it
                            this.ifLevelDone[this.ifLevel] = true;
                        }
                        else {
                            // the block is not executed and
                            // we do not fulfill the condition:
                            // lets search for the next elseif/else
                            this.skipTillEndif();
                        }
                    }
                }
                else if (instrToken == "@else") {
                    if (this.ifLevel == 0)
                    {
                        console.error("SchnackInterpreter @else without if!");
                        chunk.logError();
                        return new SchnackResult(null, SchnackResultType.ERROR);
                    }

                    if (this.ifLevelDone[this.ifLevel] == false)
                    {
                        // we are in the elseblock and
                        // until now all previous blocks have
                        // not been able to fulfull the if/elseif
                        // conditions.
                        //
                        // then we can exeicute it now :)
                        this.ifLevelDone[this.ifLevel] = true;
                    }
                    else
                    {
                        // a previous if/elseif already
                        // fulfilled the condition and was executed
                        // so we can just skip it here.
                        this.skipTillEndif();
                    }
                }
                else if (chunk.getTokenAt(0) == "@endif")
                {
                    if (this.ifLevel == 0)
                    {
                        console.error("SchnackInterpreter @endif without if!");
                        chunk.logError();
                        return new SchnackResult(null, SchnackResultType.ERROR);
                    }

                    // we are leaving the endif block :)
                    this.ifLevelDone[this.ifLevel] = true;
                    this.ifLevel--;
                }
            }
            chunk = this.currentParser.parseNextChunk();
        }

        if (this.ifLevel > 0)
        {
            console.error("SchnackInterpreter Found unexpected end!");
            return new SchnackResult(null, SchnackResultType.UNEXPECTED_END);
        }

        if (chunk.getType() == SchnackChunkType.CHUNK_END)
        {
            this.currentParser = null;
            return new SchnackResult(null, SchnackResultType.FINISHED);
        }

        // here we actually have an unexpected state :-/
        return new SchnackResult(null, SchnackResultType.UNEXPECTED_END);
    }

    /**
     *
     * @returns SchnackVar the created object holding the value
     */
    setVar(scope, name, val) {
        const sv = new SchnackVar(name, val);
        sv.setPersistent(true);
        sv.setScope(scope);
        this.storage[name] = sv;
        return sv;
    }

    /**
     * @returns boolean true on success
     */
    removeVar(name) {
        if (this.storage[name]) {
            delete this.storage[name];
            return true;
        }
        return false;
    }

    /**
     * @returns {SchnackVar|boolean}
     */
    getVar(name) {
        return this.storage[name] || false;
    }

    /**
     * returns a vector with all variables that are
     * flagged as persistant
     */
    getPersistentVars() {
        const out = [];
        Object.keys(this.storage).forEach(k => {
            const v = this.storage[k];
            if (v.isPersistent())
                out.push(v);
        });
        return out;
    }

    /** removes all variables that have map-scope. */
    releaseMapScope() {
        Object.keys(this.storage).forEach(k => {
            const v = this.storage[k];
            if (v.getScope() == SchnackVarScope.MAP) {
                delete this.storage[k];
            }
        });
    }

    /** removes all variables that have session-scope. */
    releaseSessionScope() {
        Object.keys(this.storage).forEach(k => {
            const v = this.storage[k];
            if (v.getScope() == SchnackVarScope.SESSION) {
                delete this.storage[k];
            }
        });
    }

    getScopeByName(varName) {
        if (varName.startsWith("map.")) {
            return SchnackVarScope.MAP;
        }
        else if (varName.startsWith("session.")) {
            return SchnackVarScope.SESSION;
        }
        return SchnackVarScope.GAME;
    }

    /** checks if the given condition has a valid var name */
    checkConditionVarName(condition) {
        const rawVarNameFromScript = condition.getTokenAt(1);
        return this.checkVarName(rawVarNameFromScript);
    }

    /** retruns true if the condition is true */
    checkCondition(condition) {

        // fetch left hand var
        const rawVarNameFromScript = condition.getTokenAt(1);
        const varName = this.getVarName(rawVarNameFromScript);
        const potentialVarObj = this.getVar(varName);
        const varObj = potentialVarObj ? potentialVarObj : new SchnackVar(varName, 0);

        // fetch right hand value
        const cmp = new SchnackVarValue(condition.getTokenAt(3));

        // perform condition checking
        const cmpToken = condition.getTokenAt(2);
        switch(cmpToken) {
            case "=":
            case "==":
                return varObj.getValue().equals(cmp);
            case "!=":
                return !varObj.getValue().equals(cmp);
            case "<":
                return varObj.getValue().compare(cmp) < 0;
            case ">":
                return varObj.getValue().compare(cmp) > 0;
            case "<=":
                return varObj.getValue().compare(cmp) < 0 ||
                    varObj.getValue().equals(cmp);
            case ">=":
                return varObj.getValue().compare(cmp) > 0 ||
                    varObj.getValue().equals(cmp);
            default:
                console.error("SchnackInterpreter::checkCondition Unknown comperator " + cmpToken);
        }
        return false;
    }

    checkConditionParameter(condition) {
        if (condition.getTokenCount() != 4)
            return false;
        const cmpToken = condition.getTokenAt(2);
        switch(cmpToken) {
            case "=":
            case "==":
            case "!=":
            case "<":
            case ">":
            case "<=":
            case ">=":
                break;
            default:
                return false;
        }
        return true;
    }

    checkSetParameter(setChunk) {
        const tokenCount = setChunk.getTokenCount();
        const operatorToken = setChunk.getTokenAt(2);
        if (tokenCount == 3) {
            if (operatorToken != "++" && operatorToken != "--") {
                console.error("@set invalid operator:", operatorToken);
                return false;
            }
        }
        else if (tokenCount == 4) {
            if (operatorToken != "+" &&
                operatorToken != "-" &&
                operatorToken != "-=" &&
                operatorToken != "+=" &&
                operatorToken != ".=" &&
                operatorToken != "=") {
                console.error("@set invalid operator:", operatorToken);
                return false;
            }
        }
        else {
            console.error("@set invalid parameter count", tokenCount);
            return false;
        }
        return true;
    }

    skipTillEndif() {
        let level = 0;
        let chunk = this.currentParser.parseNextChunk();
        while(chunk.getType() != SchnackChunkType.CHUNK_END) {
            if (chunk.getType() == SchnackChunkType.CHUNK_INSTRUCTION) {
                const instrToken = chunk.getTokenAt(0);
                switch (instrToken) {
                    case "@if":
                        level++;
                        break;
                    case "@elseif":
                    case "@else":
                        if (level == 0) {
                            this.currentParser.restoreLastChunk();
                            return;
                        }
                        break;
                    case "@endif":
                        if (level == 0) {
                            this.currentParser.restoreLastChunk();
                            return;
                        }
                        level--;
                        break;
                }
            }
            chunk = this.currentParser.parseNextChunk()
        }
        console.error("SchnackInterpreter() missing @endif");
    }

    /** builds a var name considering the current script context. */
    getVarName(rawName) {
        if (!this.checkVarName(rawName))
            console.error("getVarName() invalid name: " + rawName);
        if (rawName.indexOf(".") >= 0)
            return rawName;
        const prefix = this.currentParser.getSchnackId() + ".";
        return prefix + rawName;
    }

    /** checks if the given var name is valid */
    checkVarName(rawName) {
        return rawName.match(MATCH_NAME);
    }

}
