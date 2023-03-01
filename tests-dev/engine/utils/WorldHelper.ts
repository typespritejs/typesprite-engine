
import {expect} from "expect";
import {
    TextFileProvider,
    Component,
    WorldManagerBuilder,
    WorldDescription,
    ResourceLoader,
    isArray,
    WorldState,
    WorldManager,
    StringPropertyParser,
    NumberPropertyParser,
    EaseFuncPropertyParser,
    BoolPropertyParser, AnyPropertyParser, ColorPropertyParser
} from "tsjs";
import {ManualActivator} from "./ManualActivator";


export class DummyTextLoader implements TextFileProvider {
    constructor(
        public files:Record<string, string> = {}
    ) {
    }
    readAllText(url: string, receiver: (success: boolean, textOrError: string) => void): void {
        setTimeout(() => {
            for (const fileUrl of Object.keys(this.files)) {
                if (fileUrl == url) {
                    receiver(true, this.files[url]);
                    return;
                }
            }
            receiver(false, 'not_found');
        })
    }
}


export class BaseCmp extends Component {
    onInit(): void {
    }
    onActivate(): void {
    }
    onDeactivate(): void {
    }
    onUpdate(elapsed: number): void {
    }
}

export class MyGlobal {
    public path:string = "my/path";
}

export async function makeWorld(files:DummyTextLoader, edfFiles:string[]|string, loaders:ResourceLoader[]=[]):Promise<WorldManager> {


    const wb = new WorldManagerBuilder()
        .setTextLoader(files)
        .addPropertyParser(new NumberPropertyParser())
        .addPropertyParser(new StringPropertyParser())
        .addPropertyParser(new EaseFuncPropertyParser())
        .addPropertyParser(new BoolPropertyParser())
        .addPropertyParser(new AnyPropertyParser())
        .addPropertyParser(new ColorPropertyParser())
        .addGlobalProp("global", new MyGlobal());

    if (isArray(edfFiles)) {
        for (let i=0; i<edfFiles.length; i++) {
            wb.addWorld(new WorldDescription()
                .setName(`world${i+1}`)
                .setActivatorFactory(() => new ManualActivator())
                .setEDFFilePath(edfFiles[i])
            )
        }
    }
    else {
        wb.addWorld(new WorldDescription()
            .setName("world1")
            .setActivatorFactory(() => new ManualActivator())
            .setEDFFilePath(edfFiles as string)
        )
    }


    for (const loader of loaders) {
        wb.addResourceLoader(loader);
    }

    const wm = wb.build();
    const w1 = wm.getWorldByIndex(0);

    expect(w1.getState()).toBe(WorldState.Empty);
    if (isArray(edfFiles)) {
        for (let i=0; i<wm.getNumWorlds(); i++ ) {
            wm.getWorldByIndex(i).activate();
        }
    }
    else {
        w1.activate();
    }
    expect(w1.getState()).toBe(WorldState.Loading);

    let wait = 1000;
    while((wait -= 10) > 0) {
        await new Promise((ok) => setTimeout(() => ok(null), 10));
        if (isArray(edfFiles)) {
            let allLoaded = true;
            for (let i=0; i<wm.getNumWorlds(); i++ ) {
                if (wm.getWorldByIndex(i).getState() !== WorldState.Populated) {
                    allLoaded = false;
                }
            }
            if (allLoaded)
                break;
        }
        else {
            if (w1.getState() == WorldState.Populated)
                break;
        }
    }

    expect(w1.getState()).toBe(WorldState.Populated);



    for (let i=0; i<10; i++) {
        wm.render(1/60);
        wm.update(1/60);
    }

    return wm;
}

export class DummyHandler extends ResourceLoader {

    public numLoaded:number = 0;
    public numFailed:number = 0;

    private timeToLoadMap:Record<string, number> = {};

    constructor(
        private loaderId,
        private returnResource:boolean = false
    ) {
        super();
    }

    getLoaderId(): string {
        return this.loaderId;
    }

    timeToLoad(path:string, msTime:number):DummyHandler {
        this.timeToLoadMap[path] = msTime;
        return this;
    }

    load(path: string):Promise<any> {
        return new Promise<any>((ok, bad) => {
            // support for: 10ms?ok/path
            let ms = 1 + Math.random() * 10;
            if (this.timeToLoadMap[path] !== undefined) {
                ms = this.timeToLoadMap[path];
                console.log("Timed Path", path, ms + "ms");
            }

            setTimeout(() => {
                if (path.startsWith("fail/") || path == "") {
                    this.numFailed++;
                    bad("failed");
                }
                else {
                    this.numLoaded++;
                    if (this.returnResource)
                        ok(path);
                    else
                        ok(this.loaderId);
                }
            }, Math.floor(ms));
        })

    }

    // load(path: string, callback: (success: boolean, resOrErr: any) => void): void {
    //     // support for: 10ms?ok/path
    //     let ms = 1 + Math.random() * 10;
    //     if (this.timeToLoadMap[path] !== undefined) {
    //         ms = this.timeToLoadMap[path];
    //         console.log("Timed Path", path, ms + "ms");
    //     }
    //
    //     setTimeout(() => {
    //         if (path.startsWith("fail/") || path == "") {
    //             this.numFailed++;
    //             callback(false, "failed");
    //         }
    //         else {
    //             this.numLoaded++;
    //             if (this.returnResource)
    //                 callback(true, path);
    //             else
    //                 callback(true, this.loaderId);
    //         }
    //     }, Math.floor(ms));
    // }
}
