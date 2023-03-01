import {test} from 'test';
import {child, ComponentManager, registerComponent} from "tsjs";
import {BaseCmp, DummyTextLoader, makeWorld} from "./utils/WorldHelper";
import {expect} from "expect";



test("Deco 2: Child", async () => {
    ComponentManager.unregisterComponents();


    class Cmp1 extends BaseCmp {
        @child("Bomb1")
        throws:string;
    }
    registerComponent({Cmp1})

    class Cmp2 extends BaseCmp {
    }
    registerComponent({Cmp2})


    const files = new DummyTextLoader({
        "assets/edf/w1.edf": `
            [!Test1]
            @Cmp1
            alwaysActive = true
            
            [!Test2]
            @Cmp1
            alwaysActive = true
            throws = Bomb2
            
            [!Test3]
            @Cmp1
            alwaysActive = true
            throws = Bomb3
            
            [Bomb1]
            @Cmp2
            alwaysActive = true
            
            [Bomb2]
            @Cmp2
            alwaysActive = true
        `
    })

    const wm = await makeWorld(files, 'assets/edf/w1.edf');
    const w1 = wm.getWorldByIndex(0);
    {
        const e = w1.findEntitiesByName("Test1", true)[0];
        expect(e).toBeTruthy();
        expect(e.findComponent("Cmp1").throws).toBe('Bomb1')
    }
    {
        const e = w1.findEntitiesByName("Test2", true)[0];
        expect(e).toBeTruthy();
        expect(e.findComponent("Cmp1").throws).toBe('Bomb2')
    }
    {
        const e = w1.findEntitiesByName("Test3", true)[0];
        // expect(e).toBeFalsy();
        // TODO this needs to be addressed!
        //
        // Derzeit scheint die children: props => ['MyChild'] nicht wirklich sicherzustellen,
        // dass das Kind auch existiert. Lediglich das Laden von Resourcen scheint
        // geprüft zu werden - nicht aber die Existenz.
        //
        // Fall 1)
        //   Es werden Kinder mit Resourcen erfasst.
        //   Geht das Laden schief (also auch beim Kind) schlägt alles Fehl.
        //
        // Fall 2)
        //   Es wird auf Kinder ohne Resourcen referenziert ODER nur auf welche deren resourcen
        //   bereits geladen wurden.
        //   In dem Fall schlägt das ganze leise Fehl bzw. es kommt nur eine Command-Line-Ausgabe.
        //
        //
        // Ziel/Besser:
        //   Wenn ein Kind Entity nicht existiert sollte der Parent gar nicht erzeugt werden.
        //   Dies führt (auch in GJG) zu Fehlern.
    }
});





