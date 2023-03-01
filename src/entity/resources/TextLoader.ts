/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {getText} from "@tsjs/util/TTTools";
import {ResourceLoader} from "@tsjs/entity/ResourceManager";


export class TextLoader extends ResourceLoader {

    getLoaderId(): string {
        return "text";
    }

    load(path:string, loader):Promise<any> {
        return new Promise((resolve, bad) => {
            getText(
                loader.getActualUrl(path),
                data => resolve(data),
                error => bad(error)
            )
        });
    }
}
