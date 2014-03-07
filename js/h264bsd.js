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
 * Module object is an Emscripten module provided globally by h264bsd_asm.js
 * targetElement element is an HTML element that will emit events that should 
 * be listened for when H264 images are ready to be displayed
 * forceRGB boolean Says whether the YUV->RGB decoding should be used (even 
 * in the presence of the WebGL canvas)
 */
function H264Decoder(Module, targetElement, forceRGB) {
	var self = this;	
	self.Module = Module;
	self.released = false;
	self.yuvCanvas = null;
	self.pStorage = H264Decoder.h264bsdAlloc_(self.Module);
	H264Decoder.h264bsdInit_(self.Module, self.pStorage, 0);
	self.targetElement = targetElement;	

	//If we are using RGB
	if (forceRGB){
		self.useWebGL = false;
		self.precision = 32768;

		//Calculate all of the YUV->RGB coefficients 
		self.co_y = Math.floor((1.164 * self.precision) + 0.5);
		self.co_rv = Math.floor((1.596 * self.precision) + 0.5);
		self.co_gu = Math.floor((0.391 * self.precision) + 0.5);
		self.co_gv = Math.floor((0.813 * self.precision) + 0.5);
		self.co_bu = Math.floor((2.018 * self.precision) + 0.5);

		self.coefficients_y = [];
		for(var i = 0; i < 256; i++)
		{
			self.coefficients_y[i] = self.co_y * (i - 16) + (self.precision / 2);
		}

		self.coefficients_rv = [];
		for(var i = 0; i < 256; i++)
		{
			self.coefficients_rv[i] = self.co_rv * (i - 128);
		}

		self.coefficients_gu = [];
		for(var i = 0; i < 256; i++)
		{
			self.coefficients_gu[i] = self.co_gu * (i - 128);
		}

		self.coefficients_gv = [];
		for(var i = 0; i < 256; i++)
		{
			self.coefficients_gv[i] = self.co_gv * (i - 128);
		}

		self.coefficients_bu = [];
		for(var i = 0; i < 256; i++)
		{
			self.coefficients_bu[i] = self.co_bu * (i - 128);
		}
	}else{
		//Check if we can use WebGL (as this dictates the output pipline)
		self.useWebGL = H264Decoder.detectWebGl_();	
	}	
};

H264Decoder.RDY = 0;
H264Decoder.PIC_RDY = 1;
H264Decoder.HDRS_RDY = 2;
H264Decoder.ERROR = 3;
H264Decoder.PARAM_SET_ERROR = 4;
H264Decoder.MEMALLOC_ERROR = 5;

//Clean up memory used by the decoder
H264Decoder.prototype.release = function() {
	var self = this;
	if(self.released) return;

	self.released = true;
	self.h264bsdShutdown_(self.pStorage);
	self.h264bsdFree_(self.pStorage);
};

//Takes an array buffer of bytes and returns a UInt8Array of the decoded bytes
H264Decoder.prototype.decode = function(data) {
	var self = this;
	if(typeof data === 'undefined' || !(data instanceof ArrayBuffer)) {
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
	pData = pAlloced = self.malloc_(length);
	self.Module.HEAPU8.set(data, pData);

	//get a pointer to where bytesRead will be stored: Uint32 = 4 bytes
	pBytesRead = self.malloc_(4);

	var loopBody = function() {
		if(length <= 0) {
			cleanup();
			return;
		}

		retCode = self.h264bsdDecode_(self.pStorage, pData, length, lastPicId, pBytesRead);		
		bytesRead = self.Module.getValue(pBytesRead, 'i32');
		switch(retCode){
			case H264Decoder.PIC_RDY:
				lastPicId++;
				var evt = new CustomEvent("pictureReady", {
					detail: self.getNextOutputPicture()
				});

				if (self.targetElement != null){
					//Raise the event on the displaying canvas element
					self.targetElement.dispatchEvent(evt);
				}				
				break;
		}

		length = length - bytesRead;		
		pData = pData + bytesRead;

		setTimeout(loopBody, 0);
	}

	var cleanup =  function() {
		if(pAlloced != 0) {
			self.free_(pAlloced);
		}
		
		if(pBytesRead != 0) {
			self.free_(pBytesRead);
		}
	}

	loopBody();
};

H264Decoder.prototype.getNextOutputPicture = function(){
	var self = this; 
	var length = self.getYUVLength_(self.pStorage);

	var pPicId = self.malloc_(4);
	var picId = 0;

	var pIsIdrPic = self.malloc_(4);
	var isIdrPic = 0;

	var pNumErrMbs = self.malloc_(4);
	var numErrMbs = 0;

	var pBytes = self.h264bsdNextOutputPicture_(self.pStorage, pPicId, pIsIdrPic, pNumErrMbs);
	var bytes = null;

	//We don't really use these
	picId = self.Module.getValue(pPicId, 'i32');	
	isIdrPic = self.Module.getValue(pIsIdrPic, 'i32');	
	numErrMbs = self.Module.getValue(pNumErrMbs, 'i32');
		
	bytes = self.Module.HEAPU8.subarray(pBytes, (pBytes + length));

    self.free_(pPicId);		
  	self.free_(pIsIdrPic);
    self.free_(pNumErrMbs);	

    var ret = {};
    var croppingInfo = self.getCroppingInfo_(self.pStorage);

    //Return bytes according to the requested format
    var mbWidth = self.h264bsdPicWidth_(self.pStorage)*16;
    var mbHeight = self.h264bsdPicHeight_(self.pStorage)*16;
    if (self.useWebGL){
		ret = {
		    encoding: 'YUV',
		    picture: bytes, 
		    height: croppingInfo.height, 
		    width: croppingInfo.width,
		    mbWidth: mbWidth,
		    mbHeight: mbHeight
		};		
    }else{
		ret = {
			encoding: 'RGB',
		    picture: H264Decoder.convertYUV2RGB_(bytes, croppingInfo, self, mbWidth, mbHeight),
		    height: croppingInfo.height, 
		    width: croppingInfo.width,
  		    mbWidth: mbWidth,
		    mbHeight: mbHeight
		};
    }
    
    return ret; 
};


H264Decoder.prototype.getCroppingInfo_ = function(pStorage){
	var self = this;
	
	var pCroppingFlag = self.malloc_(4);
	var croppingFlag = 0;

	var pLeftOffset = self.malloc_(4);
	var leftOffset = 0;

	var pWidth = self.malloc_(4);
	var width = 0;

	var pTopOffset = self.malloc_(4);
	var topOffset = 0;

	var pHeight = self.malloc_(4);
	var height = 0;


	self.h264bsdCroppingParams_(pStorage, pCroppingFlag, pLeftOffset, pWidth, pTopOffset, pHeight);
	
	croppingFlag = self.Module.getValue(pCroppingFlag, 'i32');	
	leftOffset = self.Module.getValue(pLeftOffset, 'i32');	
	width = self.Module.getValue(pWidth, 'i32');
	topOffset = self.Module.getValue(pTopOffset, 'i32');
	height = self.Module.getValue(pHeight, 'i32');

	var result = {
		'width': width,
		'height': height,
		'top': topOffset,
		'left': leftOffset
	};
	return result;
};

H264Decoder.prototype.getYUVLength_ = function(pStorage){	
	var width = self.h264bsdPicWidth_(pStorage);
	var height = self.h264bsdPicHeight_(pStorage);
    return (width * 16 * height * 16) + (2 * width * 16 * height * 8);
};

//http://www.browserleaks.com/webgl#howto-detect-webgl
H264Decoder.detectWebGl_ = function()
{
    if (!!window.WebGLRenderingContext) {
        var canvas = document.createElement("canvas"),
             names = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"],
           context = false; 
        for(var i=0;i<4;i++) {
            try {
                context = canvas.getContext(names[i]);
                if (context && typeof context.getParameter == "function") {
                    // WebGL is enabled                    
                    return true;
                }
            } catch(e) {}
        } 
        // WebGL is supported, but disabled
        return false;
    }
    // WebGL not supported
    return false;
};

//If WebGL Canvas is not availble, this will convert an array of yuv bytes into an array of rgb bytes
H264Decoder.convertYUV2RGB_ = function(yuvBytes, croppingInfo, exCtx, mbWidth, mbHeight){
	var width = mbWidth - croppingInfo.left;
	var height = mbHeight - croppingInfo.top;
	var rgbBytes = new Uint8ClampedArray(4 * height * width);

	var lumaSize = width * height;
	var chromaSize = lumaSize >> 2;
	
	var planeY_off = 0;
	var planeU_off = lumaSize;
	var planeV_off = lumaSize + chromaSize;

	var stride_Y_h_off;
	var stride_UV_h_off;
	var stride_RGBA_off;
	for (var h=0;h<height;h++) {
		stride_Y_h_off = (width)*h;
		stride_UV_h_off = (width>>1)*(h>>1);
		stride_RGBA_off = (width<<2)*h;
		for (var w=0; w<width; w++) {
			var Y = yuvBytes[planeY_off+ w+stride_Y_h_off];
			stride_UV_off = (w>>1)+stride_UV_h_off;
			var U = (yuvBytes[planeU_off+ stride_UV_off]);
			var V = (yuvBytes[planeV_off+ stride_UV_off]);
			
			var R = exCtx.coefficients_y[Y] + exCtx.coefficients_rv[V];
			var G = exCtx.coefficients_y[Y] - exCtx.coefficients_gu[U] - exCtx.coefficients_gv[V];
			var B = exCtx.coefficients_y[Y] + exCtx.coefficients_bu[U];

			R = R >> 15; // div by 32768
			G = G >> 15;
			B = B >> 15;

			var outputData_pos = (w<<2)+stride_RGBA_off;
			rgbBytes[0+outputData_pos] = R;
			rgbBytes[1+outputData_pos] = G;
			rgbBytes[2+outputData_pos] = B;
			rgbBytes[3+outputData_pos] = 255;
		}			
	}

	return rgbBytes;
};

// u32 h264bsdDecode(storage_t *pStorage, u8 *byteStrm, u32 len, u32 picId, u32 *readBytes);
H264Decoder.prototype.h264bsdDecode_ = function(pStorage, pBytes, len, picId, pBytesRead) {
	return this.Module.ccall('h264bsdDecode', Number, 
		[Number, Number, Number, Number, Number], 
		[pStorage, pBytes, len, picId, pBytesRead]);
};

// storage_t* h264bsdAlloc();
H264Decoder.prototype.h264bsdAlloc_ = function() {
	return this.Module.ccall('h264bsdAlloc', Number);
};

// void h264bsdFree(storage_t *pStorage);
H264Decoder.prototype.h264bsdFree_ = function(pStorage) {
	this.Module.ccall('h264bsdFree', null, [Number], [pStorage]);
};

// u32 h264bsdInit(storage_t *pStorage, u32 noOutputReordering);
H264Decoder.prototype.h264bsdInit_ = function(pStorage, noOutputReordering) {
	return this.Module.ccall('h264bsdInit', Number, [Number, Number], [pStorage, noOutputReordering]);
};

//void h264bsdShutdown(storage_t *pStorage);
H264Decoder.prototype.h264bsdShutdown_ = function(pStorage) {
	this.Module.ccall('h264bsdShutdown', null, [Number], [pStorage]);
};

// u8* h264bsdNextOutputPicture(storage_t *pStorage, u32 *picId, u32 *isIdrPic, u32 *numErrMbs);
H264Decoder.prototype.h264bsdNextOutputPicture_ = function(pStorage, pPicId, pIsIdrPic, pNumErrMbs) {
	return this.Module.ccall('h264bsdNextOutputPicture', 
		Number, 
		[Number, Number, Number, Number], 
		[pStorage, pPicId, pIsIdrPic, pNumErrMbs]);
};

// u32 h264bsdPicWidth(storage_t *pStorage);
H264Decoder.prototype.h264bsdPicWidth_ = function(pStorage) {
	return this.Module.ccall('h264bsdPicWidth', Number, [Number], [pStorage]);
};

// u32 h264bsdPicHeight(storage_t *pStorage);
H264Decoder.prototype.h264bsdPicHeight_ = function(pStorage) {
	return this.Module.ccall('h264bsdPicHeight', Number, [Number], [pStorage]);
};

// void h264bsdCroppingParams(storage_t *pStorage, u32 *croppingFlag, u32 *left, u32 *width, u32 *top, u32 *height);
H264Decoder.prototype.h264bsdCroppingParams_ = function(pStorage, pCroppingFlag, pLeft, pWidth, pTop, pHeight) {
	return this.Module.ccall('h264bsdCroppingParams', 
		Number, 
		[Number, Number, Number, Number, Number, Number, Number], 
		[pStorage, pCroppingFlag, pLeft, pWidth, pTop, pHeight]);
};

// u32 h264bsdCheckValidParamSets(storage_t *pStorage);
H264Decoder.prototype.h264bsdCheckValidParamSets_ = function(pStorage){
	return this.Module.ccall('h264bsdCheckValidParamSets', Number, [Number], [pStorage]);
};

// u32* h264bsdNextOutputPictureARGB(storage_t *pStorage, u32 *picId, u32 *isIdrPic, u32 *numErrMbs);
H264Decoder.prototype.h264bsdNextOutputPictureARGB_ = function(pStorage, pPicId, pIsIdrPic, pNumErrMbs){
	return this.Module.ccall('h264bsdNextOutputPictureARGB', 
		Number, 
		[Number, Number, Number, Number], 
		[pStorage, pPicId, pIsIdrPic, pNumErrMbs]);
};

//void h264bsdConvertToARGB(u32 width, u32 height, u8* data, u32 *rgbData);
H264Decoder.prototype.h264bsdConvertToARGB_ = function(width, height, pData, pRgbData){
	this.Module.ccall('h264bsdConvertToARGB', 
		Number, 
		[Number, Number, Number, Number], 
		[width, height, pData, pRgbData]);
};

// void* malloc(size_t size);
H264Decoder.prototype.malloc_ = function(size){
	return this.Module.ccall('malloc', Number, [Number], [size]);
};

// void free(void* ptr);
H264Decoder.prototype.free_ = function(ptr){
	return this.Module.ccall('free', null, [Number], [ptr]);
};

// void* memcpy(void* dest, void* src, size_t size);
H264Decoder.prototype.memcpy_ = function(length){
	return this.Module.ccall('malloc', Number, [Number, Number, Number], [dest, src, size]);
};
