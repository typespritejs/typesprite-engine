import {ComponentManager, res, ResourceLoader, ResourceManager} from "tsjs";
import {BaseCmp, DummyHandler, DummyTextLoader, makeWorld} from './utils/WorldHelper';
import {test} from "test";
import {expect} from "expect";




test("World 4: Resources Issue 0", async () => {
    ComponentManager.unregisterComponents()

    const loader = [
        new DummyHandler('sheet', true)
            .timeToLoad('ok/res1', 0)
            .timeToLoad('ok/res2', 100)
        ,
        new DummyHandler('json', true),
    ]

    const rm = new ResourceManager();
    rm.addLoader(loader[0]);
    rm.addLoader(loader[1]);

    let res1_num = 0;


    rm.request('1', ['sheet:ok/res1']).then(() => {
        res1_num++;
    })
    rm.request('1', ['sheet:ok/res2']).then(() => {
        res1_num++;
        console.log("💡 <<<<<<<<<<<<<<<<<");
    })
    expect(res1_num).toBe(0);
    await new Promise((ok, bad) => setTimeout(() => ok(null), 10));
    expect(res1_num).toBe(1);
    await new Promise((ok, bad) => setTimeout(() => ok(null), 200));
    console.log(rm.collectResourceInfo());
    expect(res1_num).toBe(2);
});


test("World 4: Resources Issue 1", async () => {
    ComponentManager.unregisterComponents()

    const loader = [
        new DummyHandler('sheet', true),
        new DummyHandler('json', true),
    ]

    const rm = new ResourceManager();
    rm.addLoader(loader[0]);
    rm.addLoader(loader[1]);

    let res1_num = 0;
    // rm.request('sheet:ok/res1', (ok, res) => {
    //     res1_num++;
    // })
    // rm.request('sheet:ok/res1', (ok, res) => {
    //     res1_num++;
    // })
    // rm.request('sheet:ok/res1', (ok, res) => {
    //     res1_num++;
    // })
    rm.request('1', ['sheet:ok/res1']).then(() => {
        res1_num++;
    })
    rm.request('1', ['sheet:ok/res1']).then(() => {
        res1_num++;
    })
    rm.request('1', ['sheet:ok/res1']).then(() => {
        res1_num++;
    })

    expect(res1_num).toBe(0);
    await new Promise((ok, bad) => setTimeout(() => ok(null), 100));
    expect(res1_num).toBe(3);
});


test("World 4: Resources Issue 2", async () => {
    ComponentManager.unregisterComponents()

    const loader = [
        new DummyHandler('sheet', true),
        new DummyHandler('json', true),
    ]

    const rm = new ResourceManager();
    rm.addLoader(loader[0]);
    rm.addLoader(loader[1]);

    let res1_num = 0;
    let res1_num2 = 0;
    rm.request('1', ['sheet:ok/res1']).then(() => {
        res1_num++;
    })

    rm.request('1', ['sheet:ok/res1']).then(() => {
        res1_num2++;
    })


    // rm.requestGroup(['sheet:ok/res1'], () => {
    //     res1_num++;
    // })
    //
    // rm.requestGroup(['sheet:ok/res1'], () => {
    //     res1_num2++;
    // })

    expect(res1_num).toBe(0);
    await new Promise((ok, bad) => setTimeout(() => ok(null), 100));
    expect(res1_num).toBe(1);
    expect(res1_num2).toBe(1);
});

test("World 4: Resources Issue 3", async () => {
    ComponentManager.unregisterComponents()

    const loader = [
        new DummyHandler('sheet', true),
        new DummyHandler('json', true),
    ]

    const rm = new ResourceManager();
    rm.addLoader(loader[0]);
    rm.addLoader(loader[1]);

    let res1_num = 0;
    let res1_num2 = 0;
    let res1_num3 = 0;

    rm.request('1',['sheet:ok/res1', 'sheet:fail/res1']).then(() => {
        res1_num++;
    })
    rm.request('1',['sheet:ok/res3', 'sheet:ok/res1']).then(() => {
        res1_num2++;
    })
    rm.request('1',['sheet:fail/res1', 'sheet:fail/res2']).then(() => {
        res1_num3++;
    })

    // rm.requestGroup(['sheet:ok/res1', 'sheet:fail/res1'], () => {
    //     res1_num++;
    // })
    // rm.requestGroup(['sheet:ok/res3', 'sheet:ok/res1'], () => {
    //     res1_num2++;
    // })
    // rm.requestGroup(['sheet:fail/res1', 'sheet:fail/res2'], () => {
    //     res1_num3++;
    // })

    expect(res1_num).toBe(0);
    await new Promise((ok, bad) => setTimeout(() => ok(null), 100));
    expect(res1_num).toBe(1);
    expect(res1_num2).toBe(1);
    expect(res1_num3).toBe(1);
});

test("World 4: Resources Issue 4", async () => {
    ComponentManager.unregisterComponents()

    const loader = [
        new DummyHandler('sheet', true),
        new DummyHandler('json', true),
    ]

    const rm = new ResourceManager();
    rm.addLoader(loader[0]);
    rm.addLoader(loader[1]);

    let res1_num = 0;
    let res1_num2 = 0;
    let res1_num3 = 0;
    let res1_num4 = 0;

    rm.request('1',['sheet:ok/res1', 'sheet:fail/res1']).then(() => {
        res1_num++;
    })

    rm.request('1',['sheet:ok/res3', 'sheet:ok/res1']).then(() => {
        res1_num2++;

        rm.request('1',['sheet:ok/res1']).then(() => {
            res1_num4++;
        })
    })

    rm.request('1',['sheet:fail/res1', 'sheet:fail/res2']).then(() => {
        res1_num3++;
    })

    // rm.requestGroup(['sheet:ok/res1', 'sheet:fail/res1'], () => {
    //     res1_num++;
    // })
    //
    // rm.requestGroup(['sheet:ok/res3', 'sheet:ok/res1'], () => {
    //     res1_num2++;
    //
    //     rm.requestGroup(['sheet:ok/res1'], () => {
    //         res1_num4++;
    //     })
    // })
    //
    // rm.requestGroup(['sheet:fail/res1', 'sheet:fail/res2'], () => {
    //     res1_num3++;
    // })

    expect(res1_num).toBe(0);
    await new Promise((ok, bad) => setTimeout(() => ok(null), 100));
    expect(res1_num).toBe(1);
    expect(res1_num2).toBe(1);
    expect(res1_num3).toBe(1);
    expect(res1_num4).toBe(1);
});

test("World 4: Resources Issue 5", async () => {
    ComponentManager.unregisterComponents()

    const loader = [
        new DummyHandler('sheet', true)
            .timeToLoad('ok/res1', 20)
            .timeToLoad('ok/res2', 10)
        ,
        new DummyHandler('json', true),
    ]

    const rm = new ResourceManager();
    rm.addLoader(loader[0]);
    rm.addLoader(loader[1]);

    let res1_num = 0;
    let res1_num2 = 0;
    rm.request('1', ['sheet:ok/res1', 'sheet:ok/res2', 'sheet:ok/res1']).then(() => {
        console.log("CMP1");
        res1_num++;
    })

    expect(res1_num).toBe(0);
    await new Promise((ok, bad) => setTimeout(() => ok(null), 100));
    expect(res1_num).toBe(1);
});

test("World 4: Resources Issue N", async () => {
    ComponentManager.unregisterComponents()


    let cmp1_init:number = 0;
    let cmp2_init:number = 0;
    let cmp3_init:number = 0;

    class Cmp1 extends BaseCmp {
        @res('sheet', 'ok/res1')
        public res1:string
        @res('sheet', 'ok/res2')
        public res2:string
        onInit() {
            cmp1_init++;
            console.log("CMP1");
        }
    }

    class Cmp2 extends BaseCmp {
        @res('sheet', 'ok/res1')
        public res1:string

        onInit() {
            cmp2_init++;
            console.log("CMP2");
        }
    }

    ComponentManager.registerComponent({Cmp1})
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
        new DummyHandler('sheet', true)
            .timeToLoad('ok/res1', 20)
            .timeToLoad('ok/res2', 10)

        ,
        new DummyHandler('json', true),
    ]

    const wm = await makeWorld(files, 'assets/edf/w1.edf', loader);
    const w1 = wm.getWorldByIndex(0);

    expect(w1.findEntitiesByName("Test1", true)[0]).toBeTruthy()
    expect(w1.findEntitiesByName("Test2", true)[0]).toBeTruthy()

    expect(cmp1_init).toBe(1);
    expect(cmp2_init).toBe(1);

});




