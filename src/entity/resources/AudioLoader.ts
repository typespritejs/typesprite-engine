import {ResourceLoader, SubResourceLoader} from "@tsjs/entity/ResourceManager";
import {AudioHowl} from "@tsjs/lib/howlerESM";


export class AudioLoader extends ResourceLoader {

    constructor() {
        super()
    }

    getLoaderId(): string {
        return "sound";
    }

    load(path:string, loader:SubResourceLoader):Promise<any> {
        return new Promise((ok, bad) => {
            const sound = new AudioHowl({
                src: path
            });
            sound.once('load', () => {
                ok(sound);
            })
            sound.once('loaderror', () => {
                bad( "Error loading sound " + path.toString());
            })
        })
    }

    unload(path: string, resourceObj:any): void | Promise<undefined> {
        resourceObj.unload(); // release audio memory
    }
}
