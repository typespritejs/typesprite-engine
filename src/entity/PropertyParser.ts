/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 * Base class to parse your own properties.
 *
 * @see StringPropertyParser
 */
export abstract class PropertyParser {

    protected constructor(
        public readonly parserId:string
    ) {
    }

    /**
     * Basically convert a given string to the desired output.
     *
     * The input values can be set by various sources, including text based
     * files like TMX or JSON. The idea is to make sense of a designers input
     * and make things nice and configurable,
     *
     * @param propertyName the name
     * @param propertyInfo data from the component
     * @param instanceValue unparsed value from the instance
     * @param outProps object that
     * @return  okay, string: error desc;
     */
    abstract parse(propertyName:string, propertyInfo:any, instanceValue:any, outProps):void|string;
}