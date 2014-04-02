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

- (id)initWithContext:(EAGLContext *)context;
- (void)renderNextOutputPictureWithDecoder:(H264bsdDecoder *)decoder;

@end
