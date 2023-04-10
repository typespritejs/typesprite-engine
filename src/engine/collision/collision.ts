/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 *
 * Thanks to https://www.jeffreythompson.org/collision-detection/line-rect.php
 * for the collision functions.
 */
import {Color} from "@tsjs/engine/tt2d/Color";



/**
 * A manager to efficiently detect object-intersections in 2D.
 *
 * Usage looks like this:
 * ```ts
 * const collision = new CollisionEngine();
 *
 * // add static collider
 * collision.addCollider(Collider.createStatic().addShape(new CollisionCircle().setValues(310, 310, 100)));
 * // add dyanmic collider
 * collision.addCollider(Collider.createDynamic().addShape(new CollisionLine().setValues(310, 310, 500, 310)));
 *
 * // scan for collision
 * const scanRect = new CollisionRect(0, 0, 100, 50);
 * const contacts = collision.scan(scanRect);
 * ```
 *
 * Instances of CollisionContact are part of object pooling. Please check
 * CollisionContact docs for details.
 *
 *
 * @see CollisionContact
 */
export class CollisionEngine {
    private dynamicCollider:Collider[] = [];
    private staticColliders:QuadTree = new QuadTree();
    private _tmpCollectors:Collider[] = [];
    private _debugDrawer:CollisionEngineDebugDrawerImpl|null = null;

    private _poolContact:CollisionContact[] = [];
    private _poolContactsUsed:number = 0;

    public statisticCountChecks:number = 0;
    public debugDrawOptions:DebugSettings =
        DebugSettings.Recents
    ;

    public static getLayerByIndex(index:number=0):CollisionLayer {
        return 1 << index;
    }

    public addCollider(c:Collider):Collider {
        const isStatic = (c as any)._isStatic;
        if (!isStatic)
            this.dynamicCollider.push(c);
        else
            this.staticColliders.addElement(c);
        return c;
    }

    public removeCollider(c:Collider):void {
        if (this.staticColliders.removeElement(c))
            return;
        for (let i=0; i<this.dynamicCollider.length; i++) {
            if (this.dynamicCollider[i] === c) {
                this.dynamicCollider.splice(i, 1);
                break;
            }
        }
    }

    public setDebugDrawer(enabled:boolean):CollisionEngine {
        if (!enabled) {
            this._debugDrawer = null;
        }
        else {
            this._debugDrawer = this._debugDrawer ? this._debugDrawer : new CollisionEngineDebugDrawerImpl(this);
        }
        return this;
    }

    public setDebugSetting(s:DebugSettings, enable:boolean) {
        this.debugDrawOptions = enable ? this.debugDrawOptions | s : this.debugDrawOptions & ~s;
    }

    public debugDraw(dd:CollisionEngineDebugDrawer) {
        if (this._debugDrawer)
            this._debugDrawer.debugDraw(dd, this.debugDrawOptions);
    }

    private takeFromContactPool():CollisionContact {
        if (this._poolContactsUsed >= this._poolContact.length) {
            const c = new CollisionContact();
            this._poolContactsUsed++;
            this._poolContact.push(c);
            return c;
        }
        else {
            const c = this._poolContact[this._poolContactsUsed]
            this._poolContactsUsed++;
            return c;
        }
    }

    private resetContactPool() {
        while(this._poolContactsUsed > 0) {
            this._poolContactsUsed--;
            this._poolContact[this._poolContactsUsed].reset();
        }
    }

    public scan(scanner:CollisionShape, layerMask:number=CollisionLayer.All, out:CollisionContact[]=[]):CollisionContact[] {
        this.resetContactPool();
        this._tmpCollectors.length = 0;
        this.statisticCountChecks = 0;
        this.staticColliders.queryElements(scanner, this._tmpCollectors);
        this.statisticCountChecks += this.staticColliders.measureChecks;

        for (const c of this._tmpCollectors) {
            if (!c.enabled)
                continue;
            if (!(c.writesOnLayerMask & layerMask))
                continue;

            this.statisticCountChecks++;
            if (!check(scanner, c.bounds))
                continue;
            let foundColl = false;
            for (const s of (c as any)._shapes) {
                this.statisticCountChecks++;
                if (check(scanner, s)) {
                    if (!foundColl) {
                        foundColl = true;
                        if (this._debugDrawer)
                            this._debugDrawer.recentColCollider.add(c);
                        //out.push(c);
                        const contact = this.takeFromContactPool();
                        contact.scan = null;
                        contact.collisionShape = scanner;
                        contact.collision = c;
                        contact.collisionShape = s;
                        const startIndex = contact.contactPoints.length;
                        contact.contactPoints.length += contacts.length;
                        for (let i=0; i<contacts.length; i++) {
                            contact.contactPoints[startIndex + i] = contacts[i];
                        }
                        out.push(contact);
                    }
                    if (this._debugDrawer) {
                        this._debugDrawer.recentColShape.add(s);
                    }
                    else {
                        break;
                    }
                }
            }
        }

        for (const c of this.dynamicCollider) {
            if (!c.enabled)
                continue;
            if (!(c.writesOnLayerMask & layerMask))
                continue;
            this.statisticCountChecks++;
            if (!check(scanner, c.bounds))
                continue;
            let foundColl = false;
            for (const s of (c as any)._shapes) {
                this.statisticCountChecks++;
                if (check(scanner, s)) {
                    if (!foundColl) {
                        foundColl = true;
                        if (this._debugDrawer)
                            this._debugDrawer.recentColCollider.add(c);
                        const contact = this.takeFromContactPool();
                        contact.scan = null;
                        contact.collisionShape = scanner;
                        contact.collision = c;
                        contact.collisionShape = s;
                        const startIndex = contact.contactPoints.length;
                        contact.contactPoints.length += contacts.length;
                        for (let i=0; i<contacts.length; i++) {
                            contact.contactPoints[startIndex + i] = contacts[i];
                        }
                        out.push(contact);
                    }
                    if (this._debugDrawer) {
                        this._debugDrawer.recentColShape.add(s);
                    }
                    else {
                        break;
                    }
                }
            }
        }
        if (this._debugDrawer) {
            const target = out.length > 0 ? this._debugDrawer.recentScannerCol : this._debugDrawer.recentScanner;
            target.add(scanner.copy());
        }
        return out;
    }
}

// ---------------------------------------------------------------------------------------------------

/**
 * Object that contains the details about a contact.
 *
 * ## 🔥 Careful
 *
 * Values of this instance change with every call to `scan(...)`
 * so it's not meant for you to keep.
 *
 * CollisionContact objects are part of an internal object pooling. This is a measure to reduce
 * the pressure on the garbage collector.
 *
 * ```ts
 * const contactsA = collision.scan(myScanShape);       // 1st scan
 * const contactsA_copy = contacts.map(c => c.copy());  // copy for later use
 * const contactsB = collision.scan(myScanShape);       // 2nd scan
 *
 * console.log(contactsA);      // <- BAD! Random data because of 2nd scan
 * console.log(contactsA_copy); // <- OK!
 * console.log(contactsB);      // <- OK, because it's data from the last scan
 * ```
 *
 */
export class CollisionContact {
    public scan:Collider|null = null;
    public scanShape:CollisionShape|null = null;
    public collision:Collider|null = null;
    public collisionShape:CollisionShape|null = null;
    /**
     * contact points encoded
     *
     * length: 2 = x,y
     * length: 4 = x1,y1 x2,y2
     */
    public contactPoints:number[] = [];

    public reset() {
        this.scan = null;
        this.scanShape = null;
        this.collision = null;
        this.collisionShape = null;
        this.contactPoints.length = 0;
    }

    /**
     * Use this if you like to retain the contact information longer than the next scan
     */
    public copy():CollisionContact {
        const out = new CollisionContact()
        out.scan = this.scan;
        out.scanShape = this.scanShape;
        out.collision = this.collision;
        out.collisionShape = this.collisionShape;
        out.contactPoints = [...this.contactPoints];
        return out;
    }
}

// ---------------------------------------------------------------------------------------------------

/**
 * Object for collision detection.
 */
export class Collider {
    public enabled:boolean = true;
    public name:string = "";
    public userObject:any = null;

    private _shapes:CollisionShape[] = [];
    private _dirty:number = 0;
    private _bounds:CollisionRect|null = null;
    private _quadNode:QuadTreeNode|null = null;
    private _quadTree:QuadTree|null = null;

    private constructor(
        private _isStatic:boolean,
        public writesOnLayerMask:number,
    ) {
    }

    /**
     * Creates a collider object that never moves
     */
    public static createStatic(writesOnLayerMask:number=CollisionLayer.All):Collider {
        const out = new Collider(true, writesOnLayerMask);
        return out;
    }

    /**
     * Creates a collider that moves
     */
    public static createDynamic(writesOnLayerMask:number=CollisionLayer.All):Collider {
        const out = new Collider(false, writesOnLayerMask);
        return out;
    }

    public addShape(shape:CollisionShape):Collider {
        this._shapes.push(shape)
        this._dirty++;
        return this;
    }

    public getShapeAt(i:number):CollisionShape|undefined {
        return this._shapes[i];
    }

    public get numShapes():number {
        return this._shapes.length;
    }

    public removeShapeAt(i:number):CollisionShape|undefined {
        const r = this._shapes.splice(i, 1);
        this._dirty++;
        return r && r.length > 0 ? r[0] : null;
    }

    public removeAllShapes() {
        this._dirty++;
        this._shapes.length = 0;
    }

    public get bounds():CollisionRect|null {
        if (!this._bounds || this._dirty)
            this.updateBounds();
        return this._bounds;
    }

    public updateBounds() {
        this._bounds = this._bounds || new CollisionRect();
        const b = this._bounds;
        let first = true;
        for (const s of this._shapes) {
            if (first) {
                b.x = s.left;
                b.y = s.top;
                b.w = s.right - s.left;
                b.h = s.bottom - s.top;
                first = false;
            }
            else {
                b.enclosePoint(s.left, s.top);
                b.enclosePoint(s.right, s.bottom);
            }
        }
        if (first)
            this._bounds = null;
        this._dirty = 0;
    }

}

// -------------------------------------------------------------------------------------

function check(a:CollisionShape, b:CollisionShape):boolean {
    if (contacts.length > 0)
        contacts.length = 0;
    switch(a.shapeType) {
        case ShapeType.Rect:
            switch(b.shapeType) {
                case ShapeType.Rect:
                    return checkRectVsRect(a as CollisionRect, b as CollisionRect);
                case ShapeType.Circle:
                    return checkCircleVsRect(b as CollisionCircle, a as CollisionRect);
                case ShapeType.Line:
                    return rectIntersectsWithLine(a as CollisionRect, b as CollisionLine);
                case ShapeType.Point:
                    return pointInRect(a as CollisionRect, b as CollisionPoint);
            }
            return false;
        case ShapeType.Circle:
            switch(b.shapeType) {
                case ShapeType.Rect:
                    return checkCircleVsRect(a as CollisionCircle, b as CollisionRect);
                case ShapeType.Circle:
                    return checkCircleVsCircle(a as CollisionCircle, b as CollisionCircle);
                case ShapeType.Line:
                    return circleIntersectsWithLine(a as CollisionCircle, b as CollisionLine);
                case ShapeType.Point:
                    return pointInCircle(a as CollisionCircle, b as CollisionPoint);
            }
            return false;
        case ShapeType.Line:
            switch(b.shapeType) {
                case ShapeType.Rect:
                    return rectIntersectsWithLine(b as CollisionRect, a as CollisionLine);
                case ShapeType.Circle:
                    return circleIntersectsWithLine(b as CollisionCircle, a as CollisionLine);
                case ShapeType.Line:
                    return lineIntersectsWithLine(a as CollisionLine, b as CollisionLine);
                case ShapeType.Point:
                    return pointInLine(b as CollisionPoint, a as CollisionLine);
            }
            return false;
        case ShapeType.Point:
            switch(b.shapeType) {
                case ShapeType.Rect:
                    return pointInRect(b as CollisionRect, a as CollisionPoint);
                case ShapeType.Circle:
                    return pointInCircle(b as CollisionCircle, a as CollisionPoint);
                case ShapeType.Line:
                    return pointInLine(a as CollisionPoint, b as CollisionLine)
                case ShapeType.Point:
                    return false; // do this?
            }
            return false;
    }
    return false;
}

// ---------------------------------------------------------------------------------------------------

function checkCircleVsCircle(c1:CollisionCircle, c2:CollisionCircle):boolean {
    // get distance between the circle's centers
    // use the Pythagorean Theorem to compute the distance
    const distX = c1.x - c2.x;
    const distY = c1.y - c2.y;
    const distance = Math.sqrt((distX*distX) + (distY*distY))

    // if the distance is less than the sum of the circle's
    // radii, the circles are touching!
    if (distance <= c1.radius+c2.radius) {
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------------------------------

function checkRectVsRect(r1:CollisionRect, r2:CollisionRect):boolean {
    if (r1.x + r1.w >= r2.x &&    // r1 right edge past r2 left
        r1.x <= r2.x + r2.w &&    // r1 left edge past r2 right
        r1.y + r1.h >= r2.y &&    // r1 top edge past r2 bottom
        r1.y <= r2.y + r2.h) {    // r1 bottom edge past r2 top
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------------------------------

function checkCircleVsRect(c:CollisionCircle, r:CollisionRect):boolean {

    // temporary variables to set edges for testing
    let testX = c.x;
    let testY = c.y;

    // which edge is closest?
    if (c.x < r.x)         testX = r.x;      // test left edge
    else if (c.x > r.x+r.w) testX = r.x+r.w;   // right edge
    if (c.y < r.y)         testY = r.y;      // top edge
    else if (c.y > r.y+r.h) testY = r.y+r.h;   // bottom edge

    // get distance from closest edges
    const distX = c.x-testX;
    const distY = c.y-testY;
    const distanceSq = (distX*distX) + (distY*distY) ;

    // if the distance is less than the radius, collision!
    if (distanceSq <= c.radius*c.radius) {
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------------------------------

function pointInRect(r:CollisionRect, p:CollisionPoint):boolean {
    if (p.x >= r.x && p.x <= r.x + r.w &&
        p.y >= r.y && p.y <= r.y + r.h)
        return true;
    return false;
}

// ---------------------------------------------------------------------------------------------------

function pointInCircle(c:CollisionCircle, p:CollisionPoint):boolean {
    const xx = c.x - p.x;
    const yy = c.y - p.y;
    return (xx*xx + yy*yy <= c.radius*c.radius)
}

// ---------------------------------------------------------------------------------------------------

function dist(x1:number, y1:number, x2:number, y2:number) {
    const distX = x1 - x2;
    const distY = y1 - y2;
    return Math.sqrt( (distX*distX) + (distY*distY) );
}

// ---------------------------------------------------------------------------------------------------

function pointInLine(p:CollisionPoint, l:CollisionLine, buffer = 0.1):boolean {
    // get distance from the point to the two ends of the line
    const d1 = dist(p.x,p.y, l.x,l.y);
    const d2 = dist(p.x,p.y, l.x2,l.y2);

    // get the length of the line
    const lineLen = dist(l.x, l.y, l.x2, l.y2);

    // since floats are so minutely accurate, add
    // a little buffer zone that will give collision
    //   const ;    // higher # = less accurate

    // if the two distances are equal to the line's
    // length, the point is on the line!
    // note we use the buffer here to give a range,
    // rather than one #
    if (d1+d2 >= lineLen-buffer && d1+d2 <= lineLen+buffer) {
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------------------------------

function circleIntersectsWithLine(c:CollisionCircle, l:CollisionLine):boolean {

    // is either end INSIDE the circle?
    // if so, return true immediately
    p.x = l.x;
    p.y = l.y;
    if (pointInCircle(c, p))
        return true;
    p.x = l.x2;
    p.y = l.y2;
    if (pointInCircle(c, p))
        return true;

    const len = dist(l.x, l.y, l.x2, l.y2);

    // get dot product of the line and circle
    // loat dot = ( ((cx-x1)*(x2-x1)) + ((cy-y1)*(y2-y1)) ) / pow(len,2);
    const dot = ( ((c.x-l.x)*(l.x2-l.x)) + ((c.y-l.y)*(l.y2-l.y)) ) / Math.pow(len,2);

    // find the closest point on the line
    const closestX = l.x + (dot * (l.x2-l.x));
    const closestY = l.y + (dot * (l.y2-l.y));

    // is this point actually on the line segment?
    // if so keep going, but if not, return false
    p.x = closestX;
    p.y = closestY;
    const onSegment = pointInLine(p, l);
    if (!onSegment)
        return false;

    // get distance to closest point
    const distX = closestX - c.x;
    const distY = closestY - c.y;
    const distanceSquared = (distX*distX) + (distY*distY) //Math.sqrt( (distX*distX) + (distY*distY) );
    if (distanceSquared <= c.radius*c.radius) {
        // contacts.length += 2;
        // contacts[contacts.length-2] = closestX;
        // contacts[contacts.length-1] = closestY;
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------------------------------

function rectIntersectsWithLine(a:CollisionRect, b:CollisionLine):boolean {
    // p.x = b.x;
    // p.y = b.y;
    // if (pointInRect(a, p))
    //     return true;
    // p.x = b.x2;
    // p.y = b.y2;
    // if (pointInRect(a, p))
    //     return true;
    return  lineIntersectsWithLineBold(b.x, b.y, b.x2, b.y2,   a.x,       a.y,         a.x + a.w, a.y) ||       // top
        lineIntersectsWithLineBold(b.x, b.y, b.x2, b.y2,   a.x,       a.y,         a.x,       a.y + a.h) || // left
        lineIntersectsWithLineBold(b.x, b.y, b.x2, b.y2,   a.x + a.w, a.y,         a.x + a.w, a.y + a.h) || // right
        lineIntersectsWithLineBold(b.x, b.y, b.x2, b.y2,   a.x,       a.y + a.h,   a.x + a.w, a.y + a.h)    // bottom
        ;
}

// ---------------------------------------------------------------------------------------------------

function lineIntersectsWithLine(a:CollisionLine, b:CollisionLine):boolean {
    const x1 = a.x;
    const y1 = a.y;
    const x2 = a.x2;
    const y2 = a.y2;
    const x3 = b.x;
    const y3 = b.y;
    const x4 = b.x2;
    const y4 = b.y2;
    return lineIntersectsWithLineBold(
        x1, y1,
        x2, y2,
        x3, y3,
        x4, y4,
    );
}

// ---------------------------------------------------------------------------------------------------

function lineIntersectsWithLineBold(
    x1:number, y1:number,
    x2:number, y2:number,
    x3:number, y3:number,
    x4:number, y4:number,
):boolean {
    // source:  https://www.jeffreythompson.org/collision-detection/line-rect.php
    // calculate the direction of the lines
    const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    // if uA and uB are between 0-1, lines are colliding
    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
        const intersectionX = x1 + (uA * (x2-x1));
        const intersectionY = y1 + (uA * (y2-y1));
        contacts.length += 2;
        contacts[contacts.length-2] = intersectionX;
        contacts[contacts.length-1] = intersectionY;
        return true;
    }
    return false;
}


/**
 *
 */
export enum DebugSettings {
    None = 0,
    DynamicCollider     = 1 << 0,
    StaticCollider      = 1 << 1,
    QuadTreeGrid        = 1 << 2,
    Recents             = 1 << 3,
    ShapeBoundingBox    = 1 << 4,
    All                 = ~(~0 << 31)
}

export enum CollisionLayer {
    All = ~(~0 << 31),
    None = 0,
    Layer = 1 << 0,
}


enum ShapeType {
    Point,
    Line,
    Circle,
    Rect
}

export abstract class CollisionShape {
    public x:number = 0;
    public y:number = 0;

    get shapeType():ShapeType {
        return ShapeType.Point;
    }

    copy():CollisionShape {
        return null;
    }

    get left()  {
        return this.x;
    }
    get top()  {
        return this.y;
    }
    get right()  {
        return this.x;
    }
    get bottom()  {
        return this.y;
    }
}

// ---------------------------------------------------------------------------------------------------

export class CollisionPoint extends CollisionShape {

    copy():CollisionPoint {
        return new CollisionPoint().setValues(this.x, this.y);
    }

    setValues(x:number, y:number):this {
        this.x = x;
        this.y = y;
        return this
    }
}

// ---------------------------------------------------------------------------------------------------

export class CollisionLine extends CollisionShape {
    public x2:number = 0;
    public y2:number = 0;

    setValues(x:number, y:number, x2:number, y2:number):this {
        this.x = x;
        this.y = y;
        this.x2 = x2;
        this.y2 = y2;
        return this
    }

    copy():CollisionLine {
        return new CollisionLine().setValues(this.x, this.y, this.x2, this.y2);
    }

    get shapeType():ShapeType {
        return ShapeType.Line;
    }

    get left()  {
        return this.x < this.x2 ? this.x : this.x2;
    }
    get top()  {
        return this.y < this.y2 ? this.y : this.y2;
    }
    get right()  {
        return this.x > this.x2 ? this.x : this.x2;
    }
    get bottom()  {
        return this.y > this.y2 ? this.y : this.y2;
    }
}

// ---------------------------------------------------------------------------------------------------

export class CollisionCircle extends CollisionShape {
    public radius:number = 0;

    get shapeType():ShapeType {
        return ShapeType.Circle;
    }

    setValues(x:number, y:number, r:number):this {
        this.x = x;
        this.y = y;
        this.radius = r;
        return this
    }

    copy():CollisionCircle {
        return new CollisionCircle().setValues(this.x, this.y, this.radius);
    }

    get left()  {
        return this.x - this.radius;
    }
    get top()  {
        return this.y - this.radius;
    }
    get right()  {
        return this.x + this.radius;
    }
    get bottom()  {
        return this.y + this.radius;
    }
}

// ---------------------------------------------------------------------------------------------------

export class CollisionRect extends CollisionShape {
    public w:number = 0;
    public h:number = 0;

    constructor(x:number=0, y:number=0, w:number=0, h:number=0) {
        super()
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    copy():CollisionRect {
        return new CollisionRect().setValues(this.x, this.y, this.w, this.h);
    }

    setValues(x:number, y:number, w:number, h:number):CollisionRect {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        return this
    }

    get shapeType():ShapeType {
        return ShapeType.Rect;
    }

    get left()  {
        return this.w < 0 ? this.x + this.w : this.x;
    }
    get top()  {
        return this.h < 0 ? this.y + this.h : this.y;
    }
    get right()  {
        return this.w < 0 ? this.x : this.x + this.w;
    }
    get bottom()  {
        return this.h < 0 ? this.y : this.y + this.h;
    }

    enclosePoint(x:number, y:number) {
        if (x < this.x) {
            const d = this.x - x;
            this.x = x;
            this.w += d;
        }
        else if (x > this.right) {
            const d = x - this.right;
            this.w += d;
        }
        if (y < this.y) {
            const d = this.y - y;
            this.y = y;
            this.h += d;
        }
        else if (y > this.bottom) {
            const d = y - this.bottom;
            this.h += d;
        }
    }

    createQuadrant(index:number) {
        switch(index) {
            case 0: return new CollisionRect(this.x, this.y, this.w*0.5, this.h*0.5);
            case 1: return new CollisionRect(this.x+this.w*0.5, this.y, this.w*0.5, this.h*0.5);
            case 2: return new CollisionRect(this.x, this.y+this.h*0.5, this.w*0.5, this.h*0.5);
            case 3: return new CollisionRect(this.x+this.w*0.5, this.y+this.h*0.5, this.w*0.5, this.h*0.5);
        }
    }
    /**
     * true if the other object is completely inside
     * the rectangle
     *
     */
    contains(other:CollisionShape) {
        return (
            other.left >= this.x &&
            other.top >= this.y &&
            other.right <= this.right &&
            other.bottom <= this.bottom
        );
    }
    intersects(other:CollisionShape) {
        return !(
            other.left > this.right ||
            other.right < this.x ||
            other.top > this.bottom ||
            other.bottom < this.y
        );
    }
}

const p = new CollisionPoint();
const contacts:number[] = [];


// ---------------------------------------------------------------------------------------------------


class QuadTree {

    public forceQuad:boolean = true;
    public minQuadSize:number = 25;
    public measureChecks:number = 0;

    private _minQuadSize:number;
    private _inRebuild:boolean = false;
    private _root:QuadTreeNode|null = null;

    constructor(minQuadSize=25) {
        this._minQuadSize = minQuadSize;
    }

    addElement(e:Collider) {
        if (!this._root) {
            const b = e.bounds;
            this._root = new QuadTreeNode(
                this,
                b.left,
                b.top,
                b.right - b.left,
                b.bottom - b.top
            );
        }

        let node = this._root.addElement(e);
        if (node === false)
        {
            // console.warn("Node was out of QuadTree area. If this happen to often it result in poor performance.");
            console.log("CollisionEngine: rebuild static space");
            this.rebuild([e]);
        }
    }

    removeElement(e:Collider):boolean {
        const t = (e as any)._quadTree as QuadTree;
        if (t !== this) {
            return false;
        }
        const n = (e as any)._quadNode as QuadTreeNode;
        for (let i=0; i<n.elements.length; i++) {
            if (n.elements[i] === e) {
                n.elements.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Updates the position of the element within the tree.
     * This function should be reasonably fast as it only
     * has a very small loop to find the element within
     * the node.
     */
    updateElement(e:Collider) {
        if (!this._root) {
            return;
        }

        let node = (e as any)._quadNode;
        if (!node || (e as any)._quadTree !== this) {
            console.error("Cannot update element", e, ". Element is not in the tree.");
            return;
        }
        // to update an element we simply remove it
        // from the tree and reinsert it.
        // no node-objects are deleted
        const len = node.elements.length;
        for (let i=0; i<len; i++)
            if (node.elements[i] === e)
                node.elements.splice(i, 1);
        // let bounds = e.bounds;
        node = this._root.addElement(e);
        if (node === false) {
            console.warn("Node was out of QuadTree area. If this happen to often it result in poor performance.");
            this.rebuild([e]);
        }
        else  {
            (e as any)._quadNode = node;
            (e as any)._quadTree = this;
        }
    }
    /**
     * Rebuilds the entire tree with all existing elements
     * and also allows adding new ones.
     *
     * It also ensures that the root node is large enough to
     * cover all elements.
     *
     * This should be used to initialize the tree with all
     * static objects.
     *
     * The function is very costy and should not be uses in
     * mainloop.
     */
    rebuild(newElements:Collider[], saveBorder:number=1) {
        if (this._inRebuild) {
            console.error("Found recursion in rebuild. There must be an error.");
            return;
        }
        if (!this._root) {
            return;
        }
        this._inRebuild = true;
        let toInsert:Collider[] = [...newElements];
        this.collectAllElements(toInsert);
        let len = toInsert.length;
        if (len > 0) {
            let bounds = toInsert[0].bounds;
            let l=bounds.left,
                t=bounds.top,
                r=bounds.right,
                b=bounds.bottom;
            let i=1;
            for (; i<len; i++) {
                bounds = toInsert[i].bounds;
                if (l > bounds.left)
                    l = bounds.left;
                if (r < bounds.right)
                    r = bounds.right;
                if (t > bounds.top)
                    t = bounds.top;
                if (b < bounds.bottom)
                    b = bounds.bottom;
            }
            let cx = l + (r-l)*0.5;
            let cy = t + (b-t)*0.5;
            if (this.forceQuad) {
                let newSize = (r-cx) + saveBorder;
                if (b-cy + saveBorder > newSize)
                    newSize = (b-cy) + saveBorder;
                this._root = new QuadTreeNode(this, cx-newSize, cy-newSize, newSize*2, newSize*2);
            }
            else {
                let newW = (r-cx) + saveBorder;
                let newH = (b-cy) + saveBorder;
                this._root = new QuadTreeNode(this, cx-newW, cy-newH, newW*2, newH*2);
            }

            let allOk = true;
            for (i=0; i<len; i++) {
                let elem = toInsert[i];
                (elem as any)._quadNode = null;
                (elem as any)._quadTree = null;
                if (this._root.addElement(elem) === false)
                    allOk = false;
            }
            if (allOk === false) {
                console.error("Error during rebuild of the tree. Unable to insert one or more elments.");
            }
        }
        this._inRebuild = false;
    }
    contains(e:Collider) {
        return (e as any)._quadNode && (e as any)._quadTree === this;
    }
    queryElements(queryShape:CollisionShape, target:Collider[]=[]):Collider[] {
        this.measureChecks = 0;
        this._root.getIntersectingElements(queryShape, target, 0);
        return target;
    }

    collectAllElements(outList:Collider[], internNode = this._root) {
        if (!this._root)
            return;

        outList.push(...internNode.elements);
        if (internNode.quadrants) {
            this.collectAllElements(outList, internNode.quadrants[0]);
            this.collectAllElements(outList, internNode.quadrants[1]);
            this.collectAllElements(outList, internNode.quadrants[2]);
            this.collectAllElements(outList, internNode.quadrants[3]);
        }
    }

    debugDraw(dd:CollisionEngineDebugDrawerImpl) {
        if (!this._root)
            return;
        this._root.debugDraw(dd);
    }

}

// ---------------------------------------------------------------------------------------------------

class QuadTreeNode {

    public tree:QuadTree;
    /** sub quadrants of this node */
    public quadrants:QuadTreeNode[]|null;
    /** node elements */
    public elements:Collider[];
    public quad:CollisionRect;

    constructor(tree:QuadTree, x:number|CollisionRect, y?:number, width?:number, height?:number) {
        this.tree = tree;
        this.quadrants = null;
        this.elements = [];
        if (x instanceof CollisionRect)
            this.quad = x;
        else
            this.quad = new CollisionRect(x, y, width, height);
    }

    addElement(e:Collider):boolean|QuadTreeNode {
        const bounds = e.bounds;
        if (!this.quad.contains(bounds))
            return false; // is not covered by this quadrant
        // if subquadrant come underneath the size threshold
        // we perform no further subdivisions
        if (this.getSubQudrantSize() < this.tree.minQuadSize) {
            this.elements.push(e);
            return this;
        }
        // create subquadrants if needed
        if (!this.quadrants) {
            this.quadrants = [
                new QuadTreeNode(this.tree, this.quad.createQuadrant(0)),
                new QuadTreeNode(this.tree, this.quad.createQuadrant(1)),
                new QuadTreeNode(this.tree, this.quad.createQuadrant(2)),
                new QuadTreeNode(this.tree, this.quad.createQuadrant(3)),
            ];
        }
        // if the element fits into one subquadrant
        // we let the subquadrant decide where to put it
        if (this.quadrants[0].quad.contains(bounds)) {
            return this.quadrants[0].addElement(e);
        }
        else if (this.quadrants[1].quad.contains(bounds)) {
            return this.quadrants[1].addElement(e);
        }
        else if (this.quadrants[2].quad.contains(bounds)) {
            return this.quadrants[2].addElement(e);
        }
        else if (this.quadrants[3].quad.contains(bounds)) {
            return this.quadrants[3].addElement(e);
        }
        else {
            // if the bound object is not covered by
            // one subquadrant it means that the object
            // is crossing one or more border.
            // In that case we are responsible for it.
            this.elements.push(e);
            return this;
        }
    }

    getQudrantSize() {
        return this.quad.w;
    }
    getSubQudrantSize() {
        return Math.min(this.quad.w*0.5, this.quad.h*0.5);
    }
    getIntersectingElements(queryShape:CollisionShape, outList:Collider[], d:number) {
        this.tree.measureChecks++;
        if (this.quad.intersects(queryShape)) {
            //outList.concat(this.elements);
            outList.push(...this.elements);
            if (this.quadrants) {
                this.quadrants[0].getIntersectingElements(queryShape, outList, d+1);
                this.quadrants[1].getIntersectingElements(queryShape, outList, d+1);
                this.quadrants[2].getIntersectingElements(queryShape, outList, d+1);
                this.quadrants[3].getIntersectingElements(queryShape, outList, d+1);
            }
        }
    }

    debugDraw(dd:CollisionEngineDebugDrawerImpl) {

        if (dd.debugSettings & DebugSettings.QuadTreeGrid)
            dd.renderBounds(this.quad, dd.colorBounds);

        if (this.elements) {
            for (const c of this.elements) {
                if (!c.enabled)
                    continue;

                let colliderShape = dd.colorShape;
                let boundsColor = dd.colorColliderBounds;
                if (dd.recentColCollider.has(c)) {
                    colliderShape = dd.colorShapeColliderCollision;
                    boundsColor = dd.colorColliderBoundsCollision;
                }
                if (c.bounds && (dd.debugSettings & DebugSettings.ShapeBoundingBox))
                    dd.renderBounds(c.bounds, boundsColor);
                for (const s of (c as any)._shapes as CollisionShape[])
                    dd.renderShape(s, dd.colorShape);
            }
        }
        if (this.quadrants) {
            this.quadrants[0].debugDraw(dd)
            this.quadrants[1].debugDraw(dd)
            this.quadrants[2].debugDraw(dd)
            this.quadrants[3].debugDraw(dd)
        }
    }
}

// ---------------------------------------------------------------------------------------------------

export interface CollisionEngineDebugDrawer {
    drawLine(x:number, y:number, x2:number, y2:number, c:Color):void;
    drawPoint(x:number, y:number, c:Color):void;
}

// ---------------------------------------------------------------------------------------------------

class CollisionEngineDebugDrawerImpl {

    public readonly colorShape = Color.fromHash("#f88");
    public readonly colorShapeColliderCollision = Color.fromHash("#a44");
    public readonly colorShapeCollision = Color.fromHash("#f44");
    public readonly colorScanCollision = Color.fromHash("#8f8");
    public readonly colorScan = Color.fromHash("#88f");
    public readonly colorBounds = Color.fromHash("#ddd").setAlpha(0.5);
    public readonly colorColliderBounds = Color.fromHash("#dd8").setAlpha(0.1);
    public readonly colorColliderBoundsCollision = Color.fromHash("#dd8").setAlpha(0.3);
    public readonly recentScanner:Set<CollisionShape> = new Set();
    public readonly recentScannerCol:Set<CollisionShape> = new Set();
    public readonly recentColShape:Set<CollisionShape> = new Set();
    public readonly recentColCollider:Set<Collider> = new Set();

    private debugDrawer:CollisionEngineDebugDrawer;

    public debugSettings:DebugSettings;

    constructor(
        private readonly _engine:CollisionEngine,
    ){
    }

    public debugDraw(debugDraw:CollisionEngineDebugDrawer, debugSettings:DebugSettings) {
        this.debugSettings = debugSettings;
        this.debugDrawer = debugDraw;
        this.renderDebug();
        this.debugDrawer = null;
    }

    public renderShape(shape:CollisionShape, col:Color) {
        switch(shape.shapeType) {
            case ShapeType.Circle: return this.renderCircle(shape as CollisionCircle, col);
            case ShapeType.Rect:   return this.renderRect(shape as CollisionRect, col);
            case ShapeType.Point:  return this.renderPoint(shape as CollisionPoint, col);
            case ShapeType.Line:   return this.renderLine(shape as CollisionLine, col);
        }
    }

    public renderCircle(c:CollisionCircle, col:Color) {
        const numSeg = Math.min(Math.max(Math.floor(Math.abs(c.radius)*Math.PI*2 / 30), 20), 70);
        let lx = c.x + Math.cos(0) * c.radius;
        let ly = c.y + Math.sin(0) * c.radius;
        const seg = Math.PI*2/numSeg;
        for (let i=1; i<=numSeg; i++) {
            let xx = c.x + Math.cos(i*seg) * c.radius;
            let yy = c.y + Math.sin(i*seg) * c.radius;
            this.debugDrawer.drawLine(xx, yy, lx, ly, col)
            lx = xx;
            ly = yy;
        }
        if (this.debugSettings & DebugSettings.ShapeBoundingBox)
            this.renderBounds(c, this.colorBounds);
    }

    public renderRect(c:CollisionRect, col:Color) {
        this.debugDrawer.drawLine(c.x, c.y,       c.x + c.w, c.y,       col)
        this.debugDrawer.drawLine(c.x, c.y + c.h, c.x + c.w, c.y + c.h, col)
        this.debugDrawer.drawLine(c.x, c.y,       c.x,       c.y + c.h, col)
        this.debugDrawer.drawLine(c.x + c.w, c.y, c.x + c.w, c.y + c.h, col)
        if (this.debugSettings & DebugSettings.ShapeBoundingBox)
            this.renderBounds(c, this.colorBounds);
    }

    public renderPoint(c:CollisionPoint, col:Color) {
        this.debugDrawer.drawPoint(c.x, c.y, col)
        if (this.debugSettings & DebugSettings.ShapeBoundingBox)
            this.renderBounds(c, this.colorBounds);
    }

    public renderLine(c:CollisionLine, col:Color) {
        this.debugDrawer.drawLine(c.x, c.y, c.x2, c.y2, col)
        if (this.debugSettings & DebugSettings.ShapeBoundingBox)
            this.renderBounds(c, this.colorBounds);
    }

    public renderBounds(shape:CollisionShape, col:Color) {
        const c_x = shape.left;
        const c_y = shape.top;
        const c_w = shape.right - shape.left;
        const c_h = shape.bottom - shape.top;
        this.debugDrawer.drawLine(c_x, c_y,       c_x + c_w, c_y,       col)
        this.debugDrawer.drawLine(c_x, c_y + c_h, c_x + c_w, c_y + c_h, col)
        this.debugDrawer.drawLine(c_x, c_y,       c_x,       c_y + c_h, col)
        this.debugDrawer.drawLine(c_x + c_w, c_y, c_x + c_w, c_y + c_h, col)
    }

    private renderDebug() {

        if (this.debugSettings & DebugSettings.StaticCollider)
            ((this._engine as any).staticColliders as QuadTree).debugDraw(this);

        if (this.debugSettings & DebugSettings.DynamicCollider) {
            for (const c of (this._engine as any).dynamicCollider as Collider[]) {
                if (!c.enabled)
                    continue;
                let colliderShape = this.colorShape;
                let boundsColor = this.colorColliderBounds;
                if (this.recentColCollider) {
                    if (this.recentColCollider.has(c)) {
                        colliderShape = this.colorShapeColliderCollision;
                        boundsColor = this.colorColliderBoundsCollision;
                    }
                }
                if (c.bounds && (this.debugSettings & DebugSettings.ShapeBoundingBox))
                    this.renderBounds(c.bounds, boundsColor);
                for (const s of (c as any)._shapes) {
                    if (!this.recentColShape || !this.recentColShape.has(s))
                        this.renderShape(s, colliderShape);
                }
            }
        }

        if (this.debugSettings & DebugSettings.Recents) {
            if (this.recentColShape) {
                this.recentColShape.forEach(e => {
                    this.renderShape(e, this.colorShapeCollision);
                })
            }

            if (this.recentScanner) {
                this.recentScanner.forEach(e => {
                    this.renderShape(e, this.colorScan);
                })
            }
            if (this.recentScannerCol) {
                this.recentScannerCol.forEach(e => {
                    this.renderShape(e, this.colorScanCollision);
                })
            }
        }


        this.recentScanner.clear();
        this.recentScannerCol.clear();
        this.recentColShape.clear();
        this.recentColCollider.clear();
    }
}
