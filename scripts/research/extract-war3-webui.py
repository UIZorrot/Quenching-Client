"""Read local Warcraft CASC with an ANSI x64 CascLib 3.x DLL; never edits game files.

The DLL is supplied by the caller, not downloaded or installed by this script.
Output contains game assets for local analysis; keep it outside distributed builds.
"""
import argparse
import ctypes as C
import hashlib
import json
import os
from pathlib import Path, PurePosixPath


class FindData(C.Structure):
    _fields_ = [
        ("name", C.c_char * 260), ("ckey", C.c_ubyte * 16),
        ("ekey", C.c_ubyte * 16), ("tags", C.c_uint64),
        ("size", C.c_uint64), ("plain", C.c_void_p),
        ("file_id", C.c_uint32), ("locale", C.c_uint32),
        ("content", C.c_uint32), ("spans", C.c_uint32),
        ("available", C.c_uint32), ("name_type", C.c_uint32),
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game", required=True, type=Path)
    parser.add_argument("--dll", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    game, out = args.game.resolve(), args.out.resolve()
    if out == game or game in out.parents:
        parser.error("Output must be outside the game installation")
    out.mkdir(parents=True, exist_ok=True)
    search_dirs = [os.add_dll_directory(str(args.dll.resolve().parent))]
    if Path("C:/MinGW/bin").exists():
        search_dirs.append(os.add_dll_directory("C:/MinGW/bin"))
    lib = C.WinDLL(str(args.dll.resolve()), use_last_error=True)
    handle = C.c_void_p
    uint = C.c_uint32
    signatures = {
        "CascOpenStorage": ([C.c_char_p, uint, C.POINTER(handle)], C.c_bool),
        "CascCloseStorage": ([handle], C.c_bool),
        "CascFindFirstFile": ([handle, C.c_char_p, C.POINTER(FindData), C.c_char_p], handle),
        "CascFindNextFile": ([handle, C.POINTER(FindData)], C.c_bool),
        "CascFindClose": ([handle], C.c_bool),
        "CascOpenFile": ([handle, C.c_char_p, uint, uint, C.POINTER(handle)], C.c_bool),
        "CascGetFileSize64": ([handle, C.POINTER(C.c_uint64)], C.c_bool),
        "CascReadFile": ([handle, C.c_void_p, uint, C.POINTER(uint)], C.c_bool),
        "CascCloseFile": ([handle], C.c_bool),
    }
    for name, (parameters, result) in signatures.items():
        fn = getattr(lib, name)
        fn.argtypes, fn.restype = parameters, result
    storage = handle()
    if not lib.CascOpenStorage(str(game).encode("mbcs"), 0xFFFFFFFF, C.byref(storage)):
        raise OSError(C.get_last_error(), "CascOpenStorage failed")
    entries, extracted, failures = [], [], []
    try:
        found = FindData()
        search = lib.CascFindFirstFile(storage, b"*webui*", C.byref(found), None)
        if search and search != C.c_void_p(-1).value:
            try:
                while True:
                    name = found.name.decode("utf-8", "replace")
                    entries.append({"name": name, "size": found.size,
                                    "available": bool(found.available & 1)})
                    if not lib.CascFindNextFile(search, C.byref(found)):
                        error = C.get_last_error()
                        if error not in (0, 18):  # Some CascLib builds leave last-error unchanged.
                            failures.append({"enumeration_error": error})
                        break
            finally:
                lib.CascFindClose(search)
        # Includes explicit candidates when a storage has incomplete filename enumeration.
        candidates = {e["name"] for e in entries if Path(e["name"]).suffix.lower()
                      in {".js", ".html", ".json"}}
        candidates.update({"war3.w3mod:webui\\GlueManager.js", "war3.w3mod:webui\\index.html",
                           "webui\\GlueManager.js", "webui\\index.html"})
        seen = set()
        for name in sorted(candidates):
            if name.casefold() in seen:
                continue
            seen.add(name.casefold())
            file = handle()
            if not lib.CascOpenFile(storage, name.encode(), 0xFFFFFFFF, 0, C.byref(file)):
                failures.append({"name": name, "error": C.get_last_error()})
                continue
            try:
                size = C.c_uint64()
                if not lib.CascGetFileSize64(file, C.byref(size)):
                    raise OSError(C.get_last_error(), "CascGetFileSize64 failed")
                if size.value > 32 * 1024 * 1024:
                    failures.append({"name": name, "error": "over 32 MiB limit"})
                    continue
                buffer = C.create_string_buffer(size.value)
                read = uint()
                if not lib.CascReadFile(file, buffer, size.value, C.byref(read)) or read.value != size.value:
                    failures.append({"name": name, "error": C.get_last_error(), "read": read.value})
                    continue
                relative = PurePosixPath(name.replace("\\", "/").replace(":", "/"))
                if relative.is_absolute() or ".." in relative.parts:
                    raise ValueError("Unsafe archive path")
                target = out.joinpath(*relative.parts).resolve()
                if out not in target.parents:
                    raise ValueError("Archive output escapes output directory")
                data = buffer.raw[:read.value]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                extracted.append({"name": name, "file": target.relative_to(out).as_posix(),
                                  "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
            finally:
                lib.CascCloseFile(file)
    finally:
        lib.CascCloseStorage(storage)
    manifest = {"game": str(game), "dll": str(args.dll.resolve()),
                "dll_sha256": hashlib.sha256(args.dll.read_bytes()).hexdigest(),
                "entries": entries, "extracted": extracted, "failures": failures}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"entries": len(entries), "extracted": len(extracted),
                      "failures": len(failures), "manifest": str(out / "manifest.json")}))
    if not extracted:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
