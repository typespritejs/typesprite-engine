#!/usr/bin/env node

import { cli } from "../service/cli/typesprite-cli.js";

cli().catch(err => {
    console.error(err);
})
