/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Component} from "@tsjs/entity/Component";
import {ContextState, EngineContext} from "@tsjs/engine/tt2d/EngineContext";
import {LUIManager} from "@tsjs/engine/lui/LUIManager";
import {GameRunner} from "@tsjs/runtime/GameRunner";
import {linkGlobal, prop} from "@tsjs/entity/decorate/ComponentDecorators";
import {Color} from "@tsjs/engine/tt2d/Color";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {LUILayer} from "@tsjs/engine/lui/elements/LUILayer";
import {RenderElement} from "@tsjs/engine/tt2d/RenderTree";
import {AffineMatrix} from "@tsjs/engine/tt2d/AffineMatrix";
import {LUIFreeStackLayout} from "@tsjs/engine/lui/layouts/LUIFreeStackLayout";
import {LUITreeRenderer} from "@tsjs/engine/lui/styles/LUITreeRenderer";


/**
 * ```ts
 * props:
 *
 * // true = UI/Game will be scaled
 * // false = 1 game pixel is 1 screen pixel
 * scaleToPixelSize:bool [default: true]
 * ```
 */
export class GraphicsEngine extends Component {

    //public canvas:HTMLCanvasElement;
    @prop('bool', true)
    public scaleToPixelSize:boolean;
    @linkGlobal()
    public engineContext:EngineContext;
    @linkGlobal()
    private canvas:HTMLCanvasElement;
    public frame:number = 0;
    //public clearColor:Color = Color.fromHash("#2a231f");
    @prop("color", "#f88")
    public clearColor:Color;

    public lui:LUIManager;
    public renderer:FatRenderer;
    private idMatrix:AffineMatrix = new AffineMatrix();
    private _guiBehind:LUILayer;
    private _game:RenderElement;
    private _gui:LUILayer;
    private _width:number = 1;
    private _height:number = 1;
    private _pixelSize:number = 1;
    private _rootMatrix:AffineMatrix = new AffineMatrix();

    private clientToGameX:number = 1;
    private clientToGameY:number = 1;
    private clientRect:DOMRect;
    private isMouseDown:boolean = false;
    private lastTouchX:number = 0;
    private lastTouchY:number = 0;

    private _debugZoom:number = 0;
    private _keyDown:Record<string, boolean> = {};


    public get debugZoom():number {
        return this._debugZoom;
    }

    /** Logical pixel width of the canvas */
    public get width():number {
        return this._width;
    }

    /** Logical pixel height of the canvas */
    public get height():number {
        return this._height
    }


    onInit(): void {
        this.renderer = FatRenderer.create(this.engineContext);
        this.renderer.retain();

        this.lui = new LUIManager();
        this.lui.setRootSize(this.width, this.height);

        const backLayer = this.lui.createLayer("guiBehind");
        backLayer.setContainerLayout(new LUIFreeStackLayout())
        this._guiBehind = backLayer;

        const gameLayer = this.lui.createLayer("game");
        gameLayer.setContainerLayout(new LUIFreeStackLayout())
        const gameStyle = new LUITreeRenderer();
        gameLayer.addStyleElement(gameStyle);
        this._game = gameStyle.root;
        //this._gameLayer = new GameLayer(this._game);

        const layer = this.lui.createLayer("gui");
        layer.setContainerLayout(new LUIFreeStackLayout())
        this._gui = layer;
        this.world.requestRenderEvents(this.entity);

        this.lui.addListener('message', messageInfo => {
            const {eventData, message, source} = messageInfo;
            this.world.sendMessage(message, eventData);
        });

        this.lui.addListener('key', ({key, isDown}) => {
            this._keyDown[key] = isDown;
        });
    }

    isKeyDown(key:string):boolean {
        return !!this._keyDown[key];
    }

    onMessage_CanvasResize({width, height, pixelSize}) {
        if (this.lui) {
            this._width = width;
            this._height = height;
            this.renderer.flush();
            this.engineContext.mainRenderTarget.onResize(width, height);
            if (pixelSize != 1 && this.scaleToPixelSize)
                this.lui.setRootSize(this.width/pixelSize, this.height/pixelSize);
            else
                this.lui.setRootSize(this.width, this.height);
            this.lui.updateLayout(true);
            this._rootMatrix.identity();
            if (pixelSize != 1 && this.scaleToPixelSize)
                this._rootMatrix.scale(pixelSize, pixelSize);
            this._pixelSize = pixelSize;
            this.calcClientToGameCoords();
        }
    }

    public get gui():LUILayer {
        return this._gui;
    }

    public get gameLayer():RenderElement {
        return this._game;
    }

    public get guiBehind():LUILayer {
        return this._guiBehind;
    }

    onActivate(): void {
        window.addEventListener("resize", this.handleWindowResize);
        this.registerInputEvents();
    }

    onDeactivate(): void {
        window.removeEventListener("reisze", this.handleWindowResize);
        this.unregisterInputEvents();
    }

    onDispose() {

    }

    onUpdate(elapsed: number): void {

    }

    public enableDebugZoom(zoom:number) {
        this._debugZoom = zoom;
    }

    public disableDebugZoom() {
        this._debugZoom = 0;
    }

    onMessage_DebugZoom(zoomVal) {
        if (zoomVal == -1) {
            this.disableDebugZoom();
        }
        else {
            this.enableDebugZoom(zoomVal)
        }
    }

    onRender(elasped:number):void {
        this.lui.updateLayout();

        /*
        if (this._debugZoom > 0) {
            const debugZoom = this._debugZoom;
            this._game.x = -this._camera.x * debugZoom - this._camera.centerOffsetX;
            this._game.y = -this._camera.y * debugZoom - this._camera.centerOffsetY;
            this._game.scale = debugZoom;
        }
        else {
            this._game.x = -this._camera.x * this.camera.zoom - this._camera.centerOffsetX;
            this._game.y = -this._camera.y * this.camera.zoom - this._camera.centerOffsetY;
            this._game.scale = this.camera.zoom;
        }
        */


        const gl = this.engineContext.gl as WebGLRenderingContext;
        this.engineContext.mainRenderTarget.apply();

        gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.renderer.animationElapsed = elasped;
        this.renderer.setRootMatrix(this._rootMatrix);
        this.renderer.numLastDrawCalls = 0;
        this.renderer.numLastElements = 0;
        this.lui.renderToCanvas(elasped, this.renderer)
        this.renderer.setRootMatrix(this.idMatrix);
    }


    private registerInputEvents() {
        const canvas = this.world.manager.globals.canvas as HTMLCanvasElement;
        const eventElement = canvas;

        this.calcClientToGameCoords();

        // mouse events
        eventElement.addEventListener("mousedown", this.handleMouseDown);
        eventElement.addEventListener("mouseup", this.handleMouseUp);
        eventElement.addEventListener("mouseleave", this.handleMouseLeave);
        eventElement.addEventListener("mousemove", this.handleMouseMove);
        eventElement.addEventListener("mouseout", this.handleMouseOut);

        // touch events
        eventElement.addEventListener("touchstart", this.handleTouchstart)
        eventElement.addEventListener("touchend", this.handleTouchend)
        eventElement.addEventListener("touchmove", this.handleTouchmove)

        // keys
        document.addEventListener('keydown', this.handleKeydown, true);
        document.addEventListener('keyup', this.handleKeyup, true);
    }

    private unregisterInputEvents() {
        const canvas = this.world.manager.globals.canvas as HTMLCanvasElement;
        const eventElement = canvas;

        // mouse events
        eventElement.removeEventListener("mousedown", this.handleMouseDown);
        eventElement.removeEventListener("mouseup", this.handleMouseUp);
        eventElement.removeEventListener("mouseleave", this.handleMouseLeave);
        eventElement.removeEventListener("mousemove", this.handleMouseMove);
        eventElement.removeEventListener("mouseout", this.handleMouseOut);

        // touch events
        eventElement.removeEventListener("touchstart", this.handleTouchstart)
        eventElement.removeEventListener("touchend", this.handleTouchend)
        eventElement.removeEventListener("touchmove", this.handleTouchmove)

        // keys
        document.removeEventListener('keydown', this.handleKeydown, true);
        document.removeEventListener('keyup', this.handleKeyup, true);
    }

    private handleKeydown = (k) => {
        // if (this.activeMessage)
        //     return;
        // TODO later we could do: ENTER => OKAY
        this.lui.handleKeyDown(k.key);
    };

    private handleKeyup = (k) => {
        // if (this.activeMessage)
        //     return;
        this.lui.handleKeyUp(k.key);
    };


    private calcClientToGameCoords() {
        //let rect = eventElement.getBoundingClientRect();
        const rect = this.canvas.getBoundingClientRect(); //eventElement.getBoundingClientRect();
        this.clientToGameX = 1 / rect.width * this.width / (this.scaleToPixelSize ? this._pixelSize : 1);
        this.clientToGameY = 1 / rect.height * this.height / (this.scaleToPixelSize ? this._pixelSize : 1);
        this.clientRect = rect;
    }

    private handleWindowResize = e => {
        this.calcClientToGameCoords();
    }

    private handleMouseDown = e => {
        e.preventDefault();
        //console.log("mousedown");
        if (e.buttons == 1)
            this.isMouseDown = true;
        if (this.isMouseDown) {
            const xx = this.clientToGameX * (e.clientX - this.clientRect.left);
            const yy = this.clientToGameY * (e.clientY - this.clientRect.top);
            this.onDown(xx, yy);
        }
    };

    private handleMouseMove = e => {
        e.preventDefault();
        if (this.isMouseDown) {
            const xx = this.clientToGameX * (e.clientX - this.clientRect.left);
            const yy = this.clientToGameY * (e.clientY - this.clientRect.top);
            this.onMove(xx, yy);
        }
    };

    private handleMouseUp = e => {
        e.preventDefault();

        if (this.isMouseDown) {
            const xx = this.clientToGameX * (e.clientX - this.clientRect.left);
            const yy = this.clientToGameY * (e.clientY - this.clientRect.top);
            this.onUp(xx, yy);
        }
        this.isMouseDown = false;
    };

    private handleMouseLeave = e => {
        e.preventDefault();
        if (this.isMouseDown) {
            const xx = this.clientToGameX * (e.clientX - this.clientRect.left);
            const yy = this.clientToGameY * (e.clientY - this.clientRect.top);
            this.onUp(xx, yy);
        }
        this.isMouseDown = false;
    };

    private handleMouseOut = e => {
        e.preventDefault();
        if (this.isMouseDown) {
            const xx = this.clientToGameX * (e.clientX - this.clientRect.left);
            const yy = this.clientToGameY * (e.clientY - this.clientRect.top);
            this.onUp(xx, yy);
        }
        this.isMouseDown = false;
    };

    private handleTouchstart = e => {
        e.preventDefault();

        //console.log("touchstart");

        const xx = this.clientToGameX * (e.touches[0].clientX - this.clientRect.left);
        const yy = this.clientToGameY * (e.touches[0].clientY - this.clientRect.top);
        this.lastTouchX = xx;
        this.lastTouchY = yy;
        this.onDown(xx, yy);
    };

    private handleTouchmove = e => {
        e.preventDefault();
        const xx = this.clientToGameX * (e.touches[0].clientX - this.clientRect.left);
        const yy = this.clientToGameY * (e.touches[0].clientY - this.clientRect.top);
        this.lastTouchX = xx;
        this.lastTouchY = yy;
        this.onMove(xx, yy);
    };

    private handleTouchend = e => {
        e.preventDefault();
        const xx = this.lastTouchX;
        const yy = this.lastTouchY;
        this.onUp(xx, yy);
    };

    private onDown(x:number, y:number) {
        if (this.renderer.engineContext.contextState == ContextState.Lost)
            return;

        //console.log("Down:", x, y);
        const consumed = this.lui.handleMouseDown(x, y);
    }

    private onMove(x:number, y:number) {
        if (this.renderer.engineContext.contextState == ContextState.Lost)
            return;

        //console.log("Move:", x, y);
        this.lui.handleMouseMove(x, y, true);
    }

    private onUp(x:number, y:number) {
        if (this.renderer.engineContext.contextState == ContextState.Lost)
            return;

        //console.log("Up:", x, y);
        const consumed = this.lui.handleMouseUp(x, y);
    }
}

