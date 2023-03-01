/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 * @see SchnackInterpreter
 */
export enum SchnackVarValueType {
    NUMBER,
    STRING,
}


/**
 * A switchable variable between string and number.
 *
 * We still need this class in JavaScript as we can have a double meaning of null
 * otherwise.
 *
 * @see SchnackInterpreter
 */
export class SchnackVarValue {
    
    public str:any;
    public num:any;
    public type:any;

    constructor(value) {
        this.str = "";
        this.num = 0;
        this.type = SchnackVarValueType.STRING;
        if (value || value === 0)
            this.setValue(value)
    }
    
    _num(numVal) {
        if (typeof numVal != "number")
            console.error("error! no number!");
        this.num = numVal;
    }
    _str(strVal) {
        if (typeof strVal != "string")
            console.error("error! no string!");
        this.str = strVal;
    }
    _convertToNumber(num) {
        this._num(num);
        this.str = "";
        this.type = SchnackVarValueType.NUMBER;
    }
    /**
     * NOTE:
     * In case of a string this function tries to parse the value
     * from string to number.
     *
     * setValue(0)   => number
     * setValue("0") => number
     * setValue("a") => string
     *
     * @param v handles: strings, numbers and SchnackVarValue instances.
     */
    setValue(v) {
        const t = typeof v;
        if (t == "string") {
            const parsedValue = Number(v);
            if (Number.isNaN(parsedValue)) {
                this.type = SchnackVarValueType.STRING;
                this._num(0);
                this._str(v);
            }
            else {
                this._num(parsedValue);
                this._str("");
                this.type = SchnackVarValueType.NUMBER;
            }
        }
        else if (t == "number") {

            this._str("");
            this._num(v);
            this.type = SchnackVarValueType.NUMBER;
        }
        else if (t == "object" && v instanceof SchnackVarValue) {
            // @ts-ignore
            this.num = v.num;
            // @ts-ignore
            this.str = v.str;
            // @ts-ignore
            this.type = v.type;
        }
        else if (!v) {
            this._num(0);
            this._str("");
            this.type = SchnackVarValueType.STRING;
        }
        else {
            console.error("SchnackVarValue.setValue() incompatible type:", t, "with value", v);
        }
    }
    /**
     * Sets the value without trying to parse numbers.
     *
     * setValue(0)   => number
     * setValue("0") => string
     * setValue("a") => string
     *
     * @param v handles strings, numbers and SchnackVarValue instances.
     */
    setValueNoParse(v) {
        const t = typeof v;
        if (t == "string") {
            this.type = SchnackVarValueType.STRING;
            this._num(0);
            this._str(v);
        }
        else {
            this.setValue(v);
        }
    }
    /**
     * Changes the type to "string" and only accepts a string for a value
     */
    setAsString(strValue) {
        console.warn("setAsString() don't use! Use setValueNoParse instead");
        this.setValueNoParse(strValue);
    }
    /**
     * Changes the type to "string" and only accepts a string for a value
     */
    setAsNumber(numValue) {
        console.warn("setAsNumber() don't use! Use setValueNoParse instead");
        this.setValueNoParse(numValue);
    }
    /**
     * true if they are equal
     *
     * if typeCheck is false the comparsion does not consider the types
     */
    equals(sv, typeCheck = false) {
        if (typeCheck && this.type != sv.type) {
            return false;
        }
        return this.getAsString() == sv.getAsString();
    }

    /**
     * true if they are equal
     *
     * if typeCheck is false the comparsion does not consider the types
     */
    compare(sv) {
        if (this.type != sv.type) {
            return this.getAsString().localeCompare(sv.getAsString());
        }
        if (this.isNumber()) {
            if (this.num < sv.num)
                return -1;
            else if (this.num > sv.num)
                return 1;
            return 0;
        }
        return this.str.localeCompare(sv.str); // string
    }
    increment() {
        if (this.type == SchnackVarValueType.NUMBER)
            this.num++;
        else
            this._convertToNumber(1);
    }
    incrementBy(sv) {
        if (sv instanceof SchnackVarValue) {
            // @ts-ignore
            const numVal = sv.getAsNumber();
            if (this.type == SchnackVarValueType.NUMBER)
                this.num += numVal;
            else
                this._convertToNumber(numVal);
        }
        else {
            const t = typeof sv;
            if (t == "number") {
                if (this.type == SchnackVarValueType.NUMBER)
                    this.num += sv;
                else
                    this._convertToNumber(sv);
            }
            else {
                const val = new SchnackVarValue(sv);
                this.incrementBy(val);
            }
        }

    }
    decrement() {
        if (this.type == SchnackVarValueType.NUMBER)
            this.num--;
        else
            this._convertToNumber(-1);
    }
    decrementBy(sv) {
        if (sv instanceof SchnackVarValue) {
            // @ts-ignore
            const numVal = sv.getAsNumber();
            if (this.type == SchnackVarValueType.NUMBER)
                this.num -= numVal;
            else
                this._convertToNumber(-numVal);
        }
        else {
            const t = typeof sv;
            if (t == "number") {
                if (this.type == SchnackVarValueType.NUMBER)
                    this.num -= sv;
                else
                    this._convertToNumber(-sv);
            }
            else {
                const val = new SchnackVarValue(sv);
                this.decrementBy(val);
            }
        }
    }
    concat(sv) {
        if (sv instanceof SchnackVarValue) {
            if (this.type == SchnackVarValueType.NUMBER) {
                // @ts-ignore
                this._str(this.getAsString() + sv.getAsString());
                this._num(0);
                this.type = SchnackVarValueType.STRING;
            }
            else {
                // @ts-ignore
                this._str(this.str + sv.getAsString());
            }
        }
        else {
            const type = typeof sv;
            if (type == "string") {
                if (this.type == SchnackVarValueType.NUMBER) {
                    this._str(this.getAsString() + sv);
                    this._num(0);
                    this.type = SchnackVarValueType.STRING;
                }
                else {
                    this.str += sv;
                }
            }
        }
    }
    /** resets the data to zero, type is unchanged */
    setEmpty() {
        this.str = "";
        this.num = 0;
    }
    /**
     * compare with: SchnackVarValueType.STRING or SchnackVarValueType.NUMBER
     */
    getType() {
        return this.type;
    }
    dumpString() {
        let out = "";
        if (this.isString()) {
            out += "[string:\"" + this.getAsString() + "\"]";
            //@out.Append("[string:\"").Append(strValue).Append("\"]");
        }
        else {
            out += "[number:\"" + this.getAsString() + "\"]";
        }
        return out;
    }
    /** true if the value is a string */
    isString() {
        return this.type == SchnackVarValueType.STRING;
    }
    /** true if the value is a string */
    isNumber() {
        return this.type == SchnackVarValueType.NUMBER;
    }
    /** returns the numeric value. If its a string 0 is returned */
    getAsNumber() {
        return this.type == SchnackVarValueType.NUMBER ? this.num : 0;
    }
    /** returns the numeric value floored (intish). If its a string 0 is returned */
    getAsInt() {
        return Math.floor(this.getAsNumber());
    }
    /** returns string value. If it is a number it'll be converted. */
    getAsString() {
        if (this.type == SchnackVarValueType.STRING) {
            return this.str;
        }
        return this.num.toString();
    }

}

