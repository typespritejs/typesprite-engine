/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 *
 */
export class EntityDefinition {

    /** @type bool static entites are always instantiated */
    public isStatic = false;
    /** @type String */
    public name = "";
    /** @type Array */
    public components:string[] = [];
    /**  */
    public parent:string = null;
    /** property family */
    public family:string[] = [];
    /** unparsed properties */
    public properties:any = {};
    /** information about the definition origin */
    public source:any = {};
    /** information about the definition origin */
    public type:string = "";
    /** means this static entity depends on anther entity to be initialized */
    public staticDependencies:string[] = null;

    constructor() {

    }
}
