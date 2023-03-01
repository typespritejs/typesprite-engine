import {ComponentManager, ResourceLoader, ResourceState} from "tsjs";
import {BaseCmp, DummyTextLoader, makeWorld} from './utils/WorldHelper';
import {test} from "test";
import {expect} from "expect";


test("World 3: Resources", async () => {
    ComponentManager.unregisterComponents()

    class Cmp1 extends BaseCmp {
        static requires = {
            props: {
                sheet1: ['string', 'sheet:my/path/file.json'],
            },
            res: props => [
                props.sheet1,
            ]
        }
    }
    ComponentManager.registerComponent({Cmp1})

    class Cmp2 extends BaseCmp {
        static requires = {
            props: {
                sheet3: ['string', 'sheet:my/path/file.json'],
                sheet4: ['string', 'json:my/path/file.json'],
            },
            res: props => [
                props.sheet3,
                props.sheet4,
            ]
        }
    }
    ComponentManager.registerComponent({Cmp2})



    const files = new DummyTextLoader({
        "assets/edf/w1.edf": `
            [!Test1]
            @Cmp1
            alwaysActive = true
            
            [!Test2]
            @Cmp2
            alwaysActive = true
        `
    })

    const loader = [
        new DummyHandler('sheet'),
        new DummyHandler('json'),
    ]

    const wm = await makeWorld(files, 'assets/edf/w1.edf', loader);
    const w1 = wm.getWorldByIndex(0);
    {
        const e = w1.findEntitiesByName("Test1", true)[0];
        expect(e).not.toBeFalsy();
    }
    {
        const e = w1.findEntitiesByName("Test2", true)[0];
        expect(e).not.toBeFalsy()
    }

    expect(wm.resources.getResourceState('json:my/path/file.json') == ResourceState.Ready).toBeTruthy();
    expect(wm.resources.getResourceState('sheet:my/path/file.json') == ResourceState.Ready).toBeTruthy();

    expect(loader[0].numLoaded).toBe(1);
    expect(loader[1].numLoaded).toBe(1);
});

test("World 3: Resources", async () => {
    ComponentManager.unregisterComponents();

    class Cmp1 extends BaseCmp {
        static requires = {
            props: {
                sheet1: ['string', 'sheet:my/path/file.json'],
            },
            res: props => [
                props.sheet1,
            ]
        }
    }
    ComponentManager.registerComponent({Cmp1})

    class Cmp2 extends BaseCmp {
        static requires = {
            props: {
                sheet3: ['string', 'sheet:my/path/file.json'],
                sheet4: ['string', 'json:my/path/file.json'],
            },
            cmps: [
                "Cmp1"
            ],
            res: props => [
                props.sheet3,
                props.sheet4,
            ]
        }
    }
    ComponentManager.registerComponent({Cmp2})

    const files = new DummyTextLoader({
        "assets/edf/w1.edf": `
            [!Test1]
            @Cmp1
            alwaysActive = true
            
            [!Test2]
            @Cmp2
            alwaysActive = true
            
            [!Test3]
            @Cmp1
            @Cmp2
            alwaysActive = true
        `
    })

    const loader = [
        new DummyHandler('sheet'),
        new DummyHandler('json'),
    ]

    const wm = await makeWorld(files, 'assets/edf/w1.edf', loader);
    const w1 = wm.getWorldByIndex(0);
    {
        const e = w1.findEntitiesByName("Test1", true)[0];
        expect(e).not.toBeFalsy();
    }
    {
        const e = w1.findEntitiesByName("Test2", true)[0];
        expect(e).toBeFalsy()
    }
    {
        const e = w1.findEntitiesByName("Test3", true)[0];
        expect(e).toBeTruthy()
    }
});

// ---------------------------------------------------------------------------------------------------------------------

class DummyHandler extends ResourceLoader {

    public numLoaded:number = 0;
    public numFailed:number = 0;


    constructor(
        private loaderId:string
    ) {
        super()
    }

    getLoaderId(): string {
        return this.loaderId;
    }

    load(path: string):Promise<any> {
        return new Promise<any>((ok, bad) => {

            setTimeout(() => {
                if (path.startsWith("fail/") || path == "") {
                    this.numFailed++;
                    bad("failed");
                }
                else {
                    this.numLoaded++;
                    ok(this.loaderId);
                }
            }, Math.floor(1 + Math.random() * 10))

        })
    }

    // load(path: string, callback: (success: boolean, resOrErr: any) => void): void {
    //     setTimeout(() => {
    //         if (path.startsWith("fail/") || path == "") {
    //             this.numFailed++;
    //             callback(false, "failed");
    //         }
    //         else {
    //             this.numLoaded++;
    //             callback(true, this.loaderId);
    //         }
    //     }, Math.floor(1 + Math.random() * 10))
    // }
}


