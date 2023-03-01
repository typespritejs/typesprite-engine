/**
 * TypeSprite Game Engine
 * .....................
 *
 * TERMS OF USE - EASING EQUATIONS
 *
 * Open source under the BSD License.
 *
 * Copyright (c) 2001 Robert Penner
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list
 * of conditions and the following disclaimer in the documentation and/or other materials
 * provided with the distribution.
 * Neither the name of the author nor the names of contributors may be used to endorse
 * or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
 * OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ==================================================
 *
 * Modifications:
 *
 * Author: Richard Lord
 * Copyright (c) Richard Lord 2008-2011
 * http://flintparticles.org
 *
 * Port to JavaScript:
 * 
 * Copyright (c) 2013, Christoph Schnackenberg <mail@xtoff.games>
 *
 * Used in the Flint Particle System - JavaScript-Port which is licenced under the MIT license. As per the
 * original license for Robert Penner's classes, these specific classes are released under
 * the BSD License.
 *
 * ==================================================
 *
 * t = current time
 * b = start value (offset)
 * c = target value
 * d = target time
 */


var PI2X = 3.141592653;

"use strict";
export const Easing = {

    Back: {
        easeIn: function(t, b, c, d, s?) {
            s = s || 1.70158;
            return c * ( t /= d ) * t * ( ( s + 1 ) * t - s ) + b;
        },
        easeOut: function(t, b, c, d, s?) {
            s = s || 1.70158;
            return c * ( ( t = t / d - 1 ) * t * ( ( s + 1 ) * t + s ) + 1 ) + b;
        },
        easeInOut: function(t, b, c, d, s?) {
            s = s || 1.70158;
            if ( ( t /= d * 0.5 ) < 1 )
            {
                return c * 0.5 * ( t * t * ( ( ( s *= ( 1.525 ) ) + 1 ) * t - s ) ) + b;
            }
            return c * 0.5 * ( ( t -= 2 ) * t * ( ( ( s *= ( 1.525 ) ) + 1 ) * t + s ) + 2 ) + b;
        }
    },
    Bounce: {
        easeIn: function(t, b, c, d) {
            return c - Easing.Bounce.easeOut( d - t, 0, c, d ) + b;
        },
        easeOut: function(t, b, c, d) {
            if ( ( t /= d ) < ( 1 / 2.75 ) )
            {
                return c * ( 7.5625 * t * t ) + b;
            }
            else if ( t < ( 2 / 2.75 ) )
            {
                return c * ( 7.5625 * ( t -= ( 1.5 / 2.75 ) ) * t + 0.75 ) + b;
            }
            else if ( t < ( 2.5 / 2.75 ) )
            {
                return c * ( 7.5625 * ( t -= ( 2.25 / 2.75 ) ) * t + 0.9375 ) + b;
            }
            else
            {
                return c * ( 7.5625 * ( t -= ( 2.625 / 2.75 ) ) * t + 0.984375 ) + b;
            }
        },
        easeInOut: function(t, b, c, d) {
            if ( t < d * 0.5 )
            {
                return Easing.Bounce.easeIn( t * 2, 0, c, d ) * 0.5 + b;
            }
            else
            {
                return Easing.Bounce.easeOut( t * 2 - d, 0, c, d ) * 0.5 + c * 0.5 + b;
            }
        }
    },
    Circular: {
        easeIn: function(t, b, c, d) {
            return -c * ( Math.sqrt( 1 - ( t /= d ) * t ) - 1 ) + b;
        },
        easeOut: function(t, b, c, d) {
            return c * Math.sqrt( 1 - ( t = t / d - 1 ) * t ) + b;
        },
        easeInOut: function(t, b, c, d) {
            if ( ( t /= d * 0.5 ) < 1)
            {
                return -c * 0.5 * ( Math.sqrt( 1 - t * t ) - 1 ) + b;
            }
            return c * 0.5 * ( Math.sqrt( 1 - ( t -= 2 ) * t ) + 1 ) + b;
        }
    },
    Cubic: {
        easeIn: function(t, b, c, d) {
            return c * ( t /= d ) * t * t + b;
        },
        easeOut: function(t, b, c, d) {
            return c * ( ( t = t / d - 1 ) * t * t + 1 ) + b;
        },
        easeInOut: function(t, b, c, d) {
            if ( ( t /= d * 0.5 ) < 1 )
            {
               return c * 0.5 * t * t * t + b;
            }
            return c * 0.5 * ( ( t -= 2 ) * t * t + 2 ) + b;
        }
    },
    Elastic: {
        easeIn: function(t, b, c, d, a?, p?) {
            a = a || 0;
            p = p || 0;

            if ( t == 0 )
            {
                return b;
            }
            if ( ( t /= d ) == 1 )
            {
                return b + c;
            }
            if ( !p )
            {
                p = d * 0.3;
            }
            var s = 0;
            if ( !a || a < Math.abs( c ) )
            {
                a = c;
                s = p * 0.25;
            }
            else
            {
                s = p / ( 2 * Math.PI ) * Math.asin( c / a );
            }

            return -( a * Math.pow( 2, 10 * ( --t ) ) * Math.sin( ( t * d - s ) * ( 2 * Math.PI ) / p ) ) + b;
        },
        easeOut: function(t, b, c, d, a?, p?) {
            a = a || 0;
            p = p || 0;

            if ( t == 0 )
            {
                return b;
            }
            if ( ( t /= d ) == 1)
            {
                return b + c;
            }
            if ( !p )
            {
                p = d * 0.3;
            }
            var s = 0;
            if ( !a || a < Math.abs( c ) )
            {
                a = c;
                s = p * 0.25;
            }
            else
            {
                s = p / ( 2 * Math.PI ) * Math.asin( c / a );
            }

            return a * Math.pow( 2, -10 * t ) * Math.sin( ( t * d - s ) * ( 2 * Math.PI ) / p ) + c + b;
        },
        easeInOut: function(t, b, c, d, a?, p?) {
            a = a || 0;
            p = p || 0;

            if ( t == 0 )
            {
                return b;
            }
            if ( ( t /= d * 0.5 ) == 2 )
            {
                return b + c;
            }
            if ( !p )
            {
                p = d * ( 0.3 * 1.5 );
            }
            var s = 0;
            if ( !a || a < Math.abs( c ) )
            {
                a = c;
                s = p * 0.25;
            }
            else
            {
                s = p / ( 2 * Math.PI ) * Math.asin( c / a );
            }
            if ( t < 1 )
            {
                return -0.5 * ( a * Math.pow( 2, 10 * ( t -= 1 ) ) * Math.sin( ( t * d - s ) * ( 2 * Math.PI ) / p ) ) + b;
            }
            return a * Math.pow( 2, -10 * ( t -= 1 ) ) * Math.sin( ( t * d - s ) * ( 2 * Math.PI ) / p ) * 0.5 + c + b;
        }
    },

    Exponential: {
        easeIn: function(t, b, c, d) {
            return t == 0 ? b : c * Math.pow( 2, 10 * ( t / d - 1 ) ) + b;
        },
        easeOut: function(t, b, c, d) {
            return t == d ? b + c : c * ( -Math.pow( 2, -10 * t / d ) + 1 ) + b;
        },
        easeInOut: function(t, b, c, d) {
            if ( t == 0 )
            {
                return b;
            }
            if ( t == d )
            {
                return b + c;
            }
            if ( ( t /= d * 0.5 ) < 1 )
            {
                return c * 0.5 * Math.pow( 2, 10 * ( t - 1 ) ) + b;
            }
            return c * 0.5 * ( -Math.pow( 2, -10 * --t ) + 2 ) + b;
        }
    },

    Linear: {
        easeNone: function(t, b, c, d) {
            return c * t / d + b;
        },
        easeIn: function(t, b, c, d) {
            return c * t / d + b;
        },
        easeOut: function(t, b, c, d) {
            return c * t / d + b;
        },
        easeInOut: function(t, b, c, d) {
            return c * t / d + b;
        }
    },

    Quadratic: {
        easeIn: function(t, b, c, d) {
            return c * ( t /= d ) * t + b;
        },
        easeOut: function(t, b, c, d) {
            return -c * ( t /= d ) * ( t - 2 ) + b;
        },
        easeInOut: function(t, b, c, d) {
            if ( ( t /= d * 0.5 ) < 1 )
            {
                return c * 0.5 * t * t + b;
            }
            return -c * 0.5 * ( ( --t ) * ( t - 2 ) - 1 ) + b;
        }
    },

    Quartic: {
        easeIn: function(t, b, c, d) {
            return c * ( t /= d ) * t * t * t + b;
        },
        easeOut: function(t, b, c, d) {
            return -c * ( ( t = t / d - 1 ) * t * t * t - 1 ) + b;
        },
        easeInOut: function(t, b, c, d) {
            if ( ( t /= d * 0.5 ) < 1)
            {
                return c * 0.5 * t * t * t * t + b;
            }
            return -c * 0.5 * ( ( t -= 2 ) * t * t * t - 2 ) + b;
        }
    },

    Quintic: {
        easeIn: function(t, b, c, d) {
            return c * ( t /= d ) * t * t * t * t + b;
        },
        easeOut: function(t, b, c, d) {
            return c * ( ( t = t / d - 1 ) * t * t * t * t + 1 ) + b;
        },
        easeInOut: function(t, b, c, d) {
            if ( ( t /= d * 0.5 ) < 1 )
            {
                return c * 0.5 * t * t * t * t * t + b;
            }
            return c * 0.5 * ( ( t -= 2 ) * t * t * t * t + 2 ) + b;
        }
    },

    Sine: {
        easeIn: function(t, b, c, d) {
            return -c * Math.cos( t / d * ( Math.PI * 0.5 ) ) + c + b;
        },
        easeOut: function(t, b, c, d) {
            return c * Math.sin( t / d * ( Math.PI * 0.5 ) ) + b;
        },
        easeInOut: function(t, b, c, d) {
            return -c * 0.5 * ( Math.cos( Math.PI * t / d ) - 1 ) + b;
        }
    },
};
	
