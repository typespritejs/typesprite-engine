/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

// Just a list with "old" shader that might be useful
// or serve as reference


// --------------------------------------------------------------

const textureRenderer_vs = `
// constants
uniform mat4	proj;

// from buffer
attribute vec2 	position;
attribute vec2 	buffTex;

// shared with FS
varying vec2 	texCoord;

void main()
{	
	texCoord = buffTex;
    gl_Position = proj*vec4((position), 0, 1.0) ;
}
`;

// --------------------------------------------------------------

const textureRenderer_fs = `
precision mediump float;

uniform sampler2D	tex;
varying vec2		texCoord;


void main()
{		
    gl_FragColor = texture2D(tex, texCoord);	
}


// Kein MixColor, premod/nicht-premod: textureRednerer.fsh
// MixColor, nicht-premod: textureRendererColorMix.fsh
// MixColor - Aber nur Alpha, premod: textureRendererAlphaMixPremod.fsh
// MixColor - Nicht Nur Alpha, premod: textureRendererColorMixPremod.fsh
`;

// --------------------------------------------------------------


const textureRendererMixColor_fs = `
precision mediump float;

// constant: input texture
uniform sampler2D	tex;
// constant: color transform
uniform vec4 		color;

// from VS
varying vec2		texCoord;


void main()
{	
	// colormix in a none premodulated environment
    vec4 texColor = texture2D(tex, texCoord);			
	gl_FragColor = texColor*color;
}

`;

// --------------------------------------------------------------

const textureRendererMixColorPremod_fs = `
precision mediump float;

// constant: input texture
uniform sampler2D	tex;
// constant: color transform
uniform vec4 		color;

// from VS
varying vec2		texCoord;


void main()
{	
    
	// If the texture data is premodulated (rgb*a)
	// we have to "unmodulate" it, mix the color and
	// then modulate it again.	
	//
	// It may be argued that the remodulation is not necessary
	// as the blendmode could be set to a none-premodulated state
	// in the EGL context. This may we have to either have another
	// multiplication here (with promod) or a division during blending
	// (wihtout premod). I suspect that a multiplication should be
	// faster, but tests may proof me wrong.
	vec4 texColor = texture2D(tex, texCoord);		
	vec3 texColorUnMod;
	texColorUnMod = texColor.rgb / texColor.a;
	vec3 finalCol = texColorUnMod*color.rgb * texColor.a * color.a;	
	gl_FragColor = vec4(finalCol.r, finalCol.g, finalCol.b, texColor.a * color.a);	
}
`;

const textureRendererAlphaMixPremod_fs = `
precision mediump float;

// constant: input texture
uniform sampler2D	tex;
// constant: color transform
uniform vec4 		color;

// from VS
varying vec2		texCoord;


void main()
{	
    
	// If the texture data is premodulated (rgb*a)
	// 	
	vec4 texColor = texture2D(tex, texCoord);		
	texColor.rgb = texColor.rgb * color.a;	
	gl_FragColor = vec4(texColor.r, texColor.g, texColor.b, texColor.a * color.a);		
}

`;