/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Easing} from '@tsjs/engine/flignov/Easing'
import {PropertyParser} from "@tsjs/entity/PropertyParser";
import {isArray, isString} from "@tsjs/util/utils";


/**
 * Translates a string to a ease function.
 * This function allows a great deal of
 *
 * Examples:
 *
 * sine.out => Easing.Sine.easeOut
 * sine.in => Easing.Sine.easeIn
 * sine.inOut => Easing.Sine.easeInOut
 * sine => Easing.Sine.easeInOut
 *
 * ["sine", "out"] => Easing.Sine.easeOut
 *
 */
export class EaseFuncPropertyParser extends PropertyParser {

    static _issue = null;

    constructor() {
        super('ease');
    }

    parse(propertyName, propertyInfo, instanceValue, outProps)
    {
        const finalFunc = EaseFuncPropertyParser.toEaseFunc(instanceValue);
        if (finalFunc == null) {
            return EaseFuncPropertyParser._issue;
        }

        outProps[propertyName] = finalFunc;
    }

    /**
     * This function does the actual transform.
     *
     * It returns the matching ease function. If null is returned check for EaseFuncPropertyParser._issue to determine
     * the reason.
     *
     * @static
     */
    static toEaseFunc(easeFuncDef) {

        EaseFuncPropertyParser._issue = null;

        let easeName = "";
        let easeMode = "inout";


        // We accept string like this: Sine.in
        if (isString(easeFuncDef)) {
            const splitPos = easeFuncDef.indexOf(".");
            if (splitPos == -1) { // no '.'
                easeName = easeFuncDef;
            }
            else {
                const parts = easeFuncDef.split(".");
                easeName = parts[0];
                easeMode = parts[1];
            }
        }
        // we also accept an array with two values ["sine", "in"]
        else if (isArray(easeFuncDef) && easeFuncDef.length == 2) {
            easeName = easeFuncDef[0];
            easeMode = easeFuncDef[1];
        }
        else {
            EaseFuncPropertyParser._issue = "Unknown type for ease-func. Provide a string or an array with two values.";
            return null;
        }


        // to avoid (very slow) toLowerCase we simply do some
        // switching here.

        let easeType:any = null;
        switch(easeName) {
            case "back": case "Back": easeType = Easing.Back; break;
            case "bounce": case "Bounce": easeType = Easing.Bounce; break;
            case "circular": case "Circular": easeType = Easing.Circular; break;
            case "cubic": case "Cubic": easeType = Easing.Cubic; break;
            case "elastic": case "Elastic": easeType = Easing.Elastic; break;
            case "exponential": case "Exponential": easeType = Easing.Exponential; break;
            case "linear": case "Linear": easeType = Easing.Linear; break;
            case "quadratic": case "Quadratic": easeType = Easing.Quadratic; break;
            case "quartic": case "Quartic": easeType = Easing.Quartic; break;
            case "quintic": case "Quintic": easeType = Easing.Quintic; break;
            case "sine": case "Sine": easeType = Easing.Sine; break;
        }
        if (!easeType) {
            EaseFuncPropertyParser._issue =  "Unknown ease type: '" + easeName + "'";
            return null;
        }


        let finalFunc = null;
        switch(easeMode) {
            case "in": case "In": case "easeIn": case "EaseIn":
                finalFunc = easeType["easeIn"];
                break;
            case "out": case "Out": case "easeOut": case "EaseOut":
                finalFunc = easeType["easeOut"];
                break;
            case "inout": case "inOut": case "easeInOut": case "EaseInOut":
                finalFunc = easeType["easeInOut"];
                break;
        }

        if (!easeType) {
            EaseFuncPropertyParser._issue =  "For ease type: '" + easeName + "' unknown func: '" + easeMode + "'";
            return null;
        }

        return finalFunc;
    }

}