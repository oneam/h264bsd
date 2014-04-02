/*
 *  Copyright (c) 2014 h264bsd. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

#import "ViewController.h"
#import "H264bsdDecoder.h"
#import "H264bsdRendererGl.h"

@interface ViewController ()

@property (strong, nonatomic) NSData *videoData;
@property (strong, nonatomic) H264bsdDecoder *decoder;
@property (assign, nonatomic) NSUInteger offset;
@property (assign, atomic) BOOL playbackStarted;
@property (strong, nonatomic) H264bsdRendererGl *renderer;

@end

@implementation ViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    [self stopPlayback];
	[self loadVideoData];
    [self initializeDecoder];
    [self initializeView];
}

- (void)viewWillAppear:(BOOL)animated
{
    [self startPlayback];
}

- (void)viewWillDisappear:(BOOL)animated
{
    [self stopPlayback];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (void)loadVideoData
{
    NSString *test_data = [[NSBundle mainBundle] pathForResource:@"test_640x360" ofType:@"h264"];
    NSData *videoData = [NSData dataWithContentsOfFile:test_data];
    self.videoData = videoData;
}

- (void)initializeDecoder
{
    H264bsdDecoder *decoder = [[H264bsdDecoder alloc] init];
    self.decoder = decoder;
}

- (void)initializeView
{
    EAGLContext *context = [[EAGLContext alloc] initWithAPI:kEAGLRenderingAPIOpenGLES2];
    
    if (!context) {
        NSLog(@"failed to create context");
        return;
    }
    
    self.renderer = [[H264bsdRendererGl alloc] initWithContext:context decoder:self.decoder];
    
    GLKView *view = (GLKView *)self.view;
    view.delegate = self;
    view.enableSetNeedsDisplay = YES;
    view.context = context;
    
    view.drawableColorFormat = GLKViewDrawableColorFormatRGBA8888;
    view.drawableDepthFormat = GLKViewDrawableDepthFormat24;
    view.drawableStencilFormat = GLKViewDrawableStencilFormat8;
}

- (void)startPlayback
{
    if(self.playbackStarted) return;
    self.playbackStarted = YES;
    [self playbackLoop];
}

- (void)stopPlayback
{
    self.playbackStarted = NO;
}

- (void)playbackLoop
{
    if(!self.playbackStarted) return;
    
    [self decodeNextImage];

    dispatch_async(dispatch_get_main_queue(), ^{
        [self playbackLoop];
    });
}

- (void)decodeNextImage
{
    H264bsdStatus status = H264bsdStatusReady;
    
    while(status != H264bsdStatusPictureReady)
    {
        NSUInteger bytesRead;
        NSUInteger length = self.videoData.length - self.offset;
        
        status = [self.decoder decode:self.videoData offset:self.offset length:length bytesRead:&bytesRead];
        
        self.offset += bytesRead;
        if(self.offset >= self.videoData.length) self.offset = 0;
    }
    
    [self.view setNeedsDisplay];
}

- (void)glkView:(GLKView *)view drawInRect:(CGRect)rect
{
    [self.renderer renderNextOutputPicture];
}

@end
