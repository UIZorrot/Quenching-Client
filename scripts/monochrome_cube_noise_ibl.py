import argparse
import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path

import numpy as np

import blend_bc1_cubemap_ibl as ibl


def cubemap_directions(face_index, width, height):
    xs = np.linspace(-1.0, 1.0, width, dtype=np.float32)
    ys = np.linspace(1.0, -1.0, height, dtype=np.float32)
    u, v = np.meshgrid(xs, ys)
    one = np.ones_like(u)

    if face_index == 0:  # +X
        dirs = np.stack([one, v, -u], axis=2)
    elif face_index == 1:  # -X
        dirs = np.stack([-one, v, u], axis=2)
    elif face_index == 2:  # +Y
        dirs = np.stack([u, one, -v], axis=2)
    elif face_index == 3:  # -Y
        dirs = np.stack([u, -one, v], axis=2)
    elif face_index == 4:  # +Z
        dirs = np.stack([u, v, one], axis=2)
    elif face_index == 5:  # -Z
        dirs = np.stack([-u, v, -one], axis=2)
    else:
        raise ValueError(face_index)

    norm = np.linalg.norm(dirs, axis=2, keepdims=True)
    return dirs / np.maximum(norm, 1e-6)


def sample_value_noise(noise_grid, dirs):
    grid_size = noise_grid.shape[0]
    coord = (dirs + 1.0) * 0.5 * (grid_size - 1)
    c0 = np.floor(coord).astype(np.int32)
    c1 = np.clip(c0 + 1, 0, grid_size - 1)
    c0 = np.clip(c0, 0, grid_size - 1)
    t = coord - c0
    t = t * t * (3.0 - 2.0 * t)

    x0, y0, z0 = c0[:, :, 0], c0[:, :, 1], c0[:, :, 2]
    x1, y1, z1 = c1[:, :, 0], c1[:, :, 1], c1[:, :, 2]
    tx, ty, tz = t[:, :, 0], t[:, :, 1], t[:, :, 2]

    c000 = noise_grid[x0, y0, z0]
    c100 = noise_grid[x1, y0, z0]
    c010 = noise_grid[x0, y1, z0]
    c110 = noise_grid[x1, y1, z0]
    c001 = noise_grid[x0, y0, z1]
    c101 = noise_grid[x1, y0, z1]
    c011 = noise_grid[x0, y1, z1]
    c111 = noise_grid[x1, y1, z1]

    c00 = c000 * (1.0 - tx) + c100 * tx
    c10 = c010 * (1.0 - tx) + c110 * tx
    c01 = c001 * (1.0 - tx) + c101 * tx
    c11 = c011 * (1.0 - tx) + c111 * tx
    c0v = c00 * (1.0 - ty) + c10 * ty
    c1v = c01 * (1.0 - ty) + c11 * ty
    return c0v * (1.0 - tz) + c1v * tz


def make_noise_grid(seed, grid_size):
    rng = np.random.default_rng(seed)
    grid = rng.normal(0.0, 1.0, (grid_size, grid_size, grid_size)).astype(np.float32)
    grid -= float(grid.mean())
    std = float(grid.std())
    if std > 1e-6:
        grid /= std
    return grid


def monochrome_with_noise(img, face_index, noise_grid, amplitude):
    arr = img.astype(np.float32)
    luma = arr @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    dirs = cubemap_directions(face_index, img.shape[1], img.shape[0])
    noise = sample_value_noise(noise_grid, dirs) * amplitude
    mono = np.clip(np.rint(luma + noise), 0, 255).astype(np.uint8)
    return np.repeat(mono[:, :, None], 3, axis=2)


def edge_pixels(img, edge_name):
    if edge_name == "top":
        return img[0, :, :]
    if edge_name == "bottom":
        return img[-1, :, :]
    if edge_name == "left":
        return img[:, 0, :]
    if edge_name == "right":
        return img[:, -1, :]
    raise ValueError(edge_name)


def set_edge_pixels(img, edge_name, values):
    if edge_name == "top":
        img[0, :, :] = values
    elif edge_name == "bottom":
        img[-1, :, :] = values
    elif edge_name == "left":
        img[:, 0, :] = values
    elif edge_name == "right":
        img[:, -1, :] = values
    else:
        raise ValueError(edge_name)


def edge_dirs(face_index, edge_name, width, height):
    dirs = cubemap_directions(face_index, width, height)
    if edge_name == "top":
        return dirs[0, :, :]
    if edge_name == "bottom":
        return dirs[-1, :, :]
    if edge_name == "left":
        return dirs[:, 0, :]
    if edge_name == "right":
        return dirs[:, -1, :]
    raise ValueError(edge_name)


def cube_edge_pairs(width, height):
    edges = ["top", "bottom", "left", "right"]
    descriptors = []
    for face_index in range(6):
        for edge_name in edges:
            descriptors.append((face_index, edge_name, edge_dirs(face_index, edge_name, width, height)))

    pairs = []
    used = set()
    for i, (face_a, edge_a, dirs_a) in enumerate(descriptors):
        if (face_a, edge_a) in used:
            continue
        best = None
        for face_b, edge_b, dirs_b in descriptors[i + 1 :]:
            if face_a == face_b or (face_b, edge_b) in used:
                continue
            same = float(np.mean(np.linalg.norm(dirs_a - dirs_b, axis=1)))
            rev = float(np.mean(np.linalg.norm(dirs_a - dirs_b[::-1], axis=1)))
            score = min(same, rev)
            if best is None or score < best[0]:
                best = (score, face_b, edge_b, rev < same)
        if best is not None and best[0] < 1e-5:
            _score, face_b, edge_b, reversed_order = best
            pairs.append((face_a, edge_a, face_b, edge_b, reversed_order))
            used.add((face_a, edge_a))
            used.add((face_b, edge_b))
    return pairs


def stitch_cube_edges(faces):
    height, width = faces[0].shape[:2]
    if width < 2 or height < 2:
        return faces
    for face_a, edge_a, face_b, edge_b, reversed_order in cube_edge_pairs(width, height):
        a = edge_pixels(faces[face_a], edge_a).astype(np.float32)
        b = edge_pixels(faces[face_b], edge_b).astype(np.float32)
        if reversed_order:
            b = b[::-1]
        avg = np.rint((a + b) * 0.5).astype(np.uint8)
        set_edge_pixels(faces[face_a], edge_a, avg)
        set_edge_pixels(faces[face_b], edge_b, avg[::-1] if reversed_order else avg)
    return faces


def process_dds(path, seed, amplitude, grid_size, preview_suffix):
    path = Path(path)
    blob, width, height, mip_count, dx10 = ibl.read_dds(path)
    out_blob = bytearray(blob)
    stats = []

    # Use a stable but different field for each texture while preserving seams inside it.
    seed_offset = int(hashlib.sha256(path.name.encode("utf-8")).hexdigest()[:8], 16)
    noise_grid = make_noise_grid(seed + seed_offset, grid_size)

    for slice_index in range(2):
        top_faces = []
        for mip_index in range(mip_count):
            mip_faces = []
            mip_w = max(1, width >> mip_index)
            mip_h = max(1, height >> mip_index)
            for face_index in range(6):
                size = ibl.mip_size(width, height, mip_index)
                off = ibl.mip_offset(width, height, mip_count, slice_index, face_index, mip_index)
                img = ibl.decode_bc1(blob[off : off + size], mip_w, mip_h)
                mip_faces.append(monochrome_with_noise(img, face_index, noise_grid, amplitude))
            stitch_cube_edges(mip_faces)
            for face_index, adjusted in enumerate(mip_faces):
                mip_w = max(1, width >> mip_index)
                mip_h = max(1, height >> mip_index)
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
    parser.add_argument("--amplitude", type=float, default=3.0)
    parser.add_argument("--grid-size", type=int, default=18)
    parser.add_argument("--seed", type=int, default=20260917)
    parser.add_argument("--files", nargs="+")
    args = parser.parse_args()

    target_dir = Path(args.target_dir)
    files = args.files or [p.name for p in sorted(target_dir.glob("*_ibl.dds"))]
    if not files:
        raise SystemExit("no *_ibl.dds files found")

    backup = target_dir / f"_codex_backup_before_monochrome_noise_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup.mkdir(parents=True, exist_ok=True)
    for name in files:
        shutil.copy2(target_dir / name, backup / name)

    results = []
    for name in files:
        results.append(
            process_dds(
                target_dir / name,
                seed=args.seed,
                amplitude=args.amplitude,
                grid_size=args.grid_size,
                preview_suffix="mono_noise_preview",
            )
        )

    summary = target_dir / "monochrome_noise_summary.json"
    summary.write_text(
        json.dumps(
            {
                "backup": str(backup),
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
