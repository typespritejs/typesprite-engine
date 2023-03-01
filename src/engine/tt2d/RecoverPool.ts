/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {RecoverableResource} from "@tsjs/engine/tt2d/RecoverableResource";


export default class RecoverPool {

    private resources:Set<RecoverableResource> = new Set<RecoverableResource>();

    addResource(res:RecoverableResource):void {
        this.resources.add(res);
    }

    removeResource(res:RecoverableResource):void {
        this.resources.delete(res);
    }

    onRestoreContext():void {
        for (let res of this.resources) {
            res.onRestoreContext();
        }
    }

}



