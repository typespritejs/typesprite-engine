/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {PropertyParser} from "@tsjs/entity/PropertyParser";
import {arrayContains, isArray, isFunction, isString} from "@tsjs/util/utils";

/**
 *
 *
 */
export class StringPropertyParser extends PropertyParser {

    constructor() {
        super('string');
    }

    parse(propertyName, propertyInfo, instanceValue, outProps)
    {
        // we only accept numbers here
        const parsedValue = "" + instanceValue;
        if (!isString(parsedValue))
            return "Value is not a String";

        // enum
        if (isArray(propertyInfo.allow)) {
            if (!arrayContains(propertyInfo.allow, instanceValue)) {
                return "Value must be one of: " + JSON.stringify(propertyInfo.allow) +". Found: " + instanceValue;
            }
        }

        // user validate
        if (propertyInfo["validate"]) {
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