/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {PropertyParser} from "@tsjs/entity/PropertyParser";

export class BoolPropertyParser extends PropertyParser {

    constructor() {
        super('bool');
    }

    parse(propertyName, propertyInfo, instanceValue, outProps)
    {

        let outValue = propertyInfo.def || false;
        switch(instanceValue) {
            case true: outValue = true; break;
            case false: outValue = false; break;
            case 1: outValue = true; break;
            case 0: outValue = false; break;
            case "true": outValue = true; break;
            case "false": outValue = false; break;
            case "1": outValue = true; break;
            case "0": outValue = false; break;
        }

        outProps[propertyName] = outValue;
    }
}
    
