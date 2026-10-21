#!/usr/bin/env python3
"""Lập danh sách video khóa Dũng Mori (N5–N1) thành JSON cho trang /mori.

Không copy file. Web phát từ MORI_COURSE_DIR (mặc định thư mục Google Drive trên máy này).
Chạy lại khi thêm hoặc xóa video:

  python scripts/index-mori-course.py
"""

from __future__ import annotations

import json
import os
import re
import unicodedata
from pathlib import Path

DEFAULT_ROOT = Path(
    "/Users/dung/Library/CloudStorage/GoogleDrive-letiendungdt@gmail.com/My Drive/"
    "309. [Tiếng Nhật][Dũng Mori] - Combo Tiếng Nhật Từ N1 đến N5 của Dũng Mori"
)
OUT = Path(__file__).resolve().parents[1] / "apps/nihongo-web/src/data/mori-course.json"
VIDEO_EXT = {".mp4", ".mkv", ".webm", ".mov", ".m4v"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
PDF_EXT = {".pdf"}
LEVELS = [
    ("309.1 N5", "n5", "N5"),
    ("309.2 N4", "n4", "N4"),
    ("309.3 N3", "n3", "N3"),
    ("309.4 N2", "n2", "N2"),
    ("309.5 N1", "n1", "N1"),
]


def nfc(value: str) -> str:
    return unicodedata.normalize("NFC", value)


def display_title(filename: str) -> str:
    name = nfc(filename)
    while name.startswith("Bản sao của "):
        name = name[len("Bản sao của ") :]
    # Drive lưu cả bản gốc và bản trùng "tên.mp4_2.mp4" / "tên.pdf".
    while True:
        nxt = re.sub(r"(?i)(?:_2)?(?:\.(?:mp4|pdf|png|jpe?g|webp|gif))+$", "", name)
        nxt = re.sub(r"(?i)_2$", "", nxt)
        if nxt == name:
            break
        name = nxt
    return name.strip()


def rank(filename: str) -> tuple[int, int, str]:
    name = nfc(filename)
    penalty = 0
    lower = name.lower()
    if "_2." in lower or lower.endswith("_2"):
        penalty += 2
    if name.startswith("Bản sao của"):
        penalty += 1
    if ".mp4.mp4" in name.lower():
        penalty += 1
    return (penalty, len(name), name)


def main() -> None:
    root = Path(os.environ.get("MORI_COURSE_DIR", DEFAULT_ROOT))
    if not root.is_dir():
        raise SystemExit(f"Không thấy thư mục khóa học: {root}")

    levels_out = []
    total = 0
    material_total = 0
    for folder, level_id, label in LEVELS:
        level_dir = root / folder
        if not level_dir.is_dir():
            # Tên thư mục trên Drive có thể khác dấu.
            matches = [p for p in root.iterdir() if p.is_dir() and level_id.upper() in nfc(p.name).upper()]
            if not matches:
                continue
            level_dir = matches[0]

        grouped: dict[tuple[str, str, str], list[Path]] = {}
        for path in level_dir.rglob("*"):
            if not path.is_file():
                continue
            ext = path.suffix.lower()
            if ext in VIDEO_EXT:
                kind = "video"
                if path.stat().st_size < 100_000:
                    continue
            elif ext in IMAGE_EXT or ext in PDF_EXT:
                kind = "image" if ext in IMAGE_EXT else "pdf"
                if path.stat().st_size < 1024:
                    continue
                if "password" in path.name.casefold():
                    continue
            else:
                continue
            rel_parent = nfc(str(path.parent.relative_to(level_dir)))
            if rel_parent == ".":
                rel_parent = ""
            key = (kind, rel_parent, display_title(path.name).casefold())
            grouped.setdefault(key, []).append(path)

        lessons: dict[str, dict[str, list[dict[str, str]]]] = {}
        chosen = []
        for (kind, parent, _title), paths in grouped.items():
            best = min(paths, key=lambda p: rank(p.name))
            chosen.append((kind, parent, best))
        chosen.sort(key=lambda item: nfc(str(item[2].relative_to(root))).casefold())

        counts = {"video": 0, "image": 0, "pdf": 0}
        for kind, parent, path in chosen:
            counts[kind] += 1
            lesson_title = " · ".join(part for part in parent.split("/") if part) or "Khác"
            bucket = lessons.setdefault(lesson_title, {"videos": [], "materials": []})
            item = {
                "id": f"{level_id}-{kind[:1]}-{counts[kind]}",
                "title": display_title(path.name),
                "file": nfc(str(path.relative_to(root))),
            }
            if kind == "video":
                bucket["videos"].append(item)
                total += 1
            else:
                item["kind"] = kind
                bucket["materials"].append(item)
                material_total += 1

        levels_out.append(
            {
                "id": level_id,
                "label": label,
                "lessons": [
                    {"title": title, "videos": bucket["videos"], "materials": bucket["materials"]}
                    for title, bucket in lessons.items()
                ],
            }
        )

    payload = {
        "title": "Combo Tiếng Nhật từ N5 đến N1 · Dũng Mori",
        "videoCount": total,
        "materialCount": material_total,
        "levels": levels_out,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{total} video, {material_total} tài liệu → {OUT}")


if __name__ == "__main__":
    main()
