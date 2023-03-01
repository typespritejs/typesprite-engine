import {prop, ComponentManager, registerComponent, Entity} from "tsjs";
import {BaseCmp, DummyTextLoader, makeWorld, DummyHandler} from './utils/WorldHelper';
import {expect} from "expect";
import {test} from "test";



test("Deco 1: Props: With Default", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        @prop('string', '123')
        private someProp:string;
    }
    await cmpOk({Cmp1});
});

test("Deco 1: Props: Missing default", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        @prop('string')
        private someProp:string;
    }
    await cmpBad({Cmp1});
});

test("Deco 1: Props: Unknown PropParser", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        @prop('not-existing', 'muh')
        private someProp:string;
    }
    await cmpBad({Cmp1});
});

test("Deco 1: Props: Cannot mix Require & Props", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        static requires = {
        }
        @prop('string', '123')
        private someProp:string;
    }
    expect(() => registerComponent({Cmp1})).toThrow();
});

test("Deco 1: Props: No Field Default", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        @prop('string', '123')
        private someProp:string = "abc";
    }
    expect(() => registerComponent({Cmp1})).toThrow();
});

test("Deco 1: Props: String-Value must be part of enum", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        @prop('string', '123', {allow: ['abc', 'xyz']})
        private someProp:string;
    }
    await cmpBad({Cmp1});
});

test("Deco 1: Props: Number-Value must be part of enum", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        @prop('number', 123, {allow: [5, 11]})
        private someProp:number;
    }
    await cmpBad({Cmp1});
});

test("Deco 1: Props: String-Value is part of enum", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        @prop('string', 'abc', {allow: ['abc', 'xyz']})
        private someProp:string;
    }
    await cmpOk({Cmp1});
});

test("Deco 1: Props: Number-Value is part of enum", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        @prop('number', 5, {allow: [5, 11]})
        private someProp:number;
    }
    await cmpOk({Cmp1});
});

test("Deco 1: Props: ValueCheck", async () => {
    ComponentManager.unregisterComponents()
    class Cmp1 extends BaseCmp {
        @prop('number', 5, {allow: [5, 11]})
        public someProp1:number;
        @prop('number', 4711)
        public someProp2:number;
        @prop('string', 'abc', {allow: ['abc', '123']})
        public someProp3:number;
        @prop('string', 'xyz')
        public someProp4:number;
        @prop('bool', 1)
        public someProp5:boolean;
        @prop('bool', true)
        public someProp6:boolean;
        @prop('bool', 'true')
        public someProp7:boolean;
        @prop('bool', 0)
        public someProp8:boolean;
        @prop('bool', false)
        public someProp9:boolean;
        @prop('bool', 'false')
        public someProp10:boolean;
    }
    const e = await cmpOk({Cmp1});
    const cmpValues:Cmp1 = e.findComponent("Cmp1");
    expect(cmpValues.someProp1).toBe(5);
    expect(cmpValues.someProp2).toBe(4711);
    expect(cmpValues.someProp3).toBe('abc');
    expect(cmpValues.someProp4).toBe('xyz');
    expect(cmpValues.someProp5).toBe(true);
    expect(cmpValues.someProp6).toBe(true);
    expect(cmpValues.someProp7).toBe(true);
    expect(cmpValues.someProp8).toBe(false);
    expect(cmpValues.someProp9).toBe(false);
    expect(cmpValues.someProp10).toBe(false);

});


test();

// ---------------------------------------------------------------------------------------------------------------------


async function cmpBad(cmpDef:any) {
    await expectComponentTo(cmpDef, false)
}

async function cmpOk(cmpDef:any):Promise<Entity> {
    /** @ts-ignore */
    return await expectComponentTo(cmpDef, true)
}

async function expectComponentTo(cmpDef:any, expectOk:boolean):Promise<Entity|void> {
    registerComponent(cmpDef)
    const files = new DummyTextLoader({
        "assets/edf/w1.edf": `
                [!Test1]
                @Cmp1
                alwaysActive = true
            `
    })

    const wm = await makeWorld(files, 'assets/edf/w1.edf');
    const w1 = wm.getWorldByIndex(0);
    {
        const e = w1.findEntitiesByName("Test1", true)[0];
        const isOkay = !!e;

        if (isOkay != expectOk) {
            console.log(e);
        }

        expect(isOkay == expectOk).toBeTruthy()
        return e;
    }
}