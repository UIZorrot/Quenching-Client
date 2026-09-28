import argparse
import json
import math
import shutil
import struct
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


FACE_NAMES = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"]
DDS_HEADER_SIZE = 128
DX10_HEADER_SIZE = 20
DATA_OFFSET = DDS_HEADER_SIZE + DX10_HEADER_SIZE
DXGI_FORMAT_BC1_UNORM_SRGB = 72


def rgb565_to_rgb(c):
    r = ((c >> 11) & 31) * 255 // 31
    g = ((c >> 5) & 63) * 255 // 63
    b = (c & 31) * 255 // 31
    return np.array([r, g, b], dtype=np.uint8)


def rgb_to_rgb565(rgb):
    r = int(round(float(rgb[0]) * 31 / 255))
    g = int(round(float(rgb[1]) * 63 / 255))
    b = int(round(float(rgb[2]) * 31 / 255))
    r = max(0, min(31, r))
    g = max(0, min(63, g))
    b = max(0, min(31, b))
    return (r << 11) | (g << 5) | b


def decode_bc1_block(block):
    c0, c1, bits = struct.unpack_from("<HHI", block)
    p0 = rgb565_to_rgb(c0).astype(np.float32)
    p1 = rgb565_to_rgb(c1).astype(np.float32)
    if c0 > c1:
        palette = np.vstack([p0, p1, (2 * p0 + p1) / 3, (p0 + 2 * p1) / 3])
    else:
        palette = np.vstack([p0, p1, (p0 + p1) / 2, np.zeros(3, dtype=np.float32)])
    out = np.empty((16, 3), dtype=np.uint8)
    for i in range(16):
        out[i] = np.clip(np.rint(palette[(bits >> (2 * i)) & 3]), 0, 255)
    return out.reshape(4, 4, 3)


def decode_bc1(data, width, height):
    bw = max(1, (width + 3) // 4)
    bh = max(1, (height + 3) // 4)
    blocks = np.frombuffer(data, dtype=np.uint8).reshape(-1, 8)
    c0 = blocks[:, 0].astype(np.uint16) | (blocks[:, 1].astype(np.uint16) << 8)
    c1 = blocks[:, 2].astype(np.uint16) | (blocks[:, 3].astype(np.uint16) << 8)
    bits = (
        blocks[:, 4].astype(np.uint32)
        | (blocks[:, 5].astype(np.uint32) << 8)
        | (blocks[:, 6].astype(np.uint32) << 16)
        | (blocks[:, 7].astype(np.uint32) << 24)
    )

    def unpack565(c):
        r = ((c >> 11) & 31).astype(np.float32) * 255 / 31
        g = ((c >> 5) & 63).astype(np.float32) * 255 / 63
        b = (c & 31).astype(np.float32) * 255 / 31
        return np.stack([r, g, b], axis=1)

    p0 = unpack565(c0)
    p1 = unpack565(c1)
    palette = np.empty((blocks.shape[0], 4, 3), dtype=np.float32)
    palette[:, 0] = p0
    palette[:, 1] = p1
    four_color = c0 > c1
    palette[four_color, 2] = (2 * p0[four_color] + p1[four_color]) / 3
    palette[four_color, 3] = (p0[four_color] + 2 * p1[four_color]) / 3
    three_color = ~four_color
    palette[three_color, 2] = (p0[three_color] + p1[three_color]) / 2
    palette[three_color, 3] = 0

    shifts = (np.arange(16, dtype=np.uint32) * 2)[None, :]
    idx = ((bits[:, None] >> shifts) & 3).astype(np.intp)
    decoded = palette[np.arange(blocks.shape[0])[:, None], idx]
    img = (
        np.clip(np.rint(decoded), 0, 255)
        .astype(np.uint8)
        .reshape(bh, bw, 4, 4, 3)
        .transpose(0, 2, 1, 3, 4)
        .reshape(bh * 4, bw * 4, 3)
    )
    return img[:height, :width].copy()


def encode_bc1_block(block):
    pixels = block.reshape(-1, 3).astype(np.float32)
    if np.max(pixels) - np.min(pixels) < 0.5:
        c = rgb_to_rgb565(pixels[0])
        return struct.pack("<HHI", c, c, 0)

    # IBL faces are low-frequency. Luma endpoints are much faster than PCA here
    # and avoid spending seconds on every mip-chain iteration.
    luma = pixels @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    lo = pixels[int(np.argmin(luma))]
    hi = pixels[int(np.argmax(luma))]
    c0 = rgb_to_rgb565(np.clip(hi, 0, 255))
    c1 = rgb_to_rgb565(np.clip(lo, 0, 255))

    if c0 == c1:
        mn = pixels.min(axis=0)
        mx = pixels.max(axis=0)
        c0 = rgb_to_rgb565(mx)
        c1 = rgb_to_rgb565(mn)
    if c0 < c1:
        c0, c1 = c1, c0

    p0 = rgb565_to_rgb(c0).astype(np.float32)
    p1 = rgb565_to_rgb(c1).astype(np.float32)
    palette = np.vstack([p0, p1, (2 * p0 + p1) / 3, (p0 + 2 * p1) / 3])
    diff = pixels[:, None, :] - palette[None, :, :]
    idx = np.argmin(np.sum(diff * diff, axis=2), axis=1)
    bits = 0
    for i, value in enumerate(idx):
        bits |= int(value) << (2 * i)
    return struct.pack("<HHI", c0, c1, bits)


def encode_bc1(img):
    height, width = img.shape[:2]
    bw = max(1, (width + 3) // 4)
    bh = max(1, (height + 3) // 4)
    padded = np.empty((bh * 4, bw * 4, 3), dtype=np.uint8)
    padded[:height, :width] = img
    if width < bw * 4:
        padded[:height, width : bw * 4] = img[:, width - 1 : width]
    if height < bh * 4:
        padded[height : bh * 4, :] = padded[height - 1 : height, :]

    blocks = padded.reshape(bh, 4, bw, 4, 3).transpose(0, 2, 1, 3, 4).reshape(-1, 16, 3)
    pixels = blocks.astype(np.float32)
    luma = pixels @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    block_count = pixels.shape[0]
    row = np.arange(block_count)
    lo = pixels[row, np.argmin(luma, axis=1)]
    hi = pixels[row, np.argmax(luma, axis=1)]

    def quant565(rgb):
        r = np.clip(np.rint(rgb[:, 0] * 31 / 255), 0, 31).astype(np.uint16)
        g = np.clip(np.rint(rgb[:, 1] * 63 / 255), 0, 63).astype(np.uint16)
        b = np.clip(np.rint(rgb[:, 2] * 31 / 255), 0, 31).astype(np.uint16)
        return (r << 11) | (g << 5) | b

    c0 = quant565(hi)
    c1 = quant565(lo)
    same = c0 == c1
    if np.any(same):
        mn = pixels.min(axis=1)
        mx = pixels.max(axis=1)
        c0[same] = quant565(mx[same])
        c1[same] = quant565(mn[same])

    swap = c0 < c1
    c0_swapped = c0.copy()
    c1_swapped = c1.copy()
    c0_swapped[swap] = c1[swap]
    c1_swapped[swap] = c0[swap]
    c0, c1 = c0_swapped, c1_swapped

    def unpack565(c):
        r = ((c >> 11) & 31).astype(np.float32) * 255 / 31
        g = ((c >> 5) & 63).astype(np.float32) * 255 / 63
        b = (c & 31).astype(np.float32) * 255 / 31
        return np.stack([r, g, b], axis=1)

    p0 = unpack565(c0)
    p1 = unpack565(c1)
    palette = np.empty((block_count, 4, 3), dtype=np.float32)
    palette[:, 0] = p0
    palette[:, 1] = p1
    palette[:, 2] = (2 * p0 + p1) / 3
    palette[:, 3] = (p0 + 2 * p1) / 3

    diff = pixels[:, :, None, :] - palette[:, None, :, :]
    idx = np.argmin(np.sum(diff * diff, axis=3), axis=2).astype(np.uint32)
    bits = np.zeros(block_count, dtype=np.uint32)
    for i in range(16):
        bits |= idx[:, i] << (2 * i)

    packed = np.empty((block_count, 8), dtype=np.uint8)
    packed[:, 0] = c0 & 0xFF
    packed[:, 1] = c0 >> 8
    packed[:, 2] = c1 & 0xFF
    packed[:, 3] = c1 >> 8
    packed[:, 4] = bits & 0xFF
    packed[:, 5] = (bits >> 8) & 0xFF
    packed[:, 6] = (bits >> 16) & 0xFF
    packed[:, 7] = (bits >> 24) & 0xFF
    return packed.tobytes()


def read_dds(path):
    blob = bytearray(Path(path).read_bytes())
    if blob[:4] != b"DDS ":
        raise ValueError(f"{path}: not a DDS file")
    height = struct.unpack_from("<I", blob, 12)[0]
    width = struct.unpack_from("<I", blob, 16)[0]
    mip_count = struct.unpack_from("<I", blob, 28)[0]
    fourcc = bytes(blob[84:88])
    if fourcc != b"DX10":
        raise ValueError(f"{path}: expected DX10 header, got {fourcc!r}")
    dx10 = struct.unpack_from("<IIIII", blob, DDS_HEADER_SIZE)
    if dx10[0] != DXGI_FORMAT_BC1_UNORM_SRGB or dx10[3] != 2:
        raise ValueError(f"{path}: expected BC1 sRGB arraySize 2, got {dx10}")
    return blob, width, height, mip_count, dx10


def mip_size(width, height, mip):
    w = max(1, width >> mip)
    h = max(1, height >> mip)
    return max(1, (w + 3) // 4) * max(1, (h + 3) // 4) * 8


def face_chain_size(width, height, mip_count):
    return sum(mip_size(width, height, m) for m in range(mip_count))


def mip_offset(width, height, mip_count, slice_index, face_index, mip_index):
    face_chain = face_chain_size(width, height, mip_count)
    off = DATA_OFFSET + (slice_index * 6 + face_index) * face_chain
    for m in range(mip_index):
        off += mip_size(width, height, m)
    return off


def adjust_after_blend(img, contrast, brightness, add_rgb, saturation, scale):
    arr = img.astype(np.float32)
    lum = arr @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    gray = lum[:, :, None]
    arr = gray + (arr - gray) * saturation
    center = float(lum.mean())
    arr = (arr - center) * contrast + center + brightness
    arr += np.array(add_rgb, dtype=np.float32)
    arr *= scale
    return np.clip(np.rint(arr), 0, 255).astype(np.uint8)


def make_contact_sheet(faces, out_path):
    size = faces[0].shape[0]
    sheet = Image.new("RGB", (size * 3, size * 2), (0, 0, 0))
    draw = ImageDraw.Draw(sheet)
    positions = [(0, 0), (size, 0), (size * 2, 0), (0, size), (size, size), (size * 2, size)]
    for name, face, pos in zip(FACE_NAMES, faces, positions):
        sheet.paste(Image.fromarray(face, "RGB"), pos)
        avg = face.reshape(-1, 3).mean(axis=0)
        label = f"{name} avg({avg[0]:.0f},{avg[1]:.0f},{avg[2]:.0f})"
        x, y = pos
        draw.rectangle([x, y + size - 18, x + 170, y + size], fill=(24, 24, 24))
        draw.text((x + 5, y + size - 15), label, fill=(255, 255, 255))
    sheet.save(out_path)


def blend_file(target, source, output, backup_dir, blend, contrast, brightness, add_rgb, saturation, scale):
    target_blob, tw, th, tmips, tdx10 = read_dds(target)
    source_blob, sw, sh, smips, sdx10 = read_dds(source)
    if (tw, th, tmips, tdx10) != (sw, sh, smips, sdx10):
        raise ValueError(f"layout mismatch: {target} vs {source}")

    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / Path(target).name
    if not backup_path.exists():
        shutil.copy2(target, backup_path)

    out_blob = bytearray(target_blob)
    previews = []
    stats = []
    for slice_index in range(2):
        top_faces = []
        for face_index in range(6):
            for mip_index in range(tmips):
                w = max(1, tw >> mip_index)
                h = max(1, th >> mip_index)
                size = mip_size(tw, th, mip_index)
                off = mip_offset(tw, th, tmips, slice_index, face_index, mip_index)
                t_img = decode_bc1(target_blob[off : off + size], w, h).astype(np.float32)
                s_img = decode_bc1(source_blob[off : off + size], w, h).astype(np.float32)
                mixed = t_img * (1.0 - blend) + s_img * blend
                mixed = adjust_after_blend(mixed, contrast, brightness, add_rgb, saturation, scale)
                out_blob[off : off + size] = encode_bc1(mixed)
                if mip_index == 0:
                    top_faces.append(mixed)
        preview_path = output.parent / f"{output.stem}_blend_preview_slice{slice_index}.png"
        make_contact_sheet(top_faces, preview_path)
        previews.append(str(preview_path))
        stats.append(
            {
                "slice": slice_index,
                "averages": [
                    [FACE_NAMES[i], [int(round(v)) for v in top_faces[i].reshape(-1, 3).mean(axis=0)]]
                    for i in range(6)
                ],
            }
        )

    output.write_bytes(out_blob)
    return {
        "target": str(target),
        "source": str(source),
        "output": str(output),
        "backup": str(backup_path),
        "blend": blend,
        "contrast": contrast,
        "brightness": brightness,
        "add_rgb": add_rgb,
        "saturation": saturation,
        "scale": scale,
        "previews": previews,
        "stats": stats,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target-dir", required=True)
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--blend-day", type=float, default=0.35)
    parser.add_argument("--blend-night", type=float, default=0.45)
    parser.add_argument("--contrast", type=float, default=0.92)
    parser.add_argument("--brightness", type=float, default=0.0)
    parser.add_argument("--add-rgb", nargs=3, type=float, default=[0.0, 1.0, 3.0])
    parser.add_argument("--add-rgb-day", nargs=3, type=float)
    parser.add_argument("--add-rgb-night", nargs=3, type=float)
    parser.add_argument("--saturation", type=float, default=1.0)
    parser.add_argument("--saturation-day", type=float)
    parser.add_argument("--saturation-night", type=float)
    parser.add_argument("--scale", type=float, default=1.0)
    parser.add_argument("--scale-day", type=float)
    parser.add_argument("--scale-night", type=float)
    parser.add_argument("--files", nargs="+", choices=["day_ibl.dds", "night_ibl.dds"])
    args = parser.parse_args()

    target_dir = Path(args.target_dir)
    source_dir = Path(args.source_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    backup_dir = target_dir / ("_codex_backup_before_de_blend_" + datetime.now().strftime("%Y%m%d_%H%M%S"))

    results = []
    file_settings = [
        (
            "day_ibl.dds",
            args.blend_day,
            args.add_rgb_day if args.add_rgb_day is not None else args.add_rgb,
            args.saturation_day if args.saturation_day is not None else args.saturation,
            args.scale_day if args.scale_day is not None else args.scale,
        ),
        (
            "night_ibl.dds",
            args.blend_night,
            args.add_rgb_night if args.add_rgb_night is not None else args.add_rgb,
            args.saturation_night if args.saturation_night is not None else args.saturation,
            args.scale_night if args.scale_night is not None else args.scale,
        ),
    ]
    selected_files = set(args.files) if args.files else None
    for name, blend, add_rgb, saturation, scale in file_settings:
        if selected_files is not None and name not in selected_files:
            continue
        results.append(
            blend_file(
                target=target_dir / name,
                source=source_dir / name,
                output=target_dir / name,
                backup_dir=backup_dir,
                blend=blend,
                contrast=args.contrast,
                brightness=args.brightness,
                add_rgb=add_rgb,
                saturation=saturation,
                scale=scale,
            )
        )

    summary_path = out_dir / "de_blend_summary.json"
    summary_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps({"backup_dir": str(backup_dir), "summary": str(summary_path), "results": results}, indent=2))


if __name__ == "__main__":
    main()
