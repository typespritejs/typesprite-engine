/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {World} from "@tsjs/entity/World";
import {Component} from "@tsjs/entity/Component";
import {isPromise} from "@tsjs/util/utils";
import {EntityInstance} from "@tsjs/entity/EntityInstance";
import {ResourceState} from "@tsjs/entity/ResourceManager";


/**
 * Part of the Window
 *
 * @see WorldManager
 */
export class WorldStartHandler {

    private starterEntries:Component[] = [];
    private pending:Component[] = [];
    private started:boolean = false;
    private readonly shared:SharedStarterContext;
    private readonly context:InternWorldStartContext;

    constructor(private world:World) {
        this.shared = new SharedStarterContext();
        this.context = new InternWorldStartContext(
            world,
            this.shared
        );
    }

    append(e:Component) {
        if (this.started) {
            throw new Error("WorldStartHandler::append() cannot happen after injectWorldStarter!");
        }
        this.starterEntries.push(e);
        this.pending.push(e);
    }

    injectWorldStarter(cb:InstanceCallback) {
        if (this.started) {
            throw new Error("WorldStartHandler::injectWorldStarter() can only run once!");
        }
        this.started = true;
        this.next(cb);
    }

    private next(cb:InstanceCallback) {
        if (this.pending.length == 0) {
            this.instantitate(cb);
            return;
        }
        const target = this.pending.shift();
        let res = null;
        try {
            res = target["beforeWorldStart"](this.context);
        }
        catch(err) {
            console.error(`Error in beforeWorldStart() in Entity: ${target.entity.name}: `, err);
            setTimeout(()=>this.next(cb));
        }
        if (isPromise(res)) {
            res.then(() => {
                setTimeout(()=>this.next(cb));
            }).catch(err => {
                console.error(`Error in beforeWorldStart() in Entity: ${target.entity.name}: `, err);
                setTimeout(()=>this.next(cb));
            })
        }
        else {
            setTimeout(()=>this.next(cb));
        }
    }

    private instantitate(cb:InstanceCallback) {
        if (this.shared.instances.length <= 0) {
            cb(null);
            return;
        }
        //
        // Create instancees
        //
        const out:EntityInstance[] = [];
        for (const instance of this.shared.instances) {
            const outInstance = new EntityInstance(
                instance.name,
                instance.def,
                {...instance.props, __static: false}
            );
            out.push(outInstance);
        }
        cb(out);
    }
}

// ---------------------------------------------------------------------------------------------------------------------

type PropType = Record<string, string|number|boolean|null>;
type InstanceCallback = (e:EntityInstance[]|null)=>void;

class SpawnInstance {
    name:string;
    def:string;
    props:PropType;
}

class SharedStarterContext {
    public instances:SpawnInstance[] = [];
}

// ---------------------------------------------------------------------------------------------------------------------

export interface WorldStartContext {
    spawn(def: string, props?: PropType, name?: string):void;
    requestResource(resUrls: string[]): Promise<any[]>;
}

class InternWorldStartContext implements WorldStartContext {

    constructor(
        private world:World,
        private shared:SharedStarterContext
    ) {}

    spawn(def:string, props?:PropType, name?:string) {
        this.shared.instances.push({
            name: name||def,
            def,
            props
        });
    }

    // requestResource(resUrls:string[]):Promise<any[]> {
    //     this.world.manager.resources.request(this.world.name, resUrls).then(errNum => {
    //
    //
    //     })
    //
    //
    //     // const ws = (this.world)._worldResources;
    //     //
    //     // return ws.request(resUrl);
    // }

    requestResource(resUrls:string[]):Promise<any[]> {
        const resManager = this.world.manager.resources;
        return new Promise<any[]>((ok, bad) => {
            resManager.requestDirect(this.world.name, resUrls, numErr => {
                const out = [];
                for (const resUrl of resUrls) {
                    const state = resManager.getResourceState(resUrl);
                    if (state === ResourceState.Ready)
                        out.push(resManager.getResource(resUrl))
                    else
                        out.push(null)
                }
                ok(out);
            })
        })
    }
}