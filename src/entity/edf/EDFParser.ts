/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 *
 */
export enum EDFEntryType {
    UNSET,
    REQUIRE,
    ENTITY,
    INSTANCE_ENTITY,
    GLOBAL_PROPS,
    PROPERTY_GROUP
}

export class UnlinkedEDFEntry {
    public properties:any = {};
    public components:string[] = [];
    public propertyGroups:string[] = [];
    public entryType:EDFEntryType = EDFEntryType.UNSET;
    public name:string = "";
    public parent:string = "";
    public staticDepends:string[] = [];
}



export class UnlinkedEDF {
    public entries:UnlinkedEDFEntry[] = [];
    public required:UnlinkedEDFEntry = null;
    public hasErrors:boolean = false;
}



/**
 * Reads *.edf files and created EntityDefinition objects out of it
 */
export function parseEDF(content:string, throws:boolean=false):UnlinkedEDF {

    enum ParseState {
        WAIT_FOR_ELEMENT,
        IN_ELEMENT,
        IN_ELEMENT_COMPONENTS,
        IN_ELEMENT_PROPERTIES,
    }

    function error(...err:any[]) {
        if (throws)
            throw new Error(err.map(e => "" + e).join(" "));
        console.error(...err);
    }

    const out = new UnlinkedEDF();

    let state:ParseState = ParseState.WAIT_FOR_ELEMENT;
    let current:UnlinkedEDFEntry = null;
    //const regHeader = /\[([!|*|\$])?(\w+)(?:\((\w+)\))?(?:\:([\w+\,]+))?]/;
    const regHeader = /\[([!|*|\$])?(\w+)(?:\((\w+)\))?(?:\:([\w+\,]+))?(->([\w+\,]+))?]/;
    const regObjectProp = /^(\w|_)*\s*"{$/;
    const regArrayProp = /^(\w|_)*\s*"\[$/;
    const regMultiStringProp = /^(\w|_)*\s*\"$/;
    const regProp = /^(\w|_)*\s*=/;
    const regPropRefDetect = /^\$(\w|_)+\s*=.+$/;
    const regPropRefFull = /^\$(\w|_)+\s*=\s*(\w|_)+\.(\w|_)+$/;


    const lines = content.split('\n');
    for (let i=0; i<lines.length; i++) {
        const line = lines[i];
        const lineTrimmed = line.trim();
        if (!lineTrimmed)
            continue;

        const first = lineTrimmed[0];
        if (first == '#')
            continue;

        const last = lineTrimmed[lineTrimmed.length-1];
        if (lineTrimmed.length <= 1) {
            if (current != null) {
                out.hasErrors = true;
            }
            error(`Unexpected content in line:`, i+1, ":", line);
            continue;
        }


        if (state == ParseState.IN_ELEMENT_COMPONENTS) {
            if (first == '@') {
                current.components.push(lineTrimmed.substring(1));
            }
            else if (first == '[') {
                current = null;
                state = ParseState.WAIT_FOR_ELEMENT;
            }
            else {
                state = ParseState.IN_ELEMENT_PROPERTIES;
            }
        }

        if (state == ParseState.IN_ELEMENT_PROPERTIES) {
            if (first == '@') {
                if (current != null) {
                    out.hasErrors = true;
                }
                error(`Unexpected component in property list. Line:`, i+1, ":", line);
                continue;
            }
            else if (first == '[') {
                current = null;
                state = ParseState.WAIT_FOR_ELEMENT;
            }
            else if (current.entryType == EDFEntryType.REQUIRE) {
                current.components.push(lineTrimmed);
            }
            else  {
                let seekMultiLine = false;
                let multiLineTerminator = "";
                if (regProp.test(lineTrimmed)) { // Key&value
                    const pair = lineTrimmed.split('=', 2);
                    if (!pair[0]) {
                        out.hasErrors = true;
                        error(`Property name cannot be empty. Line:`, i+1, ":", line);
                        continue;
                    }
                    else {
                        current.properties[pair[0].trim()] = pair[1].trim();
                    }
                }
                else if (regPropRefDetect.test(lineTrimmed)) {
                    if (!regPropRefFull.test(lineTrimmed)) {
                        out.hasErrors = true;
                        error(`Property-Link must point to another entity. Try: '$someProp = other.prop'. Line:`, i+1, ":", line);
                        continue;
                    }
                    const pair = lineTrimmed.split('=', 2);
                    current.properties[pair[0].trim()] = pair[1].trim();
                }
                else if (regArrayProp.test(lineTrimmed)) { // multiline-json-array
                    seekMultiLine = true;
                    multiLineTerminator = ']"';
                }
                else if (regMultiStringProp.test(lineTrimmed)) { // multiline-string
                    seekMultiLine = true;
                    multiLineTerminator = "\"";
                }
                else if (regObjectProp.test(lineTrimmed)) { // multiline-json-object
                    seekMultiLine = true;
                    multiLineTerminator = '}"';
                }
                else {
                    error(`Cannot parse property. Line:`, i+1, ":", line);
                    continue;
                }


                if (seekMultiLine) {
                    const startLineIndex = i;
                    const startLineStr = line;
                    i++;
                    let foundTerminator = false;
                    let multiLineVal = "";
                    for (; i<lines.length; i++) {
                        const scanLine = lines[i];
                        const scanLineTrimmed = scanLine.trim();

                        if (scanLineTrimmed == multiLineTerminator) {
                            foundTerminator = true;
                            break;
                        }
                        multiLineVal += scanLine + "\n";
                    }

                    if (!foundTerminator) {
                        error(`EOF: Multiline property never closes. Missing ${multiLineTerminator}. Line:`, startLineIndex+1, ":", startLineStr);
                        out.hasErrors = true;
                        continue;
                    }
                    else {
                        const multiLineKey = lineTrimmed.substring(0, lineTrimmed.length-multiLineTerminator.length).trim();
                        switch (multiLineTerminator) {
                            case ']"':
                                current.properties[multiLineKey] = `[ ${multiLineVal} ]`;
                                break;
                            case '}"':
                                current.properties[multiLineKey] = `{ ${multiLineVal} }`;
                                break;
                            case '"':
                                current.properties[multiLineKey] = `${multiLineVal.substring(0, multiLineVal.length-1)}`;
                                break;
                        }
                        continue;
                    }
                }
            }
        }

        if (state == ParseState.WAIT_FOR_ELEMENT) {
            if (first != '[' || last != ']') {
                error(`Unexpected content. Line:`, i+1, ":", line);
                out.hasErrors = true;
                continue;
            }
            else if (lineTrimmed == "[*]")
            {
                current = new UnlinkedEDFEntry();
                current.entryType = EDFEntryType.GLOBAL_PROPS;
                state = ParseState.IN_ELEMENT_PROPERTIES;
                out.entries.push(current);
            }
            else if (lineTrimmed == "[$require]") {
                if (out.required) {
                    error(`Unexpected second [$require] entry. Line:`, i+1, ":", line);
                    out.hasErrors = true;
                    continue;
                }
                current = new UnlinkedEDFEntry();
                current.entryType = EDFEntryType.REQUIRE;
                out.required = current;
                state = ParseState.IN_ELEMENT_PROPERTIES;
            }
            else {

                const regResult = regHeader.exec(lineTrimmed);
                if (!regResult) {
                    error(`Cannot parse. Line:`, i+1, ":", line);
                    continue;
                }

                current = new UnlinkedEDFEntry();
                const typeInfo = regResult[1];
                const name = regResult[2];
                const parent = regResult[3];
                const propGroups = regResult[4];
                const depends = regResult[6];

                current.name = name;
                current.entryType = EDFEntryType.ENTITY;
                switch(typeInfo) {
                    case "$":
                        error("Unexpected '$' in line {0}. Use '$' only with [$require]. Line", i+1, ":", line);
                        out.hasErrors = true;
                        break;
                    case "!":
                        current.entryType = EDFEntryType.INSTANCE_ENTITY;
                        state = ParseState.IN_ELEMENT_COMPONENTS;
                        break;
                    case "*":
                        current.entryType = EDFEntryType.PROPERTY_GROUP;
                        state = ParseState.IN_ELEMENT_PROPERTIES;
                        break;
                    default:
                        state = ParseState.IN_ELEMENT_COMPONENTS;
                        break;
                }

                if (parent) {
                    if (current.entryType == EDFEntryType.PROPERTY_GROUP) {
                        error("PropertyGroups cannot have parents. Line", i+1, ":", line);
                    }
                    else {
                        state = ParseState.IN_ELEMENT_PROPERTIES;
                        current.parent = parent;
                    }
                }
                if (propGroups) {
                    const parts = propGroups.split(",");
                    for (let c=0; c<parts.length; c++) {
                        const part = parts[c];
                        const partTrimmed = part ? part.trim() : "";
                        if (partTrimmed) {
                            current.propertyGroups.push(partTrimmed);
                        }
                    }
                }
                if (depends) {
                    const parts = depends.split(",");
                    for (let c=0; c<parts.length; c++) {
                        const part = parts[c];
                        const partTrimmed = part ? part.trim() : "";
                        if (partTrimmed) {
                            current.staticDepends.push(partTrimmed);
                        }
                    }
                }
                out.entries.push(current);
            }
        }

    }

    return out;
}


