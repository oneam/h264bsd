# Javascript implementation

This implementation was compiled with emscripten and includes tools for rendering to a canvas element with WebGL acceleration.

Here's an example of how to use it:
```
var decoder = new H264bsdDecoder();
var display = new H264bsdCanvas(myCanvasElement);

// Render output to the canvas when a new picture is ready
decoder.onPictureReady = function() {
    display.drawNextOutputPicture(decoder);
}

// Resize the canvas to display uncropped content.
decoder.onHeadersReady = function() {
    myCanvasElement.width = decoder.outputPictureWidth();
    myCanvasElement.height = decoder.outputPictureHeight();
}

// Queue input data
decoder.queueInput(myUint8Array);

// Pump the decode loop
var status = H264bsdDecoder.RDY;
while(status != H264bsdDecoder.NO_INPUT) {
    status = decoder.decode();
}
```

This code will decode H.264 annex B encoded bytes stored in a Uint8Array. Each call to decode() will decode a single NAL unit, so you need to keep calling it until all of the input data is consumed. Note that each call to decode() is synchronous and blocking, so you may want to delay subsequent calls or wrap the whole things in a web worker to keep your app responsive.

decode() returns H264bsdDecoder.HDRS_RDY when the output size and cropping information are available and H264bsdDecoder.PIC_RDY when there is a picture ready to render. The decoder will also call the callbacks onHeadersReady and onPictureReady to simplify your code. Use nextOutputPicture or nextOutputPictureRGBA to retrieve i420 or RGBA encoded bytes for the next picture.

H264bsdCanvas drawNextOutputPicture() will use nextOutputPicture() or nextOutputPictureRGBA() on the decoder to render the picture. If it detects that the browser in WebGL capable, it will create a 3d context and use a shader program to display the YUV encoded output directly. If WebGL is not available, it will degrade to converting YUV to RGBA in JavaScript and use a 2d context to draw the output.
