#!/usr/bin/env python3
"""Ghép nghĩa tiếng Anh từ JMdict cho bảng Vocabulary.

    python3 -I jmdict_match.py <JMdict_e> <vocab.csv> <out.csv>

- JMdict_e: file XML từ http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz (giải nén). Giấy phép CC BY-SA 4.0,
  © Electronic Dictionary Research and Development Group: app phải ghi nguồn (xem README cùng thư mục).
- vocab.csv: id,kanji,kana (xuất từ DB, xem README).
- out.csv: id,meaning_en,match (cách khớp: pair | kanji | kana | masu-pair | masu-kanji).

Chỉ nhận kết quả chắc chắn. Từ chỉ có kana mà JMdict có nhiều mục cùng cách đọc (đồng âm) thì bỏ trống,
để bước sau dịch bằng AI và ghi rõ "dịch máy", thay vì gán nhầm nghĩa của từ khác.
"""
import csv
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict

MAX_GLOSSES = 3
MAX_LEN = 90

# Thể ます → thể từ điển. Cột i (trước ます) đổi sang cột u cho động từ nhóm 1.
I_TO_U = {"い": "う", "き": "く", "ぎ": "ぐ", "し": "す", "ち": "つ", "に": "ぬ", "び": "ぶ", "み": "む", "り": "る"}
TRIM = "〜～－-‐ー・ 　。、？！?!"


def load_jmdict(path):
    text = open(path, encoding="utf-8").read()
    # Bỏ DTD và đổi entity tự định nghĩa (&n; &v5k;…) thành chữ thường: ElementTree không đọc được DTD nội bộ
    text = re.sub(r"<!DOCTYPE.*?\]>", "", text, flags=re.S)
    text = re.sub(r"&([\w-]+);", r"\1", text)
    root = ET.fromstring(text)
    entries = []
    for e in root.iter("entry"):
        kebs = [k.text for k in e.iter("keb")]
        rebs = [r.text for r in e.iter("reb")]
        senses = []
        for s in e.iter("sense"):
            glosses = [g.text for g in s.findall("gloss") if g.text]
            pos = [p.text for p in s.findall("pos") if p.text]
            misc = [m.text for m in s.findall("misc") if m.text]
            if glosses:
                senses.append({"glosses": glosses, "pos": pos, "misc": misc})
        if senses:
            entries.append({"kebs": kebs, "rebs": rebs, "senses": senses})
    return entries


def gloss_text(entry):
    glosses = entry["senses"][0]["glosses"][:MAX_GLOSSES]
    text = "; ".join(glosses)
    return text if len(text) <= MAX_LEN else text[: MAX_LEN - 1].rsplit(";", 1)[0]


def clean(s):
    s = (s or "").strip().strip(TRIM)
    return s.replace(" ", "").replace("　", "")


def masu_candidates(word):
    """たべます → [たべる, たべ…]; かきます → [かく]; かんどうします → [かんどう, かんどうする]; きます → [くる]."""
    if not word.endswith("ます"):
        return []
    stem = word[:-2]
    if not stem:
        return []
    out = [stem + "る"]  # nhóm 2 (たべ-る)
    if stem[-1] in I_TO_U:
        out.append(stem[:-1] + I_TO_U[stem[-1]])  # nhóm 1 (かき → かく)
    if stem.endswith("し") and len(stem) > 1:
        out += [stem[:-1], stem[:-1] + "する"]  # danh động từ する
    if stem in ("き", "来"):
        out.append("くる" if stem == "き" else "来る")
    return out


def main(jm_path, vocab_path, out_path):
    entries = load_jmdict(jm_path)
    by_pair, by_keb, by_reb_kana_only = defaultdict(list), defaultdict(list), defaultdict(list)
    for i, e in enumerate(entries):
        for k in e["kebs"]:
            by_keb[k].append(i)
            for r in e["rebs"]:
                by_pair[(k, r)].append(i)
        usually_kana = any("word usually written using kana alone" in m for s in e["senses"] for m in s["misc"])
        if not e["kebs"] or usually_kana:
            for r in e["rebs"]:
                by_reb_kana_only[r].append(i)

    def unique(ids):
        ids = list(dict.fromkeys(ids))
        return ids[0] if len(ids) == 1 else None

    def find(kanji, kana):
        if kanji and kana:
            hit = unique(by_pair.get((kanji, kana), []))
            if hit is not None:
                return hit, "pair"
        if kanji:
            hit = unique(by_keb.get(kanji, []))
            if hit is not None and (not kana or kana in entries[hit]["rebs"]):
                return hit, "kanji"
        if not kanji and kana:
            hit = unique(by_reb_kana_only.get(kana, []))
            if hit is not None:
                return hit, "kana"
        return None, None

    stats = defaultdict(int)
    with open(vocab_path, encoding="utf-8") as f, open(out_path, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["id", "meaning_en", "match"])
        for row in csv.DictReader(f):
            kanji, kana = clean(row["kanji"]), clean(row["kana"])
            hit, how = find(kanji, kana)
            if hit is None:
                kana_c = masu_candidates(kana)
                kanji_c = masu_candidates(kanji) if kanji else [""] * len(kana_c)
                for kc, rc in zip(kanji_c or [""] * len(kana_c), kana_c):
                    hit, how = find(kc, rc)
                    if hit is not None:
                        how = "masu-" + how
                        break
            stats[how or "none"] += 1
            if hit is not None:
                writer.writerow([row["id"], gloss_text(entries[hit]), how])
    total = sum(stats.values())
    print(f"JMdict entries: {len(entries)}; vocab: {total}")
    for k, v in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  {k:12} {v:6}  ({v * 100 / total:.1f}%)")


if __name__ == "__main__":
    main(*sys.argv[1:4])
