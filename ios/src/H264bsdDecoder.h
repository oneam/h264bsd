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

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSInteger, H264bsdStatus) {
    H264bsdStatusReady,
    H264bsdStatusPictureReady,
    H264bsdStatusParamsReady,
    H264bsdStatusError,
    H264bsdStatusParamsError,
    H264bsdStatusMemallocError
};

typedef struct
{
    BOOL croppingFlag;
    NSInteger top;
    NSInteger left;
    NSInteger width;
    NSInteger height;
} H264CroppingParams;

@interface H264bsdDecoder : NSObject

@property (readonly, nonatomic) NSInteger outputWidth;
@property (readonly, nonatomic) NSInteger outputHeight;
@property (readonly, nonatomic) H264CroppingParams croppingParams;

- (id)init;
- (void)dealloc;

- (H264bsdStatus)decode:(NSData *)data offset:(NSUInteger)offset length:(NSUInteger)length bytesRead:(NSUInteger*)bytesRead;

- (NSData *)nextOutputPicture;
- (NSData *)nextOutputPictureRGBA;

@end
