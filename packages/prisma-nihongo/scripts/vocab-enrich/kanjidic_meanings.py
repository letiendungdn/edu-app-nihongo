#!/usr/bin/env python3
"""Lấy nghĩa tiếng Anh của từng chữ kanji từ KANJIDIC2 cho bảng KanjiEntry.

    python3 -I kanjidic_meanings.py <kanjidic2.xml> <chars.txt> <out.csv>

- kanjidic2.xml: http://www.edrdg.org/kanjidic/kanjidic2.xml.gz (giải nén). Giấy phép CC BY-SA 4.0,
  © Electronic Dictionary Research and Development Group: app phải ghi nguồn (xem README cùng thư mục).
- chars.txt: mỗi dòng một chữ kanji (xuất từ DB, xem README).
- out.csv: character,meaning_en — tối đa 4 nghĩa đầu, nối bằng "; ".

Chỉ lấy <meaning> không có thuộc tính m_lang (= tiếng Anh). Dùng iterparse để không nạp cả file 15 MB vào cây.
"""
import csv
import re
import sys
import xml.etree.ElementTree as ET

MAX_MEANINGS = 4
MAX_LEN = 80
# "one radical (no.1)", "two radical (no. 7)": ghi chú bộ thủ để tra cứu, không phải nghĩa của chữ
RADICAL_NOTE = re.compile(r"radical\s*\(no\.?\s*\d+\)", re.I)


def main(xml_path, chars_path, out_path):
    wanted = {line.strip() for line in open(chars_path, encoding="utf-8") if line.strip()}
    found = {}
    # KANJIDIC2 có DTD nội bộ nhưng không dùng entity tự định nghĩa trong phần dữ liệu: iterparse đọc được thẳng
    for _, el in ET.iterparse(xml_path, events=("end",)):
        if el.tag != "character":
            continue
        literal = el.findtext("literal")
        if literal in wanted:
            meanings = [
                m.text
                for m in el.iter("meaning")
                if m.text and "m_lang" not in m.attrib and not RADICAL_NOTE.search(m.text)
            ]
            if meanings:
                text = "; ".join(meanings[:MAX_MEANINGS])
                if len(text) > MAX_LEN:
                    text = text[:MAX_LEN].rsplit(";", 1)[0]
                found[literal] = text
        el.clear()

    with open(out_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["character", "meaning_en"])
        for ch in sorted(found):
            w.writerow([ch, found[ch]])
    missing = sorted(wanted - set(found))
    print(f"cần {len(wanted)}; có nghĩa: {len(found)}; không có: {len(missing)} {''.join(missing[:40])}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
