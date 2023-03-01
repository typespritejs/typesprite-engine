/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ResourceLoader, SubResourceLoader} from "@tsjs/entity/ResourceManager";

export class ImageLoader extends ResourceLoader {


    getLoaderId(): string {
        return "image";
    }

    load(path:string, loader:SubResourceLoader): Promise<any> {
        return new Promise((ok, bad) => {
            const jsImage = new Image();
            jsImage.onload = function() {
                ok(jsImage);
            };
            const errorHandler = function() {
                bad(`Failed to load image: ${path}`);
            };
            jsImage.onerror = errorHandler;
            jsImage.onabort = errorHandler;
            jsImage.src = loader.getActualUrl(path);
        })
    }
}
	
