# h264bsd

This is a software-based library that was extracted from the Android project with the intention of being used elsewhere.

Some modifications have been made to the original project in order to remove the top-level API, add an alloc and free for encoder storage, convert to ARGB format, and add optimizations for certain platforms.

The intention is to provide a simple H.264 decoder that can be easily invoked from [ffi](http://en.wikipedia.org/wiki/Foreign_function_interface) systems.

## Implementation Notes

Currently, the process of decoding modifies the input data. This has tripped me a few times in the past so others should be aware of it.

The decoder only works nicely if it has a single consistent stream to deal with. If you want to change the width/height or restart the stream with a new access unit delimiter, it's better to shutdown and init a new decoder.

## Directories

* *src* The modified source.
* *test* Contains test data available for all platforms.
* *win* Visual Studio project files and test application.
* *posix* Simple c file that loads a test file and runs through a decode loop.
* *js* JavaScript version of the library created using [emscripten](http://emscripten.org/).
* *wasm* JavaScript version using WebAssembly created using [emscripten](http://emscripten.org/).
* *ios* XCode project and objective-c wrapper classes.
* *flex* ActionScript version of the library built using [CrossBridge](http://adobe-flash.github.io/crossbridge/).

This project was heavily inspired by [Broadway.js](https://github.com/mbebenita/Broadway). Much love to them for pioneering the idea.
