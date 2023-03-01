import {test} from "test";
import {expect} from "expect";

import {ResourceLoader, ResourceManager, ResourceState} from '../../src/entity/ResourceManager'


test("Multi Resources 1", async () => {
    const res = new ResourceManager();
    res.addLoader(new DummyHandler("res1"))
    res.addLoader(new DummyHandler("res2"))
    res.addLoader(new DummySubHandler("multi_bad1", "res1:fail/bad", ["res2:ok1", "res2:ok2"]))

    await expect(requestGroupPromis(res, [
        'multi_bad1:notok1',
        'res1:ok1',
        'res2:ok1',
    ])).resolves.toStrictEqual(['multi_bad1:notok1'])
    expect(res.getResourceError('multi_bad1:notok1')).toBe('failed1')
});

test("Multi Resources 2", async () => {
    const res = new ResourceManager();
    res.addLoader(new DummyHandler("res1"))
    res.addLoader(new DummyHandler("res2"))
    res.addLoader(new DummySubHandler("multi_bad2", "res1:parentok", ["res2:ok1", "res2:fail/bad2"]))

    console.log(res.collectResourceInfo());
    await expect(requestGroupPromis(res, [
        'multi_bad2:notok',
        'res1:ok1',
        'res2:ok1',
    ])).resolves.toStrictEqual(['multi_bad2:notok'])
    expect(res.getResourceError('multi_bad2:notok')).toBe('failed2')
});

test("Multi Resources 3", async () => {
    const res = new ResourceManager();
    res.addLoader(new DummyHandler("res1"))
    res.addLoader(new DummyHandler("res2"))
    res.addLoader(new DummySubHandler("multi_ok", "res1:parentok", ["res2:ok1", "res2:ok2"]))

    await expect(requestGroupPromis(res, [
        'multi_ok:ok',
        'res1:ok',
        'res2:ok2',
    ])).resolves.toHaveLength(0)
});

test("Multi Resources 4 - owner", async () => {
    const res = new ResourceManager();
    res.addLoader(new DummyHandler("res1"))
    res.addLoader(new DummyHandler("res2"))
    res.addLoader(new DummySubHandler("multi", "res1:assets/sheet.json", ["res1:assets/sub-spr1.png", "res1:assets/sub-spr2.png"]))

    DummyHandler.unloadCount = 0;

    {
        await res.request('0', [
            "res1:assets/sub-spr1.png"
        ]);

        const info = res.collectResourceInfo()["res1:assets/sub-spr1.png"];
        expect(info.state).toBe(ResourceState[ResourceState.Ready])
        expect(info.refCount).toBe(1)
        expectArrayToContain(info.owners, "0");
    }


    {
        await res.request('1', [
            "multi:assets/sheet.json",
            "res1:assets/spr1.png",
            "res1:assets/spr2.png",
            "res1:assets/spr3.png",
            "res2:assets/spr1.png",
        ])

        const info = res.collectResourceInfo()
        expectArrayToContain(info["multi:assets/sheet.json"].owners, "1")
        expectArrayToContain(info["res1:assets/spr1.png"].owners, "1")
        expectArrayToContain(info["res1:assets/spr2.png"].owners, "1")
        expectArrayToContain(info["res1:assets/spr3.png"].owners, "1")
        expectArrayToContain(info["res2:assets/spr1.png"].owners, "1")
    }

    {
        await res.request('2', [
            "multi:assets/sheet.json",
            "res1:assets/spr1.png",
            "res1:assets/spr2.png",
            "res1:assets/spr3.png",
            "res2:assets/spr1.png",
            "res2:assets/spr1.png",
            "res1:assets/sub-spr2.png"
        ])

        const info = res.collectResourceInfo()
        expectArrayToContain(info["multi:assets/sheet.json"].owners, '1', '2')
        expectArrayToContain(info["res1:assets/spr1.png"].owners, '1', '2')
        expectArrayToContain(info["res1:assets/spr2.png"].owners, '1', '2')
        expectArrayToContain(info["res1:assets/spr3.png"].owners, '1', '2')
        expectArrayToContain(info["res2:assets/spr1.png"].owners, '1', '2')
    }

    res.copyOwnership('nix', 'auchnix')
    res.copyOwnership('1', '1-copy')

    {
        const info = res.collectResourceInfo()
        for (const resUrl of Object.keys(info)) {
            const i = info[resUrl];
            if (i.owners.indexOf('1') > -1) {
                expect(i.owners.indexOf('1-copy')).toBeGreaterThan(-1);
            }
        }
    }

    res.release('1')
    {
        const info = res.collectResourceInfo()
        for (const resUrl of Object.keys(info)) {
            const i = info[resUrl];
            expect(i.owners.indexOf('1')).toBe(-1);
        }
    }
    res.release('1-copy')
    {
        const info = res.collectResourceInfo()
        for (const resUrl of Object.keys(info)) {
            const i = info[resUrl];
            expect(i.owners.indexOf('1-copy')).toBe(-1);
        }
    }
    res.release('2')
    {
        const info = res.collectResourceInfo()
        for (const resUrl of Object.keys(info)) {
            const i = info[resUrl];
            expect(i.owners.indexOf('2')).toBe(-1);
        }
    }

    expect(Object.keys(res.collectResourceInfo()).length).toBe(1)
    expect(DummyHandler.unloadCount).toBe(6)
});

// ---------------------------------------------------------------------------------------------------------------------

function expectArrayToContain(arr:any[], ...elements:any) {
    for (const e of elements) {
        if (arr.find(i => e === i) === undefined)
            throw new Error(`Expected ${e} be part of ${JSON.stringify(arr)}`)
    }
}

async function requestGroupPromis(res:ResourceManager, urls:string[]) {
    await res.request('1', urls);
    // const status = res.getResourceState('multi_bad2:notok');
    const out = []
    for (const url of urls ) {
        const state = res.getResourceState(url);
        const r = res.getResource(url);
        if (state == ResourceState.Error)
            out.push(url);
    }
    return out;
}

class DummyHandler extends ResourceLoader {

    static unloadCount = 0

    private lid:string;

    constructor(loaderId:string) {
        super();
        this.lid = loaderId;
    }

    getLoaderId(): string {
        return this.lid;
    }

    load(path: string, sub):Promise<any> {
        console.log("DummyHandler", path, "1");
        return new Promise<any>((ok, bad) => {
            console.log("DummyHandler", path, "2");
            if (path.indexOf(":") > -1)
                throw new Error("ResourceManager must not provide url. Received: " + path)
            setTimeout(() => {
                if (path.startsWith("fail/") || path == "") {
                    bad("failed");
                } else {
                    ok(this.getLoaderId());
                }
            }, Math.floor(1 + Math.random() * 10))
        });
    }

    unload(path: string): Promise<undefined> | void {
        DummyHandler.unloadCount++;
    }
}

class DummySubHandler extends ResourceLoader {

    constructor(
        private lid:string,
        private subRes1:string,
        private subRes2:string[],
    ) {
        super();
    }

    getLoaderId(): string {
        return this.lid;
    }

    load(path: string, loader):Promise<any> {
        return new Promise((ok, bad) => {
            (async () => {
                try {
                    const [res] = await loader.request([this.subRes1]) //this.manager.request<string>(this.subRes1);
                    if (res === null) {
                        bad('failed1')
                        return;
                    }
                }
                catch(err) {
                    bad('failed1')
                    return;
                }
                try {
                    const failed = await loader.request(this.subRes2);
                    const errCount = failed.filter(r => r === null).length;
                    if (errCount > 0)
                        bad("failed2");
                }
                catch(err) {
                    bad('failed2')
                    return;
                }
                ok(this.lid);
            })().catch(err => bad(err))
        })
    }
}