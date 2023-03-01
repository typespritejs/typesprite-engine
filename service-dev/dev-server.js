import {server} from "../service/dev/server.js";
import * as path from 'node:path';
import fs from 'node:fs';


const enginePath = process.env.PWD;
const gameDevPath = fs.readFileSync(path.join(enginePath, 'service-dev', 'dev-game-path.txt'), {encoding: "utf8"})
const gamePath = path.join(process.env.PWD, gameDevPath);

console.log("DEV-SERVER: ", {gamePath, enginePath});

server(gamePath, enginePath, true).catch(err => console.error(err));


