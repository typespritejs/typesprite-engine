/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 * Based on easeljs Rectangle
 */
export class Rect {

    constructor(
        public x:number=0,
        public y:number=0,
        public width:number=0,
        public height:number=0
    ) {
    }

    get top():number {
        return this.y;
    }

    get left():number {
        return this.x;
    }

    get right():number {
        return this.x+this.width;
    }

    get bottom():number {
        return this.y+this.height;
    }

    get centerX():number {
        return this.x+this.width*0.5;
    }

    get centerY():number {
        return this.y+this.height*0.5;
    }

    get w():number {
        return this.width;
    }

    get h():number {
        return this.height;
    }

    setValues(x:number=0, y:number=0, width:number=0, height:number=0) {
        // don't forget to update docs in the constructor if these change:
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        return this;
    }

    extend(x:number, y:number, width:number=0, height:number=0) {
        if (x+width > this.x+this.width) { this.width = x+width-this.x; }
        if (y+height > this.y+this.height) { this.height = y+height-this.y; }
        if (x < this.x) { this.width += this.x-x; this.x = x; }
        if (y < this.y) { this.height += this.y-y; this.y = y; }
        return this;
    }

    pad(top:number, left:number, bottom, right:number) {
        this.x -= left;
        this.y -= top;
        this.width += left+right;
        this.height += top+bottom;
        return this;
    }

    copy(rectangle:Rect) {
        return this.setValues(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    }



    union(rect:Rect):Rect {
        return this.clone().extend(rect.x, rect.y, rect.width, rect.height);
    }

    intersection(rect:Rect):Rect {
        var x1 = rect.x, y1 = rect.y, x2 = x1+rect.width, y2 = y1+rect.height;
        if (this.x > x1) { x1 = this.x; }
        if (this.y > y1) { y1 = this.y; }
        if (this.x + this.width < x2) { x2 = this.x + this.width; }
        if (this.y + this.height < y2) { y2 = this.y + this.height; }
        return (x2 <= x1 || y2 <= y1) ? null : new Rect(x1, y1, x2-x1, y2-y1);
    }

    intersects(rect:Rect):boolean {
        return (rect.x <= this.x+this.width && this.x <= rect.x+rect.width && rect.y <= this.y+this.height && this.y <= rect.y + rect.height);
    }

    isEmpty():boolean {
        return this.width <= 0 || this.height <= 0;
    }

    clone():Rect {
        return new Rect(this.x, this.y, this.width, this.height);
    };

    /**
     * true if the other object is completely inside
     * the rectangle
     */
    containsRect(other:Rect):boolean {
        return (
            other.left >= this.x &&
            other.top >= this.y &&
            other.right <= this.right &&
            other.bottom <= this.bottom
        );
    }

    /**
     * true if the other object is completely inside
     * the rectangle
     */
    contains(x:number, y:number, width:number=0, height:number=0) {
        return (x >= this.x && x+width <= this.x+this.width && y >= this.y && y+height <= this.y+this.height);
    }

   
}


