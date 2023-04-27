//
//  Copyright (c) 2014-2022 Sam Leitch. All rights reserved.
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

var noInput = true;
var decoder = null;

function onMessage(e) {
    var message = e.data;
    switch(message.type) {
    case 'queueInput' :
        decoder.queueInput(message.data, message.flush);
        if(noInput) {
          noInput = false;
          decodeLoop();
        }
        break;
    }
}

function onPictureReady() {
    var width = decoder.outputPictureWidth();
    var height = decoder.outputPictureHeight();
    var croppingParams = decoder.croppingParams();
    var output = decoder.nextOutputPicture();

    postMessage({
      'type' : 'pictureReady',
      'width' : width,
      'height' : height,
      'croppingParams' : croppingParams,
      'data' : output.buffer,
    }, [output.buffer]);
}

function onHeadersReady() {
    var width = decoder.outputPictureWidth();
    var height = decoder.outputPictureHeight();
    var croppingParams = decoder.croppingParams();

    postMessage({
      'type' : 'pictureParams',
      'width' : width,
      'height' : height,
      'croppingParams' : croppingParams,
    });
}

function decodeOnce() {
    var result = decoder.decode();

    switch(result) {
    case H264bsdDecoder.ERROR:
        postMessage({'type': 'decodeError'});
        break;
    case H264bsdDecoder.PARAM_SET_ERROR:
        postMessage({'type': 'paramSetError'});
        break;
    case H264bsdDecoder.MEMALLOC_ERROR:
        postMessage({'type': 'memAllocError'});
        break;
    case H264bsdDecoder.NO_INPUT:
        noInput = true;
        postMessage({'type': 'noInput'});
        break;
    default:
        return true
    }
    return false
}

function decodeLoop() {
  while (true) {
    if(!decodeOnce()) {
        return
    }
  }
}

addEventListener('message', onMessage);
importScripts('h264bsd_decoder.js', 'h264bsd_wasm.js')

H264bsd().then(module => {
  decoder = new H264bsdDecoder(module);
  decoder.onPictureReady = onPictureReady;
  decoder.onHeadersReady = onHeadersReady;
  postMessage({'type': 'decoderReady'});
})
