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

/*
 * This class wraps the details of the h264bsd library.
 */
function H264Decoder(Module) {
	this.Module = Module;
	this.released = false;

	this.pStorage = H264Decoder.h264bsdAlloc();
	H264Decoder.h264bsdInit(this.Module, this.pStorage, 0);
}

H264Decoder.prototype.release = function() {
	if(this.released) return;

	this.released = true;
	H264Decoder.h264bsdShutdown(this.Module, this.pStorage);
	H264Decoder.h264bsdFree(this.Module, this.pStorage);
}

H264Decoder.prototype.decode = function(data) {
	if(data === undefined || !(data instanceof DataView)) {
		throw new Error("data must be a DataView instance")
	}

	if(!(data instanceof Uint8Array)) {
		data = Uint8Array(data);
	}

	var heapOffset = 0;
	var allocedPtr = 0;

	if(data.buffer === Module.HEAPU8.buffer) {
		heapOffset = data.byteOffset;
	} else {
		heapOffset = allocedPtr = H264Decoder.malloc(this.Module, data.byteLength);
		this.Module.HEAPU8.set(data, heapOffset);
	}

	var len = byteLength;
	var offset = heapOffset;
	while(len > 0) {
		// TODO: Do the decode and return data here
	}

	if(allocedPtr != 0) {
		H264Decoder.free(this.Module, allocedPtr);
	}
}

H264Decoder.RDY = 0;
H264Decoder.PIC_RDY = 1;
H264Decoder.HDRS_RDY = 2;
H264Decoder.ERROR = 3;
H264Decoder.PARAM_SET_ERROR = 4;
H264Decoder.MEMALLOC_ERROR = 5;

// storage_t* h264bsdAlloc();
H264Decoder.h264bsdAlloc = function(Module) {
	return Module.ccall('_h264bsdAlloc', number);
}

// void h264bsdFree(storage_t *pStorage);
H264Decoder.h264bsdFree = function(Module, pStorage) {
	Module.ccall('_h264bsdFree', null, [number], [pStorage]);
}

// u32 h264bsdInit(storage_t *pStorage, u32 noOutputReordering);
H264Decoder.h264bsdInit = function(Module, pStorage, noOutputReordering) {
	return Module.ccall('_h264bsdInit', number, [number, number], [pStorage, noOutputReordering]);
}

//void h264bsdShutdown(storage_t *pStorage);
H264Decoder.h264bsdShutdown = function(Module, pStorage) {
	Module.ccall('_h264bsdShutdown', null, [number], [pStorage]);
}

// u32 h264bsdDecode(storage_t *pStorage, u8 *byteStrm, u32 len, u32 picId, u32 *readBytes);
H264Decoder.h264bsdDecode = function(Module, pStorage, pBytes, len, picId, pBytesRead) {
	return Module.ccall('_h264bsdDecode', 
		number, 
		[number, number, number, number, number], 
		[pStorage, pBytes, len, picId, pReadBytes]);
}

// u8* h264bsdNextOutputPicture(storage_t *pStorage, u32 *picId, u32 *isIdrPic, u32 *numErrMbs);
H264Decoder.h264bsdNextOutputPicture = function(Module, pStorage, pPicId, pIsIdrPic, pNumErrMbs) {
	return Module.ccall('_h264bsdNextOutputPicture', 
		number, 
		[number, number, number, number], 
		[pStorage, pPicId, pIsIdrPic, pNumErrMbs]);
}

// u32 h264bsdPicWidth(storage_t *pStorage);
H264Decoder.h264bsdPicWidth = function(Module, pStorage) {
	return Module.ccall('_h264bsdPicWidth', number, [number], [pStorage]);
}

// u32 h264bsdPicHeight(storage_t *pStorage);
H264Decoder.h264bsdPicHeight = function(Module, pStorage) {
	return Module.ccall('_h264bsdPicHeight', number, [number], [pStorage]);
}

// void h264bsdCroppingParams(storage_t *pStorage, u32 *croppingFlag, u32 *left, u32 *width, u32 *top, u32 *height);
H264Decoder.h264bsdCroppingParams = function(Module, pStorage, pCroppingFlag, pLeft, pWidth, pTop, pHeight) {
	return Module.ccall('_h264bsdCroppingParams', 
		number, 
		[number, number, number, number, number, number, number], 
		[pStorage, pCroppingFlag, pLeft, pWidth, pTop, pHeight]);
}

// u32 h264bsdCheckValidParamSets(storage_t *pStorage);
H264Decoder.h264bsdCheckValidParamSets = function(Module, pStorage){
	return Module.ccall('_h264bsdCheckValidParamSets', number, [number], [pStorage]);
}

// void* malloc(size_t size);
H264Decoder.malloc = function(Module, size){
	return Module.ccall('_malloc', number, [number], [size]);
}

// void free(void* ptr);
H264Decoder.free = function(Module, ptr){
	return Module.ccall('_free', null, [number], [ptr]);
}

// void* memcpy(void* dest, void* src, size_t size);
H264Decoder.memcpy = function(Module, length){
	return Module.ccall('_malloc', number, [number, number, number], [dest, src, size]);
}
