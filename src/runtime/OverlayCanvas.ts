export class OverlayCanvas {

    private _canvas:HTMLCanvasElement;
    private _ctx:CanvasRenderingContext2D;
    private _parent:HTMLElement;
    private _gameCanvas:HTMLCanvasElement;

    constructor(gameCanvas:HTMLCanvasElement, width:number, height:number) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        this._ctx = ctx;
        this._canvas = canvas;
        this._parent = gameCanvas.parentNode as HTMLElement;
        this._parent.appendChild(canvas);
        canvas.style.pointerEvents = "none";
        canvas.style.position = "absolute";

        this._gameCanvas = gameCanvas;
        this.resize();
    }

    public resize() {
        const rect = this._gameCanvas.getBoundingClientRect();
        this._canvas.width = this._gameCanvas.width;
        this._canvas.height = this._gameCanvas.height;
        this._canvas.style.top = rect.y + "px";
        this._canvas.style.left = rect.x + "px";
        this._canvas.style.width = rect.width + "px";
        this._canvas.style.height = rect.height + "px";
    }

    public detach() {
        this._parent.removeChild(this._canvas);
    }

    public setPixelate(v:boolean):void {
        // @ts-ignore
        this._ctx.mozImageSmoothingEnabled = !v;
        // @ts-ignore
        this._ctx.webkitImageSmoothingEnabled = !v;
        this._ctx.imageSmoothingEnabled = !v;
    }

    public getRenderer():CanvasRenderingContext2D {
        return this._ctx;
    }

}