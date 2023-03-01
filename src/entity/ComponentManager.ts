/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {ComponentDescription, ComponentRequirements} from "@tsjs/entity/decorate/ComponentDescription";

/**
 *
 * Component classes need to be registered here before using
 * the EntityFactory.
 *
 */
class ComponentManagerImpl {

    /** maps class-name => class/constructor */
    private _classes:Record<string, any> = {};
    private classDescs:Map<any, ComponentDescription> = new Map<any, ComponentDescription>();
    private classMap:Map<any, string> = new Map<any, string>();

    newInstance(cmpClassName) {
        const clz = this._classes[cmpClassName];
        if (clz)
            return new clz();
        return null;
    }

    /** null or the matching instance of the class name */
    getClass(cmpClassName) {
        const clz = this._classes[cmpClassName];
        if (clz)
            return clz;
        return null;
    }

    /** Drop all classes. mostly for testing */
    unregisterComponents(ignore?:any) {
        this._classes = {};
        this.classDescs = new Map();
        this.classMap = new Map();
    }

    registerComponent(props) {
        const [className] = Object.keys(props);
        const componentClass = props[className];
        if (!className)
            throw new Error("registerComponent makes no sense. Found: " + className + ", " + componentClass)

        if (this._classes[className]) {
            // Why are we here?
            //
            // Components are not part of the regular require-concept.
            // As a result it is best to not "import" component A from component B.
            //
            // Cross-Import is okay as long as we do NOT use something in it. So we
            // might access an interface and to reference to their "TYPE" (in typescript)
            // but not to actually use something.
            // throw new Error("Component Mangle with: '"+className+"' Try to register a component more than once. " +
            //     "TIP: This is likely because one component imports another. This is not directly supported. " +
            //     "Could also be a copy&paste error - check your component files.")
            console.warn("Component Mangle with: '"+className+"' Try to register a component more than once. " +
                "TIP: This is likely because one component imports another. This is not directly supported. " +
                "Could also be a copy&paste error - check your component files.")
            return;
        }

        //console.log("Register Component: | " + className);
        this._classes[className] = componentClass;
        this.classMap.set(componentClass, className);
        const desc = this.getDescription(className);
        if (desc) {
            desc.getLinkedRequirements();
            const res = desc.getLinkedRequirements()
            if (res) {
                if (this._classes[className].requires) {
                    throw new Error(`Component contains mixed requirement definition: ${className}. One cannot have static requires = {...} and use @props() in the same component!`);
                }
                this._classes[className].requires = res;
            }
        }
    }

    /**
     * @deprecated don't use! Use registerComponent instead
     */
    registerComponentClass(className:string, componentClass) {
        this.registerComponent({[className]: componentClass});
    }

    /**
     * If a component is annotated with decorators they can be accessed here
     */
    getDescription(componentClassName:string):ComponentDescription|null {
        const clz = this._classes[componentClassName];
        const desc = this.classDescs.get(clz);
        return desc||null;
    }

    /**
     * If, for the given component name, a decorator based description exist it is returned here
     * as a requirement definition.
     *
     * If not, null is returned.
     */
    getRequiredResources(componentClassName:string):ComponentRequirements|false {
        const desc = this.getDescription(componentClassName);
        return desc ? desc.getLinkedRequirements() : false;
    }

    getClassName(targetClass:any):string {
        return this.classMap.get(targetClass);
    }

    getOrCreateComponentDesc(targetClass:any):ComponentDescription {
        let cmpDesc = this.classDescs.get(targetClass);
        if (!cmpDesc) {
            cmpDesc = new ComponentDescription(targetClass);
            this.classDescs.set(targetClass, cmpDesc);
        }
        return cmpDesc;
    }

    registerComponentProperty(targetClass:any, propertyName:string, propertyType:string, propertyInfo:any, defaultValue?:any) {
        const cmpDesc = this.getOrCreateComponentDesc(targetClass)
        //console.log("Register Component Property: ", propertyName + ":" + propertyType, "|", targetClass);
        cmpDesc.registerProperty(propertyName, propertyType, propertyInfo, defaultValue);
    }

    registerComponentResource(targetClass: any, propertyName: string, loaderId: string, path?: string) {
        const cmpDesc = this.getOrCreateComponentDesc(targetClass)
        //console.log("Register Component Resource: ", loaderId + ":" + propertyName, "| default:", `'${path}'`, "|", targetClass);
        cmpDesc.registerProperty(propertyName, 'string', undefined, path);
        cmpDesc.registerResource(propertyName, loaderId);
    }

    registerComponentRequire(targetClass: any, propertyName: string, cmpName: string, optional: boolean) {
        const cmpDesc = this.getOrCreateComponentDesc(targetClass)
        cmpDesc.registerComponent(propertyName, cmpName, optional);
        //console.log("Register Component Requirement: Property", propertyName, `:'${cmpName}'`, optional?'[optional]':'');
    }

    registerComponentChildRequire(targetClass: any, memberName: string, child: string) {
        const cmpDesc = this.getOrCreateComponentDesc(targetClass)
        cmpDesc.registerProperty(memberName, 'string', undefined, child);
        cmpDesc.registerChild(memberName, child);
        //console.log("Register Component Child: Property:", memberName, "with child:", child);
    }

    registerComponentLink(targetClass: any, memberName: string, cmpName: string, world:string) {
        const cmpDesc = this.getOrCreateComponentDesc(targetClass)
        cmpDesc.registerStaticLink(memberName, cmpName, world);
        //console.log("Register Component Static Link: Property:", memberName, "with Cmp:", cmpName, world ? "on World:" + world : "");
    }

    registerComponentLinkGlobal(targetClass: any, propertyName: string) {
        const cmpDesc = this.getOrCreateComponentDesc(targetClass)
        cmpDesc.registerGlobalLink(propertyName)
        //console.log("Register Component Global Link: Property:", propertyName);
    }
}

export const ComponentManager = new ComponentManagerImpl();

export function registerComponent(props:Record<any, any>) {
    ComponentManager.registerComponent(props);
}
