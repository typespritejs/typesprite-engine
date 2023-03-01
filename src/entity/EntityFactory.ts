/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ComponentManager} from '@tsjs/entity/ComponentManager'
import {EntityInstance} from '@tsjs/entity/EntityInstance'
import {EntityLinker, LinkedEntityDefinition} from '@tsjs/entity/EntityLinker'
import {World} from "@tsjs/entity/World";
import {arrayContains, isArray, isFunction, isString} from "@tsjs/util/utils";
import {PropertyParser} from "@tsjs/entity/PropertyParser";
import {Component} from "@tsjs/entity/Component";
import {ResourceManager, ResourceState} from "@tsjs/entity/ResourceManager";


/**
 * Manages the creation of entities for one world.
 *
 * It glues together:
 *
 *  - Loding resources accordning to EntityDefinition instances
 *  - Discovers possible state of entitiy configuration
 *    - All components there?
 *    - All required resources are loaded?
 *    - Do we need resources for children?
 *  - Instantiates the objects for the world (new Component, new Entity, ...)
 */
export class EntityFactory {

    private _linkedDefinitions:Record<string, LinkedEntityDefinition> = {};
    private _nextEntityId:number = 1;

    private readonly _linker:EntityLinker = new EntityLinker();
    private readonly _world:World;
    private readonly _propertyParser:Record<string, PropertyParser> = {};
    private readonly _resourceManager:ResourceManager;

    constructor(world:World, _resourceManager:ResourceManager) {
        this._world = world;
        this._resourceManager = _resourceManager;
    }

    public addPropertyParser(pp:PropertyParser) {
        this._propertyParser[pp.parserId] = pp;
    }

    addDefinitions(defs) {
        this._linker.addDefinitions(defs);
    }
    /**
     * This function loads all data that is required for the
     * provided entities.
     */
    preloadEntities(instances:EntityInstance|EntityInstance[], onReady:(any)=>void, depth:number=0) {
        if (!this._linker.linked) {
            this._linkedDefinitions = this._linker.link();
        }

        const entityInstances = (isArray(instances) ? instances : [instances]) as EntityInstance[];
        if (depth > 20) {
            console.error("Entity-Child requirement seems to loop. Recursion exceeded 20");
            onReady([]);
            return;
        }

        // STEPS:
        // 1) Load all component-classes for all instances
        // 2) Check component requirements
        // 3) Parse all properties
        // 4) Call for each instance and for each component
        //    with the parsed properties the Resource-Request
        //    method. Requested children are collected as additional
        //    EntityInstances.
        // 5.a) If we have child-instances we call this function
        //      again with the children.
        // 5.b) If no children are needed we are done and can
        //      perform the callback
        //
        // Return (via callback) instance-able entities (including prased properties)

        // // STEP 1: instances we can work with
        let validInstances:any[] = [];
        const componentList:any[] = [];
        for (let i = 0; i < entityInstances.length; i++) {
            const instance = entityInstances[i];
            const entitySearchName = instance.entityDefinitionName.toLowerCase();
            const def = this._linkedDefinitions[entitySearchName];
            if (!def) {
                console.error("Cannot find Entity: " + instance.entityDefinitionName);
                continue;
            }
            if (def.type !== "entity") {
                console.error("Cannot load Entity: " + instance.entityDefinitionName + ". Type not compatible.");
                continue;
            }
            if (!(def.components.length > 0)) {
                console.error("Cannot load Entity: " + instance.entityDefinitionName + ". Has no components.");
                continue;
            }
            // collect all components
            for (let i2 = 0; i2 < def.components.length; i2++)
                componentList.push(def.components[i2]);
            // work able
            validInstances.push(instance);
        }
        // ----------------------------------------------------------------
        // check all instances again
        let oldValidInstances = validInstances;
        validInstances = [];
        for (let i = 0; i < oldValidInstances.length; i++) {
            const instance = oldValidInstances[i];
            const def = this._linkedDefinitions[instance.entityDefinitionName.toLowerCase()];

            // collect all components
            let stateOk = true;
            let stateErr = "";
            for (let i2 = 0; i2 < def.components.length; i2++) {
                const cmpState = ComponentManager.getClass(def.components[i2]);
                if (cmpState == null) {
                    stateOk = false;
                    stateErr = "Component not Loaded: " + def.components[i2];
                    break;
                }
            }
            if (!stateOk) {
                console.error("Cannot load Entity: " + instance.entityDefinitionName + ". " + stateErr);
                continue;
            }
            validInstances.push(instance);
        }
        // ----------------------------------------------------------------
        // STEP 2
        oldValidInstances = validInstances;
        validInstances = [];
        for (let i = 0; i < oldValidInstances.length; i++) {
            const instance = oldValidInstances[i];
            const def = this._linkedDefinitions[instance.entityDefinitionName.toLowerCase()];
            let incompleteEntity = false;
            let missingCmp = "";
            let lastCmp = "";
            const componentClasses:any[] = [];
            const componentNames:string[] = [];
            instance.componentBeforeInitList = [] as (<T extends Component>(targetCmp:T) => string|void)[];
            for (let i2 = 0; i2 < def.components.length && !incompleteEntity; i2++) {
                const cmpName = def.components[i2];
                const cmpClass = ComponentManager.getClass(cmpName);
                const cmpSetup = cmpClass.requires;
                lastCmp = cmpName;
                componentClasses.push(cmpClass);
                componentNames.push(cmpName);
                instance.componentBeforeInitList.push((cmpSetup && cmpSetup.beforeInit) ? cmpSetup.beforeInit : null);

                // resource callback
                if (cmpSetup && isArray(cmpSetup.cmps)) {
                    const len3 = cmpSetup.cmps.length;
                    for (let i3 = 0; i3 < len3; i3++) {
                        if (!arrayContains(def.components, cmpSetup.cmps[i3])) {
                            incompleteEntity = true;
                            missingCmp = cmpSetup.cmps[i3];
                            break;
                        }
                    }
                }
            }
            if (incompleteEntity) {
                console.error("Incomplete entity \"" + instance.entityDefinitionName + "\". Component \"" + lastCmp + '" requires component "' + missingCmp + '".');
                continue;
            }
            instance.componentClasses = componentClasses;
            instance.componentClassNames = componentNames;

            validInstances.push(instance);
        }
        // ----------------------------------------------------------------
        // STEP 3
        oldValidInstances = validInstances;
        validInstances = [];
        for (let i = 0; i < oldValidInstances.length; i++) {
            const instance = oldValidInstances[i];
            const def = this._linkedDefinitions[instance.entityDefinitionName.toLowerCase()];
            const rawEntityProperties = {...def.properties, ...instance.instanceProperties};
            const parsedProperties = this.parseProperties(def, rawEntityProperties, instance.entityDefinitionName);
            if (!parsedProperties)
                continue;
            instance.parsedProperties = parsedProperties;
            validInstances.push(instance);
        }
        // ----------------------------------------------------------------
        // STEP 4
        oldValidInstances = validInstances;
        validInstances = [];
        const requiredResources = [];
        let errorInCmpRes = false;
        for (let i = 0; i < oldValidInstances.length; i++) { // each Entity
            const instance = oldValidInstances[i];
            instance.expectedResources = [];
            const def = this._linkedDefinitions[instance.entityDefinitionName.toLowerCase()];
            errorInCmpRes = false;
            for (let i2 = 0; i2 < def.components.length && !errorInCmpRes; i2++) {
                const cmpName = def.components[i2];
                const cmpClass = ComponentManager.getClass(cmpName);
                const cmpSetup = cmpClass.requires;
                // resource callback
                if (cmpSetup && isFunction(cmpSetup.res)) {
                    let req = cmpSetup.res(instance.parsedProperties, this._world.manager.globals);
                    if (isArray(req)) {
                        req = this._unifyResourceProperties(req);
                        if (isString(req)) {
                            console.error("Error in component: \"" + cmpName + "\" in entity \"" + instance.entityDefinitionName + '". Resource requirement failed with "' + req + '".');
                            errorInCmpRes = true;
                            continue;
                        }
                        else {
                            instance.expectedResources.push.apply(instance.expectedResources, req);
                        }
                    }
                }
            }
            if (!errorInCmpRes) {
                requiredResources.push.apply(requiredResources, instance.expectedResources);
                validInstances.push(instance);
            }
        }
        // STEP 5.a
        const requiredChildren:any[] = [];
        for (let i = 0; i < validInstances.length; i++) { // each Entity
            const instance = validInstances[i];
            const def = this._linkedDefinitions[instance.entityDefinitionName.toLowerCase()];
            for (let i2 = 0; i2 < def.components.length && !errorInCmpRes; i2++) {
                const cmpName = def.components[i2];
                const cmpClass = ComponentManager.getClass(cmpName);
                const cmpSetup = cmpClass.requires;
                // resource callback
                if (cmpSetup && isFunction(cmpSetup.children)) {
                    const children = cmpSetup.children(instance.parsedProperties, this._world.manager.globals);
                    if (isArray(children)) {
                        for (let i3 = 0; i3 < children.length; i3++) {
                            const edfTypeName = children[i3];
                            if (!this._linkedDefinitions[edfTypeName.toLowerCase()]) {
                                console.error("Error in component: \"" + cmpName + "\" in entity \"" + instance.entityDefinitionName + '". require.child: ' + edfTypeName + ' not found!');
                                continue;
                            }

                            const childProps = instance.instanceProperties[edfTypeName] || {};
                            //console.warn(instance.instanceProperties, childProps);
                            const dummyChildEntity = new EntityInstance("", edfTypeName, childProps);
                            requiredChildren.push(dummyChildEntity);
                        }
                    }
                }
                else if (cmpSetup && isArray(cmpSetup.children)) {
                    console.error("Error in component: \"" + cmpName + "\" in entity \"" + instance.entityDefinitionName + '". require.children need to be a callback! An array is not allowed here!');
                }
            }
        }
        if (requiredResources.length === 0) {
            // STEP 5.b
            if (requiredChildren.length > 0) {
                //console.log("Request children ", requiredChildren);
                this.preloadEntities(requiredChildren, (childStuff) => {
                    //console.log("Children results", childStuff);
                    onReady(validInstances);
                }, depth + 1);
            }
            else {
                onReady(validInstances);
            }
            return;
        }
        // ----------------------------------------------------------------
        // load resources
        this._resourceManager.requestDirect(this._world.name, requiredResources, () => {
            // all data loaded
            // Now we check if all data is loaded for each
            // entity.
            oldValidInstances = validInstances;
            validInstances = [];
            for (let i = 0; i < oldValidInstances.length; i++) {
                const instance = oldValidInstances[i];
                instance.id = this._nextEntityId++;
                let allResourcesLoaded = true;
                for (let i2 = 0; i2 < instance.expectedResources.length; i2++) {
                    // const type = instance.expectedResources[i2].type;
                    // const url = instance.expectedResources[i2].url;
                    const url = instance.expectedResources[i2];
                    if (this._resourceManager.getResourceState(url) !== ResourceState.Ready) {
                        allResourcesLoaded = false;
                        let issue = this._resourceManager.getResourceError(url)
                        if (!issue) {
                            if (this._resourceManager.getLoaderByUrl(url).length == 0) {
                                issue = 'No ResourceLoader found for the given url';
                            }
                        }
                        console.error(`Cannot load Entity: ${instance.entityDefinitionName}. Required resource "${url}" was not loaded. Issue: ${issue}`);
                    }
                }
                if (allResourcesLoaded)
                    validInstances.push(instance);
            }
            // STEP 5.b
            if (requiredChildren.length > 0) {
                //console.log("Request children ", requiredChildren);
                this.preloadEntities(requiredChildren, (childStuff) => {
                    //console.log("Children results", childStuff);
                    onReady(validInstances);
                }, depth + 1);
            }
            else {
                // we are done :)
                onReady(validInstances);
            }
        });
    }
    /**
     * uniforms resource parameter
     */
    private _unifyResourceProperties(req):string[]|string {
        // Resources can be provided in different formats:
        //
        // 'image:path/to/my.png'
        // ['image', 'path/to/my.png']
        // 'image!path/to/my.png',
        // 'path/to/my.png'          // !!! only works when resourceManager.addDefaultLoader('.png', ...) is set.
        //
        const resourceUrls:string[] = [];
        for (const rawResourceDesc of req) {

            if (isArray(rawResourceDesc)) {
                if (rawResourceDesc.length != 2) {
                    return `Cannot request resource. Array expected to be [type, path]. Found: ${rawResourceDesc}`
                }
                resourceUrls.push(`${rawResourceDesc[0]}:${rawResourceDesc[1]}`);
            }
            else if (isString(rawResourceDesc)) {
                if (rawResourceDesc.indexOf('!') !== -1) {
                    console.warn("Resource path should not rely on '!'. Use ':' instead. Found:", rawResourceDesc);
                    const parts = rawResourceDesc.split('!');
                    resourceUrls.push(`${parts[0]}:${parts[1]}`);
                }
                else {
                    if (rawResourceDesc.indexOf(':') === -1) {
                        const loaderId = false; //this. _resourceManager.inferDefaultLoaderId(rawResourceDesc);
                        if (loaderId === false) {
                            return `Cannot request resource. The type needs to specified "type:path". Found: ${rawResourceDesc}`
                        }
                        else {
                            resourceUrls.push(`${loaderId}:${rawResourceDesc}`);
                        }
                    }
                    else {
                        resourceUrls.push(rawResourceDesc);
                    }
                }
            }
            else if (rawResourceDesc === undefined) {
                return `Requested resource is: ${rawResourceDesc}. That is strange!`;
            }
            else {
                return `Cannot request resource: ${rawResourceDesc}`;
            }

            // if (isArray(rawResourceDesc)) {
            //     retVal.push({
            //         'type': rawResourceDesc[0],
            //         'url': rawResourceDesc[1]
            //     });
            // }
            // else if (isString(rawResourceDesc)) {
            //     if (rawResourceDesc.indexOf('!') !== -1) {
            //         const parts = rawResourceDesc.split('!');
            //         retVal.push({
            //             'type': parts[0],
            //             'url': parts[1]
            //         });
            //     }
            //     else {
            //
            //         throw new Error("TODO take care of this - if needed");
            //
            //         // tempType = this._resourceManager.detectResourceType(rawResourceDesc);
            //         // if (tempType === false) {
            //         //     retVal = "Cannot select resource type by url '" + rawResourceDesc + "'";
            //         //     return false;
            //         // }
            //         // else if (tempType === true) {
            //         //     retVal = "Cannot select resource type by url '" + rawResourceDesc + "'. Multiple resource manager can handle the given type.";
            //         //     return false;
            //         // }
            //         // if (_.isEmpty(tempType) ||
            //         // _.isEmpty(rawResourceDesc)) {
            //         //     retVal = "Url or type are undefined/empty. url: '" + rawResourceDesc + "' type:'" + tempType + "'";
            //         //     return false;
            //         // }
            //         // retVal.push({
            //         //     'type': tempType,
            //         //     'url': rawResourceDesc
            //         // });
            //     }
            // }
            // else if (
            //     typeof rawResourceDesc !== "object" ||
            //     !rawResourceDesc.hasOwnProperty('type') ||
            //     !rawResourceDesc.hasOwnProperty('url')
            // ) {
            //     retVal = "object with 'type' and/or 'url' is missing.";
            //     return false;
            // }
            // else {
            //     retVal.push({
            //         'type': rawResourceDesc.type,
            //         'url': rawResourceDesc.url
            //     });
            // }
        }
        return resourceUrls;
        // if (!retVal)
        //     return "No request data was found";
        // return retVal;
    }
    /**
     * Here we parse the properties for an entity instance.
     *
     * [myEntity]
     * @Cmp1
     * @Cmp2
     * life = 100
     * mana = 30
     *
     * class Cmp1 {
     *     static requires = {
     *         props: {
     *             life: ['number', 5],
     *             mana: ['number', 5],
     *         }
     *     }
     * }
     *
     * class Cmp2 {
     *     static requires = {
     *         props: {
     *             super: ['bool', true]
     *         }
     *     }
     * }
     *
     */
    private parseProperties(def:LinkedEntityDefinition, rawProps, entityName) {
        const res = {};
        const propConflictDetection = {};
        let rawProp;
        for (let i = 0; i < def.components.length; i++) {
            const cmpName = def.components[i];
            const cmpClass = ComponentManager.getClass(cmpName); // window[cmpName];
            const cmpSetup:{need?:Record<string, any>, props?:Record<string, any>, opt?:Record<string, any>} = cmpClass.requires;
            // **  NEEDED PROPERTIES **
            // DEPRECATED!
            if (cmpSetup && cmpSetup.need) {
                console.error("Component:", cmpName, "uses requires.need which is deprecated. Use props instead.");
                return;

                // for (const need in cmpSetup.need) {
                //     let needInfo = cmpSetup.need[need];
                //     console.warn("Component:", cmpName, "uses requires.need which is deprecated. Use props instead.");
                //
                //     // some convinience
                //     if (typeof (needInfo) === "string")
                //         needInfo = {type: needInfo};
                //     if (typeof (needInfo) !== "object") {
                //         console.warn("Warning in Entity: " + entityName + " with components \"" + cmpName + "\". Property requirement must be string or object.");
                //         continue;
                //     }
                //     if (!rawProps.hasOwnProperty(need)) {
                //         console.error("Cannot spawn Entity: " + entityName + " with components \"" + cmpName + "\". Required Property \"" + need + "\" with type \"" + needInfo.type + "\" is not provided.");
                //         return;
                //     }
                //     rawProp = rawProps[need];
                //     const type = needInfo.type.toLowerCase()
                //     const parser = this._propertyParser[type];
                //     if (!parser) {
                //         console.error("Cannot spawn Entity: " + entityName + " with components \"" + cmpName + "\". Required Property \"" + need + "\". Unknown type \"" + needInfo.type + "\".");
                //         return;
                //     }
                //     const parserRes = parser.parse(need, needInfo, rawProp, res);
                //     if (typeof (parserRes) === "string") {
                //         console.error("Cannot spawn Entity: " + entityName + " with components \"" + cmpName + "\". Required Property \"" + need + "\". " + parserRes);
                //         return; // parser found an error
                //     }
                //     // drop property from list
                //     delete rawProps[need];
                // }
            }
            // ** PROPERTIES **
            //
            // myProp: ['number', 23]            // optional prop with default: 23
            // myProp: {type: 'number', def: 23} // optional prop with default: 23
            // myProp: {type: 'number'}          // required property of type number
            // myProp: 'number'                  // required property of type number
            //
            if (cmpSetup && (cmpSetup.opt || cmpSetup.props)) {
                if (cmpSetup.opt)
                    console.warn("Component:", cmpName, "uses requires.opt which is deprecated. Use requires.props instead.");
                for (let propName in (cmpSetup.opt || cmpSetup.props)) {


                    // const cmpPrefix = `${cmpName}.`;
                    // if (propName.startsWith(cmpPrefix)) {
                    //     propName = propName.substr(cmpPrefix.length);
                    // }

                    let propInfo = (cmpSetup.opt || cmpSetup.props)[propName];
                    // array notation
                    if (Array.isArray(propInfo)) {
                        if (propInfo.length != 2) {
                            console.error(`Error in component: "${cmpName}" in entity ${entityName}. Property ${propName}. A property array should be definition as: [type, default-value]. Found array with ${propInfo.length} entries instead.`);
                            return;
                        }
                        propInfo = {type: propInfo[0], def: propInfo[1]};
                    }

                    const propType = typeof propInfo === "string" ? propInfo : propInfo.type;
                    const propDef = typeof propInfo === "string" ? undefined : propInfo.def;
                    // if (typeof propInfo !== "object") {
                    //     console.error("Error in component: \"" + cmpName + "\" in entity \"" + entityName + '". Property "' + propName + '" must be an object');
                    //     return;
                    // }
                    if (!isString(propType)) {
                        console.error("Error in component: \"" + cmpName + "\" in entity \"" + entityName + '". Property "' + propName + '" is type undefined');
                        return;
                    }

                    if (propConflictDetection[propName]) {
                        const otherPropType = propConflictDetection[propName].propType;
                        if (otherPropType != propType) {
                        //     console.warn(`Property conflict in Entity: ${entityName}. Property '${propName}' is defined in component: ${cmpName} and ${propConflictDetection[propName].cmp}.`);
                        // }
                        // else {
                            console.error(`Property conflict in Entity: ${entityName}. Property '${propName}' is defined in component: ${cmpName} and ${propConflictDetection[propName].cmp} with different types.`);
                            return;
                        }
                    }
                    else {
                        propConflictDetection[propName] = {cmp: cmpName, propType};
                    }


                    // if (propDef === undefined) {
                    //     console.error("Error in component: \"" + cmpName + "\" in entity \"" + entityName + '". Property "' + propName + '" is missing default value');
                    //     return;
                    // }
                    rawProp = rawProps[propName];
                    if (rawProp === undefined)
                        rawProp = propDef;

                    if (rawProp === undefined) {
                        console.error("Cannot spawn Entity: " + entityName + " with components \"" + cmpName + "\". Property \"" + propName + "\" with type \"" + propType + "\" is not defined and there is no default.");
                        return;
                    }

                    const parser = this._propertyParser[propType];
                    if (!parser) {
                        console.error("Error in Entity: " + entityName + " with components \"" + cmpName + "\". Property \"" + propName + "\". Unknown type \"" + propInfo.type + "\".");
                        return;
                    }
                    const parserRes = parser.parse(propName, propInfo, rawProp, res);
                    if (typeof (parserRes) === "string") {
                        console.error("Error in Entity: " + entityName + " with components \"" + cmpName + "\". Property \"" + propName + "\". " + parserRes);
                        return; // parser found an error
                    }
                    // drop property from list
                    delete rawProps[propName];
                }
            }

            // SIMPLY COPY THE REST
            //
            for (const name in rawProps)
                res[name] = rawProps[name];
        }

        return res;
    }
}
