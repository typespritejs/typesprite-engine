import {test, beginTests, finishTests} from 'test';
import {fileURLToPath} from "url";
import path from "node:path";
import {readAllDirectoriesAndFiles} from '../service/utils/files';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// const rootDir = path.join("..", __dirname);

beginTests();

const run = async () => {
    // execute all tests
    const testFiles = [];
    const {files} = await readAllDirectoriesAndFiles(__dirname + "/..", /^_.*$/);
    for (const file of files) {
        if (file.endsWith(".test.ts") || file.endsWith(".spec.ts")) {
            const imp = path.relative(__dirname, file);
            testFiles.push(imp);
        }
    }
    for (const testFile of testFiles) {
        await import (testFile);
    }
    finishTests();
    console.log("-----")
}

run().catch(err => console.error(err));







