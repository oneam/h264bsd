# h264bsd [![Build Status](https://travis-ci.org/oneam/h264bsd.svg?branch=master)](https://travis-ci.org/oneam/h264bsd)

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

This project was heavily inspired by [Broadway.js](https://github.com/mbebenita/Broadway). Much love to them for pioneering the idea.

## Building

This project generally uses [rake](https://github.com/ruby/rake) as a build tool, since I find it simple, clear, and compatible with many different environments.

On Windows, you can download rake along with Ruby using [RubyInstaller](https://rubyinstaller.org)
On Mac, ruby and rake are already installed

In most cases, once you've installed the dependencies, you can build by changing to the desired directory and running:

```
rake
```

Here are very basic instructions for building each version:

### wasm and js

wasm and js use enscripten and Uglify-JS.

* Instructions for getting started with enscripten are here: https://emscripten.org/docs/getting_started/index.html
* Uglify-JS is availabel here: https://www.npmjs.com/package/uglify-js

### Windows

A Visual Studio project is available for the library as well as a simple test application to ensure it works.

I don't have plans to create a VSCode version of the project any time soon.

### iOS

You should only need Xcode in order to build and test the iOS version of the library. A project file for the library and a simple wrapper application is provided.

### posix

The posix build has been tested with both gcc and clang and the test application only uses POSIX.2 system calls.

### test

The test files are generated from a snippet of the movie ["Big Buck Bunny"](https://peach.blender.org) with uncompressed frames provided by [Xiph.org](https://media.xiph.org)

The encoding is done using [FFMPEG](https://ffmpeg.org)
