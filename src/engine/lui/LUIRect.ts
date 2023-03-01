/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
export class LUIRect {
    private _x:number = 0;
    private _y:number = 0;
    private _w:number = 0;
    private _h:number = 0;

    public getX() {
        return this._x
    }
    public getY() {
        return this._y
    }
    public getWidth() {
        return this._w
    }
    public getHeight() {
        return this._h
    }

    public contains(x:number, y:number):boolean {
        return (
            x >= this.getX() &&
            y >= this.getY() &&
            x <= this.getRight() &&
            y <= this.getBottom()
        );
    }

    public getCenterX() {
        return this._x + this._w*0.5;
    }
    public getCenterY() {
        return this._y + this._h*0.5;
    }

    public getBottom() {
        return this._y + this._h;
    }

    public getLeft() {
        return this._x;
    }

    public getTop() {
        return this._y;
    }

    public getRight() {
        return this._x + this._w;
    }

    public setX(v:number):LUIRect {
        this._x = v;
        return this;
    }
    public setY(v:number):LUIRect {
        this._y = v;
        return this;
    }
    public setWidth(v:number):LUIRect {
        this._w = v;
        return this;
    }
    public setHeight(v:number):LUIRect {
        this._h = v;
        return this;
    }

    public set(x:number, y:number, w:number, h:number):LUIRect {
        this._x = x;
        this._y = y;
        this._w = w;
        this._h = h;
        return this;
    }

    public setAll(v:number):LUIRect {
        this._x = v;
        this._y = v;
        this._w = v;
        this._h = v;
        return this;
    }

    public setSize(w:number, h?:number):LUIRect {
        this._w = w;
        this._h = h||w;
        return this;
    }

    public setValues(other:LUIRect):LUIRect {
        this._x = other._x;
        this._y = other._y;
        this._w = other._w;
        this._h = other._h;
        return this;
    }
}