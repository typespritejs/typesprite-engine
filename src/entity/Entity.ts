/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {getObjectClassName} from "@tsjs/util/TTTools";
import {Component} from "@tsjs/entity/Component";
import {World} from "@tsjs/entity/World";
import {InitError} from "@tsjs/entity/Errors";


export enum EntityState {
    Uninited = "uninited",
    Initing = "initing",
    Inited = "inited",
    Active = "active",
    Deactive = "deactive",
    Ignored = "ignored",
    Error = "error",
    Disposed = "disposed",
}

export class Entity {


    private _components:Component[] = [];
    private _componentNames:string[] = [];
    private _componentBeforeInit:(<T extends Component>(targetCmp:T) => string|void)[] = [];
    private _instanceProperties:any;
    /**
     * the state of the entity
     *
     * uninited: new entity
     * initing: the initprocess is in progress
     * inited: entity is ready and working
     * active: entity is activly working/running
     * deactive: entity is sleeping
     * ignored: entity is okay but should not be used
     * error: the entity cannot be used
     * disposed: the entity can be deleted
     **/
    private _state:EntityState = EntityState.Uninited;
    /** description of the state */
    private _stateMsg:string = "";

    // public
    public props:Record<string, any>;
    public name:string;
    public world:World;
    /** name of the ED the entity is created from */
    public origin:any = null;
    public id:number = 0;


    constructor(name, properties, rawProperties) {
        this._instanceProperties = rawProperties;
        this.props = properties || {};
        this.name = name;
    }

    /**
     * @deprecated use world instead.
     */
    get manager():World {
        return this.world;
    }

    /** properties for ... */
    getInstanceProperties() {
        return this._instanceProperties;
    }
    /* adds component */
    addComponent(cmp:Component, cmpName:string, beforeInit:(<T extends Component>(targetCmp:T) => string|void)|null) {
        cmp.entity = this;
        this._components.push(cmp);
        this._componentNames.push(cmpName);
        this._componentBeforeInit.push(beforeInit);
    }
    findComponent(cmpName:string):any {
        const len = this._components.length;
        for(let i=0; i<len; i++) {
            if (this._componentNames[i].toLowerCase() === cmpName.toLowerCase()) {
                if (!(this._components[i] as any)._ttjs_inited) {
                    console.error("findComponent searches for un-inited component. This is not allowed. Use onAfterInit() or check your component order.");
                    return null;
                }
                return this._components[i];
            }
        }
        return null;
    }
    /**
     * true if the given component exists. Other than "findComponent" this function does
     * not check the internal init-state.
     */
    componentExists(cmpName:string):boolean {
        const len = this._components.length;
        for(let i=0; i<len; i++) {
            if (this._componentNames[i].toLowerCase() === cmpName.toLowerCase()) {
                return true;
            }
        }
        return false;
    }
    setState(newState:EntityState, stateReason?:string) {
        this._state = newState;
        this._stateMsg = stateReason || "";
    }
    setError(reason?:string) {
        this._state = EntityState.Error;
        this._stateMsg = reason || "";
    }
    getState() {
        return this._state;
    }
    /** flag this object as garbage */
    dispose():void {
        this.setState( EntityState.Disposed);
    }
    /** true if object is not needed anymore */
    isGarbage():boolean {
        switch(this._state) {
            case EntityState.Ignored:
            case EntityState.Error:
            case EntityState.Disposed:
                return true;
        }
        return false;
    }
    /** for some states (like error) this contains additional expl */
    getStateDescription():string {
        return this._stateMsg;
    }
    onInit():void {

        if (this._instanceProperties.__static) {
            this._state = EntityState.Initing;
            let hasAfterInit = false;
            const len = this._components.length;
            for(let i=0; i<len; i++) {
                const beforeInit = this._componentBeforeInit[i];
                if (beforeInit) {
                    const issue = beforeInit(this._components[i]);
                    if (issue)
                        throw new InitError(issue);
                }

                this._components[i].onInit();
                this.world.statics[`$${this._componentNames[i]}`] = this._components[i];
                (this._components[i] as any)._ttjs_inited = true;
                if ((this._components[i] as any).onAfterInit)
                    hasAfterInit = true;
            }
            if (hasAfterInit) {
                for(var i=0; i<len; i++) {
                    if ((this._components[i] as any).onAfterInit)
                        (this._components[i] as any).onAfterInit(this);
                }
            }
            // success
            if (this._state === EntityState.Initing) {
                this._state = EntityState.Inited;
            }
            else {
                for(let i=0; i<len; i++) {
                    this.world.statics[`$${this._componentNames[i]}`] = null;
                }
            }
        }
        else {
            this._state = EntityState.Initing;
            let hasAfterInit = false;
            const len = this._components.length;
            for(let i=0; i<len; i++) {
                const beforeInit = this._componentBeforeInit[i];
                if (beforeInit)
                    beforeInit(this._components[i]);
                this._components[i].onInit();
                (this._components[i] as any)._ttjs_inited = true;
                if ((this._components[i] as any).onAfterInit)
                    hasAfterInit = true;
            }
            if (hasAfterInit) {
                for(var i=0; i<len; i++) {
                    if ((this._components[i] as any).onAfterInit)
                        (this._components[i] as any).onAfterInit(this);
                }
            }
            // success
            if (this._state === EntityState.Initing)
                this._state = EntityState.Inited;
        }
    }
    onUpdate(time:number):void {
        var len = this._components.length;
        for(var i=0; i<len; i++) {
            this._components[i].onUpdate(time);
        }
    }
    onActivate() {
        var len = this._components.length;
        this.setState(EntityState.Active);
        for(var i=0; i<len; i++) {
            this._components[i].onActivate();
        }
    }
    onDeactivate() {
        var len = this._components.length;
        this.setState(EntityState.Deactive);
        for(var i=0; i<len; i++) {
            this._components[i].onDeactivate();
        }
    }
    onDispose() {
        var len = this._components.length;
        this.setState(EntityState.Disposed);
        for(var i=0; i<len; i++) {
            if (this._components[i].onDispose)
                this._components[i].onDispose();
        }
    }

    /**
     * Note: only works when object entity is flagged as renderer
     *
     * @param elapsed f
     */
    onRender(elapsed:number) {
        let len = this._components.length;
        for(let i=0; i<len; i++) {
            this._components[i].onRender(elapsed);
        }
    }
    dump(ret=false) {
        var len = this._components.length;
        var out = "Entity: "+this.name+"\n";
        out += "Components ["+len+"] {\n";
        for(var i=0; i<len; i++) {
            out += "  " + getObjectClassName(this._components[i]) + "\n";
        }
        out += "}\n";
        if (ret)
            return out;
        console.log(out);
    }
    /* sends message to all components */
    sendMessage(name:string, params?:any) {
        const len = this._components.length;
        const msgName = "onMessage_"+name;
        for(let i=0; i<len; i++) {
            const cmp = this._components[i];
            if (cmp[msgName])
                cmp[msgName](params);
        }
    }
}
