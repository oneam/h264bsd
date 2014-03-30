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
#include "H264bsdDecoder.h"

@interface ViewController ()

@property (strong, nonatomic) NSData *videoData;
@property (strong, nonatomic) H264bsdDecoder *decoder;
@property (assign, nonatomic) NSUInteger offset;
@property (assign, atomic) BOOL playbackStarted;

@end

@implementation ViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    [self stopPlayback];
	[self loadVideoData];
    [self initializeDecoder];
    [self startPlayback];
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
    
    NSData* nextImage = [self decodeNextImage];
    [self displayImage:nextImage];

    dispatch_async(dispatch_get_main_queue(), ^{
        [self playbackLoop];
    });
}

- (NSData*)decodeNextImage
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
    
    NSData *nextOutputPicture = [self.decoder nextOutputPictureRGBA];
    return nextOutputPicture;
}

- (void)displayImage:(NSData *)nextImage
{
    size_t width = self.decoder.outputWidth;
    size_t height = self.decoder.outputHeight;
    size_t bytesPerRow = width * 4;
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGDataProviderRef imageDataProvider = CGDataProviderCreateWithCFData((CFDataRef)nextImage);
    
    CGImageRef image = CGImageCreate(width, height, 8, 32, bytesPerRow, colorSpace, kCGBitmapByteOrderDefault|kCGImageAlphaLast, imageDataProvider, NULL, NO, kCGRenderingIntentDefault);
    
    self.view.layer.contents = (__bridge id)image;
    
    CGImageRelease(image);
    CGDataProviderRelease(imageDataProvider);
    CGColorSpaceRelease(colorSpace);
}

@end
