/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {EngineContext} from "./EngineContext";


/**
 * This is a resources organized in the context.
 *
 * Other than most normal objects in JavaScript it means once created
 * it won't die when it is not referenced anymore. Instead it lives
 * until:
 *
 *   1. context lost:
 *     - canvas resize
 *     - canvas removed
 *     - some OS event
 *   2. program actively frees it
 *
 *
 * Context resources live in GPU until either (1) or (2) happened.
 *
 * This means that if we fail to identify when we can free memory
 * we'll fill up out GPU memory.
 *
 * To organize this we fall back to reference counting:
 *
 * Every time we like this kind of resource to outlive a certain
 * context we need to call retain. When we are done with it we use
 * release. If more than one owner exists release won't harm the
 * resource.
 *
 * Classes that create a resource will internally call releaseLater()
 * to let them fail if retain isn't used explicitly.
 *
 *
 *
 */
export abstract class ContextResource {

    private ref:number = 1;
    private released:boolean = false;

    public constructor(
        protected ec:EngineContext
    ) {
    }

    public release():void {
        this.ref--;
        if (this.ref <= 0) {
            if (this.released) {
                console.error("ContextResource already released");
                return;
            }

            this.released = true;
            // console.log("Free ContextResource", this);
            this.freeResource();
        }
    }

    public releaseLater(): void {
        this.ec.releasePool.collectReleaseLater(this);
    }

    public retain(): void {
        this.ref++;
    }

    public isReleased() {
        return this.released;
    }


    public abstract freeResource():void;

}
