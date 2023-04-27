/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Entity, EntityState} from '@tsjs/entity/Entity'
import {EntityFactory} from "@tsjs/entity/EntityFactory";
import {InitError} from "@tsjs/entity/Errors";
import {Component} from "@tsjs/entity/Component";
import {WorldManager} from "@tsjs/entity/WorldManager";
import {EDFLoader, TextFileProvider} from "@tsjs/entity/edf/EDFLoader";
import {EntityDefinition} from "@tsjs/entity/EntityDefinition";
import {WorldDescription} from "@tsjs/entity/WorldDescription";
import {EntityInstance} from "@tsjs/entity/EntityInstance";
import {DependencyChain} from "@tsjs/entity/edf/DependencyChain";
import {BaseEntityActivator} from "@tsjs/entity/BaseEntityActivator";
import {isFunction} from "@tsjs/util/utils";
import {WorldStartHandler} from "@tsjs/entity/WorldStartHandler";


/**
 * A world is managed and instantiated by the WorldManager.
 *
 * Each world is a running, breathing entity-component group that
 * is created out of an EDF file. The EDF defines all instances
 * that can be created within this world and also set's the
 * list of static entities.
 *
 * Static entities are instantiated on startup are meant to populate
 * the rest of the world.
 *
 * Using dependency information it is possible to ensure a static entity
 * creation order. That way those entities that others rely on can
 * be created first.
 *
 * It is possible to access entities or other worlds by query for the
 * ID of other worlds. Messages can be sent and information can find
 * it's way.
 *
 * ---
 * **Life-Cycle**
 *
 * A world has multiple states which can be manipulared by the following functions:
 *
 *  - start() to begin the loading process and automatically run static Entities when everything is running
 *  - stop() to drop all entities and clear up RAM
 *  - restart() to clear and automatically activate it afterwards.
 *  - pause() to disable it from being processed. This is without loosing the active/deactive states of the objects.
 *  - resume() to continue after pause.
 *
 * Basically the idea is to call activate() when you want to run the/a level or game part.
 * If a world is finished and we don't need the world for now we call clear().
 * To restart a level and set everything to start we use reset().
 * Pause and Resume change the `enabled` flag and help to pause things that we currently don't need
 * to run but like to continue later.
 *
 * ---
 * **Loading & Reloading**
 *
 * Every call of `stop()` will not just stop the world but also release all resources. This is good
 * if the world represents something that isn't needed anymore. However, imagine the world reperesents
 * a running level of a Jump&Run and you like to stop/start it whenever the player dies. In such
 * a case you want to keep all resources and reuse them. In such a case it's better to use `restart()`.
 *
 * Using `restart()` will only unload resources that are not needed after the start anymore and load
 * the ones that are missing. This is only true if the same resource isn't referenced in another
 * active world.
 *
 * If this automatic approach does not work for you it's also possible to create a world only for the
 * purpose of loading certain resources. This means a world can also be understand as resource
 * managing object.
 *
 * ---
 * **Rendering**
 *
 * Normally entities only get the onUpdate call so they can do the mainloop things.
 * If one likes to write an entity that shall receive the render event one must call
 * receiveFrameUpdates().
 *
 */
export class World {

    private readonly _actives:Entity[] = [];
    private readonly _alwaysActives:Entity[] = [];
    private readonly _deactives:Entity[] = [];
    private readonly _newEntities:Entity[] = [];
    private readonly _onRenderEntities:Entity[] = [];
    private _pendingInjections = 0;
    private _resetting = false;
    private _entityActivator:BaseEntityActivator;
    private _factory:EntityFactory;
    private _state:WorldState = WorldState.Empty;
    private _entityDefinitions:Record<string, EntityDefinition>;
    private readonly worldDesc:WorldDescription;
    private staticInstanceOrder:string[] = [];
    public enabled:boolean = true;
    public time:number = 0;
    public readonly statics:any = {};
    public readonly name:string;
    public readonly manager:WorldManager;
    // private readonly _worldResources:WorldResources;
    // private _pendingStateChange:PendingWorldChange =  PendingWorldChange.None;

    constructor(
        worldDesc:WorldDescription,
        manager:WorldManager
    ) {
        this.worldDesc = worldDesc;
        this.name = worldDesc.name;
        this.manager = manager;
        // this._worldResources = new WorldResources(this, this.manager.resources);
    }

    public getState():WorldState {
        return this._state;
    }

    /** @deprecated use start() instead */
    public activate():void {
        this.start();
    }

    /** @deprecated use stop() instead */
    public clear():void {
        this.stop();
    }

    /**
     * This will start the world.
     *
     * That means:
     *
     *  - Load and parse the world description file(s) (*.edf)
     *  - Load all resources requested by the static entities of the world description (*.edf)
     *  - Call all `beforeWorldStart(...)` of static entities' components
     *  - Load all resources requested by `beforeWorldStart(...)`
     *  - Run all entities created in this world
     *
     * As those steps can take more than one frame to perform it won't just start.
     * Instead it first goes into loading-state (see getState() == WorldState.Loading)
     *
     */
    public start():void {
        if (this._state == WorldState.Populated ||
            this._state == WorldState.Loading) {
            console.warn(`start() world called during start/restart`);
            return;
        }
        if (this._state == WorldState.Clearing) {
            console.error(`Cannot activate world during clearing`);
            return;
        }
        if (this._state == WorldState.Error) {
            console.error(`Cannot activate world due to previous error`);
            return;
        }
        this._state = WorldState.Loading;

        if (this._factory) {
            this.internActivateWorld();
        }
        else {
            new EDFLoader(this.manager.textLoader, this.worldDesc.edfPath, (success, edfData) => {
                if (!success) {
                    console.error("Failed to load EDF data");
                    this._state = WorldState.Error;
                    return;
                }
                this._entityDefinitions = edfData.definitions;
                this.activateFactory();
            });
        }
    }

    private activateFactory() {
        this._factory = new EntityFactory(this, this.manager.resources);
        // const keys = Object.keys(this.manager.propertyParser);
        for (let i=0; i<this.manager.propertyParser.length; i++) {
            this._factory.addPropertyParser(this.manager.propertyParser[i]);
        }
        this._factory.addDefinitions(this._entityDefinitions);
        this.orderStaticInstances();
    }

    private orderStaticInstances() {
        // sort out the one we shall at the start
        const dc = new DependencyChain();
        const statics:EntityDefinition[] = [];
        const objectNames = Object.keys(this._entityDefinitions);
        for (let i=0; i<objectNames.length; i++) {
            const entityName = objectNames[i];
            const ed = this._entityDefinitions[entityName] as EntityDefinition;
            if (ed.isStatic) {
                statics.push(ed);
                if (ed.staticDependencies) {
                    for (let i2=0; i2<ed.staticDependencies.length; i2++) {
                        const neededEntity = ed.staticDependencies[i2].toLowerCase();
                        if (!this._entityDefinitions[neededEntity]) {
                            this._state = WorldState.Error;
                            console.error(`Entity-Dependency points to unknown entity: "${neededEntity}".`);
                            return;
                        }
                        if (this._entityDefinitions[entityName].isStatic &&
                            this._entityDefinitions[neededEntity].isStatic) {
                            if (entityName != neededEntity) {
                                dc.connectAB(entityName, neededEntity);
                            }
                            else {
                                console.error(`Entity-Dependency cannot depend on itself: ${entityName}`);
                                this._state = WorldState.Error;
                                return;
                            }
                        }
                        else {
                            console.error(`Entity-Dependency only work on static dependencies "${entityName}" -> "${neededEntity}"`);
                            this._state = WorldState.Error;
                            return;
                        }
                    }
                }
            }
        }

        // order dependency
        const sortedList = dc.resolveChainToList();
        if (sortedList === null) {
            this._state = WorldState.Error;
            console.error(`Circular dependency in "${this.name}".`);
            return;
        }

        this.staticInstanceOrder = [...sortedList];
        for (let i=0; i<statics.length; i++) {
            const inOrder = this.staticInstanceOrder.find(e => e == statics[i].name.toLowerCase());
            if (!inOrder)
                this.staticInstanceOrder.push(statics[i].name.toLowerCase());
        }

        this.internActivateWorld();
    }

    public get entityActivator():BaseEntityActivator {
        return this._entityActivator;
    }

    private internActivateWorld() {
        if (!this._factory)
            throw new Error("Invalid state!");
        this.time = 0;

        // new activator instance
        this._entityActivator = this.worldDesc.activatorFactory();

        // create the static instances in given order
        const instances = [];
        for (let i=0; i<this.staticInstanceOrder.length; i++) {
            const edName = this.staticInstanceOrder[i];
            const ed:EntityDefinition = this._entityDefinitions[edName];

            instances.push(new EntityInstance(
                ed.name,
                ed.name,
                {__static:true}
            ));
        }

        // start the world
        this.internInjectEntity(instances, (entities:Entity[]) => {
            let starter:WorldStartHandler = null;
            for (const e of entities) {
                const friends = (e as any)._components;
                for (const c of friends) {
                    const beforeWorldStart = c["beforeWorldStart"];
                    if (isFunction(beforeWorldStart)) {
                        if (!starter) {
                            starter = new WorldStartHandler(this);
                        }
                        starter.append(c);
                    }
                }
            }
            if (starter) {
                // console.log("before starts");
                starter.injectWorldStarter(customInstances => {
                    // console.log("all there", customInstances);
                    this.internInjectEntity(customInstances, () => {
                        this._state = WorldState.Populated;
                        this.firstUpdate();
                    });
                })
            }
            else {
                this._state = WorldState.Populated;
                this.firstUpdate();
            }
        })
    }

    /**
     * Stops the world and frees all resources afterwards.
     */
    public stop():void {
        if (this._state == WorldState.Empty ||
            this._state == WorldState.Clearing) {
            return;
        }
        if (this._state != WorldState.Populated) {
            console.error(`Cannot use World::clear() because it is in state ${WorldState[this._state]}.`);
            return;
        }
        this._state = WorldState.PopulatedWithPendingStop;
    }

    private internStop():void {
        if (this._state != WorldState.PopulatedWithPendingStop) {
            throw new Error("Invalid state!");
        }

        // if (this._state == WorldState.Empty ||
        //     this._state == WorldState.Clearing) {
        //     return;
        // }
        // if (this._state != WorldState.Populated) {
        //     console.error(`Cannot use World::clear() because it is in state ${WorldState[this._state]}.`);
        //     return;
        // }
        // gracefully clean up
        this._state = WorldState.Clearing;
        this.internCleanup();
        const statics = Object.keys(this.statics)
        for (let i=0; i<statics.length; i++) {
            const key = statics[i];
            delete this.statics[key];
        }
        this._actives.length = 0;
        this._alwaysActives.length = 0;
        this._deactives.length = 0;
        this._newEntities.length = 0;
        this._onRenderEntities.length = 0;
        this._entityActivator = null;
        this.manager.resources.release(this.name);
    }


    public restart():void {
        if (this._state != WorldState.Populated) {
            console.warn(`World.restart() ignored when world is in: ${WorldState[this._state]}`)
            return;
        }
        this._state = WorldState.PopulatedWithPendingRestart;
    }

    private internRestart():void {
        if (this._state != WorldState.PopulatedWithPendingRestart) {
            throw new Error("Invalid state!");
        }
        this.manager.resources.copyOwnership(this.name, this.loadingName);
        this._state = WorldState.PopulatedWithPendingStop;
        this.internStop();
        this._state = WorldState.Empty;
        this.start();
    }

    private get loadingName():string {
        return this.name + "_loading";
    }

    public pause():void {
        this.enabled = false;
    }

    public resume():void {
        this.enabled = true;
    }

    public requestRenderEvents(e:Entity):void {
        for (let i=0; i<this._onRenderEntities.length; i++) {
            if (this._onRenderEntities[i] == e)
                return;
        }
        this._onRenderEntities.push(e);
    }


    /**
     * Main function to inject new entities into the running world.
     *
     * ```
     * export class MyPlayer extends Components {
     *
     *    @child("Bomb")        // this makes sure all resources are loaded for the bomb
     *    private bomb:string;
     *
     *    onUpdate(t:number):void {
     *
     *        if (playerWantsToThrowBomb) {
     *            // new bomb is created!
     *            this.world.spawn(this.bomb);
     *        }
     *
     *        if (playerWantsToThrowBigBomb) {
     *            // overwrite power property for this instance!
     *            this.world.spawn(this.bomb, {power: 200});
     *        }
     *    }
     * }
     * ```
     *
     * ---
     *
     * **NOTE:** For spawning objects to load a level use
     * `beforeWorldStart(loader:WorldStartContext)` instead.
     *
     * @param definitionName entity definition name in the current world
     * @param props set/overwrite property
     * @param instanceName
     */
    spawn(definitionName:string,props?:Record<string,any>,instanceName?:string):Entity {
        return this.spawnInstance({
            name: instanceName===undefined?definitionName:instanceName,
            entityDefinitionName: definitionName,
            instanceProperties: props||{},
            parsedProperties: {},
        });
    }

    /**
     * Same as `spawn` but with an object.
     *
     * @see spawn
     */
    spawnInstance(instance:EntityInstance):Entity {
        let entity = null;
        this.internInjectEntity(instance, function(e) {
            entity = e[0];
        });

        if (!entity) {
            console.error(`Failed to inject entity: ${instance.name}:${instance.entityDefinitionName} in World: ${this.name}`);
        }

        return entity;
    }

    /**
     * old name
     *
     * @see spawnInstance
     * @deprecated use spawnInstance instead
     */
    injectEntitySync(instance:EntityInstance):Entity {
        return this.spawnInstance(instance);
    }

    /**
     * Creates new entity(ies) and inject it as a new instance
     * into the management process.
     *
     * This function will return when
     * - a) all component scripts are loaded
     * - b) all required resources are loaded
     * - c) everything is glued together
     *
     * If the data is already loaded than it'll return
     * instantly.
     *
     * If the entity cannot be created a error is sent to
     * the logger.error function. OnReady will still
     * be called.
     *
     * @param {mixed} instance
     * @param {function} onReady 1. parameter is the array with the created entity instances
     * @returns {undefined}
     */
    private internInjectEntity(instance, onReady) {
        this._pendingInjections++;
        this._factory.preloadEntities(
            instance,
            (preparedEntities) => {
                this._pendingInjections--;
                const createdEntities = this.injectPreloadedEntity(preparedEntities);
                onReady(createdEntities);
            },
            0
        );
    }

    /**
     * Creates an entity that is known to be preloaded.
     *
     * @param {EntityInstance} preloadInstaceData
     * @returns {undefined}
     */
    private injectPreloadedEntity(preloadInstaceData) {
        preloadInstaceData = preloadInstaceData || [];
        if (!Array.isArray(preloadInstaceData))
            preloadInstaceData = [preloadInstaceData];
        let i, len, i2, len2; // FIX 2012 says "hello"
        len = preloadInstaceData.length;
        const validEntities:any[] = [];
        for (i=0; i<len; i++) {
            var instanceData = preloadInstaceData[i];
            var instance = new Entity(
                    instanceData.name,
                    instanceData.parsedProperties,
                    instanceData.instanceProperties);
            instance.id = instanceData.id;
            // At this point we have a fully inited
            // entity object.
            //
            // To really use it we have to call "onInit".
            instance.world = this;
            len2 = instanceData.componentClasses.length;
            for (i2=0; i2<len2; i2++) {
                const cmp = new instanceData.componentClasses[i2]();
                const cmpName = instanceData.componentClassNames[i2];
                const beforeInit = instanceData.componentBeforeInitList[i2];
                instance.addComponent(cmp, cmpName, beforeInit);
            }
            try {
                instance.onInit();
            }
            catch(err) {
                if (err instanceof InitError || err["initIssue"]) {
                    instance.setState(EntityState.Error, err["initIssue"]);
                }
                else {
                    throw err; // re-throw (syntax errors etc!)
                }
            }

            if (instance.getState() !== EntityState.Inited) {
                console.error("Inject entity failed. OnInit returned status '"+ instance.getState() + "' with reason '" + instance.getStateDescription() + "'. Entity:", instance.name);
                instance.world = null;
                continue;
            }
            instance.origin = instanceData.entityDefinitionName;
            this._newEntities.push(instance);
            validEntities.push(instance);
        }
        return validEntities;
    }
    /**
     * Send a message to all entities in the scene.
     *
     * @param name identifier of the message
     * @param params data you want to send
     * @param activesOnly true: only active entities get the message
     */
    sendMessage(name:string, params?:any, activesOnly?:boolean):void {
        let i;
        let len;
        len = this._actives.length;
        for (i=0; i<len; i++)
            this._actives[i].sendMessage(name, params);
        len = this._alwaysActives.length;
        for (i=0; i<len; i++)
            this._alwaysActives[i].sendMessage(name, params);
        if (activesOnly === false) {
            len = this._deactives.length;
            for (i=0; i<len; i++)
                this._deactives[i].sendMessage(name, params);
        }
    }

    firstUpdate():void {
        // Free delta resources.
        this.manager.resources.release(this.loadingName);

        // perform activation
        this._entityActivator.updateEntityActivation(
                this._newEntities,
                this._alwaysActives,
                this._actives,
                this._deactives
            );
    }
    /**
     * The internal update method of the world.
     */
    update(elapsed) {
        this.time += elapsed;

        //
        // world can be flagged to restart/stop:
        //
        switch(this._state) {
            case WorldState.PopulatedWithPendingRestart:
                this.internRestart();
                return;
            case WorldState.PopulatedWithPendingStop:
                this.internStop();
                return;
        }
        if (this._state != WorldState.Populated)
            return;
        //
        // update
        //
        let all = 0;
        let len = this._actives.length;
        for (let i=0; i<len; i++)
            this._actives[i].onUpdate(elapsed);
        all += len;

        len = this._alwaysActives.length;
        for (let i=0; i<len; i++)
            this._alwaysActives[i].onUpdate(elapsed);
        all += len;

        // perform activation
        this._entityActivator.updateEntityActivation(
                this._newEntities,
                this._alwaysActives,
                this._actives,
                this._deactives
            );
        return all;
    }

    /**
     * The internal render method of the world.
     */
    render(elapsed:number):void {
        if (this._state != WorldState.Populated)
            return;

        for (let i=0; i<this._onRenderEntities.length; i++) {
            const e = this._onRenderEntities[i];
            e.onRender(elapsed);
        }
    }

    /**
     * getResource<string>("json:path/to/file.json")
     * getResource<string>("json", "path/to/file.json")
     *
     * @param typeOrUrl json:path/to/file.json or json
     * @param path path/to/file.json
     */
    getResource<T>(typeOrUrl:string, path?:string):T {
        const res = this.manager.resources;
        return res.getResource<T>(path ? `${typeOrUrl}:${path}` : typeOrUrl);
    }

    /**
     * Finds all entities which contains a specific component
     *
     * @param componentName
     * @param activeOnly if false it also searches deactive entities
     */
    findEntitiesWithComponent(componentName, activeOnly = true):Entity[] {
        const candidates:Entity[] = [];
        const len = this._actives.length;
        for (let i=0; i<len; i++)
            if (this._actives[i].findComponent(componentName)) {
                candidates.push(this._actives[i]);
            }
        const len2 = this._alwaysActives.length;
        for (let i=0; i<len2; i++)
            if (this._alwaysActives[i].findComponent(componentName)) {
                candidates.push(this._alwaysActives[i]);
            }
        if (!activeOnly) {
            const len3 = this._deactives.length;
            for (let i=0; i<len3; i++)
                if (this._deactives[i].findComponent(componentName)) {
                    candidates.push(this._deactives[i]);
                }
        }
        return candidates;
    }
    /**
     * Finds all entities which contain the specific component and returns the component itself
     *
     * @param componentName
     * @param activeOnly if false it also searches deactive entities
     */
    findComponentsFromEntities(componentName, activeOnly = true):Component[] {
        const candidates:Component[] = [];
        const len = this._actives.length;
        for (let i=0; i<len; i++) {
            const cmp = this._actives[i].findComponent(componentName);
            if (cmp) {
                candidates.push(cmp);
            }
        }
        const len2 = this._alwaysActives.length;
        for (let i=0; i<len2; i++){
            const cmp = this._alwaysActives[i].findComponent(componentName);
            if (cmp) {
                candidates.push(cmp);
            }
        }
        if (!activeOnly) {
            const len3 = this._deactives.length;
            for (let i=0; i<len3; i++){
                const cmp = this._deactives[i].findComponent(componentName);
                if (cmp) {
                    candidates.push(cmp);
                }
            }
        }
        return candidates;
    }
    /**
     * returns all entities with the given name or empty array
     */
    findEntitiesByName(name:string, activeOnly:boolean = true):Entity[] {
        const candidates:any[] = [];
        const len = this._actives.length;
        for (let i=0; i<len; i++) {
            if (this._actives[i].name == name)
                candidates.push(this._actives[i]);
        }
        const len2 = this._alwaysActives.length;
        for (let i=0; i<len2; i++){
            if (this._alwaysActives[i].name == name)
                candidates.push(this._alwaysActives[i]);
        }
        if (!activeOnly) {
            const len3 = this._deactives.length;
            for (let i=0; i<len3; i++){
                if (this._deactives[i].name == name)
                    candidates.push(this._deactives[i]);
            }
        }
        return candidates;
    }
    /**
     * returns null or first entity matching name
     *
     * @param name complete name of the entity. must match exactly
     * @param activeOnly if false one can also search for deactive entities
     * @param includeNew if true also entities in preparation are searched (useful during initialization)
     */
    findFirstEntityWithName(name, activeOnly = true, includeNew = false) {
        const candidates = [];
        const len = this._actives.length;
        for (let i=0; i<len; i++) {
            if (this._actives[i].name == name)
                return this._actives[i];
        }
        const len2 = this._alwaysActives.length;
        for (let i=0; i<len2; i++){
            if (this._alwaysActives[i].name == name)
                return this._alwaysActives[i];
        }
        if (!activeOnly) {
            const len3 = this._deactives.length;
            for (let i=0; i<len3; i++){
                if (this._deactives[i].name == name)
                    return this._deactives[i];
            }
        }
        if (includeNew) {
            const len4 = this._newEntities.length;
            for (let i=0; i<len4; i++){
                if (this._newEntities[i].name == name)
                    return this._newEntities[i];
            }
        }
        return null;
    }
    /**
     * Cleanup function to give all entities the chance to cleanup properly before
     * the manager is dropped or reused.
     *
     * One must wait for the onReadyCallback to return to give the manager the chance to cleanup
     * entities that were loading while calling this.
     */
    private internCleanup() {
        this._resetting = true;
        while(this._resetting) {
            // We simply set "dispose" to all entities that are active, deactive or always
            // active.
            //
            // updateEntityActivation does not guarantee to throw away all disposed entities at once we need
            // to do this until we find no active, always active or deactive entities anymore.
            //
            let found = 0;
            let sanity = 500;
            do {
                let len = this._actives.length;
                for (let i = 0; i < len; i++) {
                    this._actives[i].dispose();
                }
                if (len > 0)
                    found++;
                len = this._alwaysActives.length;
                for (let i = 0; i < len; i++) {
                    this._alwaysActives[i].dispose();
                }
                if (len > 0)
                    found++;
                len = this._deactives.length;
                for (let i = 0; i < len; i++) {
                    this._deactives[i].dispose();
                }
                if (len > 0)
                    found++;
                this._entityActivator.updateEntityActivation(
                    this._newEntities,
                    this._alwaysActives,
                    this._actives,
                    this._deactives
                );
                found--;
                console.log("Cleanup loop. Found:", found, "remaining.");
            } while (found > 0 && sanity-- > 0);
            if (this._pendingInjections > 0) {
                console.log("\n-------------\nPENDING INJECTIONS, during cleanup (should be rare!)\n-------------");
                this.update(0.001);
            }
            else {
                this._resetting = false;
            }
        }
    }
}

export enum WorldState {
    /** Not populated */
    Empty,
    /** Loading and Populating world with entities */
    Loading,
    /** Populated entites have fun */
    Populated,
    /** In the process of removing populated entities */
    Clearing,
    /** In the process of removing populated entities to start it afterwards */
    Restarting,
    /** Failed in some way */
    Error,
    /** Engine IS populated but likes to restart */
    PopulatedWithPendingRestart,
    /** Engine IS populated but likes to Stop */
    PopulatedWithPendingStop
}

export interface InstanceInfo {
    name:string,
    /** name/id of the entity definition */
    entityDefinitionName:string,
    /** unparsed(!) properties of the instance */
    instanceProperties:any
}

enum PendingWorldChange {
    None,
    Stop,
    Restart,
}