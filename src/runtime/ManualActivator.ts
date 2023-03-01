/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {BaseEntityActivator} from "@tsjs/entity/BaseEntityActivator";
import {Entity} from "@tsjs/entity/Entity";

/**
 * ⚠️ experimental
 */
export class ManualActivator extends BaseEntityActivator {
    check(entity:Entity) {
        // if (entity.props.alwaysActive)
        //     return true;

        if (entity.props.active === undefined) {
            return true;
        }
        else {
            return entity.props.active;
        }
        return false;
    }
}