/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {EDFEntryType, parseEDF, UnlinkedEDF, UnlinkedEDFEntry} from "@tsjs/entity/edf/EDFParser";
import {EntityDefinition} from "@tsjs/entity/EntityDefinition";



export class EDFLoader {
    private edfMap:any = {};
    private pending:string[] = [];
    public readonly definitions:Record<string, EntityDefinition> = {};

    constructor(
        private provider:TextFileProvider,
        private startEDF:string,
        private result:(success:boolean, data:EDFLoader)=>void
    ) {
        this.pending.push(startEDF);
        this.loadNextEDF();
    }

    private loadNextEDF():void {
        while(this.pending.length > 0) {
            const nextEDFFileStr = this.pending.shift();
            if (!this.edfMap[nextEDFFileStr]) {
                console.log("Loading EDF:", nextEDFFileStr);
                this.provider.readAllText(nextEDFFileStr, (okay, textOrError) => {
                    const edfData = new RawEDFFile();
                    this.edfMap[nextEDFFileStr] = edfData;
                    edfData.name = nextEDFFileStr;
                    if (!okay) {
                        edfData.errorLoadFile = true;
                        console.error("Failed to load EDF chain. Error loading: ", nextEDFFileStr);
                        this.result(false, this);
                    }
                    else {
                        console.log("Parse EDF:", nextEDFFileStr);
                        edfData.unlinkedEDF = parseEDF(textOrError);
                        if (edfData.unlinkedEDF.required &&
                            edfData.unlinkedEDF.required.components.length > 0) {
                            for (let c=0; c<edfData.unlinkedEDF.required.components.length; c++) {
                                const requireFile = edfData.unlinkedEDF.required.components[c];
                                this.pending.push(requireFile);
                            }
                        }
                        this.loadNextEDF();
                    }
                });
                return;
            }
        }

        const orderedEDFs:UnlinkedEDFEntry[] = [];
        this.orderDependency(this.startEDF, orderedEDFs);
        this.link(orderedEDFs);
    }

    private orderDependency(edfFile:string, orderedEDFs:UnlinkedEDFEntry[]):void {
        if (edfFile == null)
            return;
        const rawEDF = this.edfMap[edfFile] as RawEDFFile;
        if (rawEDF.unlinkedEDF.required && rawEDF.unlinkedEDF.required.components.length > 0) {
            for (let c=0; c<rawEDF.unlinkedEDF.required.components.length; c++) {
                const requireFile = rawEDF.unlinkedEDF.required.components[c];
                this.orderDependency(requireFile, orderedEDFs);
            }
        }
        for (let i=0; i<rawEDF.unlinkedEDF.entries.length; i++) {
            orderedEDFs.push(rawEDF.unlinkedEDF.entries[i]);
        }
    }

    private mergeAWithB(propsA, propsB) {
        const outMap = {};
        const keysOfA = Object.keys(propsA);
        for (let i=0; i<keysOfA.length; i++) {
            const aKey = keysOfA[i];
            outMap[aKey] = propsB[aKey] || propsA[aKey];
        }
        const keysOfB = Object.keys(propsB);
        for (let i=0; i<keysOfB.length; i++) {
            const bKey = keysOfB[i];
            outMap[bKey] = propsB[bKey];
        }
        return outMap;
    }

    private link(orderedEDFs:UnlinkedEDFEntry[]):void {
        let globalProps: any = {};
        const usedNames: any = {};
        const consumeName = (name:string):boolean => {
            if (!name || !name.trim())
                return false;
            if (usedNames[name])
                return false;
            usedNames[name] = true;
            return true;
        };

        for (let i=0; i<orderedEDFs.length; i++) {
            const e = orderedEDFs[i];

            if (e.entryType == EDFEntryType.GLOBAL_PROPS) {
                globalProps = this.mergeAWithB(globalProps, e.properties);
            }
            else if (e.entryType == EDFEntryType.PROPERTY_GROUP) {
                if (!consumeName(e.name)) {
                    console.error("EDF name used more than once:", e.name);
                    continue;
                }
                const ed = new EntityDefinition();
                ed.name = e.name;
                ed.type = "property";
                e.propertyGroups.forEach(pgName => ed.family.push(pgName.toLowerCase()));
                ed.properties = e.properties;
                // this.definitions.push(ed);
                this.definitions[e.name.toLowerCase()] = ed;
            }
            else if (e.entryType == EDFEntryType.ENTITY ||
                e.entryType == EDFEntryType.INSTANCE_ENTITY) {
                if (!consumeName(e.name)) {
                    console.error("EDF name used more than once:", e.name);
                    continue;
                }
                const ed = new EntityDefinition();
                ed.name = e.name;
                ed.type = "entity";
                ed.isStatic = e.entryType == EDFEntryType.INSTANCE_ENTITY ? true : false;
                e.propertyGroups.forEach(pgName => ed.family.push(pgName.toLowerCase()));
                ed.properties = e.properties;
                ed.components = e.components;
                ed.parent = e.parent.toLowerCase();
                if (e.staticDepends.length > 0)
                    ed.staticDependencies = [];
                e.staticDepends.forEach(dep => ed.staticDependencies.push(dep));
                // this.definitions.push(ed);
                this.definitions[e.name.toLowerCase()] = ed;
            }
        }

        this.result(true, this);
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Async text file provider
 */
export interface TextFileProvider {
    readAllText(url:string, receiver:(success:boolean, textOrError:string)=>void):void;
}

// ---------------------------------------------------------------------------------------------------------------------

class RawEDFFile {
    public content:string;
    public name:string;
    public unlinkedEDF:UnlinkedEDF=null;
    public errorLoadFile:boolean = false;
}