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
const http = require('http');
const net = require('net');

const server = http.createServer((req, res) => {
  const opts = {
    hostname: '127.0.0.1', port: 9222,
    path: req.url, method: req.method,
    headers: { ...req.headers, host: 'localhost:9222' }
  };
  const proxy = http.request(opts, (upstream) => {
    let body = '';
    upstream.on('data', (c) => body += c);
    upstream.on('end', () => {
      body = body.replace(/localhost:9222/g, 'host.docker.internal:9223');
      const hdrs = { ...upstream.headers, 'content-length': Buffer.byteLength(body) };
      res.writeHead(upstream.statusCode, hdrs);
      res.end(body);
    });
  });
  proxy.on('error', (e) => { res.writeHead(502); res.end(e.message); });
  req.pipe(proxy);
});

server.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(9222, '127.0.0.1');
  const raw = req.method + ' ' + req.url + ' HTTP/1.1\r\n' +
    Object.entries(req.headers).map(([k,v]) =>
      k.toLowerCase() === 'host' ? k+': localhost:9222' : k+': '+v
    ).join('\r\n') + '\r\n\r\n';
  upstream.write(raw);
  if (head.length) upstream.write(head);
  socket.pipe(upstream);
  upstream.pipe(socket);
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(9223, '0.0.0.0', () => console.log('CDP proxy ready on :9223'));
" &

PROXY_PID=$!
trap "kill $PROXY_PID $CHROME_PID 2>/dev/null" EXIT
wait $CHROME_PID
