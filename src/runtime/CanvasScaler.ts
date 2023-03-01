/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Component} from "@tsjs/entity/Component";
import {linkGlobal, prop} from "@tsjs/entity/decorate/ComponentDecorators";


/**
 *
 * ```ts
 * props:
 *
 * // 0 = use window.devicePixelRatio leads to sharper images
 * // 1 = 100% html canvas pixel (on retina devices pixel get blurry)
 * pixelSize:number [default: 0]
 * ```
 *
 * ⚠️ experimental
 *
 * This will do for demos but fail for many other things
 */
export class CanvasScaler extends Component {

    @prop('number', 0)
    private pixelSize:number;
    @linkGlobal()
    public canvas:HTMLCanvasElement;
    private firstRun:boolean = true;

    onInit(): void {
        this.canvas.style.position = "absolute";
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
    }

    private callbackResize = () => {
        const ps = this.pixelSize > 0 ? this.pixelSize : window.devicePixelRatio;
        this.canvas.width = window.innerWidth*ps;
        this.canvas.height = window.innerHeight*ps;
        this.sendMessageToEntity("CanvasResize", {
            width: this.canvas.width,
            height: this.canvas.height,
            pixelSize: ps,
        });
    }

    onActivate(): void {
        window.addEventListener('resize', this.callbackResize, false);
    }

    onDeactivate(): void {
        window.addEventListener('resize', this.callbackResize, false);
    }

    onUpdate(elapsed: number): void {
        if (this.firstRun) {
            this.callbackResize()
            this.firstRun = false;
        }
    }
}

