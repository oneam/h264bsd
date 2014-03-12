# h264bsd

This is a software-based library that was extracted from the Android project with the intention of being used elsewhere.

Some modifications have been made to the original project in order to remove the top-level API, add an alloc and free for encoder storage, convert to ARGB format, and add optimizations for certain platforms.

The intention is to provide a simple H.264 decoder that can be easily invoked from [ffi](http://en.wikipedia.org/wiki/Foreign_function_interface) systems.

## Directories

* *src* The modified source.
* *test* Contains test data available for all platforms.
* *win* Visual Studio project files for building.
* *js* JavaScript version of the library created using [emscripten](http://emscripten.org/).
* *flex* ActionScript version of the library built using [CrossBridge](http://adobe-flash.github.io/crossbridge/).

This project was heavily inspired by [Broadway.js](https://github.com/mbebenita/Broadway). Much love to them for pioneering the idea.
