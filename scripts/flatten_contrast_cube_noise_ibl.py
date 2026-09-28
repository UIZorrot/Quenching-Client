import argparse
import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path

import numpy as np

import blend_bc1_cubemap_ibl as ibl
import monochrome_cube_noise_ibl as cube_noise


def flatten_color_with_noise(img, face_index, noise_grid, contrast, amplitude):
    arr = img.astype(np.float32)
    luma = arr @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    center = float(luma.mean())
    arr = (arr - center) * contrast + center

    dirs = cube_noise.cubemap_directions(face_index, img.shape[1], img.shape[0])
    noise = cube_noise.sample_value_noise(noise_grid, dirs)[:, :, None] * amplitude
    arr = arr + noise
    return np.clip(np.rint(arr), 0, 255).astype(np.uint8)


def process_dds(path, seed, contrast, amplitude, grid_size, preview_suffix):
    path = Path(path)
    blob, width, height, mip_count, dx10 = ibl.read_dds(path)
    out_blob = bytearray(blob)
    stats = []

    seed_offset = int(hashlib.sha256(path.name.encode("utf-8")).hexdigest()[:8], 16)
    noise_grid = cube_noise.make_noise_grid(seed + seed_offset, grid_size)

    for slice_index in range(2):
        top_faces = []
        for mip_index in range(mip_count):
            mip_w = max(1, width >> mip_index)
            mip_h = max(1, height >> mip_index)
            mip_faces = []
            for face_index in range(6):
                size = ibl.mip_size(width, height, mip_index)
                off = ibl.mip_offset(width, height, mip_count, slice_index, face_index, mip_index)
                img = ibl.decode_bc1(blob[off : off + size], mip_w, mip_h)
                mip_faces.append(flatten_color_with_noise(img, face_index, noise_grid, contrast, amplitude))

            cube_noise.stitch_cube_edges(mip_faces)

            for face_index, adjusted in enumerate(mip_faces):
                size = ibl.mip_size(width, height, mip_index)
                off = ibl.mip_offset(width, height, mip_count, slice_index, face_index, mip_index)
                out_blob[off : off + size] = ibl.encode_bc1(adjusted)
                if mip_index == 0:
                    top_faces.append(adjusted)

        preview_path = path.parent / f"{path.stem}_{preview_suffix}_slice{slice_index}.png"
        ibl.make_contact_sheet(top_faces, preview_path)
        stats.append(
            {
                "slice": slice_index,
                "averages": [
                    [
                        ibl.FACE_NAMES[i],
                        [int(round(v)) for v in top_faces[i].reshape(-1, 3).mean(axis=0)],
                    ]
                    for i in range(6)
                ],
            }
        )

    path.write_bytes(out_blob)
    return {
        "file": path.name,
        "sha": hashlib.sha256(out_blob).hexdigest()[:16].upper(),
        "layout": [width, height, mip_count, dx10[0], dx10[3]],
        "stats": stats,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target-dir", required=True)
    parser.add_argument("--contrast", type=float, default=0.45)
    parser.add_argument("--amplitude", type=float, default=3.0)
    parser.add_argument("--grid-size", type=int, default=18)
    parser.add_argument("--seed", type=int, default=20260917)
    parser.add_argument("--files", nargs="+")
    args = parser.parse_args()

    target_dir = Path(args.target_dir)
    files = args.files or [p.name for p in sorted(target_dir.glob("*_ibl.dds"))]
    if not files:
        raise SystemExit("no *_ibl.dds files found")

    backup = target_dir / f"_codex_backup_before_flatten_contrast_noise_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup.mkdir(parents=True, exist_ok=True)
    for name in files:
        shutil.copy2(target_dir / name, backup / name)

    results = [
        process_dds(
            target_dir / name,
            seed=args.seed,
            contrast=args.contrast,
            amplitude=args.amplitude,
            grid_size=args.grid_size,
            preview_suffix="flat_noise_preview",
        )
        for name in files
    ]

    summary = target_dir / "flatten_contrast_noise_summary.json"
    summary.write_text(
        json.dumps(
            {
                "backup": str(backup),
                "contrast": args.contrast,
                "amplitude": args.amplitude,
                "grid_size": args.grid_size,
                "seed": args.seed,
                "results": results,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"backup": str(backup), "summary": str(summary), "results": results}, indent=2))


if __name__ == "__main__":
    main()
