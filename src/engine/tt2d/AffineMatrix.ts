/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {DEG_TO_RAD} from "@tsjs/engine/tt2d/Math2";

const X = 0;
const Y = 1;


export class AffineMatrix {

    constructor(
        public a:number = 1,
        public b:number = 0,
        public tx:number = 0,
        public c:number = 0,
        public d:number = 1,
        public ty:number = 0,

    ) {
    }

    public copy():AffineMatrix {
        return new AffineMatrix(
            this.a, this.b, this.tx,
            this.c, this.d, this.ty
        );
    }

    /**
     * In-Place multiplication (modifies this)
     * const a = new AffineMatrix(...);
     * const b = new AffineMatrix(...);
     *
     * a.multiply(b)
     * a <= a * b
     *
     * For the pattern c = a * b use:
     *
     * const c = a.copy().multiply(b);
     */
    public multiply(m:AffineMatrix):AffineMatrix {
        const _a = this.a*m.a  + this.b*m.c  +  0;
        const _b = this.a*m.b  + this.b*m.d  +  0;
        const _tx = this.a*m.tx + this.b*m.ty +  this.tx;

        const _c = this.c*m.a  + this.d*m.c  +  0;
        const _d = this.c*m.b  + this.d*m.d  +  0;
        const _ty = this.c*m.tx + this.d*m.ty +  this.ty;

        this.a  = _a; this.b  = _b; this.tx  = _tx;
        this.c  = _c; this.d  = _d; this.ty  = _ty;

        return this;
    }

    public toMatrix4() {
        return [
            this.a, this.b,  0,  this.tx,
            this.c, this.d,  0,  this.ty,
            0,  0,  1,  0,
            0,  0,  0,  1
        ];
    }

    private _innerMultiply(
        ma:number, mb:number, mtx:number,
        mc:number, md:number, mty:number
    ):void {
        const _a = this.a*ma  + this.b*mc  +  0;
        const _b = this.a*mb  + this.b*md  +  0;
        const _tx = this.a*mtx + this.b*mty +  this.tx;

        const _c = this.c*ma  + this.d*mc  +  0;
        const _d = this.c*mb  + this.d*md  +  0;
        const _ty = this.c*mtx + this.d*mty +  this.ty;

        this.a  = _a; this.b  = _b; this.tx  = _tx;
        this.c  = _c; this.d  = _d; this.ty  = _ty;
    }

    public translate(x:number, y:number) {
        if (x != 0 || y != 0) {
            this._innerMultiply(
                1, 0, x,
                0, 1, y
            );
        }
    }

    public rotate(angleRadian:number):void {
        this._innerMultiply(
            Math.cos(angleRadian), Math.sin(angleRadian), 0,
            -Math.sin(angleRadian), Math.cos(angleRadian), 0
        );
    }

    public rotateDegree(angleDegree:number):void {
        this.rotate(angleDegree*DEG_TO_RAD)
    }

    public scale(sx:number, sy:number):void {
        this._innerMultiply(
            sx, 0, 0,
            0, sy, 0
        );
    }

    public skew(sx:number, sy:number):void {
        this._innerMultiply(
            0, Math.tan(sy), 0,
            sx, 1, 0
        );
    }

    public multiplyVector(vec:number[]) {

        const _x = (vec[X] * this.a + vec[Y] * this.b) + this.tx;
        const _y = (vec[X] * this.c + vec[Y] * this.d) + this.ty;

        vec[X] = _x;
        vec[Y] = _y;
    }

    public multiplyVectorInvert(vec:number[]) {

        // https://www.mathsisfun.com/algebra/matrix-inverse.html

        // http://delphi.zsg-rottenburg.de/faqmath5.html

        // math::matrix2 helper(a, c, b, d);
        // matrix2(float m00, float m01, float m10, float m11)
        // {
        //     col[0].x= m00, col[0].y= m01; OK
        //     col[1].x= m10, col[1].y= m11; OK
        // }
        let c0x = /*this.a*/ this.d, c0y = -this.c; // < already SWAPPED
        let c1x = -this.b, c1y = this.a /* this.d */;

        // helper.invert();
        // void invert()
        // {
        //     Swap(col[0].x, col[1].y); OK
        //     col[0].y= -col[0].y; OK
        //     col[1].x= -col[1].x; OK
        //     *this/=determinant();
        // }


        // float determinant() const
        //     {	return col[0][0]*col[1][1] - col[0][1]*col[1][0];  }
        // const matrix2 &operator /=(const float s)
        // {
        //     col[0]/=s; col[1]/=s;
        //     return *this;
        // }

        const determinant = c0x*c1y - c0y*c1x;
        if (determinant != 0) {
            c0x /= determinant;
            c0y /= determinant;
            c1x /= determinant;
            c1y /= determinant;
        }

        // const vector2f operator *(const vector2f &v) const
        //     {	return vector2f(v.x*col[0].x + v.y*col[1].x, v.x*col[0].y + v.y*col[1].y);	}
        // return helper * v - helper*Vector2(tx, ty);
        //        ----------   ----------------------
        //           _v1               _v2
        const _v1x = vec[X] * c0x + vec[Y] * c1x;
        const _v1y = vec[X] * c0y + vec[Y] * c1y;

        const _v2x = this.tx * c0x + this.ty * c1x;
        const _v2y = this.tx * c0y + this.ty * c1y;

        vec[X] = _v1x - _v2x;
        vec[Y] = _v1y - _v2y;
    }

    public multiplyVectorInvert_(vec:number[]) {

        // https://www.mathsisfun.com/algebra/matrix-inverse.html

        // http://delphi.zsg-rottenburg.de/faqmath5.html

        // math::matrix2 helper(a, c, b, d);
        // matrix2(float m00, float m01, float m10, float m11)
        // {
        //     col[0].x= m00, col[0].y= m01; OK
        //     col[1].x= m10, col[1].y= m11; OK
        // }
        let c0x = /*this.a*/ this.d, c0y = -this.c; // < already SWAPPED
        let c1x = -this.b, c1y = this.a /* this.d */;

        // helper.invert();
        // void invert()
        // {
        //     Swap(col[0].x, col[1].y); OK
        //     col[0].y= -col[0].y; OK
        //     col[1].x= -col[1].x; OK
        //     *this/=determinant();
        // }


        // float determinant() const
        //     {	return col[0][0]*col[1][1] - col[0][1]*col[1][0];  }
        // const matrix2 &operator /=(const float s)
        // {
        //     col[0]/=s; col[1]/=s;
        //     return *this;
        // }

        const determinant = c0x*c1y - c0y*c1x;
        if (determinant != 0) {
            c0x /= determinant;
            c0y /= determinant;
            c1x /= determinant;
            c1y /= determinant;
        }

        // const vector2f operator *(const vector2f &v) const
        //     {	return vector2f(v.x*col[0].x + v.y*col[1].x, v.x*col[0].y + v.y*col[1].y);	}
        // return helper * v - helper*Vector2(tx, ty);
        //        ----------   ----------------------
        //           _v1               _v2
        const _v1x = -vec[X] * c0x + -vec[Y] * c1x;
        const _v1y = -vec[X] * c0y + -vec[Y] * c1y;

        const _v2x = this.tx * c0x + this.ty * c1x;
        const _v2y = this.tx * c0y + this.ty * c1y;

        // vec[X] = _v1x - _v2x;
        // vec[Y] = _v1y - _v2y;

        vec[X] = _v2x - _v1x;
        vec[Y] = _v2y - _v1y;
    }

    public identity():void {
        this.a = 1; this.b = 0; this.tx = 0;
        this.c = 0; this.d = 1; this.ty = 0;
    }

    public copyValues(m:AffineMatrix):void {
        this.a = m.a; this.b = m.b; this.tx = m.tx;
        this.c = m.c; this.d = m.d; this.ty = m.ty;
    }

    public get isNaNPoisoned():boolean {
        const hasNaN = (
            isNaN(this.a) ||
            isNaN(this.b) ||
            isNaN(this.c) ||
            isNaN(this.d) ||
            isNaN(this.tx) ||
            isNaN(this.ty)
        );
        return hasNaN;
    }

}
