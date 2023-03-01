import {ComponentManager} from "tsjs";
import {BaseCmp, DummyTextLoader, makeWorld} from './utils/WorldHelper';
import {test} from "test";
import {expect} from "expect";



test("World 2: prop-links", async () => {

    class Cmp1 extends BaseCmp {}
    ComponentManager.registerComponent({Cmp1})

    class Cmp2 extends BaseCmp {}
    ComponentManager.registerComponent({Cmp2})


    const files = new DummyTextLoader({
        "assets/edf/w1.edf": `
            [!other]
            @Cmp1
            alwaysActive = true
            otherRaw = 12
            
            [*other2]
            otherRaw = 4711
            
            [!Test1]
            @Cmp2
            alwaysActive = true
            $raw1 = other.otherRaw
            $raw2 = other2.otherRaw
            
            [!Test2]
            @Cmp2
            alwaysActive = true
            $raw1 = other.otherRaw
            $raw2 = other2.otherRaw
            $raw3 = notfound.otherRaw
        `
    })

    const wm = await makeWorld(files, 'assets/edf/w1.edf');
    const w1 = wm.getWorldByIndex(0);
    {
        const e = w1.findEntitiesByName("Test1", true)[0];
        expect(e.props.raw1).toBe("12");
        expect(e.props.raw2).toBe("4711");
    }

    {
        const empty = w1.findEntitiesByName("Test2", true);
        expect(empty.length).toBe(0)
    }

    ComponentManager.unregisterComponents({Cmp1, Cmp2})
});





