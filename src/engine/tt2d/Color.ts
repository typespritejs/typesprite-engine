/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 * RGBA color value
 */
export class Color {

    constructor(
        public r:number = 1,
        public g:number = 1,
        public b:number = 1,
        public a:number = 1,
    ) {}


    copy():Color {
        return new Color(this.r, this.g, this.b, this.a);
    }

    copyWithAlpha(a:number):Color {
        return new Color(this.r, this.g, this.b, a);
    }

    static fromHash(colorCode:string):Color {
        const out = new Color();
        out.setFromHash(colorCode);
        return out;
    }

    setFromHash(colorCode:string):Color {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        colorCode = colorCode.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorCode);
        if (result) {
            this.r = parseInt(result[1], 16)/255;
            this.g = parseInt(result[2], 16)/255;
            this.b = parseInt(result[3], 16)/255;
            this.a = 1;
        }
        return this;
    }

    public toHash(withAlpha:boolean=false):string {
        const outParts = [
            (this.r*255).toString(16),
            (this.g*255).toString(16),
            (this.b*255).toString(16),
            (this.a*255).toString(16)
        ];

        if (!withAlpha)
            outParts.pop();

        // Pad single-digit output values
        outParts.forEach(function (part, i) {
            if (part.length === 1) {
                outParts[i] = '0' + part;
            }
        })

        const outout = ('#' + outParts.join(''));

        return outout;
    }

    copyValues(other:Color):Color {

        this.r = other.r;
        this.g = other.g;
        this.b = other.b;
        this.a = other.a;

        return this;
    }

    set(r:number, g:number, b:number, a:number):Color {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        return this;
    }

    setAlpha(a:number):Color {
        this.a = a;
        return this;
    }

    static readonly White = new Color();
    static readonly Red = new Color(1, 0, 0);
    static readonly Black = new Color(0, 0, 0);

    toHSV(target:ColorHSV=null):ColorHSV {
        let min, max, delta;
        min = this.r < this.g ? this.r : this.g;
        min = min  < this.b ? min  : this.b;
        max = this.r > this.g ? this.r : this.g;
        max = max  > this.b ? max  : this.b;
        const out = target||new ColorHSV();
        out.a = this.a;

        out.v = max;                                // v
        delta = max - min;
        if (delta < 0.00001)
        {
            out.s = 0;
            out.h = 0; // undefined, maybe nan?
            return out;
        }
        if( max > 0.0 ) { // NOTE: if Max is == 0, this divide would cause a crash
            out.s = (delta / max);                  // s
        } else {
            // if max is 0, then r = g = b = 0
            // s = 0, h is undefined
            out.s = 0.0;
            out.h = 0;                            // its now undefined
            return out;
        }
        if( this.r >= max )                           // > is bogus, just keeps compilor happy
            out.h = ( this.g - this.b ) / delta;        // between yellow & magenta
        else
            if( this.g >= max )
            out.h = 2.0 + ( this.b - this.r ) / delta;  // between cyan & yellow
        else
            out.h = 4.0 + ( this.r - this.g ) / delta;  // between magenta & cyan
        out.h *= 60.0;                              // degrees
        if( out.h < 0.0 )
            out.h += 360.0;

        return out;
    }

    /**
     * "Zero" allocation utility function.
     *
     * Uses HSV color space following this: https://stackoverflow.com/a/13489029
     */
    public static interpolateLinearHSV(target:Color, c1:Color, c2:Color, t:number)  {
        c1.toHSV(globalInterpolatorA);
        c2.toHSV(globalInterpolatorB);
        globalInterpolatorA.interpolateLinearWith(globalInterpolatorB, t);
        globalInterpolatorA.toRGB(target);
    }

    /**
     * [r, g, b, a]
     *
     * range: 0-255
     */
    toIntArray():[number,number,number,number] {
        const r = (this.r * 255) & 0xff;
        const g = (this.g * 255) & 0xff;
        const b = (this.b * 255) & 0xff;
        const a = (this.a * 255) & 0xff;
        return [r, g, b, a];
    }

    /**
     * RRGGBBAA number
     */
    toNumber():number {
        const r = (this.r * 255) & 0xff;
        const g = (this.g * 255) & 0xff;
        const b = (this.b * 255) & 0xff;
        const a = (this.a * 255) & 0xff;
        return (r << 24) + (g << 16) + (b << 8) + (a);
    }

    /**
     * [r, g, b, a] => RRGGBBAA
     *
     * range: 0-255
     */
    static intArrayToNumber(rgbaArray:[number,number,number,number]):number {
        const r = rgbaArray[0] & 0xff;
        const g = rgbaArray[1] & 0xff;
        const b = rgbaArray[2] & 0xff;
        const a = rgbaArray[3] & 0xff;
        return (r << 24) + (g << 16) + (b << 8) + (a);
    }
}



function linear(a:number, b:number, t:number)
{
    return a * (1 - t) + b * t;
}

export class ColorHSV {
    constructor(
        public h:number = 1,
        public s:number = 1,
        public v:number = 1,
        public a:number = 1
    ) {
    }

    interpolateLinearWith(b:ColorHSV, t:number):void
    {
        this.interpolateWith(b, t, linear);
    }

    interpolateWith(b:ColorHSV, t:number, interpolator:(a:number,b:number,t:number)=>number):void
    {
        const h = interpolator(this.h, b.h, t);
        const s = interpolator(this.s, b.s, t);
        const v = interpolator(this.v, b.v, t);
        const alpha = interpolator(this.a, b.a, t);
        this.h = h;
        this.s = s;
        this.v = v;
        this.a = alpha;
    }

    public toRGB(target:Color=null):Color {
        let    hh, p, q, t, ff;
        let    i;
        const  out = target||new Color();
        if(this.s <= 0.0) {
            out.r = this.v;
            out.g = this.v;
            out.b = this.v;
            out.a = this.a;
            return out;
        }
        hh = this.h;
        if(hh >= 360.0) hh = 0.0;
        hh /= 60.0;
        i = Math.floor(hh);
        ff = hh - i;
        p = this.v * (1.0 - this.s);
        q = this.v * (1.0 - (this.s * ff));
        t = this.v * (1.0 - (this.s * (1.0 - ff)));

        switch(i) {
            case 0:
                out.r = this.v;
                out.g = t;
                out.b = p;
                break;
            case 1:
                out.r = q;
                out.g = this.v;
                out.b = p;
                break;
            case 2:
                out.r = p;
                out.g = this.v;
                out.b = t;
                break;

            case 3:
                out.r = p;
                out.g = q;
                out.b = this.v;
                break;
            case 4:
                out.r = t;
                out.g = p;
                out.b = this.v;
                break;
            case 5:
            default:
                out.r = this.v;
                out.g = p;
                out.b = q;
                break;
        }

        out.a = this.a;
        return out;
    }

}

const globalInterpolatorA = new ColorHSV();
const globalInterpolatorB = new ColorHSV();