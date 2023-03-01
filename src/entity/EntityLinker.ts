/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {combineObjects} from "@tsjs/util/TTTools";





/**
 *
 *
 */
export class EntityLinker {
    
    public linked:boolean = false;
    private _definitions:any = {};
    private _linkedDefinitions:any = {};
    
    
    addDefinitions(defs) {
        for (const k in defs)
            this._definitions[k] = defs[k];
        this.linked = false;
    }
    /**
     * @private
     */
    _resolveDependencyOrder() {
        // TASK: resolve dependency
        // The JavaScript-objects do not guarantee a specific order
        // for the keys.
        // see: http://bugs.jquery.com/ticket/1107
        //
        // BACKGROUND:
        // To link our entity-objects it is important that
        // we have the definition ordered according to
        // their dependencies.
        //
        // Imagine this random list (read -> as requirs):
        // [0] EntityC -> EntityA, PropFamA, PropFamB
        // [1] PropFamB
        // [2] EntityA -> PropFamA
        // [3] PropFamA
        //
        // If JavaScript loops over the given JSObject in
        // that order we would have our first issue when EntityC
        // is parsed. By that time EntityA is unknown and
        // thus cannot be resolved.
        //
        // To fix this we can push all _definition entries
        // into an array and consider their dependencies.
        //
        // In the given example a compatible order would be:
        // [0] PropFamA
        // [1] PropFamB
        // [2] EntityA -> PropFamA
        // [3] EntityC -> EntityA, PropFamA, PropFamB
        //
        // ISSUE CIRCULAR DEPENDENCY:
        // With this we also have a new error class: circular
        // dependency.
        //
        // In an easy case it is
        // EntityA -> EntityB
        // EntityB -> EntityA
        //
        // A more advance case:
        // EntityA -> PropA
        // EntityB -> EntityA, PropB
        // PropA -> PropD, PropC
        // PropD -> PropB
        //
        // Both cases will cause an error that may be hard
        // to communicate to the developer.
        //
        // ISSUE IMPLICIT DEPENDENCY:
        // A leading '$' indicates that the right value
        // is a reference to another property. That
        // causes an implicit dependency (which is not
        // reflected by a parent nor an entity.
        //
        // $height = someEntityOrProperty.key
        //
        // ISSUE PERFORMANCE:
        // This extra step of sorting is of course an performance
        // issue. An alternative solution would be a preprocessor
        // step that does the sorting before that and puts
        // into a Json file. That however would make the config
        // more complex as we have ensure the order and an less
        // intuitive json-format.
        //
        // So until this sorting step does not proof to be
        // an performance issue I think its best to have
        // a simple config over a fast linking.


        // perform topology-search (first approach: just get
        // it to work. optimize later)
        const sortedDefinitionList:any = [];
        const sortedDefinitionSet = {};
        const pendingDefinitions:any[] = [];
        for (const definitionName in this._definitions)
        {
            const rawDef = this._definitions[definitionName];
            const depends = this._getDependencies(rawDef);
            //console.log(definitionName, "=>", depends);
            if (!depends) {
                sortedDefinitionList.push(rawDef);
                sortedDefinitionSet[definitionName] = true;
            }
            else {
                pendingDefinitions.push({
                    def: rawDef,
                    dependsOn: depends
                });
            }
        }
        // Now we have to go over the pending definitions
        // until the list is empty.
        //
        // If we have one iteration without a new candidate
        // we must have a circular dependency.
        let numFound = -1;
        while (numFound !== 0 && pendingDefinitions.length > 0) {
            numFound = 0;
            for (let i2 = pendingDefinitions.length - 1; i2 >= 0; i2--) {
                const pendingDef = pendingDefinitions[i2];
                let allFound = true;
                for (const dependName in pendingDef.dependsOn) {
                    if (sortedDefinitionSet[dependName] !== true) {
                        allFound = false;
                        break;
                    }
                }
                if (allFound) {
                    numFound++;
                    pendingDefinitions.splice(i2, 1);// remove entry from pending
                    sortedDefinitionList.push(pendingDef.def);
                    sortedDefinitionSet[pendingDef.def.name.toLowerCase()] = true;
                }
            }
        }
        // Check if we have remaining entries
        // If so it means that we have either unknown
        // references or a dependecy loop
        if (pendingDefinitions.length > 0) {
            console.error("Unresolved reference or dependency-loop detected");
            for (let i2 = 0; i2 < pendingDefinitions.length; i2++) {
                const pendingDef = pendingDefinitions[i2];
                let names:string;
                for (const k in pendingDef.dependsOn)
                    names = (names ? names + ", '" + k + "'" : "'" + k + "'");
                console.error(pendingDef.def.name, "depends on", names);
            }
            // TODO improve error reporting: detect dependency loop.
        }
        return sortedDefinitionList;
    }
    private _getDependencies(def) {
        let depends;
        // check parent
        if (def.parent) {
            depends = depends || {};
            depends[(("" + def.parent).toLowerCase())] = true;
        }
        // check family
        const len = def.family ? def.family.length : 0;
        for (let i = 0; i < len; i++) {
            depends = depends || {};
            const famPropsRef = def.family[i];
            depends[(("" + famPropsRef).toLowerCase())] = true;
        }
        // check implicit dependency
        for (const key in def.properties) {
            const linkProp = def.properties[key];
            if (key[0] === "$") {
                if (key.length > 1 && typeof (linkProp) === "string") {
                    const parts = linkProp.split('.');
                    if (parts.length === 2) {
                        depends = depends || {};
                        depends[parts[0].toLowerCase()] = true;
                    }
                }
            }
        }
        return depends;
    }
    /**
     * link definitions and properties
     **/
    link() {
        this._linkedDefinitions = {};
        const orderedDefinitionList = this._resolveDependencyOrder();
        for (let i2 = 0; i2 < orderedDefinitionList.length; i2++) {
            //const def = this._definitions[definitionName];
            const def = orderedDefinitionList[i2];
            const definitionName = def.name.toLowerCase();
            const newDefinition = new LinkedEntityDefinition();
            newDefinition.name = def.name;
            if (!def.type)
                def.type = "entity";

            // inherit from parent
            let len:number;
            if (def.parent) {
                /* @type {LinkedEntityDefinition}  */
                const parentEntity = this._linkedDefinitions[def.parent];
                if (!parentEntity) {
                    console.error('Link-error in Entity "' + definitionName + '". Cannot find parent: "' + def.parent + '".', def.source);
                    continue;
                }
                else if (parentEntity.type !== "entity") {
                    console.error('Link-error in Entity "' + definitionName + '". Parent must be an entity. "' + def.parent + '" is not.', def.source);
                    continue;
                }
                else if (def.components.length > 0) {
                    console.error('Link-error in Entity "' + definitionName + '". An entity cannot inherit from a parent and provide components itself. Parent: "' + def.parent + '".', def.source);
                    continue;
                }
                const len = parentEntity.components.length;
                for (let i = 0; i < len; i++)
                    newDefinition.components.push(parentEntity.components[i]);

                // set properties
                newDefinition.properties = combineObjects(def.properties, parentEntity.properties);
            }

            // set own components
            len = def.components ? def.components.length : 0;
            if (def.type === "entity" && len === 0 && newDefinition.components.length === 0) {
                console.error('Link-error in Entity "' + definitionName + '". No components found.', def.source);
                continue;
            }
            for (let i = 0; i < len; i++)
                newDefinition.components.push(def.components[i]);

            // inherit properties from family
            len = def.family ? def.family.length : 0;
            let familyEntryOk = true;
            for (let i = 0; i < len; i++) {
                const famPropsRef = def.family[i];
                let familyEntry = famPropsRef;
                familyEntry = familyEntry.toLowerCase();
                if (!this._linkedDefinitions.hasOwnProperty(familyEntry)) {
                    console.error('Link-error in Entity "' + definitionName + '". Cannot find property family "' + familyEntry + '".', def.source);
                    familyEntryOk = false;
                    break;
                }
                const familyEntryObj = this._linkedDefinitions[familyEntry];
                if (familyEntryObj.type !== "property") {
                    console.error('Link-error in Entity "' + definitionName + '". A property family reference must be of type Property. Found type "' + familyEntryObj.type + '".', def.source);
                    familyEntryOk = false;
                    break;
                }
                newDefinition.properties = combineObjects(newDefinition.properties, familyEntryObj.properties);
            }

            // do not add
            if (!familyEntryOk)
                continue;

            // combine own properties
            newDefinition.properties = combineObjects(newDefinition.properties, def.properties);

            // unwrap property links
            for (const key in newDefinition.properties) {
                const linkProp = newDefinition.properties[key];
                if (key[0] === "$") {
                    let linkSuccess = false;
                    if (key.length > 1 &&
                    typeof (linkProp) === "string") {
                        delete newDefinition.properties[key];
                        const parts = linkProp.split('.');
                        if (parts.length === 2 &&
                        this._linkedDefinitions.hasOwnProperty(parts[0].toLowerCase())) {
                            const newVal = this._linkedDefinitions[parts[0].toLowerCase()].properties[parts[1]];
                            if (newVal) {
                                newDefinition.properties[key.substring(1)] = newVal;
                                linkSuccess = true;
                            }
                        }
                    }
                    if (!linkSuccess) {
                        console.error('Link-error in Entity "' + definitionName + ". unresolved link \"" + key + " = " + linkProp + "\"", def.source);
                    }
                }
            }
            newDefinition.type = def.type;
            newDefinition.isStatic = def.isStatic;
            this._linkedDefinitions[definitionName.toLowerCase()] = newDefinition;
        }
        this.linked = true;
        return this._linkedDefinitions;
    }
}

export class LinkedEntityDefinition {
    /** static entities are always instantiated */
    public isStatic:boolean = false;
    /**  */
    public components:any[] = [];
    /** unparsed properties */
    public properties:any = {};
    public type:string = "";
    public name:string = "";
}