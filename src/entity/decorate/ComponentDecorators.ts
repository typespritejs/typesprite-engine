/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ComponentManager} from "@tsjs/entity/ComponentManager";


/**
 * A property defined by the map, edf or during instantiation.
 *
 * The parser-id refers to a PropertyParser instance and defines
 * how the values of the property are parsed and interpreted. The Engine provides
 * defaults but the game can define its own.
 *
 * Replaces:
 * ```ts
 * static requires = {
 *     props: {
 *         myProp1: 'number',      << required!
 *         myProp2: ['number', 2]  << with default
 *         myProp3: {type: 'number', def: 2, }
 *     }
 * }
 * ```
 *
 * With:
 * ```ts
 * @prop('number')
 * private myProp1:number;
 *
 * @prop('number')
 * private myProp2:number = 2;
 * ```
 *
 */
export function prop(parserId:string="any", defaultValue?:string|number|boolean, propertyInfo?:Record<string, any>) {
    return (target:any, memberName:string) => {
        ComponentManager.registerComponentProperty(target.constructor, memberName, parserId, propertyInfo, defaultValue);
    }
}

/**
 * Require a resource from a ResourceLoader.
 *
 * If @res is used the field-name is also a property that can be overwritten/defined in the map, EDF or during
 * initialization.
 *
 *
 * Replaces:
 *
 * ```ts
 * static requires = {
 *     props: {
 *         sheet1: 'string',                   << required!
 *         sheet2: ['string', 'path/to/sheet]  << with default
 *     },
 *     res: props => [
 *         ['sheet', props.sheet1],
 *         ['sheet', props.sheet2],
 *     ]
 * }
 *
 * private sheet1:SpriteSheet;
 * private sheet2:SpriteSheet;
 *
 * onInit() {
 *     this.sheet1 = this.requireResource('sheet', 'sheet1');
 *     this.sheet2 = this.requireResource('sheet', 'sheet2');
 * }
 *
 * ```
 *
 * With:
 * ```ts
 * @res('sheet')
 * private sheet1:SpriteSheet;
 *
 * @res('sheet', 'path/to/sheet')
 * private sheet2:SpriteSheet;
 * ```
 */
export function res(loaderId:string, path?:string) {
    return (target:any, memberName:string) => {
        ComponentManager.registerComponentResource(target.constructor, memberName, loaderId, path);
    }
}


/**
 * Reference to another component of the same entity.
 *
 * If not optional it is required that the entity is part of the entity and if not optional, that it is
 * in the order before this component.
 *
 * Optional components that aren't present will be set to null.
 *
 * Replaces:
 *
 * ```ts
 * static requires = {
 *     cmps: [
 *         "OtherCmp",
 *     ],
 * }
 *
 * private other1:OtherCmp1;
 * private other2?:OtherCmp2;
 *
 * onInit() {
 *     this.other1 = this.findComponent('OtherCmp1');
 *     if (!this.other1)
 *        throw new InitError(...);
 *     this.other2 = this.findComponent('OtherCmp2');
 * }
 *
 * ```
 *
 * With:
 * ```ts
 * @cmp('OtherCmp1')
 * private other1:OtherCmp1;
 *
 * @cmp('OtherCmp2', true)
 * private otherCmp2?:OtherCmp2;
 *
 */
export function cmp(cmpName:string, optional:boolean=false) {
    return (target:any, memberName:string) => {
        ComponentManager.registerComponentRequire(target.constructor, memberName, cmpName, optional);
    }
}

/**
 *
 *
 * If @child is used the field-name is also a property that can be overwritten/defined in the map, EDF or during
 * initialization.
 */
export function child(name:string) {
    return (target:any, memberName:string) => {
        ComponentManager.registerComponentChildRequire(target.constructor, memberName, name);
    }
}

/**
 *
 *
 * @param cmpName
 * @param worldName
 */
export function link(cmpName:string, worldName?:string) {
    return (target:any, memberName:string) => {
        ComponentManager.registerComponentLink(target.constructor, memberName, cmpName, worldName);
    }
}

export function linkGlobal() {
    return (target:any, memberName:string) => {
        ComponentManager.registerComponentLinkGlobal(target.constructor, memberName);
    }
}