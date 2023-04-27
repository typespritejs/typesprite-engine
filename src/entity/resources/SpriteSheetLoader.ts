/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {SpriteSheetModel} from "@tsjs/engine/tt2d/SpriteSheetModel";
import {SpriteSheet} from "@tsjs/engine/tt2d/SpriteSheet";
import {dirname} from "@tsjs/util/paths";
import {ResourceLoader} from "@tsjs/entity/ResourceManager";


export class SpriteSheetLoader extends ResourceLoader {

    getLoaderId(): string {
        return "sheet";
    }

    load(path:string, loader):Promise<any> {
        let model = null;
        return loader.request([`json:${path}`])
            .then(([json]) => {
                model = json as SpriteSheetModel;
                if (!(model.version > 0) && model.format !== "TypeSpriteSheet") {
                    throw `Unknown version/format.`;
                }
                const texturePaths = model.textures.map(t => `texture:${dirname(path)}/${t.file}`);
                return loader.request(texturePaths);
            }).then(textures => {
                const sheet = SpriteSheet.createFromModel(
                    textures,
                    model
                )
                return Promise.resolve(sheet);
            })
    }
}