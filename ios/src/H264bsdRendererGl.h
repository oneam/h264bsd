//
//  YuvDataRenderer.h
//  h264bsd
//
//  Created by Sam Leitch on 2014-03-30.
//  Copyright (c) 2014 h264bsd. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <GLKit/GLKit.h>
#import "H264bsdDecoder.h"

@interface H264bsdRendererGl : NSObject
@property (strong, readonly) EAGLContext *context;
@property (strong, readonly) H264bsdDecoder *decoder;

- (id)initWithContext:(EAGLContext *)context decoder:(H264bsdDecoder *)decoder;
- (void)renderNextOutputPicture;

@end
