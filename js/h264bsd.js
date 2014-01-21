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
function H264Decoder(Module, targetCanvas) {
	H264Decoder.Module = Module;
	H264Decoder.released = false;

	H264Decoder.pStorage = H264Decoder.h264bsdAlloc();

	H264Decoder.h264bsdInit(H264Decoder.Module, H264Decoder.pStorage, 0);
	H264Decoder.targetCanvas = targetCanvas;
};


H264Decoder.RDY = 0;
H264Decoder.PIC_RDY = 1;
H264Decoder.HDRS_RDY = 2;
H264Decoder.ERROR = 3;
H264Decoder.PARAM_SET_ERROR = 4;
H264Decoder.MEMALLOC_ERROR = 5;

H264Decoder.Module = null;
H264Decoder.released = false;
H264Decoder.pStorage = null;
H264Decoder.targetCanvas = null;
H264Decoder.yuvCanvas = null;

H264Decoder.prototype.release = function() {
	if(this.released) return;

	this.released = true;
	H264Decoder.h264bsdShutdown(this.Module, this.pStorage);
	H264Decoder.h264bsdFree(this.Module, this.pStorage);
};

H264Decoder.prototype.decode = function(data) {
	if(data === undefined || !(data instanceof ArrayBuffer)) {
		throw new Error("data must be a ArrayBuffer instance")
	}
	
	data = new Uint8Array(data);
	
	var pData = 0; //The offset into the heap when decoding 
	var pAlloced = 0; //The original pointer to the data buffer (for freeing)
	var pBytesRead = 0; //Pointer to bytesRead
	var length = data.byteLength; //The byte-wise length of the data to decode	
	var bytesRead = 0;  //The number of bytes read from a decode operation
	var retCode = 0; //Return code from a decode operation
	var lastPicId = 0; //ID of the last picture decoded

	//Get a pointer into the heap were our decoded bytes will live
	pData = pAlloced = H264Decoder.malloc(H264Decoder.Module, length);
	H264Decoder.Module.HEAPU8.set(data, pData);

	//get a pointer to where bytesRead will be stored: Uint32 = 4 bytes
	pBytesRead = H264Decoder.malloc(H264Decoder.Module, 4);

	//Keep decoding frames while there is still something to decode
	while(length > 0) {

		retCode = H264Decoder.h264bsdDecode(H264Decoder.Module, H264Decoder.pStorage, pData, length, lastPicId, pBytesRead);		
		bytesRead = H264Decoder.Module.getValue(pBytesRead, 'i32');
		window.console.log('Ret: ' , retCode, ' bytesRead: ', bytesRead);

		switch(retCode){
			case H264Decoder.PIC_RDY:
				lastPicId++;
				window.console.log('h264bsdDecode, PIC_RDY: ', lastPicId);
				H264Decoder.getNextOutputPicture();
				break;
			case H264Decoder.HDRS_RDY:

				break;
		}

		length = length - bytesRead;		
		pData = pData + bytesRead;
	}

	if(pAlloced != 0) {
		H264Decoder.free(H264Decoder.Module, pAlloced);
	}
	
	if(pBytesRead != 0) {
		H264Decoder.free(H264Decoder.Module, pBytesRead);
	}

};

H264Decoder.clamp = function(num, max, min) {
  return Math.min(Math.max(num, min), max);
};

H264Decoder.getNextOutputPicture = function(){
	var length = H264Decoder.getYUVLength();

	var pPicId = H264Decoder.malloc(H264Decoder.Module, 4);
	var picId = 0;

	var pIsIdrPic = H264Decoder.malloc(H264Decoder.Module, 4);
	var isIdrPic = 0;

	var pNumErrMbs = H264Decoder.malloc(H264Decoder.Module, 4);
	var numErrMbs = 0;

	var pBytes = H264Decoder.h264bsdNextOutputPicture(H264Decoder.Module, H264Decoder.pStorage, pPicId, pIsIdrPic, pNumErrMbs);
	var bytes = null;

	picId = H264Decoder.Module.getValue(pPicId, 'i32');	
	isIdrPic = H264Decoder.Module.getValue(pIsIdrPic, 'i32');	
	numErrMbs = H264Decoder.Module.getValue(pNumErrMbs, 'i32');

	window.console.log('getNextOutputPicture: picId: ' + picId + ', isIdrPic: ' + isIdrPic + ', numErrMbs: ' + numErrMbs + ', length: ' + length);

	bytes = new Uint8Array();
	bytes = H264Decoder.Module.HEAPU8.subarray(pBytes, (pBytes + length));


	if (pPicId != 0){
        H264Decoder.free(pPicId);		
	}
               
    if (pIsIdrPic != 0){
    	H264Decoder.free(pIsIdrPic);
    }
            
    if (pNumErrMbs != 0){
        H264Decoder.free(pNumErrMbs);	
    }

    var croppingInfo = H264Decoder.getCroppingInfo();
    H264Decoder.drawWebGl(bytes, croppingInfo);
    //var result = H264Decoder.convertYUV2RGB(bytes, croppingInfo);
    
    H264Decoder.free(pPicId);		
  	H264Decoder.free(pIsIdrPic);
    H264Decoder.free(pNumErrMbs);	

};

H264Decoder.drawWebGl = function(yuvBytes, croppingInfo){
	if (yuvBytes == null)
		return;

	var width = croppingInfo.width - croppingInfo.left;
	var height = croppingInfo.height - croppingInfo.top;
	H264Decoder.yuvCanvas = new YUVWebGLCanvas(H264Decoder.targetCanvas, new Size(width, height));
	
	var startTime = (new Date);	
	var lumaSize = width * height;
	var chromaSize = lumaSize >> 2;

    H264Decoder.yuvCanvas.YTexture.fill(yuvBytes.subarray(0, lumaSize), true);
    H264Decoder.yuvCanvas.UTexture.fill(yuvBytes.subarray(lumaSize, lumaSize + chromaSize), true);
    H264Decoder.yuvCanvas.VTexture.fill(yuvBytes.subarray(lumaSize + chromaSize, lumaSize + 2 * chromaSize), true);
    H264Decoder.yuvCanvas.drawScene();

    console.log("WebGL YUV decode: " + ((new Date) - startTime));

	// var thisFrame = (self.thisLoop = new Date) - self.lastLoop;
 //  	self.frameTime += (thisFrame - self.frameTime) / self.filterStrength;
 //  	self.lastLoop = self.thisLoop;
 //  	self.stats['fps']  = (1000/self.frameTime).toFixed(1);
 //  	if (self.onImageUpdated)
 //  		self.onImageUpdated(self.stats);		
 //  	self.frameCount = 0;

};

//Excessively pink
H264Decoder.convertYUV2RGB = function(yuvBytes, croppingInfo){
	var width = croppingInfo.width - croppingInfo.left;
	var height = croppingInfo.height - croppingInfo.top;

	var buffer = document.createElement('canvas');
	buffer.height = height;
	buffer.width = width; 
	var context = buffer.getContext('2d');
	var output = context.createImageData(width,height);
	var rgbBytes = output.data;

	var cb = width * height;
	var cr = cb + ((width * height) / 2);	
	var numPixels = width * height;

	var dst = 0;
	var dst_width = 0;

	var k = 0;
	for (var i = 0; i < numPixels; i += 2)
	{
		k += 1;

		var y1 = yuvBytes[i] & 0xff;
		var y2 = yuvBytes[i + 1] & 0xff;
		var y3 = yuvBytes[width + i] & 0xff;
		var y4 = yuvBytes[width + i + 1] & 0xff;
		
		var v = yuvBytes[cr + k] & 0xff;
		var u = yuvBytes[cb + k] & 0xff;
		
		v = v - 128;
		u = u - 128;

		dst = i * 4;
		dst_width = width*4 + dst;

		// i
		rgbBytes[dst] = 0xff;
		rgbBytes[dst + 1] = H264Decoder.clamp((298 * (y1 - 16) + 409 * v + 128) >> 8, 255, 0);
		rgbBytes[dst + 2] = H264Decoder.clamp((298 * (y1 - 16) - 100 * u - 208 *v + 128) >> 8, 255,0);
		rgbBytes[dst + 3] = H264Decoder.clamp((298 * y1 + 516*u + 128) >> 8, 255, 0);
				
		// i + 1
		rgbBytes[dst + 4] = 0xff;
		rgbBytes[dst + 5] = H264Decoder.clamp((298 * (y2 - 16) + 409 * v + 128) >> 8, 255, 0);
		rgbBytes[dst + 6] = H264Decoder.clamp((298 * (y2 - 16) - 100 * u - 208 *v + 128) >> 8, 255,0);
		rgbBytes[dst + 7] = H264Decoder.clamp((298 * y2 + 516*u + 128) >> 8, 255, 0);
		
		//width
		rgbBytes[dst_width] = 0xff;
		rgbBytes[dst_width + 1] = H264Decoder.clamp((298 * (y3 - 16) + 409 * v + 128) >> 8, 255, 0);
		rgbBytes[dst_width + 2] = H264Decoder.clamp((298 * (y2 - 16) - 100 * u - 208 *v + 128) >> 8, 255,0);
		rgbBytes[dst_width + 3] = H264Decoder.clamp((298 * y3 + 516*u + 128) >> 8, 255, 0);
				
		//width + 1
		rgbBytes[dst_width + 4] = 0xff;
		rgbBytes[dst_width + 5] = H264Decoder.clamp((298 * (y4 - 16) + 409 * v + 128) >> 8, 255, 0);
		rgbBytes[dst_width + 6] = H264Decoder.clamp((298 * (y4 - 16) - 100 * u - 208 *v + 128) >> 8, 255,0);
		rgbBytes[dst_width + 7] = H264Decoder.clamp((298 * y4 + 516*u + 128) >> 8, 255, 0);

		if (i != 0 && (i+2)%width ==0) {
			i += width;					
		} 
	}

	var c = document.getElementById('canvas');
	c.height = height;
	c.width = width;
	c.style.height = height;
	c.style.width = width;
	var outputContext = c.getContext('2d'); 
	outputContext.putImageData(output,0,0);
};

H264Decoder.getCroppingInfo = function(){
	var pCroppingFlag = H264Decoder.malloc(H264Decoder.Module, 4);
	var pLeftOffset = H264Decoder.malloc(H264Decoder.Module, 4);
	var pTopOffset = H264Decoder.malloc(H264Decoder.Module, 4);
	var pWidth = H264Decoder.malloc(H264Decoder.Module, 4);
	var pHeight = H264Decoder.malloc(H264Decoder.Module, 4);

	var result = {
		'width': (H264Decoder.h264bsdPicWidth(H264Decoder.Module, H264Decoder.pStorage)*16),
		'height': (H264Decoder.h264bsdPicHeight(H264Decoder.Module, H264Decoder.pStorage)*16),
		'top': 0,
		'left': 0
	};

	H264Decoder.free(pCroppingFlag);
	H264Decoder.free(pLeftOffset);
	H264Decoder.free(pTopOffset);
	H264Decoder.free(pWidth);
	H264Decoder.free(pHeight);

	return result;
};

H264Decoder.getYUVLength = function(){
	var width = H264Decoder.h264bsdPicWidth(H264Decoder.Module, H264Decoder.pStorage);
	var height = H264Decoder.h264bsdPicHeight(H264Decoder.Module, H264Decoder.pStorage);
    return (width * 16 * height * 16) + (2 * width * 16 * height * 8);
};

// u32 h264bsdDecode(storage_t *pStorage, u8 *byteStrm, u32 len, u32 picId, u32 *readBytes);
H264Decoder.h264bsdDecode = function(Module, pStorage, pBytes, len, picId, pBytesRead) {
	return H264Decoder.Module.ccall('h264bsdDecode', Number, 
		[Number, Number, Number, Number, Number], 
		[pStorage, pBytes, len, picId, pBytesRead]);
};

// storage_t* h264bsdAlloc();
H264Decoder.h264bsdAlloc = function(Module) {
	return H264Decoder.Module.ccall('h264bsdAlloc', Number);
};

// void h264bsdFree(storage_t *pStorage);
H264Decoder.h264bsdFree = function(Module, pStorage) {
	H264Decoder.Module.ccall('h264bsdFree', null, [Number], [pStorage]);
};

// u32 h264bsdInit(storage_t *pStorage, u32 noOutputReordering);
H264Decoder.h264bsdInit = function(Module, pStorage, noOutputReordering) {
	return H264Decoder.Module.ccall('h264bsdInit', Number, [Number, Number], [pStorage, noOutputReordering]);
};

//void h264bsdShutdown(storage_t *pStorage);
H264Decoder.h264bsdShutdown = function(Module, pStorage) {
	H264Decoder.Module.ccall('h264bsdShutdown', null, [Number], [pStorage]);
};

// u8* h264bsdNextOutputPicture(storage_t *pStorage, u32 *picId, u32 *isIdrPic, u32 *numErrMbs);
H264Decoder.h264bsdNextOutputPicture = function(Module, pStorage, pPicId, pIsIdrPic, pNumErrMbs) {
	return H264Decoder.Module.ccall('h264bsdNextOutputPicture', 
		Number, 
		[Number, Number, Number, Number], 
		[pStorage, pPicId, pIsIdrPic, pNumErrMbs]);
};

// u32 h264bsdPicWidth(storage_t *pStorage);
H264Decoder.h264bsdPicWidth = function(Module, pStorage) {
	return H264Decoder.Module.ccall('h264bsdPicWidth', Number, [Number], [pStorage]);
};

// u32 h264bsdPicHeight(storage_t *pStorage);
H264Decoder.h264bsdPicHeight = function(Module, pStorage) {
	return H264Decoder.Module.ccall('h264bsdPicHeight', Number, [Number], [pStorage]);
};

// void h264bsdCroppingParams(storage_t *pStorage, u32 *croppingFlag, u32 *left, u32 *width, u32 *top, u32 *height);
H264Decoder.h264bsdCroppingParams = function(Module, pStorage, pCroppingFlag, pLeft, pWidth, pTop, pHeight) {
	return H264Decoder.Module.ccall('h264bsdCroppingParams', 
		Number, 
		[Number, Number, Number, Number, Number, Number, Number], 
		[pStorage, pCroppingFlag, pLeft, pWidth, pTop, pHeight]);
};

// u32 h264bsdCheckValidParamSets(storage_t *pStorage);
H264Decoder.h264bsdCheckValidParamSets = function(Module, pStorage){
	return H264Decoder.Module.ccall('h264bsdCheckValidParamSets', Number, [Number], [pStorage]);
};

// void* malloc(size_t size);
H264Decoder.malloc = function(Module, size){
	return H264Decoder.Module.ccall('malloc', Number, [Number], [size]);
};

// void free(void* ptr);
H264Decoder.free = function(Module, ptr){
	return H264Decoder.Module.ccall('free', null, [Number], [ptr]);
};

// void* memcpy(void* dest, void* src, size_t size);
H264Decoder.memcpy = function(Module, length){
	return H264Decoder.Module.ccall('malloc', Number, [Number, Number, Number], [dest, src, size]);
};
