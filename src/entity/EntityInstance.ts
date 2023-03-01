/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

    
/**
 * Description for an Entity instance in the game world
 */
export class EntityInstance {

    public parsedProperties:any = {};

    constructor(
        /** the instance name of the element (may be "") */
        public name:string,
        /** name/id of the entity definition */
        public entityDefinitionName:string,
        /** unparsed(!) properties of the instance */
        public instanceProperties:any
    ) {
        this.name = name || "";
    }

}
