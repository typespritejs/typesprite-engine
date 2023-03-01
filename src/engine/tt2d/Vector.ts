/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 * 
 */
export class Vector2 {

    public x:number;
    public y:number;

    constructor(x:number=0, y:number=x) {
        this.x = x;
        this.y = y;
    }

    set(x:number, y:number):Vector2 {
        this.x = x;
        this.y = y;
        return this;
    }

    /** returns this */
    copyValues(other:Vector2):Vector2 {
        this.x = other.x;
        this.y = other.y;
        return this;
    }

    copy():Vector2 {
        return new Vector2(this.x, this.y);
    }

    /** inplace, returns this */
    subtract(other:Vector2):Vector2 {
        this.x = this.x - other.x;
        this.y = this.y - other.y;
        return this;
    }

    /** inplace, returns this */
    add(other:Vector2):Vector2 {
        this.x = this.x + other.x;
        this.y = this.y + other.y;
        return this;
    }

    /** inplace, returns this */
    addXY(x:number, y:number=x):Vector2 {
        this.x = this.x + x;
        this.y = this.y + y;
        return this;
    }

    /** inplace, returns this */
    subtractXY(x:number, y:number=x):Vector2 {
        this.x = this.x - x;
        this.y = this.y - y;
        return this;
    }

    /** inplace, returns this*/
    scale(v:number):Vector2 {
        this.x *= v;
        this.y *= v;
        return this;
    }

    length():number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    lengthIsBelow(distance:number):boolean {
        return (this.x*this.x + this.y*this.y) < distance*distance;
    }

}


export class Vector3 {

    constructor(
        public x: number = 0,
        public y: number = 0,
        public z: number = 0) {
    }

    copy():Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

}

export class Vector4 {

    constructor(
        public x: number = 0,
        public y: number = 0,
        public z: number = 0,
        public w: number = 1) {
    }

    copy():Vector4 {
        return new Vector4(this.x, this.y, this.z, this.w);
    }

}