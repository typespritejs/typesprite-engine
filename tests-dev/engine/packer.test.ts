import {ISize, MultiBinPacker} from "tsjs";
import {expect} from "expect";
import {test} from "test";



test("MultiBinPacker basics",() => {
    const m = new MultiBinPacker(2048, 2048, 0);
    const rects:ISize[] = [];
    rects.push({
        width: 100,
        height: 200,
    })

    rects.push({
        width: 15,
        height: 5,
    })

    rects.push({
        width: 40,
        height: 65,
    })

    for (const r of rects)
        m.add(r)

    expect(m.bins.length).toStrictEqual(1)
    expect(m.bins[0].rects.length).toStrictEqual(3)
});

test("MultiBinPacker order independend",() => {
    const m = new MultiBinPacker(2048, 2048, 0);
    const rects:ISize[] = [];

    rects.push({
        width: 40,
        height: 65,
    })

    rects.push({
        width: 15,
        height: 5,
    })

    rects.push({
        width: 100,
        height: 200,
    })

    for (const r of rects)
        m.add(r)

    expect(m.bins.length).toStrictEqual(1)
    expect(m.bins[0].rects.length).toStrictEqual(3)
});

test("MultiBinPacker oversize",() => {
    const m = new MultiBinPacker(2048, 2048, 0);
    const rects:ISize[] = [];

    rects.push({
        width: 4096,
        height: 65,
    })

    rects.push({
        width: 15,
        height: 5,
    })

    rects.push({
        width: 100,
        height: 200,
    })

    for (const r of rects)
        m.add(r)

    expect(m.oversizedElements.length).toStrictEqual(1)
    expect(m.bins.length).toStrictEqual(1)
    expect(m.bins[0].rects.length).toStrictEqual(2)
});

test("MultiBinPacker multipages",() => {
    const m = new MultiBinPacker(1024, 1024, 0);
    const rects:ISize[] = [];

    for (let i=0; i<100; i++) {
        rects.push({
            width: 290,
            height: 65,
        })
    }

    rects.push({
        width: 15,
        height: 5,
    })

    rects.push({
        width: 100,
        height: 200,
    })

    for (const r of rects)
        m.add(r)

    expect(m.oversizedElements.length).toStrictEqual( 0)
    expect(m.bins.length > 1).toBeTruthy()
});

