/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Component} from "@tsjs/entity/Component";
import {LUIPos} from "@tsjs/engine/lui/LayoutUI";
import {GraphicsEngine} from "@tsjs/runtime/GraphicsEngine";
import {cmp, prop} from "@tsjs/entity/decorate/ComponentDecorators";
import {OverlayCanvas} from "@tsjs/runtime/OverlayCanvas";


/**
 *
 */
export class DebugUI extends Component {

    // static requires = {
    //     props:  {
    //         "withLabel": ["bool", true],
    //         "onlyLayer": ["string", ""],
    //         "pixelSize": ["number", 2]
    //     },
    //     cmps: [],
    //     res: function(props) {
    //     },
    //     children: function(props) {}
    // };


    @cmp('GraphicsEngine:typesprite')
    private gfx:GraphicsEngine;
    @prop('string', "")
    private onlyLayer:string;
    @prop('bool', true)
    private showLabels:boolean;
    @prop('string', "10px")
    private fontSize:string;


    // private _ctx:CanvasRenderingContext2D;
    private _onLayoutCb:any;
    private _lastMouse:LUIPos = new LUIPos();
    private handleKeys:any;
    private visible:boolean = false;
    private overlay:OverlayCanvas;

    onInit(): void {
        const canvas = this.gfx.appendOverlayCanvas()
        this.overlay = canvas;
        this._onLayoutCb = () => this.onLayout();
        this.handleKeys = ({key, isDown}) => {
            if (key == "d" && isDown) {
                this.setVisible(!this.visible);
            }
        };
        const visible = (window.sessionStorage.getItem("overlayVisible") || "false") == "true";
        this.setVisible(visible);
    }

    private setVisible(v:boolean) {
        this.visible = v;
        window.sessionStorage.setItem("overlayVisible", v ? "true": "false");
        this.overlay.getRenderer().canvas.style.display = this.visible ? '' : 'none';

        if (v)
            this.redrawOverlay()
    }

    onActivate(): void {
        this.gfx.lui.addListener('layout', this._onLayoutCb);
        this.gfx.lui.addListener('key', this.handleKeys);
    }

    onDeactivate(): void {
        this.gfx.lui.removeListener('layout', this._onLayoutCb);
        this.gfx.lui.removeListener('key', this.handleKeys);
    }


    // onMessage_DebugZoom(zoom:number) {
    //     if (zoom == -1) {
    //         this._zoomData.scale.x = 1;
    //         this._zoomData.scale.y = 1;
    //         this._zoomData.translate.x = 0;
    //         this._zoomData.translate.y = 0;
    //     }
    //     else {
    //         // this._zoomData.translate.x = (this.rootGraphics.widthWithBorder*0.5 - this.rootGraphics.widthWithBorder*0.5*zoom);
    //         // this._zoomData.translate.y = (this.rootGraphics.height*0.5 - this.rootGraphics.height*0.5*zoom);
    //         // this._zoomData.scale.x = zoom;
    //         // this._zoomData.scale.y = zoom;
    //     }
    //     this.redrawOverlay();
    // }

    private onLayout() {
        console.log("LUI onLayout");
        //this.pendingRender = 0.1;
        this.redrawOverlay();
    }


    private redrawOverlay() {
        const ctx = this.overlay.getRenderer();
        ctx.clearRect(-1, -1,ctx.canvas.width + 2,ctx.canvas.height + 2);
        ctx.font = `bold ${this.fontSize} Verdana`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.lineWidth = 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(this.gfx.actualPixelSize, this.gfx.actualPixelSize);
        for (let i=0; i<this.gfx.lui.getNumLayer(); i++) {
            if (this.onlyLayer && this.gfx.lui.getLayerAt(i).getName() != this.onlyLayer)
                continue;

            this.gfx.lui.getLayerAt(i).debugDraw(ctx, 0, this._lastMouse, this.showLabels);
        }
    }

}
