import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

import blend_bc1_cubemap_ibl as ibl


FACE_INDEX = 2
FACE_NAME = "+Y"


def detect_spot(face):
    arr = face.astype(np.float32)
    luma = arr @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    h, w = luma.shape
    x0, x1 = int(w * 0.55), int(w * 0.96)
    y0, y1 = int(h * 0.42), int(h * 0.90)
    roi = luma[y0:y1, x0:x1]
    flat = int(np.argmax(roi))
    y, x = np.unravel_index(flat, roi.shape)
    return x0 + x, y0 + y


def remove_spot(face, center, radius_ratio, feather_ratio):
    arr = face.astype(np.float32)
    h, w = arr.shape[:2]
    cx = center[0] * w
    cy = center[1] * h
    yy, xx = np.mgrid[:h, :w]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)

    radius = max(1.5, min(w, h) * radius_ratio)
    feather = max(1.0, min(w, h) * feather_ratio)
    outer = radius + feather

    ring = (dist >= outer * 1.15) & (dist <= outer * 1.9)
    if not np.any(ring):
        ring = dist > outer
    fill = arr[ring].mean(axis=0) if np.any(ring) else arr.reshape(-1, 3).mean(axis=0)
    if not np.all(np.isfinite(fill)):
        fill = arr.reshape(-1, 3).mean(axis=0)

    temp = arr.copy()
    temp[dist <= outer] = fill
    blurred = np.array(
        Image.fromarray(np.clip(np.rint(temp), 0, 255).astype(np.uint8), "RGB").filter(
            ImageFilter.GaussianBlur(radius=max(1, int(radius * 0.75)))
        ),
        dtype=np.float32,
    )

    alpha = np.clip((outer - dist) / feather, 0, 1)
    alpha[dist <= radius] = 1
    alpha = alpha[:, :, None]
    out = arr * (1 - alpha) + blurred * alpha
    return np.clip(np.rint(out), 0, 255).astype(np.uint8)


def make_contact_sheet(blob, width, height, mip_count, out_path):
    chain = ibl.face_chain_size(width, height, mip_count)
    for slice_index in range(2):
        faces = []
        for face_index in range(6):
            off = ibl.DATA_OFFSET + (slice_index * 6 + face_index) * chain
            size = ibl.mip_size(width, height, 0)
            faces.append(ibl.decode_bc1(blob[off : off + size], width, height))
        preview = out_path.parent / f"{out_path.stem}_preview_slice{slice_index}.png"
        ibl.make_contact_sheet(faces, preview)


def process_file(path, backup_dir, radius_ratio, feather_ratio):
    blob, width, height, mip_count, _ = ibl.read_dds(path)
    backup_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, backup_dir / path.name)

    chain = ibl.face_chain_size(width, height, mip_count)
    detections = []
    for slice_index in range(2):
        off = ibl.DATA_OFFSET + (slice_index * 6 + FACE_INDEX) * chain
        size = ibl.mip_size(width, height, 0)
        face = ibl.decode_bc1(blob[off : off + size], width, height)
        x, y = detect_spot(face)
        detections.append([slice_index, x / width, y / height])

    out_blob = bytearray(blob)
    for slice_index, rel_x, rel_y in detections:
        for mip_index in range(mip_count):
            w = max(1, width >> mip_index)
            h = max(1, height >> mip_index)
            size = ibl.mip_size(width, height, mip_index)
            off = ibl.mip_offset(width, height, mip_count, slice_index, FACE_INDEX, mip_index)
            face = ibl.decode_bc1(blob[off : off + size], w, h)
            fixed = remove_spot(face, (rel_x, rel_y), radius_ratio, feather_ratio)
            out_blob[off : off + size] = ibl.encode_bc1(fixed)

    path.write_bytes(out_blob)
    make_contact_sheet(out_blob, width, height, mip_count, path.with_name(path.stem + "_spot_removed"))
    return {"file": str(path), "backup": str(backup_dir / path.name), "face": FACE_NAME, "detections": detections}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target-dir", required=True)
    parser.add_argument("--files", nargs="+", default=["day_ibl.dds", "night_ibl.dds"])
    parser.add_argument("--radius-ratio", type=float, default=0.07)
    parser.add_argument("--feather-ratio", type=float, default=0.045)
    args = parser.parse_args()

    target_dir = Path(args.target_dir)
    backup_dir = target_dir / ("_codex_backup_before_remove_spot_run_" + datetime.now().strftime("%Y%m%d_%H%M%S"))
    results = []
    for name in args.files:
        results.append(process_file(target_dir / name, backup_dir, args.radius_ratio, args.feather_ratio))
    print(json.dumps({"backup_dir": str(backup_dir), "results": results}, indent=2))


if __name__ == "__main__":
    main()
