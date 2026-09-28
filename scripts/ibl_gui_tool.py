import hashlib
import json
import os
import shutil
import subprocess
import sys
import threading
import traceback
from datetime import datetime
from pathlib import Path
from tkinter import (
    BOTH,
    DISABLED,
    END,
    LEFT,
    NORMAL,
    RIGHT,
    TOP,
    BooleanVar,
    Button,
    Checkbutton,
    Entry,
    Frame,
    Label,
    LabelFrame,
    Listbox,
    StringVar,
    Tk,
    filedialog,
    messagebox,
    ttk,
)

import numpy as np
from PIL import Image, ImageTk

import blend_bc1_cubemap_ibl as ibl


DEFAULT_IBL_DIR = Path(
    r"D:\Quenching\War3Reforged\Warcraft III\_retail_\environment\environmentmap\lordaeronsummer"
)
KNOWN_DDS = ("day_ibl.dds", "night_ibl.dds", "water_ibl.dds")
FACE_POSITIONS = ((0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (2, 1))


def now_stamp():
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def sha16(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()[:16].upper()


def read_top_faces(dds_path, slice_index):
    blob, width, height, mip_count, _dx10 = ibl.read_dds(dds_path)
    faces = []
    for face_index in range(6):
        off = ibl.mip_offset(width, height, mip_count, slice_index, face_index, 0)
        size = ibl.mip_size(width, height, 0)
        faces.append(ibl.decode_bc1(blob[off : off + size], width, height))
    return faces, width, height


def contact_sheet_from_faces(faces):
    face_h, face_w = faces[0].shape[:2]
    sheet = Image.new("RGB", (face_w * 3, face_h * 2), (0, 0, 0))
    for face, (col, row) in zip(faces, FACE_POSITIONS):
        sheet.paste(Image.fromarray(face, "RGB"), (col * face_w, row * face_h))
    return sheet


def faces_from_contact_sheet(path, face_w, face_h):
    image = Image.open(path).convert("RGB")
    expected = (face_w * 3, face_h * 2)
    if image.size != expected:
        raise ValueError(f"{path}: expected {expected[0]}x{expected[1]}, got {image.size[0]}x{image.size[1]}")
    faces = []
    for col, row in FACE_POSITIONS:
        crop = image.crop((col * face_w, row * face_h, (col + 1) * face_w, (row + 1) * face_h))
        faces.append(np.asarray(crop, dtype=np.uint8).copy())
    return faces


def resize_face(face, width, height):
    if face.shape[1] == width and face.shape[0] == height:
        return face
    img = Image.fromarray(face, "RGB").resize((width, height), Image.Resampling.LANCZOS)
    return np.asarray(img, dtype=np.uint8)


def export_tif(dds_path, export_dir):
    dds_path = Path(dds_path)
    export_dir = Path(export_dir)
    export_dir.mkdir(parents=True, exist_ok=True)
    exported = []
    meta_entries = []
    for slice_index in range(2):
        faces, width, height = read_top_faces(dds_path, slice_index)
        sheet = contact_sheet_from_faces(faces)
        out_path = export_dir / f"{dds_path.stem}_slice{slice_index}.tif"
        sheet.save(out_path, compression="tiff_lzw")
        exported.append(out_path)
        meta_entries.append(
            {
                "slice": slice_index,
                "file": out_path.name,
                "width": width,
                "height": height,
                "layout": ["+X", "-X", "+Y", "-Y", "+Z", "-Z"],
            }
        )
    return exported, meta_entries


def import_tif_pair(dds_path, import_dir):
    dds_path = Path(dds_path)
    import_dir = Path(import_dir)
    blob, width, height, mip_count, _dx10 = ibl.read_dds(dds_path)
    out_blob = bytearray(blob)
    used = []
    for slice_index in range(2):
        tif_path = import_dir / f"{dds_path.stem}_slice{slice_index}.tif"
        if not tif_path.exists():
            raise FileNotFoundError(f"Missing edited TIFF: {tif_path}")
        top_faces = faces_from_contact_sheet(tif_path, width, height)
        used.append(tif_path)
        for face_index, top_face in enumerate(top_faces):
            for mip_index in range(mip_count):
                mip_w = max(1, width >> mip_index)
                mip_h = max(1, height >> mip_index)
                mip_face = resize_face(top_face, mip_w, mip_h)
                off = ibl.mip_offset(width, height, mip_count, slice_index, face_index, mip_index)
                size = ibl.mip_size(width, height, mip_index)
                out_blob[off : off + size] = ibl.encode_bc1(mip_face)
    dds_path.write_bytes(out_blob)
    return used


def preview_png(dds_path, out_dir, suffix="preview"):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for slice_index in range(2):
        faces, _width, _height = read_top_faces(dds_path, slice_index)
        out_path = out_dir / f"{Path(dds_path).stem}_{suffix}_slice{slice_index}.png"
        ibl.make_contact_sheet(faces, out_path)
        paths.append(out_path)
    return paths


def adjust_dds(dds_path, contrast, saturation, brightness, scale, add_rgb):
    dds_path = Path(dds_path)
    blob, width, height, mip_count, _dx10 = ibl.read_dds(dds_path)
    out_blob = bytearray(blob)
    for slice_index in range(2):
        for face_index in range(6):
            for mip_index in range(mip_count):
                mip_w = max(1, width >> mip_index)
                mip_h = max(1, height >> mip_index)
                off = ibl.mip_offset(width, height, mip_count, slice_index, face_index, mip_index)
                size = ibl.mip_size(width, height, mip_index)
                image = ibl.decode_bc1(blob[off : off + size], mip_w, mip_h)
                adjusted = ibl.adjust_after_blend(
                    image,
                    contrast=contrast,
                    brightness=brightness,
                    add_rgb=add_rgb,
                    saturation=saturation,
                    scale=scale,
                )
                out_blob[off : off + size] = ibl.encode_bc1(adjusted)
    dds_path.write_bytes(out_blob)


class IblTool(Tk):
    def __init__(self):
        super().__init__()
        self.title("War3 IBL DDS 工具")
        self.geometry("1040x760")
        self.minsize(920, 640)
        self.ibl_dir = StringVar(value=str(DEFAULT_IBL_DIR))
        self.export_dir = StringVar(value=str(DEFAULT_IBL_DIR / "_ibl_tif_work"))
        self.status = StringVar(value="选择 IBL 文件夹后开始。")
        self.file_vars = {name: BooleanVar(value=True) for name in KNOWN_DDS}
        self.contrast = StringVar(value="0.34")
        self.saturation = StringVar(value="1.0")
        self.brightness = StringVar(value="0")
        self.scale = StringVar(value="1.0")
        self.add_r = StringVar(value="0")
        self.add_g = StringVar(value="0")
        self.add_b = StringVar(value="0")
        self.preview_image = None
        self.preview_label = None
        self.file_list = None
        self.log_box = None
        self._build_ui()
        self.refresh_files()

    def _build_ui(self):
        root = Frame(self, padx=10, pady=10)
        root.pack(fill=BOTH, expand=True)

        top = LabelFrame(root, text="路径")
        top.pack(fill="x")
        Label(top, text="IBL 文件夹").pack(side=LEFT, padx=(8, 4), pady=8)
        Entry(top, textvariable=self.ibl_dir).pack(side=LEFT, fill="x", expand=True, padx=4)
        Button(top, text="浏览", command=self.choose_ibl_dir).pack(side=LEFT, padx=4)
        Button(top, text="刷新", command=self.refresh_files).pack(side=LEFT, padx=(4, 8))

        mid = Frame(root)
        mid.pack(fill=BOTH, expand=True, pady=10)

        left = Frame(mid)
        left.pack(side=LEFT, fill="y")

        files = LabelFrame(left, text="DDS 文件")
        files.pack(fill="x")
        for name in KNOWN_DDS:
            Checkbutton(files, text=name, variable=self.file_vars[name]).pack(anchor="w", padx=8)
        Button(files, text="备份选中文件", command=self.backup_selected).pack(fill="x", padx=8, pady=(8, 4))
        Button(files, text="生成 PNG 预览", command=self.generate_preview).pack(fill="x", padx=8, pady=4)

        ps = LabelFrame(left, text="PS / TIFF 工作流")
        ps.pack(fill="x", pady=10)
        Label(ps, text="TIFF 输出/导入目录").pack(anchor="w", padx=8, pady=(6, 2))
        Entry(ps, textvariable=self.export_dir, width=36).pack(fill="x", padx=8)
        Button(ps, text="选择目录", command=self.choose_export_dir).pack(fill="x", padx=8, pady=(6, 2))
        Button(ps, text="导出选中 DDS 为 TIFF", command=self.export_selected_tif).pack(fill="x", padx=8, pady=2)
        Button(ps, text="从 TIFF 写回 DDS", command=self.import_selected_tif).pack(fill="x", padx=8, pady=2)
        Button(ps, text="打开 TIFF 目录", command=self.open_export_dir).pack(fill="x", padx=8, pady=(2, 8))

        adj = LabelFrame(left, text="快速调色")
        adj.pack(fill="x")
        self._field(adj, "对比度", self.contrast, "0.34 = 减少 66%")
        self._field(adj, "饱和度", self.saturation, "0 = 去色")
        self._field(adj, "亮度", self.brightness, "加法")
        self._field(adj, "整体亮度", self.scale, "1.0 不变")
        self._field(adj, "R", self.add_r, "")
        self._field(adj, "G", self.add_g, "")
        self._field(adj, "B", self.add_b, "")
        Button(adj, text="应用到选中 DDS", command=self.apply_adjustment).pack(fill="x", padx=8, pady=8)

        right = Frame(mid)
        right.pack(side=RIGHT, fill=BOTH, expand=True, padx=(10, 0))

        info = LabelFrame(right, text="当前文件")
        info.pack(fill="x")
        self.file_list = Listbox(info, height=6)
        self.file_list.pack(fill="x", padx=8, pady=8)
        self.file_list.bind("<<ListboxSelect>>", lambda _event: self.show_selected_preview())

        preview = LabelFrame(right, text="预览")
        preview.pack(fill=BOTH, expand=True, pady=10)
        self.preview_label = Label(preview, text="生成预览后会显示在这里")
        self.preview_label.pack(fill=BOTH, expand=True)

        logs = LabelFrame(right, text="日志")
        logs.pack(fill=BOTH)
        self.log_box = Listbox(logs, height=9)
        self.log_box.pack(fill=BOTH, expand=True, padx=8, pady=8)

        bottom = Frame(root)
        bottom.pack(fill="x")
        Label(bottom, textvariable=self.status).pack(side=LEFT)

    def _field(self, parent, label, var, hint):
        row = Frame(parent)
        row.pack(fill="x", padx=8, pady=2)
        Label(row, text=label, width=8, anchor="w").pack(side=LEFT)
        Entry(row, textvariable=var, width=10).pack(side=LEFT)
        if hint:
            Label(row, text=hint).pack(side=LEFT, padx=6)

    def choose_ibl_dir(self):
        path = filedialog.askdirectory(initialdir=self.ibl_dir.get() or str(DEFAULT_IBL_DIR))
        if path:
            self.ibl_dir.set(path)
            self.export_dir.set(str(Path(path) / "_ibl_tif_work"))
            self.refresh_files()

    def choose_export_dir(self):
        path = filedialog.askdirectory(initialdir=self.export_dir.get() or self.ibl_dir.get())
        if path:
            self.export_dir.set(path)

    def selected_files(self):
        root = Path(self.ibl_dir.get())
        return [root / name for name, var in self.file_vars.items() if var.get() and (root / name).exists()]

    def log(self, message):
        self.log_box.insert(END, f"{datetime.now().strftime('%H:%M:%S')}  {message}")
        self.log_box.yview_moveto(1)
        self.status.set(message)
        self.update_idletasks()

    def run_task(self, title, func):
        self.set_buttons(DISABLED)

        def wrapped():
            try:
                self.after(0, lambda: self.log(title))
                result = func()
                self.after(0, lambda: self.log(result or "完成"))
                self.after(0, self.refresh_files)
            except Exception as exc:
                detail = traceback.format_exc()
                self.after(0, lambda: self.log(f"失败: {exc}"))
                self.after(0, lambda: messagebox.showerror("操作失败", detail))
            finally:
                self.after(0, lambda: self.set_buttons(NORMAL))

        threading.Thread(target=wrapped, daemon=True).start()

    def set_buttons(self, state):
        for child in self.winfo_children():
            self._set_buttons_recursive(child, state)

    def _set_buttons_recursive(self, widget, state):
        if isinstance(widget, Button):
            widget.configure(state=state)
        for child in widget.winfo_children():
            self._set_buttons_recursive(child, state)

    def refresh_files(self):
        root = Path(self.ibl_dir.get())
        self.file_list.delete(0, END)
        if not root.exists():
            self.log(f"目录不存在: {root}")
            return
        for name in KNOWN_DDS:
            path = root / name
            if path.exists():
                try:
                    blob, width, height, mip_count, dx10 = ibl.read_dds(path)
                    item = f"{name}  {width}x{height}  mips={mip_count}  dxgi={dx10[0]}  array={dx10[3]}  sha={sha16(path)}"
                except Exception as exc:
                    item = f"{name}  无法读取: {exc}"
                self.file_list.insert(END, item)
            else:
                self.file_list.insert(END, f"{name}  缺失")
        self.show_selected_preview()

    def make_backup(self, tag):
        files = self.selected_files()
        if not files:
            raise ValueError("没有选中的 DDS 文件")
        backup = Path(self.ibl_dir.get()) / f"_ibl_gui_backup_{tag}_{now_stamp()}"
        backup.mkdir(parents=True, exist_ok=True)
        for path in files:
            shutil.copy2(path, backup / path.name)
        manifest = {
            "created_at": datetime.now().isoformat(timespec="seconds"),
            "source_dir": self.ibl_dir.get(),
            "files": [{"name": p.name, "sha": sha16(p)} for p in files],
        }
        (backup / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        return backup

    def backup_selected(self):
        def task():
            backup = self.make_backup("manual")
            return f"备份完成: {backup}"

        self.run_task("开始备份", task)

    def export_selected_tif(self):
        def task():
            backup = self.make_backup("before_tif_export")
            export_root = Path(self.export_dir.get())
            export_root.mkdir(parents=True, exist_ok=True)
            meta = {
                "created_at": datetime.now().isoformat(timespec="seconds"),
                "ibl_dir": self.ibl_dir.get(),
                "backup": str(backup),
                "files": [],
            }
            for dds in self.selected_files():
                exported, entries = export_tif(dds, export_root)
                preview_png(dds, export_root, suffix="export_preview")
                meta["files"].append({"dds": dds.name, "slices": entries})
                self.after(0, lambda d=dds.name: self.log(f"已导出 TIFF: {d}"))
            (export_root / "ibl_tif_manifest.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
            return f"TIFF 导出完成: {export_root}"

        self.run_task("开始导出 TIFF", task)

    def import_selected_tif(self):
        def task():
            backup = self.make_backup("before_tif_import")
            import_root = Path(self.export_dir.get())
            for dds in self.selected_files():
                used = import_tif_pair(dds, import_root)
                preview_png(dds, dds.parent, suffix="tif_import_preview")
                self.after(0, lambda d=dds.name, u=used: self.log(f"已从 TIFF 写回: {d} ({len(u)} files)"))
            return f"写回完成，备份: {backup}"

        self.run_task("开始从 TIFF 写回 DDS", task)

    def generate_preview(self):
        def task():
            root = Path(self.ibl_dir.get())
            for dds in self.selected_files():
                preview_png(dds, root, suffix="gui_preview")
                self.after(0, lambda d=dds.name: self.log(f"已生成预览: {d}"))
            return "预览生成完成"

        self.run_task("开始生成预览", task)

    def apply_adjustment(self):
        def task():
            backup = self.make_backup("before_adjust")
            contrast = float(self.contrast.get())
            saturation = float(self.saturation.get())
            brightness = float(self.brightness.get())
            scale = float(self.scale.get())
            add_rgb = [float(self.add_r.get()), float(self.add_g.get()), float(self.add_b.get())]
            for dds in self.selected_files():
                adjust_dds(dds, contrast, saturation, brightness, scale, add_rgb)
                preview_png(dds, dds.parent, suffix="adjust_preview")
                self.after(0, lambda d=dds.name: self.log(f"已调色: {d}"))
            return f"调色完成，备份: {backup}"

        self.run_task("开始快速调色", task)

    def open_export_dir(self):
        path = Path(self.export_dir.get())
        path.mkdir(parents=True, exist_ok=True)
        os.startfile(path)

    def show_selected_preview(self):
        root = Path(self.ibl_dir.get())
        selection = self.file_list.curselection()
        names = list(KNOWN_DDS)
        index = selection[0] if selection else 0
        if index >= len(names):
            return
        stem = Path(names[index]).stem
        candidates = [
            root / f"{stem}_tif_import_preview_slice0.png",
            root / f"{stem}_adjust_preview_slice0.png",
            root / f"{stem}_gui_preview_slice0.png",
            root / f"{stem}_contrast66_preview_slice0.png",
            root / f"{stem}_blend_preview_slice0.png",
        ]
        path = next((p for p in candidates if p.exists()), None)
        if path is None:
            self.preview_label.configure(image="", text="还没有预览。点击“生成 PNG 预览”。")
            self.preview_image = None
            return
        image = Image.open(path).convert("RGB")
        image.thumbnail((720, 360), Image.Resampling.LANCZOS)
        self.preview_image = ImageTk.PhotoImage(image)
        self.preview_label.configure(image=self.preview_image, text="")


def main():
    app = IblTool()
    app.mainloop()


if __name__ == "__main__":
    main()
