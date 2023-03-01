import {test} from "test";
import {expect} from "expect";

import {ResourceLoader, ResourceManager, ResourceState} from '../../src/entity/ResourceManager'


test("Parallel Resources 1", async () => {
    const res = new ResourceManager(3);
    res.addLoader(new Res1Loader());
    await res.request('1', [
        'res1:wait/100/r1',
        'res1:wait/100/r2',
        'res1:wait/100/r3',
        'res1:wait/100/r4',
        'res1:wait/100/r5',
    ])
    {
        const info = res.collectResourceInfo();
        expect(info["res1:wait/100/r1"].state).toBe(ResourceState[ResourceState.Ready])
        expect(info["res1:wait/100/r2"].state).toBe(ResourceState[ResourceState.Ready])
        expect(info["res1:wait/100/r3"].state).toBe(ResourceState[ResourceState.Ready])
        expect(info["res1:wait/100/r4"].state).toBe(ResourceState[ResourceState.Ready])
        expect(info["res1:wait/100/r5"].state).toBe(ResourceState[ResourceState.Ready])
    }
});

test("Parallel Resources 2", async () => {
    const res = new ResourceManager(3);
    res.addLoader(new Res1Loader());
    const resUrls = [
        'res1:wait/100/r1',
        'res1:wait/100/r2',
        'res1:wait/100/r3',
        'res1:wait/100/r4',
        'res1:wait/100/r5',
    ];
    const prom = res.request('1', resUrls)
    await new Promise((ok) => setTimeout(() => ok(null), 10));
    {
        const info = res.collectResourceInfo()
        let numLoading = 0;
        let numNew = 0;
        for (const resUrl of resUrls) {
            switch(info[resUrl].state) {
                case ResourceState[ResourceState.Loading]:
                    numLoading++;
                    break;
                case ResourceState[ResourceState.NewlyRequested]:
                    numNew++;
                    break;
            }
        }
        expect(numLoading).toBe(3);
        expect(numNew).toBe(2);
    }
    await prom;
    {
        const info = res.collectResourceInfo()
        let numReady = 0;
        for (const resUrl of resUrls) {
            switch(info[resUrl].state) {
                case ResourceState[ResourceState.Ready]:
                    numReady++;
                    break;
            }
        }
        expect(numReady).toBe(5);
    }
});

// ---------------------------------------------------------------------------------------------------------------------

class Res1Loader extends ResourceLoader {


    getLoaderId(): string {
        return "res1";
    }

    load(path: string): Promise<any> {
        if (path.startsWith("fail/")) {
            throw new Error("Cannot load" + path);
        }
        const [prefix, time] = path.split('/');
        if (prefix == "wait" && Number(time)) {
            return new Promise((ok) => {
                setTimeout(() => {
                    ok(new Res1(path));
                }, Number(time))
            })
        }
        else {
            // return Promise.resolve(new Res1(path));
            return new Promise((ok) => {
                setTimeout(() => {
                    ok(new Res1(path + "x"));
                }, 10)
            })
        }
    }


}

export class Res1 {
    constructor(
        public readonly origin
    ) {
    }
}