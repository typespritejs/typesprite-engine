import {test} from "test";
import {expect} from "expect";

import {ResourceLoader, ResourceManager, ResourceState} from '../../src/entity/ResourceManager'


test("Resources 1", async () => {
    const res = new ResourceManager();
    res.addLoader(new DummyHandler("res1"))
    res.addLoader(new DummyHandler("res2"))
    expect(() => res.addLoader(new DummyHandler(''))).toThrow();
});


test("Resources 2", async () => {
    const res = new ResourceManager();
    res.addLoader(new DummyHandler("res1"))
    res.addLoader(new DummyHandler("res2"))

    await expect(requestPromis(res, '')).rejects.toContain('not found');
    await expect(requestPromis(res, 'muh')).rejects.toContain('not found');
    await expect(requestPromis(res, ':')).rejects.toContain('not found');
    await expect(requestPromis(res, 'muh:')).rejects.toContain('not found');
    await expect(requestPromis(res, 'res:')).rejects.toContain('not found');
    await expect(requestPromis(res, 'res3:')).rejects.toContain('not found');

    await expect(requestPromis(res, 'res1:')).rejects.toContain('Invalid');
    await expect(requestPromis(res, 'res1:fail/muh')).rejects.toContain('failed');
    await expect(requestPromis(res, 'res1:fail/muh/2')).rejects.toContain('failed');
    await expect(requestPromis(res, 'res1:fail/muh/2')).rejects.toContain('failed');
    await expect(requestPromis(res, 'res1: ')).rejects.toContain('Invalid');
    await expect(requestPromis(res, 'res1: fail')).rejects.toContain('Invalid');
    await expect(requestPromis(res, 'res1:fail ')).rejects.toContain('Invalid');
    await expect(requestPromis(res, 'res1:/fail')).rejects.toContain('Invalid');


    expect(res.getResourceState('res1:someFile')).toBe(ResourceState.Unknown)
    await expect(new Promise((ok, bad) => {
        res.request('1', ['res1:someFile'])
            .then(numErr => ok(res.getResource('res1:someFile')))
            .catch(err => bad(err))
        ;
        if (res.getResourceState('res1:someFile') != ResourceState.NewlyRequested &&
            res.getResourceState('res1:someFile') != ResourceState.Loading)
            bad('exepected_loading');
    })).resolves.toContain('res1');
    await expect(requestPromis(res, 'res2:someFile')).resolves.toContain('res2');

    expect(res.getResourceState('res1:someFile') == ResourceState.Ready).toBeTruthy();
    expect(res.getResourceState('res2:someFile') == ResourceState.Ready).toBeTruthy();
    expect(res.getResourceError('res1:someFile')).toBeNull()
    expect(res.getResourceError('res2:someFile')).toBeNull()
    expect(res.getResourceError('res1:fail/muh/2')).toBe('failed');
});


async function requestPromis(res:ResourceManager, resUrl:string) {
    const numError = await res.request('1', [resUrl]);
    if (numError > 0)
        throw res.getResourceError(resUrl);
    return res.getResource(resUrl);
}

class DummyHandler extends ResourceLoader {

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

    // load(path: string, callback: (success: boolean, resOrErr: any) => void): void {
    //     if (path.indexOf(":") > -1)
    //         throw new Error("ResourceManager must not provide url. Received: " + path)
    //     setTimeout(() => {
    //         if (path.startsWith("fail/") || path == "") {
    //             callback(false, "failed");
    //         }
    //         else {
    //             callback(true, this.loaderId);
    //         }
    //     }, Math.floor(1 + Math.random() * 10))
    // }
}