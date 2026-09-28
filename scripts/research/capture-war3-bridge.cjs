// Temporary, opt-in instrumentation of an existing local WebUI index.
// Start with the game closed; then launch the game separately within 90 seconds.
// Restores index on completion, signals, or timeout (unless another program changed it).
// Only message names and payload keys are stored, never auth/profile/chat payloads or GUIDs.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const WebSocket = require('ws');
const [indexArg, outputArg] = process.argv.slice(2);
if (!indexArg || !outputArg) throw new Error('Usage: capture-war3-bridge.cjs GAME_WEBUI_INDEX OUTPUT_JSON');
const indexPath = path.resolve(indexArg), output = path.resolve(outputArg);
const original = fs.readFileSync(indexPath);
const html = original.toString('utf8');
if (!/<script\s+src=["']GlueManager\.js["']/i.test(html)) throw new Error('GlueManager script not found');
if (html.includes('quenching-research-capture')) throw new Error('Existing capture marker; restore first');
fs.mkdirSync(path.dirname(output), { recursive: true });
const backup = output + '.index-backup';
fs.writeFileSync(backup, original, { flag: 'wx' });
const key = crypto.randomBytes(24).toString('hex');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const report = { capturedAt: new Date().toISOString(), originalIndexSha256: hash(original),
  observedCommands: [], observedEvents: [], directQueryEvents: [], directQuerySent: false,
  requests: ['GetFeatureFlags'] };
let instrumented, finished = false, socket, finishTimer, captureTimer;
function finish(reason) {
  if (finished) return;
  finished = true;
  clearTimeout(finishTimer); clearTimeout(captureTimer);
  socket?.terminate();
  report.reason = reason;
  if (instrumented && hash(fs.readFileSync(indexPath)) === hash(instrumented)) {
    fs.writeFileSync(indexPath, original);
    report.restored = hash(fs.readFileSync(indexPath)) === hash(original);
  } else report.restored = false;
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  const summary = JSON.stringify({ output, reason, restored: report.restored,
    observedEvents: report.observedEvents.length,
    directQueryEvents: report.directQueryEvents.slice(0, 10).map(e => e.messageType) });
  process.stdout.write(Buffer.from(summary).subarray(0, 3000));
  process.stdout.write('\n');
  server.close(); server.closeAllConnections();
}
function connect(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return; }
  if (parsed.protocol !== 'ws:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)
      || !parsed.pathname.startsWith('/webui-socket/')) return;
  if (socket) return;
  report.endpoint = `${parsed.protocol}//${parsed.host}/webui-socket/<redacted>`;
  socket = new WebSocket(parsed, { handshakeTimeout: 4000, maxPayload: 2 * 1024 * 1024 });
  socket.on('open', () => {
    report.directQuerySent = true;
    // GetGameInfo belongs to the loading-screen lifecycle, not an idle health check.
    for (const message of report.requests) {
      socket.send(JSON.stringify({ type: 'webui', message, payload: {} }));
    }
  });
  socket.on('message', data => {
    try {
      for (const event of [].concat(JSON.parse(data.toString()))) {
        if (report.directQueryEvents.length >= 200) break;
        report.directQueryEvents.push({ messageType: event.messageType,
          payloadKeys: Object.keys(event.payload || {}),
          ...(event.messageType === 'GameVersion' ? { version: event.payload } : {}) });
      }
    } catch { report.parseError = true; }
  });
  socket.on('error', e => { report.socketError = e.message.replace(/webui-socket\/[^\s]+/g, 'webui-socket/<redacted>'); });
  socket.on('close', code => { report.socketCloseCode = code; });
  finishTimer = setTimeout(() => finish('capture-window-ended'), 12000);
}
const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
    res.writeHead(403); res.end(); return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (req.method !== 'POST' || req.url !== '/' + key) { res.writeHead(404); res.end(); return; }
  let body = '', bytes = 0;
  req.on('data', data => { bytes += data.length; if (bytes > 16384) req.destroy(); else body += data; });
  req.on('end', () => {
    try {
      const item = JSON.parse(body);
      if (item.kind === 'endpoint') connect(item.url);
      if (item.kind === 'command' && typeof item.name === 'string' && report.observedCommands.length < 300)
        report.observedCommands.push(item.name.slice(0, 150));
      if (item.kind === 'event' && report.observedEvents.length < 300)
        report.observedEvents.push({ messageType: String(item.name).slice(0, 150),
          payloadKeys: Array.isArray(item.keys) ? item.keys.slice(0, 80).map(x => String(x).slice(0, 150)) : [] });
    } catch { /* malformed capture telemetry is discarded */ }
    res.writeHead(204); res.end();
  });
});
server.listen(0, '127.0.0.1', () => {
  const address = `http://127.0.0.1:${server.address().port}/${key}`;
  const injected = `<script id="quenching-research-capture">(function(){
    var Native=window.WebSocket;
    function note(item){try{fetch(${JSON.stringify(address)},{method:'POST',body:JSON.stringify(item)}).catch(function(){});}catch(e){}}
    window.WebSocket=new Proxy(Native,{construct:function(Target,args){
      var ws=Reflect.construct(Target,args);
      if(String(args[0]).indexOf('/webui-socket/')!==-1){
        ws.addEventListener('open',function(){note({kind:'endpoint',url:String(args[0])});});
        ws.addEventListener('message',function(event){try{[].concat(JSON.parse(event.data)).forEach(function(m){note({kind:'event',name:m.messageType,keys:Object.keys(m.payload||{})});});}catch(e){}});
        var send=ws.send;ws.send=function(data){try{var m=JSON.parse(data);note({kind:'command',name:m.message});}catch(e){}return send.apply(this,arguments);};
      }return ws;
    }});
  })();</script>\n`;
  instrumented = Buffer.from(html.replace(/(?=<script\s+src=["']GlueManager\.js["'])/i, injected));
  fs.writeFileSync(indexPath, instrumented);
  console.log('Capture ready. Launch Warcraft III within 90 seconds. Index backup saved.');
  captureTimer = setTimeout(() => finish('no-endpoint-timeout'), 90000);
});
process.on('SIGINT', () => finish('SIGINT'));
process.on('SIGTERM', () => finish('SIGTERM'));
process.on('uncaughtException', error => { report.error = error.message; finish('exception'); process.exitCode = 1; });
