#!/usr/bin/env python3
"""Sinh sơ đồ ER (Mermaid) từ schema Room export.

Dùng: python3 scripts/room_erd.py app/schemas/com.edu.nihongo.data.local.AppDatabase/3.json bảng1,bảng2 ["cha|con|nhãn quan hệ logic" ...]
Khóa ngoại thật vẽ nét liền; quan hệ logic không có FK (truyền thêm) vẽ nét đứt.
"""
import json, sys
d = json.load(open(sys.argv[1]))["database"]
tables = sys.argv[2].split(",")
logical = [l.split("|") for l in sys.argv[3:]]  # parent|child|label
aff = {"INTEGER": "int", "TEXT": "string", "REAL": "float", "BLOB": "blob"}
out = ["erDiagram"]
for e in d["entities"]:
    t = e["tableName"]
    if t not in tables: continue
    pk = set(e["primaryKey"]["columnNames"])
    fkcols = {c for fk in e.get("foreignKeys", []) for c in fk["columns"]}
    uk = {c for i in e.get("indices", []) if i.get("unique") for c in i["columnNames"]}
    out.append(f"  {t} {{")
    for f in e["fields"]:
        col = f["columnName"]
        keys = [k for k, s in (("PK", pk), ("FK", fkcols), ("UK", uk)) if col in s]
        null = "" if f.get("notNull") else ' "null"'
        out.append(f"    {aff.get(f['affinity'], 'string')} {col}{(' ' + ','.join(keys)) if keys else ''}{null}")
    out.append("  }")
for e in d["entities"]:
    if e["tableName"] not in tables: continue
    for fk in e.get("foreignKeys", []):
        out.append(f'  {fk["table"]} ||--o{{ {e["tableName"]} : "FK {fk["columns"][0]} · {fk["onDelete"]}"')
for p, c, label in logical:
    out.append(f'  {p} ||..o{{ {c} : "{label}"')
print("\n".join(out))
