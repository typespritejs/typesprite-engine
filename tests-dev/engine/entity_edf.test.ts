import {EDFEntryType, parseEDF} from "tsjs";
import {expect} from "expect";
import {test} from "test";




test("Basic Parsing EDFParser", () => {

    const edf1 =
            `[*]
c = 3


[Enemy]
@alive
live = 4711

[*pg1]
xx = 23

[Obj1]
@obj1

[Obj2:pg1]
@obj2

[Obj3(Obj1)]

[Obj4(Obj1):pg1]
xx = 12

[!XXX(Obj1)]
name = awesome!

[!YYY(Obj1)]
name =  awesome2  
html " 
  <>  
1
 "
 
[JSON1]
someValA = 0
someVal "{
  "bool": true,
  "str": "yes",
  "num": 4711,
  "none": null
}"
someValB = 1

 
`;


    const edf1Parsed = parseEDF(edf1);
    // console.log(JSON.stringify(edf1Parsed.entries[9], null, 2));

    expect(edf1Parsed.hasErrors).toStrictEqual(false);
    expect(edf1Parsed.hasErrors).toStrictEqual( false);
    expect(edf1Parsed.entries[0].entryType).toStrictEqual( EDFEntryType.GLOBAL_PROPS); // *
    expect(edf1Parsed.entries[1].entryType).toStrictEqual( EDFEntryType.ENTITY); // Enemy
    expect(edf1Parsed.entries[2].entryType).toStrictEqual( EDFEntryType.PROPERTY_GROUP); // pg1
    expect(edf1Parsed.entries[3].entryType).toStrictEqual( EDFEntryType.ENTITY); // Obj1
    expect(edf1Parsed.entries[4].entryType).toStrictEqual( EDFEntryType.ENTITY); // Obj2
    expect(edf1Parsed.entries[5].entryType).toStrictEqual( EDFEntryType.ENTITY); // Obj3
    expect(edf1Parsed.entries[6].entryType).toStrictEqual( EDFEntryType.ENTITY); // Obj4
    expect(edf1Parsed.entries[7].entryType).toStrictEqual( EDFEntryType.INSTANCE_ENTITY); // XXX
    expect(edf1Parsed.entries[8].entryType).toStrictEqual( EDFEntryType.INSTANCE_ENTITY); // YYY

    expect(edf1Parsed.entries[1].properties).toStrictEqual( {
        "live": "4711"
    }); // YYY
    expect(edf1Parsed.entries[6].parent).toStrictEqual( "Obj1"); // YYY
    expect(edf1Parsed.entries[6].propertyGroups).toStrictEqual( ["pg1"]);

    expect(edf1Parsed.entries[8].properties).toStrictEqual( {
        "name": "awesome2",
        "html": "  <>  \n1"
    });

    expect(edf1Parsed.entries[9].properties.someValA).toStrictEqual( "0");
    expect(edf1Parsed.entries[9].properties.someValB).toStrictEqual( "1");

    expect(JSON.parse(edf1Parsed.entries[9].properties.someVal)).toStrictEqual( {
        "bool": true,
        "str": "yes",
        "num": 4711,
        "none": null
    });

});





