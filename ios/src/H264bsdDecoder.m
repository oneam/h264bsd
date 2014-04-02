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

#import "h264bsdDecoder.h"
#include "h264bsd_decoder.h"

@interface H264bsdDecoder()
@property (assign, nonatomic) storage_t *pStorage;
@end

@implementation H264bsdDecoder

- (id)init
{
    self = [super init];
    
    if(self)
    {
        self.pStorage = h264bsdAlloc();
        h264bsdInit(self.pStorage, 0);
    }
    
    return self;
}

- (void)dealloc
{
    h264bsdShutdown(self.pStorage);
    h264bsdFree(self.pStorage);
}

- (H264bsdStatus)decode:(NSData *)data offset:(NSUInteger)offset length:(NSUInteger)length bytesRead:(NSUInteger*)bytesRead
{
    u32 readBytes;
    u8 *byteStrm = (u8*)[data bytes] + offset;
    u32 status = h264bsdDecode(self.pStorage, byteStrm, (u32)length, 0, &readBytes);
    *bytesRead = readBytes;
    return (H264bsdStatus)status;
}

- (NSData *)nextOutputPicture
{
    u32 picId, isIdrPic, numErrMbs;
    u8* data = h264bsdNextOutputPicture(self.pStorage, &picId, &isIdrPic, &numErrMbs);
    if(!data) return nil;
    size_t length = self.outputWidth * self.outputHeight * 3 / 2;
    return [NSData dataWithBytes:data length:length];
}

- (NSData *)nextOutputPictureRGBA
{
    u32 picId, isIdrPic, numErrMbs;
    u32* data = h264bsdNextOutputPictureRGBA(self.pStorage, &picId, &isIdrPic, &numErrMbs);
    if(!data) return nil;
    size_t length = self.outputWidth * self.outputHeight * 4;
    return [NSData dataWithBytes:data length:length];
}

- (NSInteger)outputWidth
{
    return h264bsdPicWidth(self.pStorage) * 16;
}

- (NSInteger)outputHeight
{
    return h264bsdPicHeight(self.pStorage) * 16;
}

- (H264CroppingParams)croppingParams
{
    u32 croppingFlag, left, width, top, height;
    
    h264bsdCroppingParams(self.pStorage, &croppingFlag, &left, &width, &top, &height);
    
    H264CroppingParams params =
    {
        (croppingFlag > 0) ? YES : NO,
        top,
        left,
        width,
        height
    };
    
    return params;
}

@end
