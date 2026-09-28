// Reports location.search's GUID before GlueManager runs. Passive by default.
// Usage: node capture-war3-guid.cjs INDEX OUTPUT_JSON [--probe]
// --probe opens a second socket after 8 seconds and sends only GetFeatureFlags.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const WebSocket = require('ws');
const [indexArg, outputArg, mode] = process.argv.slice(2);
if (!indexArg || !outputArg || (mode && mode !== '--probe'))
  throw new Error('Usage: capture-war3-guid.cjs INDEX OUTPUT_JSON [--probe]');
const index = path.resolve(indexArg), output = path.resolve(outputArg);
const original = fs.readFileSync(index), html = original.toString('utf8');
const marker = 'quenching-guid-discovery';
if (html.includes(marker) || html.includes('quenching-research-capture'))
  throw new Error('Restore earlier instrumentation first');
const anchor = /(?=<script\s+src=["']GlueManager\.js["'])/i;
if (!anchor.test(html)) throw new Error('GlueManager script tag not found');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output + '.index-backup', original, { flag: 'wx' });
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const nonce = crypto.randomBytes(24).toString('hex');
const report = { startedAt: new Date().toISOString(), mode: mode || 'passive',
  originalIndexSha256: hash(original), pages: [], observedEvents: [], authStates: [],
  heartbeats: [], probe: { sent: false, events: [] } };
let patched, finished = false, endpoint, socket, finishTimer, probeTimer, deadline;
const start = Date.now();
const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
    res.writeHead(403); res.end(); return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (req.method !== 'POST' || req.url !== '/' + nonce) { res.writeHead(404); res.end(); return; }
  let data = '', bytes = 0;
  req.on('data', b => { bytes += b.length; if (bytes > 8192) req.destroy(); else data += b; });
  req.on('end', () => {
    try {
      const item = JSON.parse(data), atMs = Date.now() - start;
      if (item.kind === 'page') {
        const page = new URL(item.origin);
        const guid = String(item.guid);
        if (page.origin !== origin || !/^\d{1,20}$/.test(guid) || BigInt(guid) > 0xffffffffffffffffn)
          throw new Error('Invalid discovery data');
        if (report.pages.length < 8) report.pages.push({ atMs, phase: 'before-gluemanager',
          origin, guidFormat: 'uint64-decimal-string', guidDigits: guid.length,
          guidBitLength: BigInt(guid).toString(2).length, guidSha256: hash(guid) });
        if (!endpoint) {
          endpoint = `ws://${page.host}/webui-socket/${guid}`;
          finishTimer = setTimeout(() => finish('observation-complete'), 30000);
          if (mode === '--probe') probeTimer = setTimeout(probe, 8000);
        }
      } else if (item.kind === 'event' && report.observedEvents.length < 200) {
        report.observedEvents.push({ atMs, name: String(item.name).slice(0, 100) });
        if (typeof item.isAuthenticated === 'boolean')
          report.authStates.push({ atMs, source: String(item.name).slice(0, 100), isAuthenticated: item.isAuthenticated });
      } else if (item.kind === 'heartbeat' && report.heartbeats.length < 20) {
        report.heartbeats.push({ atMs, documentReady: String(item.documentReady).slice(0, 20),
          socketReadyState: Number.isInteger(item.socketReadyState) ? item.socketReadyState : null });
      }
    } catch { /* Ignore malformed or untrusted telemetry. */ }
    res.writeHead(204); res.end();
  });
});
function probe() {
  socket = new WebSocket(endpoint, { handshakeTimeout: 4000, maxPayload: 2 * 1024 * 1024 });
  socket.on('open', () => {
    report.probe.openAtMs = Date.now() - start;
    socket.send(JSON.stringify({ type: 'webui', message: 'GetFeatureFlags', payload: {} }));
    report.probe.sent = true;
  });
  socket.on('message', bytes => {
    try {
      for (const event of [].concat(JSON.parse(bytes.toString()))) {
        if (report.probe.events.length < 100) report.probe.events.push({ atMs: Date.now() - start,
          name: event.messageType, payloadKeys: Object.keys(event.payload || {}) });
      }
    } catch { report.probe.parseError = true; }
  });
  socket.on('error', e => { report.probe.error = e.message.replace(/webui-socket\/\S+/g, 'webui-socket/<redacted>'); });
  socket.on('close', code => { report.probe.closeCode = code; report.probe.closeAtMs = Date.now() - start; });
}
function finish(reason) {
  if (finished) return;
  finished = true;
  for (const t of [finishTimer, probeTimer, deadline]) clearTimeout(t);
  socket?.terminate();
  report.reason = reason;
  try {
    if (patched && hash(fs.readFileSync(index)) === hash(patched)) {
      fs.writeFileSync(index, original);
      report.restored = hash(fs.readFileSync(index)) === hash(original);
    } else report.restored = false;
  } catch (e) { report.restoreError = e.message; report.restored = false; }
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  const summary = { output, restored: report.restored, reason, pages: report.pages,
    eventCount: report.observedEvents.length, authStates: report.authStates,
    probe: { sent: report.probe.sent, eventNames: report.probe.events.map(e => e.name).slice(0, 12) } };
  process.stdout.write(Buffer.from(JSON.stringify(summary)).subarray(0, 4000));
  process.stdout.write('\n');
  server.close(); server.closeAllConnections();
}
server.listen(0, '127.0.0.1', () => {
  const receiver = `http://127.0.0.1:${server.address().port}/${nonce}`;
  const injected = `<script id="${marker}">(function(){
    var sink=${JSON.stringify(receiver)}, ws=null, ticks=0;
    function note(x){try{fetch(sink,{method:'POST',body:JSON.stringify(x)}).catch(function(){});}catch(e){}}
    var guid=new URLSearchParams(window.location.search).get('guid');
    // Retry endpoint discovery on failed requests; ordinary diagnostics are best effort.
    var announceStarted=Date.now(), attempts=0;
    function announce(){
      if(!guid||Date.now()-announceStarted>60000)return;
      attempts++;
      fetch(sink,{method:'POST',body:JSON.stringify({kind:'page',origin:window.location.origin,guid:guid})})
        .then(function(r){if(!r.ok)throw new Error('discovery rejected');})
        .catch(function(){setTimeout(announce,Math.min(5000,250*Math.pow(2,Math.min(attempts,5))));});
    }
    announce();
    function onmessage(event){try{[].concat(JSON.parse(event.data)).forEach(function(m){
      var x={kind:'event',name:m.messageType};
      if(m.messageType==='UpdateUserInfo'&&m.payload&&m.payload.user&&typeof m.payload.user.isAuthenticated==='boolean')x.isAuthenticated=m.payload.user.isAuthenticated;
      if(m.messageType==='LoggedOut'||m.messageType==='Logout')x.isAuthenticated=false;
      note(x);
    });}catch(e){}}
    var poll=setInterval(function(){
      ticks++;
      if(!ws&&typeof logCalls!=='undefined')for(var i=0;i<logCalls.length;i++){
        var candidate=logCalls[i];
        if(candidate&&typeof candidate.url==='string'&&candidate.url.indexOf('/webui-socket/')!==-1&&typeof candidate.addEventListener==='function'){
          ws=candidate;ws.addEventListener('message',onmessage);break;
        }
      }
      if(ticks%40===0)note({kind:'heartbeat',documentReady:document.readyState,socketReadyState:ws?ws.readyState:null});
      if(ticks>=640){clearInterval(poll);if(ws)ws.removeEventListener('message',onmessage);}
    },50);
  })();</script>\n`;
  patched = Buffer.from(html.replace(anchor, injected));
  fs.writeFileSync(index, patched);
  console.log(`GUID receiver ready (${mode || 'passive'}). Launch Warcraft III within 90 seconds.`);
  deadline = setTimeout(() => finish('no-page-timeout'), 90000);
});
process.on('SIGINT', () => finish('SIGINT'));
process.on('SIGTERM', () => finish('SIGTERM'));
process.on('uncaughtException', error => { report.error = error.message; finish('exception'); process.exitCode = 1; });
