# h264bsd

This is a software-based library that was extracted from the Android project with the intention of being used elsewhere.

Only minor modifications have been made in order to remove the top-level API and add an opaque pointer with alloc and free for encoder storage.

The intention is to provide a simple H.264 decoder that can be easily invoked from [ffi](http://en.wikipedia.org/wiki/Foreign_function_interface) systems. 

## Directories

* *src* The modified source.
* *win* Visual Studio project files for building.
* *js* JavaScript version of the library created using emscripten.
