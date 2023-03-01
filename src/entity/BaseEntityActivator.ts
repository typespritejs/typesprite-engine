/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Entity} from "@tsjs/entity/Entity";

/**
 * base class for entity activation
 *
 */
export abstract class BaseEntityActivator {

    /** activates the entity */
    abstract check(entity:Entity):boolean;

     /**
      * updates entities
      **/
    updateEntityActivation(
            newEntities:Entity[],
            alwaysActive:Entity[],
            activeEntities:Entity[],
            deactiveEntities:Entity[]) {
        let len, i;
        /** @type Entity */
        let entity;
        /** @type Array */
        let newDeactives:any[] = [];

        // ALWAYS ACTIVE entities
        for (i=0; i<alwaysActive.length;) {
            entity = alwaysActive[i];
            if (entity.isGarbage()) {
                if (i < alwaysActive.length-1) // SWAP
                    alwaysActive[i] = alwaysActive[alwaysActive.length-1];
               alwaysActive.pop(); // DELETE
               entity.onDeactivate();
               entity.onDispose();
            }
            else {
                i++;
            }
        }
        // ACTIVE entities
        for (i=0; i<activeEntities.length;) {
            entity = activeEntities[i];
            if (entity.isGarbage()) {
                if (i < activeEntities.length-1) // SWAP
                    activeEntities[i] = activeEntities[activeEntities.length-1];
               activeEntities.pop(); // DELETE
               entity.onDeactivate();
               entity.onDispose();
            }
            else if (!this.check(entity)) {
                if (i < activeEntities.length-1) // SWAP
                    activeEntities[i] = activeEntities[activeEntities.length-1];
                activeEntities.pop(); // DELETE
                newDeactives.push(entity);
                entity.onDeactivate();
            }
            else {
                i++
            }
        }
        // DEACTIVE entities
        for (i=0; i<deactiveEntities.length; ) {
           entity = deactiveEntities[i];
           if (entity.isGarbage()) {
               if (i < deactiveEntities.length-1) // SWAP
                    deactiveEntities[i] = deactiveEntities[deactiveEntities.length-1];
               deactiveEntities.pop(); // DELETE
               entity.onDispose();
           }
           else if (this.check(entity)) {
               if (i < deactiveEntities.length-1) // SWAP
                    deactiveEntities[i] = deactiveEntities[deactiveEntities.length-1];
               activeEntities.push(entity);
               entity.onActivate();
               deactiveEntities.pop(); // DELETE
            }
           else {
               i++;
           }
        }
        len = newDeactives.length;
        for (i=0; i<len; i++)
            deactiveEntities.push(newDeactives[i]);
        // NEW entities
        len = newEntities.length;
        for (i=0; i<len; i++) {
            entity = newEntities.pop();
            if (entity.props.alwaysActive) {
                entity.onActivate();
                activeEntities.push(entity);
            }
            else {
                if (this.check(entity)) {
                    entity.onActivate();
                    activeEntities.push(entity);
                }
                else {
                    if (!entity.isGarbage())
                        deactiveEntities.push(entity);
                    else {
                        deactiveEntities.push(entity);
                        // console.log("entity", entity.name, "is in void now");
                    }
                }
            }
        }
    }
}
