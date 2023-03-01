/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ManagedTexture} from "@tsjs/engine/tt2d/ManagedTexture";
import {EngineContext} from "@tsjs/engine/tt2d/EngineContext";
import {ResourceLoader, SubResourceLoader} from "@tsjs/entity/ResourceManager";
import {EngineContextProvider} from "@tsjs/runtime/GameRunner";


export class TextureLoader extends ResourceLoader {

    constructor(
        private ec:EngineContext|EngineContextProvider
    ){
        super();
    }

    getLoaderId(): string {
        return "texture";
    }

    load(path:string, loader:SubResourceLoader):Promise<any> {
        return loader.request([`image:${path}`])
        .then(([img]) => {
            const ec = ((typeof this.ec["getContext"] === "function") ? (this.ec as EngineContextProvider).getContext() : this.ec) as EngineContext;
            if (!ec) {
                throw `Cannot load image before EngineContext is set.`
            }
            const tex = ManagedTexture.fromImage(ec, img as HTMLImageElement, false, false);
            tex.retain();
            return Promise.resolve(tex);
        })
    }

    unload(path: string, resoureObj: ManagedTexture) {
        console.log(`TextureLoader::unload(${path}):`, resoureObj)
        resoureObj.release();
    }

}



