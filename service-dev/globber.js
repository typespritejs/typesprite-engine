import path from 'node:path'
import fs from 'node:fs/promises'
import {readAllDirectoriesAndFiles} from "../service/utils/files.js";
import {globIgnore} from "./globber-ignore.js";


async function main() {
    const rootDirName = "src";
    const scan = await readAllDirectoriesAndFiles(`./${rootDirName}`);

    const moduleMap = {};
    const out = scan.files
        .filter(f => f.endsWith(".ts"))
        .filter(f => !f.endsWith("index.ts") && !f.endsWith(".test.ts") && !f.endsWith(".spec.ts"))
        .filter(f => {
            const baseName = path.basename(f)
            const name = baseName.substring(0, baseName.length-".ts".length);
            return !name.startsWith("_")
                && !name.endsWith("_")
                && !name.toLowerCase().endsWith("old")
                && !globIgnore.has(name)
                ;
        })
        .map(f => f.substring(0, f.length -".ts".length))
        .map(f => {
            const baseName = path.basename(f)
            moduleMap[baseName] = moduleMap[baseName]||[];
            moduleMap[baseName].push(f);
            return f;
        })
        .map(f => `export * from '.${f.substring(rootDirName.length)}'`)

    console.log(out);
    await fs.writeFile(`./${rootDirName}/index.ts`, out.join('\n'), {encoding: "utf-8"})
}
main().catch(err => console.error(err));