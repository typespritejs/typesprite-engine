/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {SchnackVarValue} from "./SchnackVarValue";


/**
 * @see SchnackInterpreter
 */
export enum SchnackVarScope {
    /** variable exists during the entire game */
    GAME,
    /** variable exists during the current map */
    MAP,
    /** variable exists throut in the current talk session */
    SESSION,
}


/**
 *
 * @see SchnackInterpreter
 */
export class SchnackVar {
    
    public name;
    public value;
    public persistent;
    public scope;
    
    constructor(name, value) {
        this.name = name || "";
        this.value = new SchnackVarValue(value /* intentional. constr takes care of null etc */);
        this.persistent = false;
        this.scope = SchnackVarScope.GAME;
    }

    getName() {
        return this.name;
    }
    /** @returns SchnackVarValue */
    getValue() {
        return this.value;
    }
    dumpString() {
        let out = "{";
        switch(this.scope) {
            case SchnackVarScope.GAME:
                out += "[GAME]";
                break;
            case SchnackVarScope.SESSION:
                out += "[SESSION]";
                break;
            case SchnackVarScope.MAP:
                out += "[MAP]";
                break;
        }

        out += " = " + this.value.dumpString();
        return out;
    }
    isPersistent() {
        return this.persistent;
    }
    setPersistent(p) {
        this.persistent = p ? true : false;
    }
    getScope() {
        return this.scope;
    }
    setScope(s) {
        if (s == SchnackVarScope.SESSION)
            this.scope = s;
        else if (s == SchnackVarScope.MAP)
            this.scope = s;
        else if (s == SchnackVarScope.GAME)
            this.scope = SchnackVarScope.GAME;
        else
            console.warn("setScope(): unknown", s);
    }
}