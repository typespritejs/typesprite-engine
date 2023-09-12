/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Component} from "@tsjs/entity/Component";
import {ContextState, EngineContext} from "@tsjs/engine/tt2d/EngineContext";
import {LUIManager} from "@tsjs/engine/lui/LUIManager";
import {linkGlobal, prop} from "@tsjs/entity/decorate/ComponentDecorators";
import {Color} from "@tsjs/engine/tt2d/Color";
import {FatRenderer} from "@tsjs/engine/tt2d/FatRenderer";
import {LUILayer} from "@tsjs/engine/lui/elements/LUILayer";
import {RenderElement} from "@tsjs/engine/tt2d/RenderTree";
import {AffineMatrix} from "@tsjs/engine/tt2d/AffineMatrix";
import {LUIFreeStackLayout} from "@tsjs/engine/lui/layouts/LUIFreeStackLayout";
import {LUITreeRenderer} from "@tsjs/engine/lui/styles/LUITreeRenderer";
import {OverlayCanvas} from "@tsjs/runtime/OverlayCanvas";
import {World, WorldState} from "@tsjs/entity/World";


/**
 * ## GraphicsEngine-Component
 *
 * This component will do the following tasks for you:
 *
 *  - manage a FatRenderer instance
 *  - manage a LUIManager instance
 *  - manage the canvas (HTMLCanvasElement)
 *  - manages touch/mouse input
 *  - observes keyboard-input (keyDown, keyUp etc.)
 *
 * You use this to:
 *  - add graphics objects to the world
 *  - add UI elements to the GUI
 *  - configure how your canvas get's scaled (or tell it that you like to do that yourself)
 *
 *
 * # EDF properties:
 * ```
 * [prop] clearColor:color = "#f88"  // Very basic BG color
 * [prop] pixelSize:number = 0       // size of pixels
 *                                   // 0 = hiDPI support (uses window.devicePixelRatio)
 *                                   // 1 = 1 pixel in your game is 1 pixel on your monitor
 *                                   // 2 = 1 pixel in your game is 2 pixels on your monitor
 *                                   // ... = etc
 * [prop] scaleMode:string = "scale" // scale: canvas will consume 100% size of the body and auto resize
 *                                   // fixed: canvas retains the size configured and auto resize
 *                                   // none:  canvas remains untouched here.
 *                                   //        Useful if you like to implment your own rescale/canvas
 *                                   //        management but still use this class.
 *                                   //        To get access to the canvas use: @linkGlobal() canvas:HTMLCanvasElement;
 * [prop] uiEventWorlds:string = ""  // A list of the worlds that shall receive the UI events.
 *                                   // Per default all worlds receive all UI-Events (like onMessage_ButtonPressed).
 *                                   // Put this e.g. to "core, level" would mean only the worlds "core" and "level"
 *                                   // would receive the events.
 * ```
 *
 * @see FatRenderer
 * @see LUIManager
 */
export class GraphicsEngine extends Component {

    @linkGlobal()
    public engineContext:EngineContext;
    @linkGlobal()
    private canvas:HTMLCanvasElement;
    public frame:number = 0;
    //public clearColor:Color = Color.fromHash("#2a231f");
    @prop("color", "#f88")
    public clearColor:Color;
    @prop('number', 0)
    private pixelSize:number;
    @prop('string', "scale", {allow: ["scale", "fixed", "none"]})
    private scaleMode:string;
    @prop('string', "")
    private uiEventWorlds:string;
    private _pixelSize:number;

    public lui:LUIManager;
    public renderer:FatRenderer;
    private idMatrix:AffineMatrix = new AffineMatrix();
    private _guiBehind:LUILayer;
    private _game:RenderElement;
    private _gui:LUILayer;
    private _width:number = 1;
    private _height:number = 1;
    private _rootMatrix:AffineMatrix = new AffineMatrix();
    private _overlayCanvasList:OverlayCanvas[] = [];

    private clientToGameX:number = 1;
    private clientToGameY:number = 1;
    private clientRect:DOMRect;
    private isMouseDown:boolean = false;
    private lastTouchX:number = 0;
    private lastTouchY:number = 0;

    private _debugZoom:number = 0;
    private _keyDown:Record<string, boolean> = {};

    private uiEventTargetWorlds:World[] = [];


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

        if (this.uiEventWorlds) {
            this.uiEventTargetWorlds = this.uiEventWorlds.split(',')
                .map(e => e.trim())
                .filter(e => e)
                .map(e => this.world.manager.getWorldByName(e))
                .filter(w => w ? true : false)
            ;
        }
        else {
            for (let i=0; i<this.world.manager.getNumWorlds(); i++)
                this.uiEventTargetWorlds.push(this.world.manager.getWorldByIndex(i));
        }
        console.log("GraphicsEngine::uiEventWorlds => ", JSON.stringify(this.uiEventTargetWorlds.map(e => e.name)));

        this.lui.addListener('message', messageInfo => {
            const {eventData, message, source} = messageInfo;
            if (this.uiEventTargetWorlds) {
                for (const world of this.uiEventTargetWorlds) {
                    if (world.getState() == WorldState.Populated)
                        world.sendMessage(message, eventData);
                }
            }
        });

        this.lui.addListener('key', ({key, isDown}) => {
            this._keyDown[key] = isDown;
        });

        this._pixelSize = this.pixelSize > 0 ? this.pixelSize : window.devicePixelRatio;
        if (this.scaleMode == "scale") {
            this.canvas.style.position = "absolute";
            this.canvas.style.width = "100%";
            this.canvas.style.height = "100%";
            // const ps = this.pixelSize > 0 ? this.pixelSize : window.devicePixelRatio;
            this.canvas.width = window.innerWidth*this.actualPixelSize;
            this.canvas.height = window.innerHeight*this.actualPixelSize;
        }
        else if (this.scaleMode == "fixed") {
            const originalWidth = this.canvas.width;
            const originalHeight = this.canvas.height;
            this.canvas.style.width = `${originalWidth}px`;
            this.canvas.style.height = `${originalHeight}px`;
            this.canvas.width = originalWidth * this.actualPixelSize;
            this.canvas.height = originalHeight * this.actualPixelSize;
        }
        else if (this.scaleMode == "none") {
            this._pixelSize = this.pixelSize > 0 ? this.pixelSize : 1;
        }

        this.windowResize();
    }

    /**
     * This is the pixel size the GraphicEngine is using.
     * It is either window.devicePixelRatio or overwritten by the config.
     */
    get actualPixelSize():number {
        return this._pixelSize;
    }

    isKeyDown(key:string):boolean {
        return !!this._keyDown[key];
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
        this.renderer.releaseLater();
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
        // this.clientToGameX = 1 / rect.width * this.width / (this.scaleToPixelSize ? this._pixelSize : 1);
        // this.clientToGameY = 1 / rect.height * this.height / (this.scaleToPixelSize ? this._pixelSize : 1);
        this.clientToGameX = 1 / rect.width * this.width;
        this.clientToGameY = 1 / rect.height * this.height;
        this.clientRect = rect;
    }

    private handleWindowResize = e => {
        this._overlayCanvasList.forEach(c => c.resize())
        this.windowResize();
        this.calcClientToGameCoords();


        this.world.sendMessage("CanvasResize", {
            width: this.canvas.width/this.actualPixelSize,
            height: this.canvas.height/this.actualPixelSize,
            bufferWidth: this.canvas.width,
            bufferHeight: this.canvas.height,
            pixelSize: this.actualPixelSize,
        });
    }

    private windowResize() {
        if (this.scaleMode == "scale") {
            this.canvas.width = window.innerWidth*this.actualPixelSize;
            this.canvas.height = window.innerHeight*this.actualPixelSize;
        }

        const width = this.canvas.width/this.actualPixelSize;
        const height = this.canvas.height/this.actualPixelSize;
        const bufferWidth = this.canvas.width;
        const bufferHeight = this.canvas.height;

        this._width = width;
        this._height = height;
        this.renderer.flush();
        this.engineContext.mainRenderTarget.onResize(bufferWidth, bufferHeight);

        if (this.lui) {
            this.lui.setRootSize(this.width, this.height);
            this.lui.updateLayout(true);
            this._rootMatrix.identity();
            this._rootMatrix.scale(this.actualPixelSize, this.actualPixelSize);
            this.calcClientToGameCoords();
        }
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
        const consumed = this.lui.handleMouseDown(x, y);
    }

    private onMove(x:number, y:number) {
        if (this.renderer.engineContext.contextState == ContextState.Lost)
            return;
        this.lui.handleMouseMove(x, y, true);
    }

    private onUp(x:number, y:number) {
        if (this.renderer.engineContext.contextState == ContextState.Lost)
            return;
        const consumed = this.lui.handleMouseUp(x, y);
    }

    appendOverlayCanvas(factor:number=1):OverlayCanvas {
        const overlay = new OverlayCanvas(
            this.canvas,
            this.canvas.width,
            this.canvas.height,
        );
        this._overlayCanvasList.push(overlay);
        return overlay;
    }
}



