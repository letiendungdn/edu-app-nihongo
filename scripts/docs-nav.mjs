#!/usr/bin/env node
// Sinh mục "Đi tiếp" (<!-- nav:start --> … <!-- nav:end -->) ở cuối mỗi bài trong docs/
// từ các bảng trong docs/README.md. README là nguồn duy nhất của lộ trình: muốn thêm, bớt hay
// đổi thứ tự bài thì sửa bảng trong README rồi chạy lại script, đừng sửa tay mục "Đi tiếp".
//
//   node scripts/docs-nav.mjs           # ghi lại mục "Đi tiếp" cho mọi bài
//   node scripts/docs-nav.mjs --check   # chỉ kiểm, có bài lệch thì thoát mã 1 (dùng trong CI)
//
// Quy ước trong README:
//   ## <số>. <Tên nhóm>        tiêu đề nhóm; dòng chữ đầu tiên bên dưới là mô tả nhóm
//   | … | [bai.md](./bai.md) | Mô tả |     mỗi dòng bảng là một bài, theo thứ tự đọc
//   <!-- nav:reference-from N -->      nhóm số >= N là tài liệu tham khảo (không nối sang nhóm sau)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");
const START = "<!-- nav:start -->";
const END = "<!-- nav:end -->";
const check = process.argv.includes("--check");

function parseReadme() {
  const text = readFileSync(join(DOCS, "README.md"), "utf8");
  const refMatch = text.match(/<!--\s*nav:reference-from\s+(\d+)\s*-->/);
  const referenceFrom = refMatch ? Number(refMatch[1]) : Infinity;
  const groups = [];
  let current = null;
  for (const line of text.split("\n")) {
    const heading = line.match(/^## (\d+)\. (.+?)\s*$/);
    if (heading) {
      current = { num: Number(heading[1]), title: `${heading[1]}. ${heading[2]}`, desc: "", docs: [] };
      groups.push(current);
      continue;
    }
    if (!current) continue;
    if (/^## /.test(line)) { current = null; continue; }
    if (!current.desc && line.trim() && !line.startsWith("|") && !line.startsWith("<!--")) {
      current.desc = line.trim();
      continue;
    }
    if (!line.startsWith("|")) continue;
    const link = line.match(/\[([^\]]+\.md)\]\(\.\/([^)#]+\.md)\)/);
    if (!link) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    current.docs.push({ file: link[2], desc: cells[cells.length - 1] });
  }
  return { groups, referenceFrom };
}

function navFor(group, index, nextGroup, isReference) {
  const doc = group.docs[index];
  const lines = ["", "---", "", "## Đi tiếp", ""];
  if (isReference) {
    lines.push(`Tài liệu tham khảo thuộc **${group.title}**. Cùng nhóm:`, "");
    for (const other of group.docs) {
      if (other.file !== doc.file) lines.push(`- [${other.file}](./${other.file}) — ${other.desc}`);
    }
  } else {
    lines.push(`Bạn đang ở **${group.title}** — bài ${index + 1}/${group.docs.length}.`, "");
    const prev = group.docs[index - 1];
    const next = group.docs[index + 1];
    if (prev) lines.push(`- Bài trước: [${prev.file}](./${prev.file}) — ${prev.desc}`);
    if (next) {
      lines.push(`- **Bài tiếp: [${next.file}](./${next.file})** — ${next.desc}`);
    } else if (nextGroup) {
      const first = nextGroup.docs[0];
      lines.push(
        `- Xong nhóm này. **Nhóm tiếp: ${nextGroup.title}** — bắt đầu bằng [${first.file}](./${first.file}) (${first.desc})`,
      );
    } else {
      lines.push(
        "- Xong lộ trình chính. Xem thêm các nhóm tham khảo (lộ trình framework, phỏng vấn, định hướng Senior) trong [mục lục](./README.md).",
      );
    }
  }
  lines.push("", "Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)", "");
  return `${START}\n${lines.join("\n")}\n${END}`;
}

function applyNav(content, nav) {
  const s = content.indexOf(START);
  const e = content.indexOf(END);
  if (s !== -1 && e > s) return content.slice(0, s) + nav + content.slice(e + END.length);
  return `${content.replace(/\s*$/, "")}\n\n${nav}\n`;
}

const { groups, referenceFrom } = parseReadme();
const main = groups.filter((g) => g.num < referenceFrom && g.docs.length);
const seen = new Map();
const problems = [];
let changed = 0;

for (const group of groups) {
  const isReference = group.num >= referenceFrom;
  const nextGroup = isReference ? null : main[main.indexOf(group) + 1];
  group.docs.forEach((doc, i) => {
    if (seen.has(doc.file)) {
      problems.push(`${doc.file} có trong cả nhóm "${seen.get(doc.file)}" và "${group.title}"`);
      return;
    }
    seen.set(doc.file, group.title);
    const path = join(DOCS, doc.file);
    if (!existsSync(path)) { problems.push(`README trỏ tới ${doc.file} nhưng file không tồn tại`); return; }
    const before = readFileSync(path, "utf8");
    const after = applyNav(before, navFor(group, i, nextGroup, isReference));
    if (after !== before) {
      changed++;
      if (check) problems.push(`${doc.file}: mục "Đi tiếp" chưa khớp README`);
      else writeFileSync(path, after);
    }
  });
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join("\n"));
  if (check) console.error("\nSửa: node scripts/docs-nav.mjs");
  process.exit(1);
}
console.log(check ? "✓ Mục \"Đi tiếp\" khớp README" : `✓ Cập nhật ${changed} bài`);
