"""Read-only, bounded search for Warcraft's exact local WebUI URL in a game browser.

No memory dump is written. Only URL fingerprints are persisted. Optional --probe
passes the URL through stdin to Node and sends GetFeatureFlags once.
This is a research alternative to a WebUI discovery addon, not a stable game API.
"""
import argparse
import ctypes as C
import hashlib
import json
import re
import subprocess
import time
from pathlib import Path


class MemoryInfo(C.Structure):
    _fields_ = [("base", C.c_void_p), ("allocation_base", C.c_void_p),
                ("allocation_protect", C.c_uint32), ("pad", C.c_uint32),
                ("size", C.c_size_t), ("state", C.c_uint32),
                ("protect", C.c_uint32), ("type", C.c_uint32), ("pad2", C.c_uint32)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pid", required=True, type=int, help="BlizzardBrowser PID belonging to your test game")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--max-mib", type=int, default=256)
    parser.add_argument("--probe", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.max_mib <= 2048:
        parser.error("max-mib must be between 1 and 2048")
    kernel = C.WinDLL("kernel32", use_last_error=True)
    kernel.OpenProcess.argtypes = [C.c_uint32, C.c_bool, C.c_uint32]
    kernel.OpenProcess.restype = C.c_void_p
    kernel.CloseHandle.argtypes = [C.c_void_p]
    kernel.VirtualQueryEx.argtypes = [C.c_void_p, C.c_void_p, C.POINTER(MemoryInfo), C.c_size_t]
    kernel.VirtualQueryEx.restype = C.c_size_t
    kernel.ReadProcessMemory.argtypes = [C.c_void_p, C.c_void_p, C.c_void_p, C.c_size_t, C.POINTER(C.c_size_t)]
    kernel.ReadProcessMemory.restype = C.c_bool
    kernel.QueryFullProcessImageNameW.argtypes = [C.c_void_p, C.c_uint32, C.c_wchar_p, C.POINTER(C.c_uint32)]
    kernel.QueryFullProcessImageNameW.restype = C.c_bool
    process = kernel.OpenProcess(0x410, False, args.pid)  # QUERY_INFORMATION | VM_READ only
    if not process:
        raise OSError(C.get_last_error(), "Cannot open target for read-only inspection")
    started = time.monotonic()
    urls, scanned, regions = set(), 0, 0
    pattern = re.compile(rb'http://127\.0\.0\.1:[0-9]{1,5}/webui/index\.html\?guid=[0-9]{1,20}(?![0-9])')
    try:
        image = C.create_unicode_buffer(32768)
        size = C.c_uint32(len(image))
        if not kernel.QueryFullProcessImageNameW(process, 0, image, C.byref(size)):
            raise OSError(C.get_last_error(), "Cannot verify target executable")
        if Path(image.value).name.lower() != "blizzardbrowser.exe":
            raise ValueError("Target must be the BlizzardBrowser.exe of your test game")
        limit, address = args.max_mib * 1024 * 1024, 0
        info = MemoryInfo()
        while scanned < limit and time.monotonic() - started < 25:
            if not kernel.VirtualQueryEx(process, address, C.byref(info), C.sizeof(info)):
                break
            next_address = (info.base or 0) + info.size
            if next_address <= address:
                break
            if info.state == 0x1000 and info.type == 0x20000 and not info.protect & (0x100 | 0x01):
                regions += 1
                offset, tail = 0, b""
                while offset < info.size and scanned < limit and time.monotonic() - started < 25:
                    amount = min(1024 * 1024, info.size - offset, limit - scanned)
                    buffer, read = C.create_string_buffer(amount), C.c_size_t()
                    kernel.ReadProcessMemory(process, (info.base or 0) + offset, buffer, amount, C.byref(read))
                    scanned += amount
                    data = tail + buffer.raw[:read.value]
                    for candidate in (data, data[::2], data[1::2]):
                        for match in pattern.finditer(candidate):
                            # Validate the full match with a subsequent socket handshake if requested.
                            value = match[0].decode("ascii")
                            if int(value.rsplit("=", 1)[1]) <= 0xffffffffffffffff and len(urls) < 8:
                                urls.add(value)
                    tail = data[-256:] if read.value == amount else b""
                    offset += amount
                if urls:
                    break
            address = next_address
    finally:
        kernel.CloseHandle(process)
    report = {"pid": args.pid, "readOnly": True, "bytesExaminedBudget": scanned,
              "privateRegionsVisited": regions, "seconds": round(time.monotonic() - started, 3), "candidates": []}
    for url in sorted(urls):
        origin, guid = url.split("/webui/index.html?guid=")
        record = {"origin": origin, "guidSha256": hashlib.sha256(guid.encode()).hexdigest(), "guidDigits": len(guid)}
        if args.probe:
            js = """
const WebSocket=require('ws');let input='';process.stdin.on('data',b=>input+=b);
process.stdin.on('end',()=>{const {url}=JSON.parse(input);const ws=new WebSocket(url,{handshakeTimeout:3000,maxPayload:2097152});
const r={sent:false,events:[]};let done=false;function finish(){if(done)return;done=true;clearTimeout(timer);ws.terminate();console.log(JSON.stringify(r));}
const timer=setTimeout(finish,5000);ws.on('open',()=>{r.sent=true;ws.send(JSON.stringify({type:'webui',message:'GetFeatureFlags',payload:{}}));});
ws.on('message',b=>{try{for(const x of [].concat(JSON.parse(b))){if(r.events.length<40)r.events.push({name:x.messageType,keys:Object.keys(x.payload||{})});}}catch{}});
ws.on('error',()=>{r.error='WebSocket connection failed';});ws.on('close',code=>{r.code=code;finish();});});
"""
            endpoint = origin.replace("http://", "ws://", 1) + "/webui-socket/" + guid
            result = subprocess.run(["node", "-e", js], input=json.dumps({"url": endpoint}),
                                    capture_output=True, text=True, timeout=10, check=True)
            record["probe"] = json.loads(result.stdout)
        report["candidates"].append(record)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2), encoding="utf8")
    print(json.dumps(report)[:5000])


if __name__ == "__main__":
    main()
