//
//  YuvDataRenderer.m
//  h264bsd
//
//  Created by Sam Leitch on 2014-03-30.
//  Copyright (c) 2014 h264bsd. All rights reserved.
//

#import "H264bsdRendererGl.h"

@interface H264bsdRendererGl ()
{
    GLuint _programRef;
    
    GLuint _positionRef;
    GLuint _positionBufferRef;
    
    GLuint _texcoordRef;
    GLuint _texcoordBufferRef;
    
    GLuint _samplerRef[3];
    GLuint _textureRef[3];
}

@end

#define STRINGIZE(x) #x
#define STRINGIZE2(x) STRINGIZE(x)
#define SHADER_STRING(text) @ STRINGIZE2(text)

NSString *const vertexShaderString;
NSString *const fragmentShaderString;
static GLuint compileShader(GLenum type, NSString *shaderString);

static const GLfloat positionVertices[] = {
    -1.0f, -1.0f,
    1.0f, -1.0f,
    -1.0f,  1.0f,
    1.0f,  1.0f,
};

static const GLfloat texcoordVertices[] = {
    0.0f, 1.0f,
    1.0f, 1.0f,
    0.0f, 0.0f,
    1.0f, 0.0f,
};


@implementation H264bsdRendererGl

- (id)initWithContext:(EAGLContext *)context
{
    self = [super init];
    
    if(self)
    {
        _context = context;
        
        if(![EAGLContext setCurrentContext:context]) {
            NSLog(@"failed to setup context");
            return nil;
        }
        
        [self initProgram];
        [self initBuffers];
        [self initTextures];
    }
    
    return self;
}

- (void)initProgram
{
    GLuint vertexShader = compileShader(GL_VERTEX_SHADER, vertexShaderString);
	if (!vertexShader) return;
    
	GLuint fragmentShader = compileShader(GL_FRAGMENT_SHADER, fragmentShaderString);
    if (!fragmentShader) return;
    
    _programRef = glCreateProgram();
	glAttachShader(_programRef, vertexShader);
	glAttachShader(_programRef, fragmentShader);
	glLinkProgram(_programRef);
    
    GLint status;
    glGetProgramiv(_programRef, GL_LINK_STATUS, &status);
    if (status == GL_FALSE) {
		NSLog(@"Failed to link program %d", _programRef);
        return;
    }
    
    _positionRef = glGetAttribLocation(_programRef, "position");
    _texcoordRef = glGetAttribLocation(_programRef, "texcoord_a");
    
    _samplerRef[0] = glGetUniformLocation(_programRef, "ySampler");
    _samplerRef[1] = glGetUniformLocation(_programRef, "uSampler");
    _samplerRef[2] = glGetUniformLocation(_programRef, "vSampler");
}

- (void)initBuffers
{
    glGenBuffers(1, &_positionBufferRef);
    glBindBuffer(GL_ARRAY_BUFFER, _positionBufferRef);
    glBufferData(GL_ARRAY_BUFFER, 2 * 4 * sizeof(float), positionVertices, GL_STATIC_DRAW);
    glEnableVertexAttribArray(_positionRef);
    glVertexAttribPointer(_positionRef, 2, GL_FLOAT, GL_FALSE, 0, 0);
    
    glGenBuffers(1, &_texcoordBufferRef);
    glBindBuffer(GL_ARRAY_BUFFER, _texcoordBufferRef);
    glBufferData(GL_ARRAY_BUFFER, 2 * 4 * sizeof(float), texcoordVertices, GL_STATIC_DRAW);
    glEnableVertexAttribArray(_texcoordRef);
    glVertexAttribPointer(_texcoordRef, 2, GL_FLOAT, GL_FALSE, 0, 0);
}

- (void)initTextures
{
    glGenTextures(3, _textureRef);
    
    for(int i = 0; i < 3; ++i)
    {
        glActiveTexture(GL_TEXTURE0 + i);
        glBindTexture(GL_TEXTURE_2D, _textureRef[i]);
        
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    }
}

- (void)dealloc
{
    if(![EAGLContext setCurrentContext:_context]) {
        NSLog(@"failed to setup context");
        return;
    }
    glDeleteProgram(_programRef);
    glDeleteTextures(3, _textureRef);
    glDeleteBuffers(1, &_positionBufferRef);
    glDeleteBuffers(1, &_texcoordBufferRef);
}

- (void)renderNextOutputPictureWithDecoder:(H264bsdDecoder *)decoder
{
    if(![EAGLContext setCurrentContext:self.context]) {
        NSLog(@"failed to setup context");
        return;
    }
    
    NSData *yuvData = [decoder nextOutputPicture];
    if(!yuvData) return;

    NSInteger width = decoder.outputWidth;
    NSInteger height = decoder.outputHeight;
    NSInteger uvWidth = width/2;
    NSInteger uvHeight = height/2;
    
    UInt8* yBuf = (UInt8*)yuvData.bytes;
    UInt8* uBuf = yBuf + (width * height);
    UInt8* vBuf = uBuf + (uvWidth * uvHeight);
    
    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
	glUseProgram(_programRef);
    
    GLsizei textureWidth[] = { width, uvWidth, uvWidth };
    GLsizei textureHeight[] = { height, uvHeight, uvHeight };
    GLvoid* textureBuf[] = { yBuf, uBuf, vBuf };
    
    for(int i = 0; i < 3; ++i)
    {
        glUniform1i(_samplerRef[i], i);
        
        glActiveTexture(GL_TEXTURE0 + i);
        glBindTexture(GL_TEXTURE_2D, _textureRef[i]);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_LUMINANCE, textureWidth[i], textureHeight[i], 0, GL_LUMINANCE, GL_UNSIGNED_BYTE, textureBuf[i]);
    }
    
    glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
    
    bool glError = false;
    GLenum glStatus = glGetError();
    while (glStatus != GL_NO_ERROR) {
        NSLog(@"GL error: %x", glStatus);
        glError = true;
        glStatus = glGetError();
    }
}

@end

NSString *const vertexShaderString = SHADER_STRING
(
 attribute vec4 position;
 attribute vec4 texcoord_a;
 varying vec2 texcoord;
 
 void main()
 {
     gl_Position = position;
     texcoord = texcoord_a.xy;
 }
 );

NSString *const fragmentShaderString = SHADER_STRING
(
 varying highp vec2 texcoord;
 
 uniform sampler2D ySampler;
 uniform sampler2D uSampler;
 uniform sampler2D vSampler;
 
 const mediump mat4 yuv2rgb = mat4(1.1643828125, 0, 1.59602734375, -.87078515625,
                                   1.1643828125, -.39176171875, -.81296875, .52959375,
                                   1.1643828125, 2.017234375, 0, -1.081390625,
                                   0, 0, 0, 1);
 
 void main()
 {
     mediump vec4 yuv = vec4(0.0, 0.0, 0.0, 1.0);
     
     yuv.r = texture2D(ySampler, texcoord).r;
     yuv.g = texture2D(uSampler, texcoord).r;
     yuv.b = texture2D(vSampler, texcoord).r;
     
     mediump vec4 rgb = yuv * yuv2rgb;
     
     gl_FragColor = rgb;
 }
 );

static GLuint compileShader(GLenum type, NSString *shaderString)
{
	GLint status;
	const GLchar *sources = (GLchar *)shaderString.UTF8String;
    
    GLuint shader = glCreateShader(type);
    if (shader == 0 || shader == GL_INVALID_ENUM) {
        NSLog(@"Failed to create shader %d", type);
        return 0;
    }
    
    glShaderSource(shader, 1, &sources, NULL);
    glCompileShader(shader);
    
#ifdef DEBUG
	GLint logLength;
    glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &logLength);
    if (logLength > 0)
    {
        GLchar *log = (GLchar *)malloc(logLength);
        glGetShaderInfoLog(shader, logLength, &logLength, log);
        NSLog(@"Shader compile log:\n%s", log);
        free(log);
    }
#endif
    
    glGetShaderiv(shader, GL_COMPILE_STATUS, &status);
    if (status == GL_FALSE) {
        glDeleteShader(shader);
		NSLog(@"Failed to compile shader:\n");
        return 0;
    }
    
	return shader;
}


