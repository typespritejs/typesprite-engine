/**
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
 */

var PI2X = 3.141592653;

"use strict";
export const EnergyEasing = {

    Linear: {
        easeNone: function(age, lifetime)
        {
            return 1 - age / lifetime;
        },
        easeIn: function(age, lifetime)
        {
            return 1 - age / lifetime;
        },
        easeOut: function(age, lifetime)
        {
            return 1 - age / lifetime;
        },
        easeInOut: function(age, lifetime)
        {
            return 1 - age / lifetime;
        }
    },

    Quadratic: {
        easeIn: function(age, lifetime)
        {
            return 1 - ( age /= lifetime ) * age;
        },
        easeOut: function(age, lifetime)
        {
            return ( age = 1 - age / lifetime ) * age;
        },
        easeInOut: function(age, lifetime)
        {
            if ( ( age /= lifetime * 0.5 ) < 1 )
            {
                return 1 - age * age * 0.5;
            }
            return ( age -= 2 ) * age * 0.5;
        }
    },

    Elastic: {
        easeIn: function(age, lifetime)
        {
            if ( age == 0 )
            {
                return 1;
            }
            if ( ( age /= lifetime ) == 1 )
            {
                return 0;
            }

            var p = 0.3 * lifetime;
            return 1 + Math.pow( 2, 10 * --age ) * Math.sin( ( age * lifetime - p * 0.25 ) * PI2X / p );
        },
        easeOut: function(age, lifetime)
        {
            if ( age == 0 )
            {
                return 1;
            }
            if ( ( age /= lifetime ) == 1 )
            {
                return 0;
            }

            var p = 0.3 * lifetime;
            return Math.pow( 2, -10 * age ) * Math.sin( ( age * lifetime - p * 0.25 ) * PI2X / p);
        },
        easeInOut: function(age, lifetime)
        {
            if ( age == 0 )
            {
                return 1;
            }
            if ( ( age /= lifetime * 0.5 ) == 2 )
            {
                return 0;
            }
            var p = lifetime * 0.45;
            if ( age < 1 )
            {
                return 1 + 0.5 * ( Math.pow( 2, 10 * --age ) * Math.sin( ( age * lifetime - p * 0.25 ) * PI2X / p ) );
            }
            return -0.5 * Math.pow( 2, -10 * --age ) * Math.sin( ( age * lifetime - p * 0.25 ) * PI2X / p );
        }
    }


};
	
    
