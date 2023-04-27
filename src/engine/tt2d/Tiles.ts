import {AffineMatrix} from "./AffineMatrix";
import {Color} from "./Color";
import {FatRenderer} from "./FatRenderer";
import {Rect} from "./Rect";
import {DirectRenderElement} from "./RenderTree";
import {SpriteSheetFrame} from "./SpriteSheet";
import {BlendMode} from "@tsjs/engine/tt2d/BlendMode";


export class Tile {
    public frame:SpriteSheetFrame;
    public flipX:boolean = false;
    public flipY:boolean = false;
    public flipDiag:boolean = false;
}

export enum TileRepeat {
    None,
    Repeat
}

export class TileLayer {
    private _numX:number;
    private _numY:number;
    private _tiles:(Tile|null)[] = [];
    private _tileWidth:number;
    private _tileHeight:number;

    constructor(
        numX:number,
        numY:number,
        tileWidth:number,
        tileHeight:number,
    ) {
        this._tiles.length = numX * numY;
        this._tileWidth = tileWidth;
        this._tileHeight = tileHeight;
        this._numX = numX;
        this._numY = numY;
    }

    setTile(x:number, y:number, t:Tile|null):this {
        const i = this.toTileIndex(x, y);
        if (i < 0 || i >= this._tiles.length) {
            console.error("Placed tiles out of bounds", {x, y, numX: this._numX, numY: this._numY});
            return;
        }
        this._tiles[i] = t;
        return this;
    }

    getTile(x:number, y:number):Tile|null {
        const i = this.toTileIndex(x, y);
        return this._tiles[i]||null;
    }

    getTileWithRepeatMode(
        x:number, 
        y:number, 
        repeatX:TileRepeat,
        repeatY:TileRepeat 
    ):Tile|null {
        const _x = this._indexWithRepeat(x, repeatX, this._numX);
        const _y = this._indexWithRepeat(y, repeatY, this._numY);
        const i = _x > -1 && _y > -1 ? this.toTileIndex(_x, _y) : -1;
        return this._tiles[i]||null;
    }

    private _indexWithRepeat(v:number, m:TileRepeat, num:number):number {
        switch(m) {
            case TileRepeat.Repeat: {
                const out = v % num;
                return out < 0 ? out + num : out;
            }
            default:
                return v < 0 || v >= num ? -1 : v;
        }
    }

    toTileIndex(x:number, y:number):number {
        return x + y*this._numX;
    }

    get width():number {
        return this._numX * this._tileWidth;
    }

    get height():number {
        return this._numY * this._tileHeight;
    }

    get tileWidth():number {
        return this._tileWidth;
    }

    get tileHeight():number {
        return this._tileHeight;
    }

    get tileCountX():number {
        return this._numX;
    }
    get tileCountY():number {
        return this._numY;
    }
}


export class TileLayerViewport {
    private _viewport:Rect = new Rect();
    private _repeatX:TileRepeat = TileRepeat.None;
    private _repeatY:TileRepeat = TileRepeat.None;

    public setViewport(x:number, y:number, width:number, height:number) {
        this._viewport.x = x;
        this._viewport.y = y;
        this._viewport.width = width;
        this._viewport.height = height;
    }

    get repeatX():TileRepeat {
        return this._repeatX;
    }
    set repeatX(v:TileRepeat) {
        this._repeatX = v;
    }

    set repeatY(v:TileRepeat) {
        this._repeatY = v;
    }
    get repeatY():TileRepeat {
        return this._repeatY;
    }

    getViewRect():Rect {
        return this._viewport;
    }
}

export class TileLayerElement extends DirectRenderElement {
    private _viewport:TileLayerViewport = new TileLayerViewport();
    private _layer:TileLayer|null = null;
    private _fillColor:Color = Color.White.copy();

    constructor() {
        super();
        this._viewport.setViewport(0, 0, 100, 100);
    }
    
    get viewport():TileLayerViewport {
        return this._viewport;
    }

    get layer():TileLayer|null {
        return this._layer;
    }

    set layer(v:TileLayer|null) {
        this._layer = v;
    }

    get fillColor():Color {
        return this._fillColor;
    }

    renderDirect(renderer: FatRenderer, parentMatrix: AffineMatrix) {
        if (!this._layer)
            return;

        renderTilesDirect(renderer, this._layer, this._viewport, this._fillColor);
    }
}



function renderTilesDirect(target:FatRenderer, layer:TileLayer, viewport:TileLayerViewport, fill:Color) {
    const vr = viewport.getViewRect();

    const tw = layer.tileWidth;
    const th = layer.tileHeight;
    let numX = Math.ceil(vr.width / tw) + 2;
    let numY = Math.ceil(vr.height / th) + 2;
    
    const six = Math.floor(vr.x / tw) - 1;
    const siy = Math.floor(vr.y / th) - 1;
    const sx = six * tw;
    const sy = siy * th;

    for (let y=0; y<numY; y++) {
        for (let x=0; x<numX; x++) {

            const xx = sx + x * tw;
            const yy = sy + y * th;
            const t = layer.getTileWithRepeatMode(six + x, siy+y, viewport.repeatX, viewport.repeatY);

            if (t && t.frame) {
                const srX = t.flipX ? t.frame.textureRect.x + t.frame.textureRect.w : t.frame.textureRect.x;
                const srY = t.flipY ? t.frame.textureRect.y + t.frame.textureRect.h : t.frame.textureRect.y;
                const srW = t.flipX ? -t.frame.textureRect.w : t.frame.textureRect.w;
                const srH = t.flipY ? -t.frame.textureRect.h : t.frame.textureRect.h;
                target.directDrawMix(
                    t.frame.texture,
                    srX,
                    srY,
                    srW,
                    srH,
                    xx, yy,
                    t.frame.textureRect.w,
                    t.frame.textureRect.h,
                    fill,
                    fill,
                    fill,
                    fill,
                    BlendMode.BM_NORMAL,
                    t.flipDiag
                );
            }
        }
    }
}



