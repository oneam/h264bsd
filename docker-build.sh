#!/bin/bash
docker run -v $(pwd):/root/h264bsd ubuntu /bin/bash -c "apt-get update && apt-get -y install rake gcc emscripten uglifyjs.terser && cd /root/h264bsd && rake posix js wasm"