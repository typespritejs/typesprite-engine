/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {PropertyParser} from "@tsjs/entity/PropertyParser";
import {arrayContains, isArray, isFunction, isString} from "@tsjs/util/utils";



/**
 * Property parser for: number, float, real
 */
export class NumberPropertyParser extends PropertyParser {

    constructor() {
        super('number');
    }
    
    parse(propertyName, propertyInfo, instanceValue, outProps)
    {
        // we only accept numbers here
        const parsedValue = Number(instanceValue);
        if (isNaN(parsedValue))
            return "Value is not a number";

        // check minvalue
        if (propertyInfo.hasOwnProperty("min")) {
            const min = Number(propertyInfo["min"]);
            if (isNaN(min))
                return "Component-Error. Min must be a number!";
            if (parsedValue < min)
                return "Required value is to small. Minimum is " + min + ". Provided: \""+ parsedValue + "\"";
        }

        // check maxvalue
        if (propertyInfo.hasOwnProperty("max")) {
            const max = Number(propertyInfo["max"]);
            if (isNaN(max))
                return "Component-Error. Max must be a number!";
            if (parsedValue > max)
                return "Required value is to big. Maximum is " + max + ". Provided: \""+ parsedValue + "\"";
        }

        // enum
        if (isArray(propertyInfo.allow)) {
            if (!arrayContains(propertyInfo.allow, instanceValue)) {
                return "Value must be one of: " + JSON.stringify(propertyInfo.allow) +". Found: " + instanceValue;
            }
        }

        // user validate
        if (propertyInfo["validate"])
        {
            if (!isFunction(propertyInfo["validate"]))
                return "Component-Error. 'validate' must be a function!";
            const validationResult = propertyInfo["validate"](parsedValue);
            if (validationResult !== true) {
                if (isString(validationResult))
                    return "Validateion failed with message '" + validationResult + "'";
                return "Validateion failed.";
            }
        }
        outProps[propertyName] = parsedValue;
    }
}