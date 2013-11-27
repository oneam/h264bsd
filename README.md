# h264bsd

This is a software-based library that was extracted from the Android project with the intention of being used elsewhere.

The only modification that have been made are to remove the top-level API and add an opaque pointer for encoder storage.

The intention is to provide a simple H.264 decoder that can be easily invoked from [ffi](http://en.wikipedia.org/wiki/Foreign_function_interface) systems. 

## Directories

*src* Contains the modified source.
*win* Contains Visual Studio project files for building.
