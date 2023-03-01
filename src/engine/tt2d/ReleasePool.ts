/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ContextResource} from "./ContextResource";


export default class ReleasePool {

    private pendingResource: Set<ContextResource> = new Set<ContextResource>();

    public collectReleaseLater(res:ContextResource):void {
        this.pendingResource.add(res);
    }

    public resolve():void {
        for (let res of this.pendingResource) {
            res.release();
        }
        this.pendingResource.clear();
    }


}



