//
//  Copyright (c) 2014 Sam Leitch. All rights reserved.
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to
//  deal in the Software without restriction, including without limitation the
//  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
//  sell copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
//  IN THE SOFTWARE.
//

/**
 * This class can be used to render output pictures from an H264bsdDecoder to a canvas element.
 * If available the content is rendered using WebGL.
 *
 * params:
 * 'forceNoGL' : bool  When set to true, the content will be rendered using 2D canvas (can be very slow)
 * 'fullRange' : bool  When set to true, the rendering canvas will assume the content is encoded in full range [0..255] instead of studio range [16..235]
 */
function H264bsdCanvas(canvas, params) {
    this.canvasElement = canvas;

    if(!params || !params['forceNoGL']) this.initContextGL();

    if(this.contextGL) {
        this.initProgram(params);
        this.initBuffers();
        this.initTextures();
    }
}

/**
 * Returns true if the canvas supports WebGL
 */
H264bsdCanvas.prototype.isWebGL = function() {
    return this.contextGL;
}

/**
 * Create the GL context from the canvas element
 */
H264bsdCanvas.prototype.initContextGL = function() {
    var canvas = this.canvasElement;
    var gl = null;

    var validContextNames = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"];
    var nameIndex = 0;

    while(!gl && nameIndex < validContextNames.length) {
        var contextName = validContextNames[nameIndex];
        
        try {
            gl = canvas.getContext(contextName);
        } catch (e) {
            gl = null;
        }

        if(!gl || typeof gl.getParameter !== "function") {
            gl = null;
        }    

        ++nameIndex;
    }
 
    this.contextGL = gl;
}

/**
 * Initialize GL shader program
 */
H264bsdCanvas.prototype.initProgram = function(params) {
    var gl = this.contextGL;

    var vertexShaderScript = [
        'attribute vec4 vertexPos;',
        'attribute vec4 texturePos;',
        'varying vec2 textureCoord;',

        'void main()',
        '{',
            'gl_Position = vertexPos;',
            'textureCoord = texturePos.xy;',
        '}'
        ].join('\n');

    // This matrix is derived from here: https://en.wikipedia.org/wiki/YCbCr#ITU-R_BT.709_conversion
    // The input of Cb and Cr is (0..1) when it needs to be (-0.5..0.5)
    // R = Y + 1.5748(Cr - 0.5)
    // G = Y - 0.1873(Cb - 0.5) - 0.4681(Cr - 0.5)
    // B = Y + 1.8556(Cb - 0.5)
    var bt709FullRange = [
        'mat4 (',
            '1,  0,       1.5748, -0.7874,',
            '1, -0.1873, -0.4681,  0.3277,',
            '1,  1.8566,  0,      -0.9278,',
            '0,  0,       0,       1',
        ')'
    ].join(' ');

    // Same as above, but with a scale factor adjusting for studio range input (16..235)
    var bt709StudioRange = [
        'mat4 (',
            '1.1643828125,  0,              1.59602734375, -0.87078515625,',
            '1.1643828125, -0.39176171875, -0.81296875,     0.52959375,',
            '1.1643828125,  2.017234375,    0,             -1.081390625,',
            '0,             0,              0,              1',
        ')'
    ].join(' ');
    
    var yCbCrMat = bt709StudioRange
    if (params.hasOwnProperty('fullRangeColor') && params['fullRangeColor']) {
        console.log('Using full range color conversion')
        yCbCrMat = bt709FullRange
    }

    var fragmentShaderScript = [
        'precision highp float;',
        'varying highp vec2 textureCoord;',
        'uniform sampler2D ySampler;',
        'uniform sampler2D uSampler;',
        'uniform sampler2D vSampler;',
        'const mat4 YUV2RGB = ' + yCbCrMat + ';',
      
        'void main(void) {',
            'highp float y = texture2D(ySampler,  textureCoord).r;',
            'highp float u = texture2D(uSampler,  textureCoord).r;',
            'highp float v = texture2D(vSampler,  textureCoord).r;',
            'gl_FragColor = vec4(y, u, v, 1) * YUV2RGB;',
        '}'
        ].join('\n');

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderScript);
    gl.compileShader(vertexShader);
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.log('Vertex shader failed to compile: ' + gl.getShaderInfoLog(vertexShader));
    }

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderScript);
    gl.compileShader(fragmentShader);
    if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.log('Fragment shader failed to compile: ' + gl.getShaderInfoLog(fragmentShader));
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log('Program failed to compile: ' + gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);
    
    this.shaderProgram = program;
}

/**
 * Initialize vertex buffers and attach to shader program
 */
H264bsdCanvas.prototype.initBuffers = function() {
    var gl = this.contextGL;
    var program = this.shaderProgram;

    var vertexPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), gl.STATIC_DRAW);

    var vertexPosRef = gl.getAttribLocation(program, 'vertexPos');
    gl.enableVertexAttribArray(vertexPosRef);
    gl.vertexAttribPointer(vertexPosRef, 2, gl.FLOAT, false, 0, 0);

    var texturePosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texturePosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

    var texturePosRef = gl.getAttribLocation(program, 'texturePos');
    gl.enableVertexAttribArray(texturePosRef);
    gl.vertexAttribPointer(texturePosRef, 2, gl.FLOAT, false, 0, 0);

    this.texturePosBuffer = texturePosBuffer;
}

/**
 * Initialize GL textures and attach to shader program
 */
H264bsdCanvas.prototype.initTextures = function() {
    var gl = this.contextGL;
    var program = this.shaderProgram;

    var yTextureRef = this.initTexture();
    var ySamplerRef = gl.getUniformLocation(program, 'ySampler');
    gl.uniform1i(ySamplerRef, 0);
    this.yTextureRef = yTextureRef;

    var uTextureRef = this.initTexture();
    var uSamplerRef = gl.getUniformLocation(program, 'uSampler');
    gl.uniform1i(uSamplerRef, 1);
    this.uTextureRef = uTextureRef;

    var vTextureRef = this.initTexture();
    var vSamplerRef = gl.getUniformLocation(program, 'vSampler');
    gl.uniform1i(vSamplerRef, 2);
    this.vTextureRef = vTextureRef;
}

/**
 * Create and configure a single texture
 */
H264bsdCanvas.prototype.initTexture = function() {
    var gl = this.contextGL;

    var textureRef = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureRef);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return textureRef;
}

/**
 * Draw picture data to the canvas.
 * If this object is using WebGL, the data must be an I420 formatted ArrayBuffer,
 * Otherwise, data must be an RGBA formatted ArrayBuffer.
 */
H264bsdCanvas.prototype.drawNextOutputPicture = function(width, height, croppingParams, data) {
    var gl = this.contextGL;

    if(gl) {
        this.drawNextOuptutPictureGL(width, height, croppingParams, data);
    } else {
        this.drawNextOuptutPictureRGBA(width, height, croppingParams, data);
    }
}

/**
 * Draw the next output picture using WebGL
 */
H264bsdCanvas.prototype.drawNextOuptutPictureGL = function(width, height, croppingParams, data) {
    var gl = this.contextGL;
    var texturePosBuffer = this.texturePosBuffer;
    var yTextureRef = this.yTextureRef;
    var uTextureRef = this.uTextureRef;
    var vTextureRef = this.vTextureRef;    

    if(croppingParams === null) {
        gl.viewport(0, 0, width, height);
    } else {
        gl.viewport(0, 0, croppingParams.width, croppingParams.height);

        var tTop = croppingParams.top / height;
        var tLeft = croppingParams.left / width;
        var tBottom = croppingParams.height / height;
        var tRight = croppingParams.width / width;
        var texturePosValues = new Float32Array([tRight, tTop, tLeft, tTop, tRight, tBottom, tLeft, tBottom]);

        gl.bindBuffer(gl.ARRAY_BUFFER, texturePosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texturePosValues, gl.DYNAMIC_DRAW);
    }

    var i420Data = data;

    var yDataLength = width * height;
    var yData = i420Data.subarray(0, yDataLength);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, yTextureRef);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, yData);

    var cbDataLength = width/2 * height/2;
    var cbData = i420Data.subarray(yDataLength, yDataLength + cbDataLength);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, uTextureRef);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width/2, height/2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, cbData);

    var crDataLength = cbDataLength;
    var crData = i420Data.subarray(yDataLength + cbDataLength, yDataLength + cbDataLength + crDataLength);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, vTextureRef);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width/2, height/2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, crData);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); 
}

/**
 * Draw next output picture using ARGB data on a 2d canvas.
 */
H264bsdCanvas.prototype.drawNextOuptutPictureRGBA = function(width, height, croppingParams, data) {
    var canvas = this.canvasElement;

    var croppingParams = null;

    var argbData = data;

    var ctx = canvas.getContext('2d');
    var imageData = ctx.getImageData(0, 0, width, height);
    imageData.data.set(argbData);

    if(croppingParams === null) {
        ctx.putImageData(imageData, 0, 0);
    } else {
        ctx.putImageData(imageData, -croppingParams.left, -croppingParams.top, 0, 0, croppingParams.width, croppingParams.height);
    }
}
