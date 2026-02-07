#!/bin/bash
# Run on the host to enable Chrome remote debugging.
# The devcontainer can then connect via host.docker.internal:9222
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug-profile \
  "$@"
