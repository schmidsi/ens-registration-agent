#!/bin/bash
# Run on the host to enable Chrome remote debugging.
# The devcontainer connects via host.docker.internal:9223
#
# Chrome binds CDP to 127.0.0.1 and rejects non-localhost Host headers.
# A Node.js TCP proxy rewrites Host headers and /json response URLs.

# Start Chrome with CDP on localhost:9222
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug-profile \
  --incognito \
  "$@" &

CHROME_PID=$!
sleep 2

echo "Starting CDP proxy on 0.0.0.0:9223 → localhost:9222"
node -e "
const net = require('net');

net.createServer((client) => {
  const upstream = net.connect(9222, '127.0.0.1');

  client.once('data', (data) => {
    const str = data.toString();
    const isJson = /GET \/json/.test(str);
    const patched = str.replace(/[Hh]ost: [^\r\n]+/, 'Host: localhost:9222');
    upstream.write(patched);
    client.pipe(upstream);

    if (isJson) {
      let buf = '';
      upstream.on('data', (d) => buf += d.toString());
      upstream.on('end', () => {
        let res = buf.replace(/localhost:9222/g, 'host.docker.internal:9223');
        // Fix Content-Length after URL rewrite
        res = res.replace(/Content-Length:\s*\d+/i, () => {
          const bodyStart = res.indexOf('\r\n\r\n') + 4;
          return 'Content-Length: ' + Buffer.byteLength(res.slice(bodyStart));
        });
        client.end(res);
      });
    } else {
      upstream.pipe(client);
    }
  });

  upstream.on('error', () => client.destroy());
  client.on('error', () => upstream.destroy());
}).listen(9223, '0.0.0.0', () => console.log('CDP proxy ready on :9223'));
" &

PROXY_PID=$!
trap "kill $PROXY_PID $CHROME_PID 2>/dev/null" EXIT
wait $CHROME_PID
