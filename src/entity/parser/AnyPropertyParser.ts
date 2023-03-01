/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

import {cloneDeep, isArray} from "@tsjs/util/utils";
import {PropertyParser} from "@tsjs/entity/PropertyParser";


/**
 * Property parser for unspecific type.
 * This can be used to enforce arbitarry userdata
 */
export class AnyPropertyParser extends PropertyParser {

    constructor() {
        super('any');
    }

    parse(propertyName, propertyInfo, instanceValue, outProps) {

        const typeVal = typeof instanceValue;
        if (typeVal === undefined)
            return "Must not be empty";


        try {
            if (typeVal == "string") {
                outProps[propertyName] = JSON.parse(instanceValue);
                return;
            }
        }
        catch(e) {

        }

        // as we do not know what is inside the data we have
        // to make a deep copy. The user might change the content
        // in one entity and it should have impact on the
        // definition.
        //
        // I suspect that for simpletypes this is not an issue
        // outProps[propertyName] = cloneDeep(instanceValue);

        // FIX make sure this is okay to do
        if (isArray(instanceValue)) {
            outProps[propertyName] = [...instanceValue];
        }
        else {
            const type = typeof instanceValue;
            switch(type) {
                case "number":
                case "boolean":
                case "string":
                    outProps[propertyName] = instanceValue;
                    break;
                case "object":
                    outProps[propertyName] = {...instanceValue};
                    break;
            }
        }

    }
}
