import {build} from "../service/packing/build.js";
import * as path from 'node:path';
import fs from "node:fs";


const enginePath = process.env.PWD;
const gameDevPath = fs.readFileSync(path.join(enginePath, 'service-dev', 'dev-game-path.txt'), {encoding: "utf8"})
const gamePath = path.join(process.env.PWD, gameDevPath);


build(gamePath, enginePath).catch(err => {
    console.error(err)
    console.error(err, "\n------------------------\n🔥 Build failed. Sorry.")
});


