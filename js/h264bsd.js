//
//  Copyright (c) 2013 Sam Leitch. All rights reserved.
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

var H264BSD_RDY = 0;
var H264BSD_PIC_RDY = 1;
var H264BSD_HDRS_RDY = 2;
var H264BSD_ERROR = 3;
var H264BSD_PARAM_SET_ERROR = 4;
var H264BSD_MEMALLOC_ERROR = 5;

// storage_t* h264bsdAlloc();
function h264bsdAlloc() {
	return Module.ccall('h264bsdAlloc', number);
}

// void h264bsdFree(storage_t *pStorage);
function h264bsdFree(pStorage) {
	Module.ccall('h264bsdFree', null, [number], [decoder]);
}

// u32 h264bsdInit(storage_t *pStorage, u32 noOutputReordering);
function h264bsdInit(pStorage, noOutputReordering) {
	return Module.ccall('h264bsdInit', number, [number, number], [decoder, noOutputReordering]);
}

//void h264bsdShutdown(storage_t *pStorage);
function h264bsdShutdown(pStorage) {
	Module.ccall('h264bsdShutdown', null, [number], [decoder]);
}

// u32 h264bsdDecode(storage_t *pStorage, u8 *byteStrm, u32 len, u32 picId, u32 *readBytes);
function h264bsdDecode(pStorage, pBytes, len, picId, pBytesRead) {
	return Module.ccall('h264bsdDecode', 
		number, 
		[number, number, number, number, number], 
		[pStorage, pBytes, len, picId, pReadBytes]);
}

// u8* h264bsdNextOutputPicture(storage_t *pStorage, u32 *picId, u32 *isIdrPic, u32 *numErrMbs);
function h264bsdNextOutputPicture(pStorage, pPicId, pIsIdrPic, pNumErrMbs) {
	return Module.ccall('h264bsdNextOutputPicture', 
		number, 
		[number, number, number, number], 
		[pStorage, pPicId, pIsIdrPic, pNumErrMbs]);
}

// u32 h264bsdPicWidth(storage_t *pStorage);
function h264bsdPicWidth(pStorage) {
	return Module.ccall('h264bsdPicWidth', number, [number], [decoder]);
}

// u32 h264bsdPicHeight(storage_t *pStorage);
function h264bsdPicHeight(pStorage) {
	return Module.ccall('h264bsdPicHeight', number, [number], [decoder]);
}

// void h264bsdCroppingParams(storage_t *pStorage, u32 *croppingFlag, u32 *left, u32 *width, u32 *top, u32 *height);
function h264bsdCroppingParams(pStorage, pCroppingFlag, pLeft, pWidth, pTop, pHeight) {
	return Module.ccall('h264bsdCroppingParams', 
		number, 
		[number, number, number, number, number, number, number], 
		[pStorage, pCroppingFlag, pLeft, pWidth, pTop, pHeight]);
}
