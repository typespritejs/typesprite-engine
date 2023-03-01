import {ComponentManager} from "tsjs";
import {BaseCmp, DummyTextLoader, makeWorld} from './utils/WorldHelper';
import {test} from "test";
import {expect} from "expect";



test("World 1: Basic Rules", async () => {

    class Cmp1 extends BaseCmp {}
    ComponentManager.registerComponent({Cmp1})
    const files = new DummyTextLoader({
        "assets/edf/w1.edf": `
            [!Test1]
            @Cmp1
            alwaysActive = true
            raw1 = 12
            raw2 = raw
            raw3 = 12mix
        `
    })

    const wm = await makeWorld(files, 'assets/edf/w1.edf');
    const w1 = wm.getWorldByIndex(0);
    {
        const cmp1_1 = w1.statics.$Cmp1 as Cmp1;
        const cmp1_2 = w1.findComponentsFromEntities("Cmp1", true)[0];
        expect(cmp1_1).toBe(cmp1_2);
        expect(cmp1_1).not.toBeFalsy()
        expect(cmp1_2).not.toBeFalsy()
        expect(cmp1_1.entity.props.raw1).toBe("12");
        expect(cmp1_1.entity.props.raw2).toBe("raw");
        expect(cmp1_1.entity.props.raw3).toBe("12mix");
    }

    ComponentManager.unregisterComponents({Cmp1})
});


test("World 1: Basic Rules", async () => {

    class Cmp1 extends BaseCmp {}
    ComponentManager.registerComponent({Cmp1})

    class Cmp2 extends BaseCmp {
        static requires = {
            props: {
                raw1: ["number", 4711],
                raw2: ["string", 'def1'],
                raw3: ["string", 'def2'],
            }
        }
    }
    ComponentManager.registerComponent({Cmp2})


    const files = new DummyTextLoader({
        "assets/edf/w1.edf": `
            [!Test1]
            @Cmp1
            alwaysActive = true
            raw1 = 12
            raw2 = raw
            raw3 = 12mix

            [!Test2]
            @Cmp2
            alwaysActive = true

            [!Test3]
            @Cmp1
            @Cmp2
            alwaysActive = true

            [!Test4]
            @Cmp1
            @Cmp2
            alwaysActive = true
            raw1 = 12
            raw2 = raw
            raw3 = 12mix
        `
    })

    const wm = await makeWorld(files, 'assets/edf/w1.edf');
    const w1 = wm.getWorldByIndex(0);
    {
        const e = w1.findEntitiesByName("Test1", true)[0];
        const cmp1 = e.findComponent("Cmp1") as Cmp1;
        expect(cmp1).not.toBeFalsy()
        expect(cmp1.entity.props.raw1).toBe("12");
        expect(cmp1.entity.props.raw2).toBe("raw");
        expect(cmp1.entity.props.raw3).toBe("12mix");
    }

    {
        const e = w1.findEntitiesByName("Test2", true)[0];
        const cmp2 = e.findComponent("Cmp2") as Cmp2;
        expect(cmp2).not.toBeFalsy()

        expect(cmp2.entity.props.raw1).toBe(4711);
        expect(cmp2.entity.props.raw2).toBe("def1");
        expect(cmp2.entity.props.raw3).toBe("def2");
    }

    {
        const e = w1.findEntitiesByName("Test3", true)[0];
        const cmp1 = e.findComponent("Cmp1") as Cmp1;
        const cmp2 = e.findComponent("Cmp2") as Cmp2;
        expect(cmp1).not.toBeFalsy()
        expect(cmp2).not.toBeFalsy()

        expect(cmp1.entity).toBe(cmp2.entity);

        expect(cmp1.entity.props.raw1).toBe(4711);
        expect(cmp1.entity.props.raw2).toBe("def1");
        expect(cmp1.entity.props.raw3).toBe("def2");
    }

    {
        const e = w1.findEntitiesByName("Test4", true)[0];
        const cmp1 = e.findComponent("Cmp1") as Cmp1;
        const cmp2 = e.findComponent("Cmp2") as Cmp2;
        expect(cmp1).not.toBeFalsy()
        expect(cmp2).not.toBeFalsy()

        expect(cmp1.entity).toBe(cmp2.entity);

        expect(cmp1.entity.props.raw1).toBe(12);
        expect(cmp1.entity.props.raw2).toBe("raw");
        expect(cmp1.entity.props.raw3).toBe("12mix");
    }

    ComponentManager.unregisterComponents({Cmp1, Cmp2})
});

test("World 1: Conflict Properties", async () => {

    class Cmp1 extends BaseCmp {
        static requires = {
            props: {
                raw1: ["number", 23],
            }
        }
    }
    ComponentManager.registerComponent({Cmp1})

    class Cmp2 extends BaseCmp {
        static requires = {
            props: {
                raw1: ["string", "10"], // conflict!
            }
        }
    }
    ComponentManager.registerComponent({Cmp2})


    const files = new DummyTextLoader({
        "assets/edf/w1.edf": `
            [!Test1]
            @Cmp1
            @Cmp2
            alwaysActive = true
            raw1 = 12
        `
    })

    const wm = await makeWorld(files, 'assets/edf/w1.edf');
    const w1 = wm.getWorldByIndex(0);
    {
        const e = w1.findEntitiesByName("Test1", true);
        expect(e.length).toBe(0); // < expect property-conflict!
    }

    ComponentManager.unregisterComponents({Cmp1, Cmp2})
});

test("World 1: Conflict Properties - not if type is same!", async () => {

    class Cmp1 extends BaseCmp {
        static requires = {
            props: {
                raw1: ["number", 23],
            }
        }
    }
    ComponentManager.registerComponent({Cmp1})

    class Cmp2 extends BaseCmp {
        static requires = {
            props: {
                raw1: ["number", 10], // NO! conflict!
            }
        }
    }
    ComponentManager.registerComponent({Cmp2})


    const files = new DummyTextLoader({
        "assets/edf/w1.edf": `
            [!Test1]
            @Cmp1
            @Cmp2
            alwaysActive = true
            raw1 = 12
        `
    })

    const wm = await makeWorld(files, 'assets/edf/w1.edf');
    const w1 = wm.getWorldByIndex(0);
    {
        const e = w1.findEntitiesByName("Test1", true);
        expect(e.length).toBe(1);
    }

    ComponentManager.unregisterComponents({Cmp1, Cmp2})
});




