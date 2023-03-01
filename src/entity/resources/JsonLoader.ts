/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ResourceLoader, SubResourceLoader} from "@tsjs/entity/ResourceManager";


export class JsonLoader extends ResourceLoader {

    getLoaderId(): string {
        return "json";
    }

    load(path:string, loader:SubResourceLoader):Promise<any> {
        return loader.request([`text:${path}`])
            .then(([jsonStr]) => {
            try {
                const json = JSON.parse(jsonStr);
                return Promise.resolve(json);
            }
            catch(err) {
                throw new Error(`Cannot parse json from ${path}. Reason: ${(err as any).message}`);
            }
        });
    }
}
