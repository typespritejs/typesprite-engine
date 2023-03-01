/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {isArray, isString} from "@tsjs/util/utils";
import {Component} from "@tsjs/entity/Component";


export class ComponentDescription {

    private properties:Map<string, ComponentProperty> = new Map<string, ComponentProperty>();
    private resources:Map<string, string> = new Map<string, string>();
    private cmps:Map<string, [string, boolean]> = new Map<string, [string, boolean]>();
    private canSpawnChildren:Map<string, string> = new Map<string, string>();
    private linksStatic:Map<string, [string, string]> = new Map<string, [string, string]>();
    private linksGlobal:Set<string> = new Set<string>();
    private linkedRequires:ComponentRequirements|false;

    constructor(
        private cmpClz:any
    ) {
    }

    registerProperty(propertyName:string, propertyType:string, propertyInfo?:any, defaultValue?:any) {
        const prop = new ComponentProperty()
        prop.annotation = propertyInfo;
        prop.name = propertyName;
        prop.type = propertyType;
        prop.defaultValue = defaultValue;

        this.properties.set(propertyName, prop);
    }

    registerResource(propertyName:string, loaderId:string) {
        this.resources.set(propertyName, loaderId);
    }

    registerComponent(propertyName:string, otherComponent:string, optional:boolean) {
        this.cmps.set(propertyName, [otherComponent, optional]);
    }

    registerChild(propertyName:string, child:string) {
        this.canSpawnChildren.set(propertyName, child);
    }

    registerStaticLink(propertyName:string, componentName:string, world:string) {
        this.linksStatic.set(propertyName, [componentName, world]);
    }

    registerGlobalLink(propertyName:string) {
        this.linksGlobal.add(propertyName);
    }

    private link():ComponentRequirements|false {
        const linkedRequires:ComponentRequirements = {};
        // props
        {
            const props = {};
            for (const [name, desc] of this.properties.entries()) {
                const prop = {type: desc.type};
                if (desc.defaultValue !== undefined)
                    prop["def"] = desc.defaultValue;

                if (isArray( desc.annotation))
                    props[name] = {...prop, annotation: desc.annotation};
                else if (typeof desc.annotation === "object")
                    props[name] = {...prop, ...desc.annotation};
                else if (isString( desc.annotation))
                    props[name] = {...prop, annotation: desc.annotation};
                else
                    props[name] = prop;
            }
            if (Object.keys(props)) {
                linkedRequires["props"] = props;
            }
        }

        // res
        {
            if (this.resources.size > 0) {
                const res = (props):string[] => {
                    const ret:string[] = [];
                    for (const [propName, resType] of this.resources.entries()) {
                        ret.push(`${resType}:${props[propName]}`);
                    }
                    return ret.length > 0 ? ret : undefined;
                }
                linkedRequires["res"] = res;
            }
        }

        // cmps
        {
            if (this.cmps.size > 0) {
                const cmps:string[] = [];
                const cmpsOptional:string[] = [];
                for (const [prop, [cmpName, optional]] of this.cmps.entries()) {
                    if (optional)
                        cmpsOptional.push(cmpName);
                    else
                        cmps.push(cmpName);
                }
                if (cmps.length > 0)
                    linkedRequires["cmps"] = cmps;
                if (cmpsOptional.length > 0)
                    linkedRequires["cmpsOptional"] = cmpsOptional;
            }
        }

        // children
        {
            if (this.canSpawnChildren.size > 0) {
                const children = (props):string[] => {
                    const ret:string[] = [];
                    for (const [propName] of this.canSpawnChildren.entries()) {
                        ret.push(`${props[propName]}`);
                    }
                    return ret.length > 0 ? ret : undefined;
                }
                linkedRequires["children"] = children;
            }
        }

        // build pre-init-function
        {
            // beforeInitSteps
            //
            // This array, if not empty, is executed for each component of the given
            // type every time an entity is instantiated.
            //
            // The idea is to avoid to write ugly boilerplate code every time engine access
            // is required. However, it comes at a certain price. Therefor
            // the function 'beforeInit' is only created if any properties are provided here.
            const beforeInitSteps:(<T extends Component>(targetCmp:T) => void|string)[] = [];


            // @prop() + @child()
            //
            if (this.properties.size > 0) {
                // create empty instance to make sure no default values are set
                // on @prop values
                {
                    const nn = new this.cmpClz();
                    for (const propName of this.properties.keys()) {
                        if (nn[propName] !== undefined) {
                            // const name = ComponentManager.getClassName(this.cmpClz);
                            const name = 'TODO';
                            throw new Error(`Invalid assignment in Component: ${name}::${propName} must not have a default value.`);
                        }
                    }
                }

                // Here we take all properties @prop()
                // and inject the parsed value into the components field.
                const propNames = [];
                for (const [propName, ] of this.properties.entries()) {
                    // We skip properties wich's field will be set by other initSteps later.
                    if (this.resources.has(propName))
                        continue;
                    propNames.push(propName);
                }
                if (propNames.length > 0) {
                    beforeInitSteps.push(<T extends Component>(targetCmp:T) => {
                        for (const prop of propNames) {
                            targetCmp[prop] = targetCmp.requireProperty(prop);
                        }
                    })
                }
            }

            // @res()
            //
            if (this.resources.size > 0) {
                const resProps = [];
                for (const [propName, res] of this.resources.entries()) {
                    resProps.push([propName, res])
                }
                beforeInitSteps.push(<T extends Component>(targetCmp:T) => {
                    for (const p of resProps)
                        targetCmp[p[0]] = targetCmp.requireResource(p[1], p[0]);
                });
            }

            // @cmp()
            //
            if (this.cmps.size > 0) {
                const cmps = [];
                const optionalCmps = [];
                for (const [propName, [cmpName, optional]] of this.cmps.entries()) {
                    if (optional)
                        optionalCmps.push([propName, cmpName]);
                    else
                        cmps.push([propName, cmpName]);
                }
                if (cmps.length > 0) {
                    beforeInitSteps.push(<T extends Component>(targetCmp:T) => {
                        for (const p of cmps)
                            targetCmp[p[0]] = targetCmp.requireComponent(p[1])
                    });
                }
                if (optionalCmps.length > 0) {
                    beforeInitSteps.push(<T extends Component>(targetCmp:T) => {
                        for (const p of optionalCmps) {
                            targetCmp[p[0]] = targetCmp.entity.findComponent(p[1]);
                        }
                    });
                }
            }

            // @link
            //
            if (this.linksStatic.size > 0) {
                const links = [];
                const withWorld = [];
                for (const [propName, [staticCmp, world]] of this.linksStatic) {
                    if (world)
                        withWorld.push([propName, world,  `$${staticCmp}`])
                    else
                        links.push([propName, `$${staticCmp}`])
                }
                if (links.length > 0) {
                    beforeInitSteps.push(<T extends Component>(targetCmp:T) => {
                        for (const p of links) {
                            const elem = targetCmp.entity.world.statics[p[1]]
                            if (!elem) {
                                return `static object not found: ${p[1]}. Property: ${p[0]}. Missing dependency in EDF?`
                            }
                            targetCmp[p[0]] = elem;
                        }
                    });
                }
                if (withWorld.length > 0) {
                    beforeInitSteps.push(<T extends Component>(targetCmp:T) => {
                        for (const p of withWorld) {
                            const world = targetCmp.world.manager.getWorldByName(p[1]);
                            if (!world) {
                                return `Cannot resolve @link(). World not found: ${p[1]} in world: ${p[2]}. Property: ${p[0]}.`
                            }
                            const elem = world.statics[p[2]]
                            if (!elem) {
                                return `static object not found: ${p[1]} in world: ${p[2]}. Property: ${p[0]}`
                            }
                            targetCmp[p[0]] = elem;
                        }
                    });
                }
            }

            // @globalLink
            //
            if (this.linksGlobal.size > 0) {
                beforeInitSteps.push(<T extends Component>(targetCmp:T) => {
                    for (const p of this.linksGlobal) {
                        const globalVal = targetCmp.world.manager.globals[p];
                        if (globalVal === undefined)
                            return `Cannot find reference to global value: ${p}`;
                        targetCmp[p] = globalVal;
                    }
                });
            }

            if (beforeInitSteps.length > 0) {
                linkedRequires["beforeInit"] = <T extends Component>(targetCmp:T) => {
                    for (const initer of beforeInitSteps) {
                        const ret = initer(targetCmp);
                        if (ret)
                            return ret;
                    }
                }
            }
        }

        this.linkedRequires = Object.keys(linkedRequires).length > 0 ? linkedRequires : false;
        return this.linkedRequires;
    }

    public getLinkedRequirements():ComponentRequirements|false {
        return this.linkedRequires ? this.linkedRequires : this.link();
    }

}

export interface ComponentRequirements {
    props?:Record<string, any>,
    res?:(props:Record<string, any>)=>any[],
    cmps?:string[],
    cmpsOptional?:string[],
    children?:(props:Record<string, any>)=>any[],
    beforeInit?<T extends Component>(targetCmp:T):string|void,
}

export class ComponentProperty {
    public annotation:any;
    public name:string;
    public type:string;
    public defaultValue:any;
}