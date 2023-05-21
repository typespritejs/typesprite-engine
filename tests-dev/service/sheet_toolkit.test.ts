import {test} from "test";
import {expect} from "expect";

import {parseVersion} from '../../service/assets/spritesheet/aseprite_cli'
import {parseFilePattern} from '../../service/assets/spritesheet/files'


test("Aseprite Version Parsing",() => {
    expect(parseVersion("Aseprite 1.2.29")).toStrictEqual({
        app: "Aseprite", main: 1, mid: 2, min: 29
    })
    expect(parseVersion("Aseprite 10.2.29")).toStrictEqual( {
        app: "Aseprite", main: 10, mid: 2, min: 29
    })
    expect(parseVersion("Aseprite 0.5.29")).toStrictEqual( {
        app: "Aseprite", main: 0, mid: 5, min: 29
    })
    expect(parseVersion("Aseprite 1.3-beta6")).toStrictEqual( {
        app: "Aseprite", main: 1, mid: 3, min: "beta6"
    })

    expect(parseVersion("Aseprite muh")).toStrictEqual( null)
});

test("Filter ignored files", () => {

    const hasIgnorePattern = (path) => parseFilePattern(path).issue === "IGNORE_PATTERN";
    const reasPatterhIssue = (path) => parseFilePattern(path).issue;

    expect(!hasIgnorePattern('/not/on/OS/hud.aseprite')).toBeTruthy();
    expect(!hasIgnorePattern('/not/on/OS/hud_1.aseprite')).toBeTruthy();
    expect(!hasIgnorePattern('/not/on/OS/karenfat.font.aseprite')).toBeTruthy();
    expect(!hasIgnorePattern('/not/on/OS/karenfat_1.font.aseprite')).toBeTruthy();

    expect(hasIgnorePattern('/not/on/OS/_hud.aseprite')).toBeTruthy();
    expect(hasIgnorePattern('/not/on/OS/_hud_.aseprite')).toBeTruthy();
    expect(hasIgnorePattern('/not/on/OS/hud_.aseprite')).toBeTruthy();

    expect(hasIgnorePattern('/not/on/OS/_karenfat.font.aseprite')).toBeTruthy();
    expect(hasIgnorePattern('/not/on/OS/karenfat_.font.aseprite')).toBeTruthy();
    expect(hasIgnorePattern('/not/on/OS/karenfat._font.aseprite')).toBeTruthy();
    expect(hasIgnorePattern('/not/on/OS/karenfat.font_.aseprite')).toBeTruthy();
    expect(hasIgnorePattern('/not/on/OS/_karenfat.font.aseprite')).toBeTruthy();

    expect(reasPatterhIssue('/not/on/OS/karenfat.muh.aseprite')).toStrictEqual("UNKNOWN_TYPE")
    expect(reasPatterhIssue('/not/on/OS/karenfat.not_ase')).toStrictEqual("FOREIGN_FILE_TYPE");
    expect(reasPatterhIssue('/not/on/OS/karenfat.font.not_ase')).toStrictEqual("FOREIGN_FILE_TYPE");
})

// test("Acutal Aseprite Version works", async() => {
//
//     try {
//         await ensureVersion(asepritePath);
//     }
//     catch(err) {
//         console.error(err)
//         expect(false, "Aspriteversion seems to be wrong!")
//     }
// });






