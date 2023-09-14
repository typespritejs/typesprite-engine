
import {test} from "test";
import {expect} from "expect";

import {parseCli, CliConfig} from '../../service/cli/cli-parser'


test("CliConfig",() => {

    expect(() => new CliConfig()
        .appendCommand("arg1", "a1", ``)
        .appendCommand("arg1", "a2", ``)
    ).toThrowError()
    expect(() => new CliConfig()
        .appendCommand("arg1", "a1", ``)
        .appendCommand("arg2", "a1", ``)
    ).toThrowError()
    expect(() => new CliConfig()
        .appendCommand("arg1", "a1", ``)
        // @ts-ignore 
        .appendCommand("arg2", "a2", ``, "xxx")
    ).toThrowError()
    expect(() => new CliConfig()
        .appendCommand("arg1", "a1", ``)
        .appendCommand("arg2", "a2", ``)
    ).not.toThrow()
    
});

test("CliParser",() => {

    const c = new CliConfig()
        .appendCommand(`arg1`, "a1", `d1`)
        .appendCommand(`arg2`, "a2", `d2`, undefined)
        .appendCommand(`arg3`, "a3", `d3`)
        .appendCommand(`arg4`, "a4", `d4`, "number")
        .appendCommand(`arg5`, "a5", `d5`, "string")

    // good cases
    expect(parseCli(c, []).commands).toStrictEqual([]);
    expect(parseCli(c, ["arg1"]).commands).toStrictEqual([["arg1", undefined]]);
    expect(parseCli(c, ["arg2", "arg1"]).commands).toStrictEqual([["arg2", undefined], ["arg1", undefined]]);
    expect(parseCli(c, ["arg2", "--arg1"]).commands).toStrictEqual([["arg2", undefined], ["arg1", undefined]]);
    expect(parseCli(c, ["--arg2", "--arg1"]).commands).toStrictEqual([["arg2", undefined], ["arg1", undefined]]);
    expect(parseCli(c, ["--arg2", "arg1"]).commands).toStrictEqual([["arg2", undefined], ["arg1", undefined]]);
    expect(parseCli(c, ["arg2", "-a1"]).commands).toStrictEqual([["arg2", undefined], ["arg1", undefined]]);
    expect(parseCli(c, ["-a2", "-a1"]).commands).toStrictEqual([["arg2", undefined], ["arg1", undefined]]);
    expect(parseCli(c, ["-a2", "arg1"]).commands).toStrictEqual([["arg2", undefined], ["arg1", undefined]]);
    expect(parseCli(c, ["-a2", "-a4", "12"]).commands).toStrictEqual([["arg2", undefined], ["arg4", 12]]);
    expect(parseCli(c, ["-a2", "-a4", "12.5"]).commands).toStrictEqual([["arg2", undefined], ["arg4", 12.5]]);
    expect(parseCli(c, ["-a2", "-a5", "12"]).commands).toStrictEqual([["arg2", undefined], ["arg5", "12"]]);
    expect(parseCli(c, ["-a2", "-a5", "abc"]).commands).toStrictEqual([["arg2", undefined], ["arg5", "abc"]]);
    expect(parseCli(c, ["-a4", "12", "-a2"]).commands).toStrictEqual([["arg4", 12], ["arg2", undefined]]);
    expect(parseCli(c, ["-a4", "12", "--arg4", "24"]).cliHas("arg4")).toStrictEqual(true);
    expect(parseCli(c, ["-a4", "12", "--arg4", "24"]).cliHas("no-an-arg")).toStrictEqual(false);
    expect(parseCli(c, ["-a4", "12", "--arg4", "24"]).cliValue("arg4")).toStrictEqual(12);
    expect(parseCli(c, ["-a4", "12", "--arg4", "24"]).cliValueMulti("arg4")).toHaveLength(2);
    expect(parseCli(c, ["-a4", "12", "--arg4", "24"]).cliValueMulti("arg4")).toStrictEqual([12, 24])
    // bad cases
    expect(() => parseCli(c, ["-a4", "xx"])).toThrow();
    expect(() => parseCli(c, ["not-an-arg"])).toThrow();
    expect(() => parseCli(c, ["-a5"])).toThrow();
    
});