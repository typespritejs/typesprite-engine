/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {World, WorldState} from "@tsjs/entity/World";
import {ResourceLoader, ResourceManager} from "@tsjs/entity/ResourceManager";
import {TextFileProvider} from "@tsjs/entity/edf/EDFLoader";
import {WorldDescription} from "@tsjs/entity/WorldDescription";
import {PropertyParser} from "@tsjs/entity/PropertyParser";


/**
 * The core object of a running game.
 *
 * @see World
 */
export class WorldManager {

    private worlds:World[] = [];
    public readonly propertyParser:PropertyParser[] = [];
    public gameTime:number = 0;
    /**
     * **New to TypeSprite?:**
     *
     * Use only the getter/status functions, if at all.
     *
     * It's better to load resources in the Component with the decorator `@res(...)` or
     * the Component callback function: `beforeWorldStart(loader:WorldStartContext) {...}`.
     *
     * If you like to use this to load custom file types (like loading your own
     * binary map file format etc.) it's better to implement a `ResourceLoader`.
     *
     * ---
     *
     * **For advanced devs:**
     *
     * Use this to load/unload additional resources if `beforeWorldStart` isn't enough.
     * Note that Worlds will load/unload resources when activated/deactivated.
     * Make sure to crawl the code to understand the inner rules.
     *
     * @see ResourceLoader
     */
    public readonly resources:ResourceManager;

    constructor(
        public readonly globals:Record<string, any> = {},
        resources:ResourceManager,
        public readonly textLoader:TextFileProvider
    ) {
        this.resources = resources;
    }

    public getWorldByName(worldName:string):World {
        for (let i=0; i<this.worlds.length; i++) {
            if (this.worlds[i].name == worldName)
                return this.worlds[i];
        }
        return null;
    }

    public getNumWorlds():number {
        return this.worlds.length;
    }

    public getWorldByIndex(i:number):World {
        return this.worlds[i];
    }

    /**
     * Use this to declare a new world.
     *
     * ---
     *
     * **New to TypeSprite?:**
     *
     * This is not the API to load a level. Worlds (in 99%) are defined once at
     * the beginning of your game and there will always be only a hand full of them.
     *
     * To load a level from a custom file just add a function called: `beforeWorldStart(loader:WorldStartContext) {...}`
     * in one of your static Components.
     */
    public defineWorld(desc:WorldDescription):World {
        if (this.getWorldByName(desc.name))
            throw new Error(`Failed to define world. World with name "${name}" already defined.`);

        const w = new World(desc, this);
        this.worlds.push(w);
        return w;
    }

    /**
     * Sends a message to all entities in all worlds.
     *
     * @param msgName
     * @param params
     * @param onlyActives false => also send it to deactive objects
     * @param onlyEnabledWorlds false => send to objects in disabled worlds too.
     */
    public sendMessageToAllWorlds(msgName:string, params?:any, onlyActives:boolean=true, onlyEnabledWorlds:boolean=true):void {
        for (let i=0; i<this.worlds.length; i++) {
            const w = this.worlds[i];
            if (onlyEnabledWorlds && !w.enabled)
                continue;
            if (w.getState() != WorldState.Populated)
                continue;
            w.sendMessage(msgName, params, onlyActives);
        }
    }

    public update(elapsed:number):void {
        this.gameTime += elapsed;

        for (let i=0; i<this.worlds.length; i++) {
            const w = this.worlds[i];
            if (!w.enabled)
                continue;
            w.update(elapsed);
        }
    }

    public render(elapsed:number):void {
        for (let i=0; i<this.worlds.length; i++) {
            const w = this.worlds[i];
            if (!w.enabled)
                continue;
            w.render(elapsed);
        }
    }


    // public dropWorldResources(source:World, resUrls:string[]) {
    //     const clear = [];
    //     out: for (const resUrl of resUrls) {
    //         let canStay = false;
    //         for (const world of this.worlds) {
    //             if (source === world) {
    //                 continue;
    //             }
    //             if (world.holdsResource(resUrl)) {
    //                 canStay = true;
    //                 break;
    //             }
    //         }
    //         //
    //         // url not needed anymore
    //         //
    //         if (!canStay)
    //             clear.push(resUrl);
    //     }
    //     if (clear.length > 0) {
    //         console.log("Drop unused resources:", clear.join(', '));
    //     }
    //     this.resources.free(clear);
    // }
}


// ---------------------------------------------------------------------------------------------------------------------

export class WorldManagerBuilder {

    private res:ResourceManager = new ResourceManager();
    private worldDescs:WorldDescription[] = [];
    private textLoader:TextFileProvider;
    private globals:Record<string, any> = {};
    private propertyParser:PropertyParser[] = [];
    private built:boolean = false;


    constructor() {

    }


    addResourceLoader(loader:ResourceLoader):WorldManagerBuilder {
        this.res.addLoader(loader);
        return this;
    }

    addPropertyParser(parser:PropertyParser):WorldManagerBuilder {
        this.propertyParser.push(parser);
        return this;
    }

    addGlobalProp(name:string, v:any):WorldManagerBuilder {
        this.globals[name] = v;
        return this;
    }

    addWorld(w:WorldDescription):WorldManagerBuilder {
        this.worldDescs.push(w);
        return this;
    }

    setTextLoader(t:TextFileProvider):WorldManagerBuilder {
        this.textLoader = t;
        return this;
    }

    build():WorldManager {
        if (this.built)
            throw new Error("Cannot reuse WorldBuilder");
        this.built = true;
        const w = new WorldManager(this.globals, this.res, this.textLoader);
        this.propertyParser.forEach(e => w.propertyParser.push(e));
        this.worldDescs.forEach(wd => w.defineWorld(wd));
        return w;
    }
}