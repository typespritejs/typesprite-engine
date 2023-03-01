/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Entity} from "@tsjs/entity/Entity";
import {Component} from "@tsjs/entity/Component";


export class ComponentRef<T extends Component> {

    private refCmp:T = null;
    private disposed:boolean = false;
    private numSearches:number = 0;

    public constructor(
        public readonly owner:Entity,
        public readonly targetComponentName:string,
        public readonly targetEntityName?:string,
        public readonly activeOnly:boolean = true,
    ) {
    }

    get exists():boolean {
        return this.checkRef();
    }

    get ref():T {
        return this.checkRef()
            ? this.refCmp
            : null;
    }

    private checkRef():boolean {
        if (this.disposed)
            return false;

        if (this.refCmp) {
            if (this.refCmp.entity.isGarbage() || this.owner.isGarbage()) {
                this.refCmp = null;
                this.disposed = true;
                return false;
            }
            return true;
        }

        this.numSearches++;
        if (this.numSearches % 1000 == 0) {
            console.error(`ComponentRef search() called very often! Most likely not wanted. Owner: ${this.owner.name} in World: ${this.owner.world.name} searches for: CMP: ${this.targetComponentName}, Entity: ${this.targetEntityName}, ActiveOnly:${this.activeOnly}`)
        }

        if (this.targetEntityName) {
            const e = this.owner.world.findEntitiesByName(this.targetEntityName, this.activeOnly);
            if (!e || e.length == 0)
                return false;
            const cmp = e[0].findComponent(this.targetComponentName);
            if (!cmp)
                return false;
            this.refCmp = cmp;
            return true;
        }
        else {
            const entities = this.owner.world.findEntitiesWithComponent(this.targetComponentName, this.activeOnly);
            if (!entities || entities.length == 0)
                return false;

            const cmp = entities[0].findComponent(this.targetComponentName);
            if (!cmp)
                return false;
            this.refCmp = cmp;
            return true;
        }
    }


}