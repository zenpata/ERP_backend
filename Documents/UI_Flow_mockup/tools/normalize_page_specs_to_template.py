#!/usr/bin/env python3
"""
Normalize Page/*.md files: move legacy 'เนื้อหาอ้างอิงจาก UX' blocks into an Appendix
and wrap with _PAGE_SPEC_TEMPLATE-aligned sections (metadata, goals summary, pointers).

Does not invent field lists; appendix preserves full UX paste for manual/LLM refinement.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "Page"
# Paths relative to Page/Rx-xx/*.md
WORKFLOW_REL = "../../UX_TO_UI_SPEC_WORKFLOW.md"
DS_REL = "../../design-system.md"
GLOBAL_REL = "../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md"
MANUAL = "../MD_TO_PREVIEW_HTML_MANUAL.md"


def first_goal_in_block(text: str) -> str:
    m = re.search(r"\*\*Goal:\*\*\s*(.+?)(?:\n|$)", text)
    if m:
        return m.group(1).strip()
    m = re.search(r"\*\*Goal:\*\*\s*\n+\s*(.+?)(?:\n|$)", text, re.S)
    if m:
        return re.sub(r"\s+", " ", m.group(1).strip())[:300]
    return "ดูรายละเอียดใน Appendix และ UX flow ที่อ้างอิง"


def extract_route(title_block: str) -> str:
    m = re.search(r"\*\*Route:\*\*\s*`([^`]+)`", title_block)
    if m:
        return m.group(1).strip()
    m = re.search(r"\*\*Route:\*\*\s*([^\n]+)", title_block)
    if m:
        return m.group(1).strip()
    return "—"


def extract_ux_flow_href(title_block: str) -> str | None:
    m = re.search(r"\]\(\.\./\.\./\.\./UX_Flow/Functions/([^)]+\.md)\)", title_block)
    if m:
        return f"[`{m.group(1)}`](../../../UX_Flow/Functions/{m.group(1)})"
    m = re.search(r"Functions/(R[12]-[^)]+\.md)", title_block)
    if m:
        fn = m.group(1)
        return f"[`{fn}`](../../../UX_Flow/Functions/{fn})"
    return None


def preview_name(title_line: str) -> str:
    name = title_line.lstrip("# ").strip()
    if "—" in name:
        name = name.split("—")[0].strip()
    safe = re.sub(r"[^\w]+", "", name.replace(" ", "")) or "Page"
    return safe[:48]


def normalize_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "เนื้อหาอ้างอิงจาก UX" not in text:
        return False
    if "## Appendix — UX excerpt (reference)" in text:
        return False

    parts = text.split("## เนื้อหาอ้างอิงจาก UX (Sub-flow ที่เกี่ยวข้อง)", 1)
    if len(parts) != 2:
        parts = text.split("## เนื้อหาอ้างอิงจาก UX", 1)
    if len(parts) != 2:
        return False

    head, appendix_raw = parts
    lines = text.splitlines()
    title_line = next((ln for ln in lines if ln.startswith("# ")), "# Page")
    front_matter = "\n".join(lines[: min(80, len(lines))])

    route = extract_route(front_matter)
    ux_href = extract_ux_flow_href(front_matter) or "`TBD — ใส่ลิงก์ UX`"
    goal_summary = first_goal_in_block(appendix_raw)
    prev_base = preview_name(title_line)
    preview_file = f"{path.stem}.preview.html"
    if f"{path.stem}.preview.html" in front_matter:
        preview_file = f"{path.stem}.preview.html"

    rel_to_page = path.parent
    # Preview link: same folder
    preview_link = f"[`{preview_file}`](./{preview_file})"

    new_head = f"""{title_line}

คู่มือแปลง UX → spec: [`{WORKFLOW_REL}`]({WORKFLOW_REL})

**Route:** `{route}`

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | {ux_href} |
| **UX sub-flow / steps** | สรุปใน Appendix — แตกตามหัวข้อ Sub-flow / Step ในเอกสาร UX |
| **Design system** | [`design-system.md`]({DS_REL}) — §3 Page layout, §5 forms, §6 DataTable ตามประเภทหน้า |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`]({GLOBAL_REL}) |
| **Preview** | {preview_link} · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`]({MANUAL}) |

---

## เป้าหมายหน้าจอ

{goal_summary}

## ผู้ใช้และสิทธิ์

อ่าน Actor(s) และ permission gate ใน Appendix / เอกสาร UX — กรณี 401/403/409 อ้าง Global FE behaviors

## โครง layout (สรุป)

ระบุตามประเภทหน้าใน Appendix: list / detail / form / แท็บ — ใช้ pattern ใน design-system.md

## เนื้อหาและฟิลด์

สกัดจาก **User sees** / **User Action** / ช่องกรอกใน Appendix เป็นตารางฟิลด์เต็มเมื่อปรับแต่งรอบถัดไป; ขณะนี้ใช้บล็อก UX ด้านล่างเป็นข้อมูลอ้างอิงครบถ้วน

## การกระทำ (CTA)

สกัดจากปุ่มใน Appendix (`[...]`) และ Frontend behavior

## สถานะพิเศษ

Loading, empty, error, validation, dependency ขณะลบ — ตาม **Error** / **Success** ใน Appendix

## หมายเหตุ implementation (ถ้ามี)

เทียบ `erp_frontend` เมื่อทราบ path ของหน้า

## Preview HTML notes

| หัวข้อ | ใส่อะไร |
|--------|--------|
| **Shell** | โดยมาก `app` (ยกเว้นหน้า login / standalone) |
| **Regions** | ดูลำดับ **User sees** ใน Appendix |
| **สถานะสำหรับสลับใน preview** | `default` · `loading` · `empty` · `error` ตาม UX |
| **ข้อมูลจำลอง** | จำนวนแถว / สถานะ badge ตามประเภทหน้า |
| **ลิงก์ CSS** | [`../_Shared/preview-base.css`](../_Shared/preview-base.css) |

---

## Appendix — UX excerpt (reference)

{appendix_raw.strip()}

"""
    path.write_text(new_head.strip() + "\n", encoding="utf-8")
    return True


def main() -> None:
    count = 0
    for md in sorted(ROOT.glob("R*/*.md")):
        if md.name.startswith("_"):
            continue
        if normalize_file(md):
            count += 1
            print("normalized:", md.relative_to(ROOT))
    print("Total normalized:", count)


if __name__ == "__main__":
    main()
