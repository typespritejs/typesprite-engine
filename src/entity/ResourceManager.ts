/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

import { WorldManager } from "./WorldManager";


/**
 * This is mostly an internal class. TypeSprite normaly takes care of all
 * calles you find here.
 *
 * ResourceManager takes care of all resources. It's tightly coupled with World and WorldManager
 * class and ensures that assets are loaded and available if needed.
 *
 * It's possible to have multiple resource of the same file.
 *
 * ```ts
 * // Usage:
 *
 * const res = new ResourceManager();
 * res.addLoader(new MyLoader1());
 * res.addLoader(new MyLoader2());
 *
 * res.request('myOwner', ['loader1:path/to/file', 'loader2:path/to/file']).then(numFailed => {...});
 * ```
 *
 * @see ResourceLoader
 * @see SubResourceLoader
 */
export class ResourceManager {
    private requireChain:RequireChain = new RequireChain(this);
    private pendingRequests:RequestSet[] = [];
    private loaders:Map<string, ResourceLoader> = new Map();
    private pendingHeartbeat = null;
    private rootPath:string = "";

    constructor(
        private readonly maxParallel= 8,
    ) {
    }

    getResource<T>(resUrl:string):T|null {
        const res = this.requireChain.resources.get(resUrl);
        if (!res || res.state != ResourceState.Ready)
            return null;
        return res.resourceObject;
    }

    getResourceError(resUrl:string):string|null {
        const res = this.requireChain.resources.get(resUrl);
        if (res && res.state == ResourceState.Error)
            return res.issue;
        return null;
    }

    getLoaderByUrl(resUrl:string):ResourceLoader[] {
        const matches = [];
        for (const loader of this.loaders.values()) {
            if (loader.canHandleUrl(resUrl)) {
                matches.push(loader);
            }
        }
        return matches;
    }

    getResourceState(resUrl:string):ResourceState {
        const res = this.requireChain.resources.get(resUrl);
        if (!res)
            return ResourceState.Unknown;
        return res.state;
    }

    addLoader(resourceLoader:ResourceLoader):void {
        const loaderId = resourceLoader.getLoaderId();
        if (!loaderId || typeof loaderId != "string" || loaderId.trim() === '') {
            throw new Error(`ResourceLoader registration failed. The loader ID is empty or undefined.`);
        }
        if (this.loaders.has(loaderId)) {
            throw new Error(`Duplicated ResourceLoader registration of id: ${resourceLoader.getLoaderId()}.`);
        }
        this.loaders.set(loaderId, resourceLoader);
    }

    private internRelease(res:Resource) {
        const [loaderId, path] = this.parseResUrl(res.resUrl);
        const loader = this.loaders.get(loaderId);
        if (!loader) {
            throw new Error("Invalid State!");
        }
        const prom = loader.unload(path, res.resourceObject);
        if (prom) {
            prom.catch(err => {
                console.error(`Error while unloading resourse: ${res.resUrl}. Reason:`, err);
            })
        }
    }

    private internSetResourceState(resUrl:string, resState:ResourceState, err:string=null) {
        const res = this.requireChain.resources.get(resUrl);
        if (!res) {
            throw new Error("Invalid state!");
        }
        res.state = resState;
        if (resState === ResourceState.Error)  {
            res.issue = err;
            if (err === null) {
                throw new Error("Invalid state!");
            }
        }
        this.scheduleHeartbeat();
    }

    /**
     * All resources attached to that ownerId will be released.
     *
     * @param ownerId resUrl
     */
    public release(ownerId:string) {
        this.requireChain.dropOwner(ownerId);
    }

    /**
     * All resources that are owned by `ownerId` also become owned by
     * `additionalOwner`.
     *
     * It's meant for retaining resources during world-restarts.
     */
    public copyOwnership(ownerId:string, additionalOwner:string) {
        this.requireChain.copyOwnership(ownerId, additionalOwner);
    }

    /**
     * Frees all resources.
     */
    public releaseAll() {
        for (const ownerId of this.requireChain.getOwnerList()) {
            this.release(ownerId);
        }
    }

    /**
     * Same as requireDirect but as a Promise (ease usage of await/async)
     */
    public request(ownerId:string, resUrls:string[]):Promise<number> {
        return new Promise<number>((ok, bad) => {
            this.requestDirect(ownerId, resUrls, numError => {
                ok(numError);
            })
        })
    }

    /**
     * Requires all resources. If they are not yet loaded they'll be put into the loading queue.
     *
     * The callback return is called in sync if all resources are were loaded (or failed).
     *
     * The ownerId is the world, resource, etc. that holds the resource.
     */
    public requestDirect(ownerId:string, resUrls:string[], cb:(number) => void) {
        if (resUrls.length == 0)
            throw new Error("Cannot request nothing");
        let numReady = 0;
        let numError = 0;
        let numNew = 0;
        let numLoading = 0;
        let numWaiting = 0;
        for (const resUrl of resUrls) {
            const res = this.requireChain.require(ownerId, resUrl);
            switch(res.state) {
                case ResourceState.NewlyRequested:
                    numNew++;
                    this.scheduleHeartbeat();
                    break;
                case ResourceState.Ready:
                    numReady++;
                    break;
                case ResourceState.Error:
                    numError++;
                    break;
                case ResourceState.WaitForDepedencies:
                    numWaiting++;
                    break;
                case ResourceState.Loading:
                    numLoading++;
                    break;
                case ResourceState.Released:
                    throw new Error("Invalid state. Should never happen!");
            }
        }
        if (numReady + numError >= resUrls.length) {
            cb(numError);
            return;
        }
        const req = new RequestSet(ownerId, resUrls, cb)
        this.pendingRequests.push(req);
        this.scheduleHeartbeat();
    }

    private heartbeat():void {
        this.checkPendingRequests();
        this.checkWaitingResources();
    }

    private scheduleHeartbeat() {
        if (this.pendingHeartbeat)
            return;
        this.pendingHeartbeat = setTimeout(() => {
            this.pendingHeartbeat = null;
            this.heartbeat()
        });
    }

    /**
     * Checks if a waiting resources can start to load
     */
    private checkWaitingResources() {
        //
        // check state
        //
        const newlyRequested:Resource[] = [];
        let numLoading = 0;
        for (const res of this.requireChain.resources.values()) {
            if (res.state === ResourceState.NewlyRequested) {
                newlyRequested.push(res);
            }
            else if (res.state === ResourceState.Loading) {
                numLoading++;
            }
        }
        if (numLoading >= this.maxParallel || newlyRequested.length <= 0)
            return; // queue full or empty => nothing to do for us
        //
        // Start loading
        //
        for (let i=0; i<this.maxParallel-numLoading && newlyRequested.length > 0; i++) {
            const res = newlyRequested.shift();
            const [loaderId, path] = this.parseResUrl(res.resUrl);
            const loader = this.loaders.get(loaderId);
            if (!loader) {
                res.state = ResourceState.Error;
                res.issue = `Loader not found! 💡 Forget to use the loader-prefix? Try 'LOADER_TYPE:path/to/myFile.type'`;
                console.error(`Failed to load ${res.resUrl}. ${res.issue}`);
                this.scheduleHeartbeat();
                continue;
            }
            if (!path || !path.trim()) {
                res.state = ResourceState.Error;
                res.issue = `Invalid path. Should not be empty`;
                console.error(`Failed to load ${res.resUrl}. ${res.issue}`);
                this.scheduleHeartbeat();
                continue;
            }
            const trimPath = path.trim();
            if (trimPath.length != path.length) {
                res.state = ResourceState.Error;
                res.issue = `Invalid path. It must be trimmed.`;
                console.error(`Failed to load ${res.resUrl}. ${res.issue}`);
                this.scheduleHeartbeat();
                continue;
            }
            if (path.startsWith("/")) {
                res.state = ResourceState.Error;
                res.issue = `Invalid path. Must not start with '/'`;
                console.error(`Failed to load ${res.resUrl}. ${res.issue}`);
                this.scheduleHeartbeat();
                continue;
            }
            //
            // Perform the actual loading
            //
            res.state = ResourceState.Loading;
            res.issue = "";
            (loader as any).internLoad(this, res.resUrl, path, (success, resOrErr) => {
                this.scheduleHeartbeat();
                if (success) {
                    res.state = ResourceState.Ready;
                    res.resourceObject = resOrErr;
                } else {
                    res.state = ResourceState.Error;
                    res.issue = errorToString(resOrErr);
                }
            })
        }
    }

    /**
     * A TypeSprite resUrl looks like this:
     *
     * ```
     * texture:assets/spirtes1.png` => loaderId: "texture", path: "assets/sprites1.png"
     * image:assets/spirtes1.png`   => loaderId: "image",   path: "assets/sprites1.png"
     * ```
     *
     * @param resUrl
     */
    public parseResUrl(resUrl:string): [string, string]|[] {
        const colonIndex = resUrl.indexOf(':');
        if (colonIndex === -1) {
            return [null, null]
        }
        const loaderId = resUrl.substr(0, colonIndex);
        const path = resUrl.substr(colonIndex+1);
        return [loaderId, path];
    }

    /**
     * A request is fulfilled if all resources are either:
     * error or ready.
     *
     * Here we perform the callbacks when this condition changed.
     */
    private checkPendingRequests() {
        for (let i=0; i<this.pendingRequests.length;) {
            const pr = this.pendingRequests[i];
            let numError = 0;
            let numReady = 0;
            for (const resUrl of pr.resUrls) {
                const res = this.requireChain.getResource(resUrl);
                switch (res.state) {
                    case ResourceState.Error:
                        numError++;
                        break;
                    case ResourceState.Ready:
                        numReady++;
                        break;
                    case ResourceState.Released:
                        console.error("Invalid state. Should never happen!");
                        break;
                }
            }
            if (numError + numReady == pr.resUrls.length) {
                pr.receiver(numError);
                this.pendingRequests.splice(i, 1);
                this.scheduleHeartbeat();
                continue;
            }
            i++;
        }
    }

    /**
     * Use this to understand the state of all resources.
     *
     * Pretty GC heavy. Mostly meant for debugging/optimization.
     */
    public collectResourceInfo():Record<string, ResourceInfo> {
        const out = {};
        const owner = (this.requireChain as any).owner;
        const ownerMap = {};
        for (const [ownerId, resOwner] of owner.entries()) {
            for (const resUrl of resOwner.requires) {
                ownerMap[resUrl] = ownerMap[resUrl]||[];
                ownerMap[resUrl].push(ownerId);
            }
        }
        for (const [resUrl, res] of this.requireChain.resources.entries()) {
            const info = new ResourceInfo();
            out[resUrl] = info;
            info.issue = res.issue||"";
            info.state = ResourceState[res.state];
            info.resUrl = resUrl;
            info.refCount = res.refCount;
            info.owners = ownerMap[resUrl];
        }
        return out;
    }

    /**
     * If set, will be prefixed for every actual-path access.
     * This is useful when running the game on a subfolder path.
     *
     * @see SubResourceLoader
     */
    setRootPath(rootPath:string) {
        this.rootPath = rootPath;
    }

    setWorldManager(wm:WorldManager) {
        for (const l of this.loaders.values()) {
            l.setWorldManager(wm);
        }
    }

    getActualUrl(path:string):string {
        return this.rootPath ? `${this.rootPath}${path}` : path;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export enum ResourceState {
    /**
     * The resource is unknown
     */
    Unknown,
    /**
     * The resource is scheduled for loading but not yet tried.
     */
    NewlyRequested,
    /**
     * ResourceManager is actively loading the resource
     */
    Loading,
    /**
     * The resource is actively loading but it's waiting for another
     * resource to be loaded.
     */
    WaitForDepedencies,
    /**
     * Loading failed at some point.
     */
    Error,
    /**
     * Resource is loaded and can be used.
     */
    Ready,
    /**
     * Is an internal state that should not occur.
     */
    Released,
}


// ---------------------------------------------------------------------------------------------------------------------


/**
 * Extend to implement custom resources.
 *
 * The loader-id is the used to ensure that we can load the same assets out of different
 * contexts. For each loader-id there can only be one loader.
 *
 * Loaders can be build for specific game needs.
 *
 * Overwrite `unload` to release GPU objects.
 */
export abstract class ResourceLoader {

    abstract getLoaderId():string;

    private _worldManager:WorldManager;

    setWorldManager(wm:WorldManager) {
        this._worldManager = wm;
    }

    get worldManager():WorldManager {
        return this._worldManager;
    }

    canHandleUrl(url:string):boolean {
        return url.startsWith(`${this.getLoaderId()}:`);
    }

    private internLoad(resManager:ResourceManager, resUrl:string, path:string, cb:(success:boolean, resOrErr:any)=>void) {
        //
        // Bind the owner
        //
        const loader = new class SubResourceLoader {
            request(resUrls:string[]):Promise<any[]> {
                return new Promise<any[]>((ok, bad) => {
                    (resManager as any).internSetResourceState(resUrl, ResourceState.WaitForDepedencies);
                    resManager.requestDirect(resUrl, resUrls, numErr => {
                        (resManager as any).internSetResourceState(resUrl, ResourceState.Loading);
                        const out = [];
                        const err = [];
                        for (const resUrl of resUrls) {
                            const state = resManager.getResourceState(resUrl);
                            if (state === ResourceState.Ready) {
                                out.push(resManager.getResource(resUrl))
                            }
                            else {
                                err.push( resManager.getResourceError(resUrl));
                            }
                        }
                        switch(err.length) {
                            case 0:
                                ok(out);
                                break;
                            case 1:
                                bad(err[0]);
                                break;
                            default:
                                bad(err.join(','))
                                break;
                        }
                    })
                })
            }
            getResourceState(resUrl:string):ResourceState {
                return resManager.getResourceState(resUrl);
            }
            getActualUrl(path:string):string {
                return resManager.getActualUrl(path);
            }
        }
        //
        // Execute the loading
        //
        let prom = null;
        try {
            prom = this.load(path, loader);
        }
        catch(err) {
            cb(false, err);
            return;
        }
        prom.then(resObj => {
            cb(true, resObj);
        }).catch(err => {
            cb(false, err);
        })
    }

    /**
     * Implement here your custom loading and parsing parts.
     *
     * Use `this.manager` to access the resource manager and
     * use existing loaders to get things done fast and easy.
     *
     * ```ts
     * // Example:
     * // 1. uses TextLoader to load the json raw string data
     * // 2. parses the raw text to json
     * load(path:string):Promise<any> {
     *    return this.manager.request<string>(`text:${path}`)
     *        .then(jsonStr => {
     *        try {
     *            const json = JSON.parse(jsonStr);
     *            return Promise.resolve(json);
     *        }
     *        catch(err) {
     *            throw new Error(`Cannot parse json from ${path}. Reason: ${(err as any).message}`);
     *        }
     *    });
     * }
     * ```
     *
     * @param path is only the _path_ part. There is NO loader-id here.
     */
    abstract load(path:string, loader:SubResourceLoader):Promise<any>;

    /**
     * Overwrite this function to be able to remove foreign memory objects.
     *
     * Some resources, like GPU objects might contain foreign memory objects that should
     * be removed alongside with the CPU memory.
     *
     * If all goes well this is never called during loading itself. One can always assume
     * that the resource is fully loaded.
     *
     * ---
     * There is also [FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry)
     * but it might introduce additional load on the CPU/GPU during normal gameplay.
     *
     * @param path
     * @param resoureObj
     */
    unload(path:string, resourceObj:any):void|Promise<undefined> {
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * This is meant to be used with the ResourceLoader.
 * It allows you to load additonal resources.
 *
 * It takes care of all dependencies.
 *
 * @see ResourceLoader
 */
export interface SubResourceLoader {
    /**
     * Use this to request one or more sub-resources your
     * loader format needs.
     *
     * Example could be:
     * ```
     * sheetConfig = await mySubResLoader.request(['json:mySpriteSheet.json']);
     * const images = await mySubResLoader.request(sheetJson.images);
     * // now sheet config & images are there to create the object
     * ```
     */
    request(resUrls:string[]):Promise<any[]>;
    /**
     * If request(...) returns a null value that might
     * be a valid result of a resource.
     *
     * If in doubt the state of a resource can be queried here.
     *
     * ---
     *
     * **IMPORTANT**
     *
     * Don't use this function to decide weather you have
     * to load a sub-resource or not.
     *
     * **Always** use `loader.request()` for all sub-resources
     * you need.
     */
    getResourceState(resUrl:string):ResourceState;

    /**
     * Resource-Loader that actually ask the browser for resources
     * (like loading an PNG or TXT file) should use this method to
     * support rootPath.
     *
     * USE this only for actual browser resource access.
     */
    getActualUrl(path:string):string;
}

// ---------------------------------------------------------------------------------------------------------------------

class RequestSet {

    constructor(
        public readonly ownerId:string,
        public readonly resUrls:string[],
        public readonly receiver:(numError)=>void,
    ) {
    }
}

// ---------------------------------------------------------------------------------------------------------------------

function errorToString(err:any):string {
    if (err && typeof err !== "string") {
        return err["message"] ? err["message"] as string: `${err}`;
    }
    return err;
}

// ---------------------------------------------------------------------------------------------------------------------

class ResourceInfo {
    public resUrl:string = "";
    public state:string = "";
    public issue:string = "";
    public refCount:number = 0;
    public owners:string[] = [];
}

// ---------------------------------------------------------------------------------------------------------------------

class ResourceOwner {
    requires:Set<string> = new Set();
    constructor(
        public readonly id:string
    ) {
    }
}

// ---------------------------------------------------------------------------------------------------------------------

class Resource {
    private _refCount:number = 0;
    public resourceObject:any;
    public state:ResourceState = ResourceState.NewlyRequested;
    public issue:string = "";

    constructor(
        public readonly resUrl:string,
    ) {
    }

    /** as a resource can also be an owner we need an ID for it */
    public get ownerId():string {
        return this.resUrl;
    }

    public get refCount():number {
        return this._refCount;
    }

    retain() {
        this._refCount++;
    }

    release():boolean {
        this._refCount--;
        if (this._refCount === 0) {
            console.log("🔥 Resource dropped out of scope:", this.resUrl);
            this.state = ResourceState.Released;
            return true;
        }
        else if (this._refCount < 0) {
            throw new Error("Invalid state!");
        }
        return false;
    }

}

// ---------------------------------------------------------------------------------------------------------------------

class RequireChain {

    private owner:Map<string, ResourceOwner> = new Map()
    public readonly resources:Map<string, Resource> = new Map()

    constructor(
        private readonly releaseContext:ResourceManager
    ) {
    }

    public getOwnerList():string[] {
        return [...this.owner.keys()];
    }

    public require(ownerId:string, resUrl:string):Resource {
        const res = this.getResourceOrCreate(resUrl)
        if (!this.getOwnerOrCreate(ownerId).requires.has(resUrl)) {
            res.retain();
            this.getOwnerOrCreate(ownerId).requires.add(resUrl);
        }
        return res;
    }

    public copyOwnership(ownerId:string, additionalOwnerId:string) {
        const owner = this.owner.get(ownerId);
        if (!owner)
            return;
        const additional = this.getOwnerOrCreate(additionalOwnerId);
        for (const resUrl of owner.requires.values()) {
            if (!additional.requires.has(resUrl)) {
                const res = this.getResourceOrCreate(resUrl)
                res.retain();
                additional.requires.add(resUrl);
            }
        }
    }

    public dropOwner(ownerId:string) {
        if (!this.owner.has(ownerId))
            return;
        const owner = this.getOwnerOrCreate(ownerId);
        const ownerRequires = [...owner.requires.values()]
        for (const resUrl of ownerRequires) {
            const res = this.resources.get(resUrl);
            if (!res)
                continue;
            owner.requires.delete(resUrl);
            const removed = res.release();
            if (removed) {
                try {
                    (this.releaseContext as any).internRelease(res);
                }
                catch(err) {
                    console.error("Error while releasing a resource", err);
                }
                this.resources.delete(res.resUrl);
                this.dropOwner(res.ownerId);
            }
        }
        if (owner.requires.size == 0) {
            this.owner.delete(ownerId);
        }
    }

    private getOwnerOrCreate(id:string):ResourceOwner {
        const owner = this.owner.get(id)
        if (owner)
            return owner;
        const newOwner = new ResourceOwner(id);
        this.owner.set(id, newOwner);
        return newOwner;
    }

    private getResourceOrCreate(resUrl:string):Resource {
        const res = this.resources.get(resUrl);
        if (res)
            return res;
        const newRes = new Resource(resUrl);
        this.resources.set(resUrl, newRes);
        return newRes;
    }

    public getResource(resUrl:string):Resource {
        return this.resources.get(resUrl);
    }
}
