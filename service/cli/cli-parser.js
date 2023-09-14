


/**
 * @typedef {("string"|"number"|undefined)} ValueType
 * @typedef {([string, string|number|undefined])} ConfigTuple
 * @typedef {{name: string, short: string, desc: string, value:ValueType}} CmdEntry
 */


export class CliConfig {

    
    /** @type {Array<CmdEntry>}*/
    commands = [];
    /** 
     * @type {Record<string, true>}
     */
    names = {};
    /** 
     * @type {Record<string, true>}
     */
    shortNames = {};

    /**
     * 
     * @param {string} name 
     * @param {string} short 
     * @param {string} desc 
     * @param {ValueType} value true: my contain an additonal value
     * @returns {this}
     */
    appendCommand(name, short, desc, value = undefined) {
        if (this.names[name])
            throw new Error(`Duplicated command name during: ${name}`);
        if (this.shortNames[short])
            throw new Error(`Duplicated command shorthand during: ${short}`);
        if (value !== undefined &&
            value !== "string" &&
            value !== "number")
            throw new Error(`Unsupported type for value: ${value}`);
        const cmd = {name, short, desc, value};
        this.names[name] = cmd;
        this.shortNames[short] = cmd;
        this.commands.push(cmd);
        return this;
    }
}

export class CliResult {

    /** @type {ConfigTuple[]} */
    commands;

    /** @var {ConfigTuple[]} cmds */
    constructor(cmds) {
        this.commands = [...cmds];
    }

    /**
     * Returns the single value of a command.
     * 
     * If exactly false is returned it means the command has not been set
     * If exactly undefined is returned it means the command is set but no value is defined in the CliConfig
     * Otherwise it's the value of the argument
     * 
     * @param {string} cmdName
     * @returns {false|undefined|string|number}
     */
    cliValue(cmdName) {
        for (const [arg, val] of this.commands) {
            if (arg === cmdName) {
                return val;
            }
        }
        return false;
    }

    /**
     * If a command is set multiple times we can collect it's values here
     * 
     * @param {string} cmdName 
     * @returns {{undefined|string|number}[]} the value or undefined (which means the CliConfig expects no value here)
     */
    cliValueMulti(cmdName) {
        const out = [];
        for (const [arg, val] of this.commands) {
            if (arg === cmdName) {
                out.push(val);
            }
        }
        return out;
    }

    /**
     * 
     * @param {string} cmdName 
     * @returns {boolean} true if the given command is set
     */
    cliHas(cmdName) {
        for (const [arg] of this.commands) {
            if (arg === cmdName) {
                return true;
            }
        }
        return false;
    }
}


/**
 * 
 * @param {CliConfig} config 
 * @param {string[]} args 
 * @returns {CliResult}
 */
export function parseCli(config, args) {
    if (!Array.isArray(args))
        throw new Error("args needs to be an array");

    
    /** @type {ConfigTuple[]} */
    const out = [];
    

    for (let i=0; i<args.length; i++) {
        const arg = args[i];

        /** @type CmdEntry|undefined */
        let refCmd = undefined;
        let cmdName = '';

        if (arg.startsWith("--")) {
            cmdName = arg.substring(2);
            refCmd = config.names[cmdName];
        }
        else if (arg.startsWith("-")) {
            cmdName = arg.substring(1);
            refCmd = config.shortNames[cmdName];
            cmdName = refCmd ? refCmd.name : cmdName; // change 'u' => 'update' (if valid cmd)
        }
        else {
            cmdName = arg;
            refCmd = config.names[cmdName];
        }

        if (!refCmd)
            throw new Error(`Command not found: '${cmdName}'`);

        if (refCmd.value === undefined) {
            out.push([
                cmdName,
                undefined
            ])
            continue;
        }

        // read arg
        const valueArg = args[++i];
        if (valueArg === undefined) {
            throw new Error(`Missing value for command '${cmdName}'`);
        }

        if (refCmd.value === "number") {
            const numVal = Number(valueArg);
            if (isNaN(numVal)) {
                throw new Error(`Invalid value for command '${cmdName}'. Cannot read '${valueArg}' as a number`);
            }
            out.push([
                cmdName,
                numVal
            ])
        }
        else if (refCmd.value === "string") {
            out.push([
                cmdName,
                valueArg
            ])
        }
        else {
            throw new Error(`Unexpected state. Value type should not be of: ${refCmd.value}`);
        }
    }
    return new CliResult(out);
}

