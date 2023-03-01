import { Rect } from "./Rect";
import { RenderElement } from "./RenderTree";
import { SpriteSheetFrame } from "./SpriteSheet";


export class Tile {
    public frame:SpriteSheetFrame;
}

export enum TileRepeat {
    None,
    Repeat,
    RepeatWindow,
    RepeatCount,
}

export class TileLayer extends RenderElement {

    private _numX:number;
    private _numY:number;
    private _repeatX:TileRepeat = TileRepeat.None;
    private _repeatY:TileRepeat = TileRepeat.None;
    private _tiles:Tile[] = [];
    private _viewport:Rect = new Rect();
    private _tileWidth:number;
    private _tileHeight:number;
    private _dirtyViewport:number=0;

    constructor(
        numX:number,
        numY:number,
        tileWidth:number,
        tileHeight:number,
    ) {
        super();
        this._tiles.length = numX * numY;
        this._tileWidth = tileWidth;
        this._tileHeight = tileHeight;
        this._numX = numX;
        this._numY = numY;
    }

    public setViewport(x:number, y:number, width:number, height:number) {
        this._viewport.x = x;
        this._viewport.y = y;
        this._viewport.width = width;
        this._viewport.height = height;
        this._dirtyViewport++;
    }

    get width():number {
        return this._numX * this._tileWidth;
    }

    get height():number {
        return this._numY * this._tileHeight;
    }

    set width(v:number) {
        console.error("cannot set width of tilelayer. use setViewport to render subsets");
    }

    set height(v:number) {
        console.error("cannot set height of tilelayer. use setViewport to render subsets");
    }

    get tileCountX():number {
        return this._numX;
    }
    get tileCountY():number {
        return this._numY;
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

}



