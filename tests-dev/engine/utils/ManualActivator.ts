import {BaseEntityActivator, Entity} from "tsjs";

export class ManualActivator extends BaseEntityActivator {

    check(entity:Entity) {
        if (entity.props.alwaysActive)
            return true;

        if (entity.props.manualActivation) {
            return entity.props.active;
        }

        if (!entity.props.anchor) {
            if (!entity.props.oneShot) {
                console.error("Found entity without Anchor. Disposed!: " + entity.name);
            }
            entity.dispose();
            return false;
        }

        return false;
    }
}