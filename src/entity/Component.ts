/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Entity} from "@tsjs/entity/Entity";
import {InitError} from "@tsjs/entity/Errors";
import {World} from "@tsjs/entity/World";
import {ComponentRef} from "@tsjs/entity/ComponentRef";



/**
 * Base class for your game. Mostly everything in TypeSprite-games will be a component.
 *
 * Simple example:
 * ```ts
 * import {prop, component} from 'typesprite'
 *
 * export class MyPlayer extends Component {
 *
 *     _@prop('number', 100) // NOTE: this needs to be @prop and not _@prop
 *     private life:number;
 *
 *     onInit() {
 *         // only called once when the entity is created.
 *     }
 *
 *     onUpdate(detlaTime:number) {
 *         // move your player
 *     }
 *
 * }
 * ```
 * ---
 *
 * This class is tightly coupled with Entity and World:
 *
 * - A Component is part of an Entity.
 * - An Entity is part of a World
 * - A World is part of the WorldManager
 *
 * So one or more worlds run. Each worlds contains one or more entities.
 * Each entity has at least one Component. Every Entity is part of the life cycle
 * and so are the components.
 *
 * As a game developer you can access the outer world:
 * ```ts
 * this.entity;         // access to the entity the component is part of
 * this.world;          // access to the world the entity of the component is part of
 * this.world.manager;  // access to the world manager that handles all worlds
 * ```
 *
 * Here an example
 * ```ts
 * import {prop, component} from 'typesprite'
 *
 * export class MyPlayer extends Component {
 *
 *     _@prop('number', 100) // NOTE: this needs to be @prop and not _@prop
 *     private life:number;
 *
 *     onUpdate() {
 *          if (this.life <= 0)
 *             this.died();
 *     }
 *
 *     died():void {
 *          this.world.spawn("bomb"); // Spawn a bomb (another entity).
 *          this.word.manager.getWorldByName("userInterface").sendMessage('died') // notify the UI
 *          this.entity.dispose();    // Destroy's the players game object
 *      }
 * }
 *
 * ```
 *
 * @see Entity
 * @see World
 * @see WorldManager
 **/
export abstract class Component {

    public entity:Entity = null;

    constructor() {
        /** @type Entity link to the owner entity */
        this.entity = null;
    }

    /**
     *
     * @param propName
     */
    requireProperty<T>(propName:string):T {
        const val = this.entity.props[propName];
        if ((val === undefined || val === null)) {
            throw new InitError(`requireProperty(): ${propName} must not be undefined/null Empty: ${this.entity.name}`);
        }
        return val;
    }

    requireResource<T>(resourceName:string, urlProp:string):T {
        const val = this.entity.world.getResource(resourceName, this.requireProperty(urlProp));
        if ((val === undefined || val === null)) {
            throw new InitError(`requireResource(): ${resourceName} must not be undefined/null Empty: ${this.entity.name}. ResourceName: ${resourceName}. Url Property: ${urlProp}`);
        }
        return val as any;
    }

    requireComponent<T extends Component>(cmpType:string): T {
        const cmp = this.entity.findComponent(cmpType);
        if (!cmp) {
            if (this.entity.componentExists(cmpType))
                throw new InitError(`requireComponent(): ${cmpType} requires an un-inited Component in: ${this.entity.name}. Use onAfterInit() or check your component order.`);
            throw new InitError(`requireComponent(): ${cmpType} not found on Entity: ${this.entity.name}`);
        }
        return cmp;
    }

    /**
     * A reference to another entity's component.
     *
     * It'll internally search the current world for the given entity + component and
     * keep and check the reference.
     *
     * The idea is to keep the reference as a variable. This avoids ugly search code in the
     * component space.
     *
     * @param cmpName
     * @param activesOnly
     * @param entityName
     */
    createComponentRef<T extends Component>(cmpName:string, activesOnly?:boolean, entityName?:string):ComponentRef<T> {
        const cmp = new ComponentRef<T>(this.entity, cmpName, entityName, activesOnly);
        return cmp;
    }

    /** Send a message to all entity components */
    sendMessageToEntity(name:string, params?:any):any {
        this.entity.sendMessage(name, params);
    }

    /** Send a message to all active entities */
    sendMessageToActive(name:string, params?:any):void {
        this.entity.manager.sendMessage(name, params, true);
    }

    /**
     * Send a message to all entities.
     *
     * This should be used with caution as there may be thousends
     * of entities to crawl.
     **/
    sendMessageToAll(name:string, params:any):void {
        this.entity.manager.sendMessage(name, params, false);
    }

    /**
     * Finds a component within this entitiy.
     *
     * @param {String} cmpName Class-Name of the component
     **/
    findComponent(cmpName) {
        return this.entity.findComponent(cmpName);
    }

    get world():World {
        return this.entity.world;
    }

    /**
     *
     */
    onInit():void {
    }

    onActivate():void {
    }

    onUpdate(elapsed:number):void {
    }

    onDeactivate():void {
    }

    onDispose():void {
    }

    /**
     * Overwrite this if you need to listen to render events.
     *
     * It only works if you also register the outer entity to receive
     * render events:
     *
     * ```
     * onInit() {
     *     this.world.requestRenderEvents(this.entity); // REQUIRED!!
     * }
     * ```
     */
    onRender(elapsed:number):void {
    }

}
