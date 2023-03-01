/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {LUIElement} from "../LUIElement";
import {LUIManager} from "../LUIManager";
import {LUILayerConsume} from "../LayoutUI";


/**
 * Root-Layer be used by the LUIManager class.
 *
 * ```ts
 * function createOverlayBackground(lui:LUIManager):LUILayer {
 *     const myLayer:LUILayer = lui.createLayer("overlayBackground")
 * }
 * ```
 *
 */
export class LUILayer extends LUIElement {
    private _consumes:LUILayerConsume = LUILayerConsume.OnElement;
    private _context:LUIManager;

    public constructor(ctx:LUIManager) {
        super();
        this._context = ctx;
    }

    public getConsumes():LUILayerConsume {
        return this._consumes;
    }
    public setConsumes(c:LUILayerConsume):LUILayer {
        this._consumes = c;
        return this;
    }

    public onAttach(newParent:LUIElement):void {
        throw new Error("Not Allowed for LUILayer");
    }
    public onDetach(newParent:LUIElement):void {
        throw new Error("Not Allowed for LUILayer");
    }

    getManager(): LUIManager {
        return this._context;
    }
}
