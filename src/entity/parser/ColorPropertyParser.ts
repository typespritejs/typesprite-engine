/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {PropertyParser} from "@tsjs/entity/PropertyParser";
import {arrayContains, isArray, isFunction, isString} from "@tsjs/util/utils";
import {Color} from "@tsjs/engine/tt2d/Color";

/**
 *
 */
export class ColorPropertyParser extends PropertyParser {

    constructor() {
        super('color');
    }

    parse(propertyName, propertyInfo, instanceValue, outProps)
    {
        const parsedValue = `${instanceValue}`;
        const color = new Color(0, 0, 0);
        if (parsedValue.startsWith("#")) {
            color.setFromHash(parsedValue);
        }
        else {
            return `Cannot parse color value of: '${parsedValue}'`;
        }
        outProps[propertyName] = color;
    }
}