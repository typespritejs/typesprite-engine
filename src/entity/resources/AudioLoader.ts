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

    // load_(url, callback) {
    //     const urls = HowlerSoundResources.transferUrl(url);
    //     const sound = new Howl({
    //         src: urls
    //     });
    //     sound.once('load', () => {
    //         callback(true, sound);
    //     })
    //     sound.once('loaderror', () => {
    //         callback(false, "Error loading sound " + urls.toString());
    //     })
    // }



    // /**
    //  * Takes a sound-effect-url and translates it into a howler-compatible
    //  * list or urls (taking handleTypes and availableFiles into account).
    //  *
    //  * @param url
    //  * @returns {Array}
    //  */
    // static transferUrl(url, availableFiles?, handleTypes?) {
    //     availableFiles = availableFiles || HowlerSoundResources.availableFiles;
    //     handleTypes = handleTypes || HowlerSoundResources.handleTypes;
    //
    //
    //     // We need the url without the file name so we can let howler decide what to load
    //     let urls:any = [];
    //     for (let i=0; i<handleTypes.length; i++) {
    //         const handleType =  handleTypes[i];
    //         if (env.strEndsWith(url.toLowerCase(), "." + handleType)) {
    //             const baseUrl = url.substring(0, url.length - handleType.length);
    //             for (let i2=0; i2<availableFiles.length; i2++) {
    //                 urls.push(baseUrl + availableFiles[i2]);
    //             }
    //             break;
    //         }
    //     }
    //     if (urls.length == 0)
    //         urls.push(url);
    //
    //     return urls;
    // }



}
