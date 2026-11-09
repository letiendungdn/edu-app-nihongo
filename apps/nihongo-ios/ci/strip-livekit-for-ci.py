#!/usr/bin/env python3
"""Bỏ package LiveKit khỏi project.yml khi chạy CI.

Unit/UI test không cần WebRTC; binary SPM LiveKit trên GitHub Actions
hay lỗi "already exists in file system" (exit 74). Máy local vẫn dùng project.yml đủ.
"""

from __future__ import annotations

from pathlib import Path


def strip(text: str) -> str:
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]

        # Bỏ khối LiveKitClient: và các dòng con indent sâu hơn.
        if line.startswith("  LiveKitClient:"):
            # Xóa comment ngay trước đó nếu nói về LiveKit / ghim / prefetch.
            while out and out[-1].lstrip().startswith("#"):
                prev = out[-1]
                if any(
                    key in prev
                    for key in ("LiveKit", "Ghim", "prefetch", "exactVersion", "from:")
                ):
                    out.pop()
                    continue
                break
            i += 1
            while i < len(lines):
                nxt = lines[i]
                if nxt.startswith("    ") or nxt.strip() == "":
                    i += 1
                    continue
                if nxt.startswith("  ") and not nxt.startswith("    "):
                    break
                i += 1
            continue

        # Bỏ dependency package LiveKitClient + dòng product.
        if "package: LiveKitClient" in line:
            i += 1
            if i < len(lines) and "product: LiveKit" in lines[i]:
                i += 1
            continue

        out.append(line)
        i += 1

    return "".join(out)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "project.yml"
    dst = root / "project.ci.yml"
    dst.write_text(strip(src.read_text()), encoding="utf-8")
    print(f"Wrote {dst.relative_to(root)}")


if __name__ == "__main__":
    main()
