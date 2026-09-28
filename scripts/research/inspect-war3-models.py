"""Read-only CASC model survey. Uses the same native CascLib API as CascViewer.

Exports only matched samples outside the game; reports bounded MDX chunk metadata.
Game assets belong in ignored analysis_outputs, never in distributed source/assets.
"""
import argparse
import ctypes as C
import hashlib
import json
import os
import struct
from collections import Counter
from pathlib import Path, PurePosixPath
from importlib.util import spec_from_file_location, module_from_spec

spec = spec_from_file_location("extract_webui", Path(__file__).with_name("extract-war3-webui.py"))
shared = module_from_spec(spec)
spec.loader.exec_module(shared)


def inspect_geoset(data):
    """Validate each counted array and detect SKIN width by the complete UV tail.

    Do not search binary floats for tags: walk declared counts within the record.
    """
    pos = 4
    counts = {}
    for tag, width in ((b"VRTX", 12), (b"NRMS", 12), (b"PTYP", 4), (b"PCNT", 4),
                       (b"PVTX", 2), (b"GNDX", 1), (b"MTGC", 4), (b"MATS", 4)):
        if pos + 8 > len(data) or data[pos:pos + 4] != tag:
            raise ValueError(f"Expected {tag!r} at geoset +{pos}")
        count, = struct.unpack_from("<I", data, pos + 4)
        counts[tag.decode()] = count
        pos += 8 + count * width
        if pos > len(data):
            raise ValueError("Geoset array exceeds record")
    material, = struct.unpack_from("<I", data, pos)
    # Classic custom files can omit the 84-byte LOD fields. Validate both layouts.
    layouts = []
    for lod_bytes in (0, 84):
        try:
            cursor = pos + 12 + lod_bytes + 28
            extents, = struct.unpack_from("<I", data, cursor)
            cursor += 4 + extents * 28
            if data[cursor:cursor + 4] == b"TANG":
                tangents, = struct.unpack_from("<I", data, cursor + 4)
                if tangents != counts["VRTX"]:
                    continue
                cursor += 8 + tangents * 16
            skin_start, elements = None, 0
            if data[cursor:cursor + 4] == b"SKIN":
                elements, = struct.unpack_from("<I", data, cursor + 4)
                if elements != counts["VRTX"] * 8:
                    continue
                skin_start = cursor + 8
            for width in ((1, 2) if skin_start is not None else (0,)):
                uv = skin_start + elements * width if skin_start is not None else cursor
                if data[uv:uv + 4] != b"UVAS":
                    continue
                uv_count, = struct.unpack_from("<I", data, uv + 4)
                end = uv + 8
                if uv_count > 32:
                    continue
                for _ in range(uv_count):
                    if data[end:end + 4] != b"UVBS":
                        break
                    count, = struct.unpack_from("<I", data, end + 4)
                    if count != counts["VRTX"]:
                        break
                    end += 8 + count * 8
                else:
                    if end == len(data):
                        layout = {"vertices": counts["VRTX"], "indices": counts["PVTX"],
                                  "material": material, "lod_fields": bool(lod_bytes),
                                  "skin_element_bytes": width, "uv_sets": uv_count}
                        if width:
                            values = struct.unpack_from("<" + ("B" if width == 1 else "H") * elements, data, skin_start)
                            bones = [x for i, x in enumerate(values) if i % 8 < 4]
                            weights = [x for i, x in enumerate(values) if i % 8 >= 4]
                            layout.update(max_bone_index=max(bones, default=0), max_weight=max(weights, default=0),
                                          weight_sum_range=[min((sum(values[i+4:i+8]) for i in range(0, elements, 8)), default=0),
                                                            max((sum(values[i+4:i+8]) for i in range(0, elements, 8)), default=0)])
                        layouts.append(layout)
        except struct.error:
            continue
    if len(layouts) != 1:
        raise ValueError(f"Ambiguous/unsupported geoset layout: {len(layouts)} matches")
    return layouts[0]


def inspect_material(data):
    offsets = [i for i in (12, 92) if data[i:i + 4] == b"LAYS"]
    if len(offsets) != 1:
        raise ValueError("Unknown/ambiguous material layout")
    pos = offsets[0]
    count, = struct.unpack_from("<I", data, pos + 4)
    pos += 8
    layers = []
    for _ in range(count):
        size, = struct.unpack_from("<I", data, pos)
        if size < 28 or pos + size > len(data):
            raise ValueError("Invalid layer length")
        layer = {"size": size, "filter": struct.unpack_from("<I", data, pos + 4)[0]}
        # Modern slot table; keep remaining bytes opaque until tracks are verified.
        if offsets[0] == 12 and size >= 68:
            unknown, slots = struct.unpack_from("<II", data, pos + 52)
            if unknown in (0, 1) and slots <= 32 and 60 + slots * 8 <= size:
                layer["slots"] = [dict(zip(("texture", "slot"), struct.unpack_from("<II", data, pos + 60 + i * 8))) for i in range(slots)]
                layer["tail_bytes"] = size - 60 - slots * 8
        layers.append(layer)
        pos += size
    if pos != len(data):
        raise ValueError("Material length mismatch")
    return {"lays_offset": offsets[0], "layers": layers}


def inspect_mdx(data):
    if data[:4] != b"MDLX":
        return {"magic": data[:4].hex(), "error": "Not MDLX"}
    result = {"chunks": [], "textures": []}
    offset = 4
    while offset < len(data):
        if offset + 8 > len(data):
            raise ValueError(f"Truncated chunk header at {offset}")
        tag = data[offset:offset + 4].decode("ascii")
        size, = struct.unpack_from("<I", data, offset + 4)
        start, end = offset + 8, offset + 8 + size
        if end > len(data):
            raise ValueError(f"Chunk {tag} exceeds file at {offset}")
        chunk = {"tag": tag, "offset": offset, "size": size,
                 "sha256": hashlib.sha256(data[start:end]).hexdigest()}
        if tag == "VERS" and size == 4:
            result["version"], = struct.unpack_from("<I", data, start)
        if tag == "TEXS":
            if size % 268:
                chunk["warning"] = "Nonstandard TEXS record size"
            else:
                for pos in range(start, end, 268):
                    replaceable, = struct.unpack_from("<I", data, pos)
                    flags, = struct.unpack_from("<I", data, pos + 264)
                    result["textures"].append({"replaceable": replaceable,
                        "path": data[pos + 4:pos + 264].split(b"\0", 1)[0].decode("utf-8", "replace"),
                        "flags": flags})
        if tag in ("MTLS", "GEOS"):
            pos, records = start, []
            while pos < end:
                if pos + 4 > end:
                    raise ValueError(f"Truncated {tag} record")
                length, = struct.unpack_from("<I", data, pos)
                if length < 4 or pos + length > end:
                    raise ValueError(f"Invalid {tag} record length {length} at {pos}")
                record = {"offset": pos, "size": length, "header": data[pos:min(pos + 112, pos + length)].hex()}
                record["layout"] = (inspect_geoset if tag == "GEOS" else inspect_material)(data[pos:pos + length])
                records.append(record)
                pos += length
            chunk["records"] = records
        result["chunks"].append(chunk)
        offset = end
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game", type=Path, required=True)
    parser.add_argument("--dll", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--pattern", default="*.mdx")
    parser.add_argument("--product", default="w3", choices=("w3", "w3t"))
    parser.add_argument("--match", action="append", default=[])
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    game, out = args.game.resolve(), args.out.resolve()
    if game == out or game in out.parents:
        parser.error("Output must be outside game installation")
    if not (game / ".build.info").is_file():
        parser.error("Expected installed CASC with .build.info; CDN caches are not supported by this read-only survey")
    out.mkdir(parents=True, exist_ok=True)
    dll_dirs = [os.add_dll_directory(str(args.dll.resolve().parent))]
    if Path("C:/MinGW/bin").exists():
        dll_dirs.append(os.add_dll_directory("C:/MinGW/bin"))
    lib = C.WinDLL(str(args.dll.resolve()), use_last_error=True)
    handle, uint = C.c_void_p, C.c_uint32
    signatures = {
        "CascOpenStorage": ([C.c_char_p, uint, C.POINTER(handle)], C.c_bool),
        "CascCloseStorage": ([handle], C.c_bool),
        "CascFindFirstFile": ([handle, C.c_char_p, C.POINTER(shared.FindData), C.c_char_p], handle),
        "CascFindNextFile": ([handle, C.POINTER(shared.FindData)], C.c_bool),
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
    if not lib.CascOpenStorage((str(game) + "*" + args.product).encode("mbcs"), 0xFFFFFFFF, C.byref(storage)):
        raise OSError(C.get_last_error(), "CascOpenStorage failed")
    entries, samples, failures = [], [], []
    try:
        found = shared.FindData()
        search = lib.CascFindFirstFile(storage, args.pattern.encode(), C.byref(found), None)
        if not search or search == C.c_void_p(-1).value:
            raise OSError(C.get_last_error(), "No matching CASC entries")
        try:
            while True:
                name = found.name.decode("utf-8", "replace")
                entries.append({"name": name, "bytes": found.size, "available": bool(found.available & 1)})
                if not lib.CascFindNextFile(search, C.byref(found)):
                    break
        finally:
            lib.CascFindClose(search)
        for entry in entries:
            name = entry["name"]
            if not any(term.casefold() in name.casefold() for term in args.match) or len(samples) >= args.limit:
                continue
            file = handle()
            if not lib.CascOpenFile(storage, name.encode(), 0xFFFFFFFF, 0, C.byref(file)):
                failures.append({"name": name, "error": C.get_last_error()})
                continue
            try:
                size = C.c_uint64()
                if not lib.CascGetFileSize64(file, C.byref(size)) or size.value > 64 * 1024 * 1024:
                    raise ValueError("Invalid size or over 64 MiB")
                buf, read = C.create_string_buffer(size.value), uint()
                if not lib.CascReadFile(file, buf, size.value, C.byref(read)) or read.value != size.value:
                    raise OSError(C.get_last_error(), "Incomplete read")
                data = buf.raw[:read.value]
                rel = PurePosixPath(name.replace("\\", "/").replace(":", "/"))
                target = out.joinpath(*rel.parts).resolve()
                if rel.is_absolute() or ".." in rel.parts or out not in target.parents:
                    raise ValueError("Unsafe archive path")
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                sample = {**entry, "file": target.relative_to(out).as_posix(),
                          "sha256": hashlib.sha256(data).hexdigest()}
                if name.lower().endswith(".mdx"):
                    sample["mdx"] = inspect_mdx(data)
                elif data[:4] == b"DDS " and len(data) >= 128:
                    sample["dds"] = {"width": struct.unpack_from("<I", data, 16)[0],
                                     "height": struct.unpack_from("<I", data, 12)[0],
                                     "fourcc": data[84:88].decode("ascii", "replace")}
                samples.append(sample)
            except Exception as error:
                failures.append({"name": name, "error": str(error)})
            finally:
                lib.CascCloseFile(file)
    finally:
        lib.CascCloseStorage(storage)
    prefixes = Counter(e["name"].rsplit(":", 1)[0] if ":" in e["name"] else "(none)" for e in entries)
    build_info = game / ".build.info"
    report = {"game": str(game), "product": args.product,
              "build_info": build_info.read_text(encoding="utf-8") if build_info.exists() else None,
              "dll_sha256": hashlib.sha256(args.dll.read_bytes()).hexdigest(),
              "prefixes": dict(prefixes), "entries": entries, "samples": samples, "failures": failures}
    (out / "manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"entries": len(entries), "prefixes": dict(prefixes), "samples": len(samples),
                      "failures": len(failures), "out": str(out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
