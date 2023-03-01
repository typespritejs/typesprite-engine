/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

// Hiermit lassen sich die Vertex-Positionen relativ einfach auf 1x1 Pixel Auflösung bringen.
// const fixPixelPos = `vec2 pp = floor(aPosition.xy / 1.0)*1.0;`;


// ---------------------------------------------------------------------------------------------------------------------

export const fatRendererVsh_Header = `
    uniform mat4	uProj;

    attribute vec2	aPosition;
    attribute vec2	aTexCoord;
    attribute vec4	aColor;

    varying vec2	vTexCoord;
    varying vec4	vColor;
`;

export const fatRendererVsh = `
    ${fatRendererVsh_Header}

    void main()
    {
        vTexCoord = aTexCoord;
        vColor = aColor;
        
        gl_Position = uProj * vec4(aPosition, 0.0, 1.0);
    }
`;

export const fatRendererFsh_Header = `
    precision mediump float;

    uniform sampler2D	uTex;

    varying vec2		vTexCoord;
    varying vec4		vColor;
`;

export const fatRendererFsh = `
    ${fatRendererFsh_Header}
    
    void main()
    {
        vec4 texColor = texture2D(uTex, vTexCoord);
        gl_FragColor = texColor * vColor;
    }
`;

// ---------------------------------------------------------------------------------------------------------------------

export const fatRendererScissorVsh_Header = `
    uniform mat4	uProj;

    attribute vec2	aPosition;
    attribute vec2	aTexCoord;
    attribute vec4	aColor;

    varying vec2	vTexCoord;
    varying vec4	vColor;
    varying vec2	vPosition;
`;

export const fatRendererScissorVsh = `
    ${fatRendererScissorVsh_Header}

    void main()
    {
        vTexCoord = aTexCoord;
        vColor = aColor;
        vPosition = aPosition;
        
        gl_Position = uProj * vec4(aPosition, 0.0, 1.0);
    }
`;

export const fatRendererScissorFsh_Header = `
    precision mediump float;

    uniform sampler2D	uTex;
    uniform vec4        uScissor;

    varying vec2		vTexCoord;
    varying vec4		vColor;
    varying vec2	    vPosition;
`

export const fatRendererScissorFsh_Discard = `
    // vPosition is in rendertarget coordinates
    if (vPosition.x < uScissor.x ||
        vPosition.x > uScissor.z ||
        vPosition.y < uScissor.y ||
        vPosition.y > uScissor.w)
        discard;
`;

export  const fatRendererScissorFsh = `
    ${fatRendererScissorFsh_Header}

    void main()
    {
        vec4 texColor = texture2D(uTex, vTexCoord);

        ${fatRendererScissorFsh_Discard}

        gl_FragColor = texColor * vColor;
    }
`;

// ---------------------------------------------------------------------------------------------------------------------

export const fatRendererScissorCircleVsh_Header = `
    uniform mat4	uProj;

    attribute vec2	aPosition;
    attribute vec2	aTexCoord;
    attribute vec4	aColor;

    varying vec2	vTexCoord;
    varying vec4	vColor;
    varying vec2	vPosition;
`

export const fatRendererScissorCircleVsh = `
    ${fatRendererScissorCircleVsh_Header}

    void main()
    {
        vTexCoord = aTexCoord;
        vColor = aColor;
        vPosition = aPosition;

        gl_Position = uProj * vec4((aPosition), 0.0, 1.0);
    }
`;

export  const fatRendererScissorCircleFsh_Header = `
    precision highp float;

    uniform sampler2D	uTex;
    uniform vec4        uScissor;

    varying vec2		vTexCoord;
    varying vec4		vColor;
    varying vec2	    vPosition;
`;

export const fatRendererScissorCircleFsh_Discard = `
    // (x - center_x)^2 + (y - center_y)^2 < radius^2
    float xx = uScissor.x - vPosition.x;
    float yy = uScissor.y - vPosition.y;
    xx = floor(xx/2.0)*2.0;  // reduce resolution (to cope with retina pixel art)
    yy = floor(yy/2.0)*2.0;
    if (uScissor.w > 0.0 && xx*xx + yy*yy > uScissor.z*uScissor.z ||
        uScissor.w < 0.0 && xx*xx + yy*yy < uScissor.z*uScissor.z)
        discard;
`;

export const fatRendererScissorCircleFsh = `
    ${fatRendererScissorCircleFsh_Header}

    void main()
    {
        vec4 texColor = texture2D(uTex, vTexCoord);
        
        ${fatRendererScissorCircleFsh_Discard}

        gl_FragColor = texColor * vColor;
    }
`;



