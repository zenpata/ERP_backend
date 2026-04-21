#!/usr/bin/env python3
"""
Generate UX-first Page/*.md from Documents/UX_Flow/Functions/*.md
Skips R1-01 (pilot done) and index/template/manual files.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # UI_Flow_mockup
PAGE = ROOT / "Page"
UXF = ROOT.parent / "UX_Flow" / "Functions"

SKIP_FOLDERS = {"R1-01_Auth_Login_and_Session"}
SKIP_FILES = {
    "_INDEX.md",
    "_PAGE_SPEC_TEMPLATE.md",
    "MD_TO_PREVIEW_HTML_MANUAL.md",
    # R1-16: hand-authored page specs (not generator template)
    "RoleCreate.md",
    "RoleDelete.md",
}

WORKFLOW_REL = "../../UX_TO_UI_SPEC_WORKFLOW.md"
DS_REL = "../../design-system.md"
GLOBAL_REL = "../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md"


def split_subflows(text: str) -> list[tuple[str, str]]:
    """Return [(title_line, full_block), ...] for each ## Sub-flow."""
    parts = re.split(r"(?m)^## Sub-flow ", text)
    out = []
    for p in parts[1:]:
        title_line, _, body = p.partition("\n")
        title_line = title_line.strip()
        full = "## Sub-flow " + p
        out.append((title_line, full))
    return out


def split_special_sections(text: str) -> list[tuple[str, str]]:
    """Also capture ## ส่วนกลาง and # กลุ่ม headers as pseudo blocks."""
    out = []
    for m in re.finditer(
        r"(?m)^(## ส่วนกลาง[^\n]*\n)(.*?)(?=^## Sub-flow |^# กลุ่ม |^## Coverage |\Z)",
        text,
        re.S,
    ):
        title = m.group(1).strip()
        out.append((title, m.group(0).strip()))
    return out


def score_match(fname: str, title: str) -> int:
    f = fname.lower()
    t = title.lower()
    score = 0
    if "list" in f or "hub" in f or "center" in f or "viewer" in f:
        if any(k in t for k in ("รายการ", "list", "โหลดรายการ")):
            score += 12
        if "quotation" in f and "quotation" in t:
            score += 5
        if "salesorder" in f and "sales" in t and "order" in t:
            score += 5
        if "customer" in f and "customer" in t and "รายการ" in t:
            score += 8
    if "detail" in f:
        if any(k in t for k in ("รายละเอียด", "detail")):
            score += 12
    if "form" in f:
        if any(k in t for k in ("สร้าง", "create", "แก้ไข", "update", "patch", "ฟอร์ม")):
            score += 8
        if "journal" in f and "journal" in t and ("draft" in t or "บันทึก" in t):
            score += 10
    if "editor" in f:
        if any(k in t for k in ("journal", "ร่าง", "post", "สมุดรายวัน")):
            score += 10
    if "report" in f or "summary" in f or "pnd" in f or "vat" in f or "ledger" in f:
        if any(k in t for k in ("รายงาน", "report", "export", "สรุป", "vat", "wht", "pnd", "ledger")):
            score += 8
    if "dashboard" in f or "globaldashboard" in f:
        if any(k in t for k in ("dashboard", "widget", "bootstrap")):
            score += 10
    if "payroll" in f:
        score += 6 if "payroll" in t or "เงินเดือน" in t else 0
    if "leave" in f:
        if "leave" in t or "ลา" in t:
            score += 8
    if "invoice" in f:
        if "invoice" in t or "แจ้งหนี้" in t or "ar" in t:
            score += 8
    if "vendor" in f:
        if "vendor" in t or "ผู้ขาย" in t:
            score += 8
    if "aplist" in f or ("ap" in f and "list" in f):
        if "ap" in t or "เจ้าหนี้" in t or "payable" in t:
            score += 8
    if "budget" in f:
        if "budget" in t or "งบ" in t:
            score += 8
    if "expense" in f:
        if "expense" in t or "ค่าใช้จ่าย" in t:
            score += 8
    if "progress" in f or "task" in f:
        if "progress" in t or "task" in t or "งาน" in t:
            score += 8
    if "users" in f or "roles" in f:
        if "user" in t or "role" in t or "บทบาท" in t:
            score += 8
    if "organization" in f:
        if "แผนก" in t or "ตำแหน่ง" in t or "department" in t or "position" in t:
            score += 6
    if "chartofaccounts" in f or "accountslist" in f:
        if "account" in t or "ผังบัญชี" in t or "coa" in t:
            score += 10
    if "taxhub" in f:
        if "hub" in t or "tax" in t:
            score += 10
    if "notification" in f:
        if "notification" in t or "แจ้งเตือน" in t:
            score += 8
    if "audit" in f:
        if "audit" in t or "ประวัติ" in t:
            score += 8
    if "printexport" in f or "print" in f:
        score += 10 if "print" in t or "export" in t or "pdf" in t else 0
    if "bank" in f:
        if "bank" in t or "ธนาคาร" in t:
            score += 8
    if "purchase" in f or "goodsreceipt" in f:
        if "purchase" in t or "สั่งซื้อ" in t or "receipt" in t:
            score += 8
    if "attendance" in f or "overtime" in f or "holiday" in f or "schedule" in f:
        if any(k in t for k in ("attendance", "มาทำงาน", "overtime", "ot", "holiday", "schedule", "work-schedule")):
            score += 8
    if "company" in f or "fiscal" in f:
        if "company" in t or "fiscal" in t or "บริษัท" in t or "รอบบัญชี" in t:
            score += 8
    if "payment" in f and "ar" in f:
        if "payment" in t or "รับชำระ" in t:
            score += 10
    if "aging" in f:
        if "aging" in t or "ar" in t:
            score += 10
    if "entityaudit" in f:
        if "entity" in t or "detail-by-entity" in t:
            score += 10
    if "financial" in f and "hub" in f:
        if "hub" in t or "statement" in t:
            score += 10
    if "profit" in f or "balance" in f or "cashflow" in f:
        if "profit" in t or "balance" in t or "cash" in t or "งบ" in t:
            score += 10
    return score


# Manual multi-block: (folder, file) -> list of substring that must appear in ## Sub-flow title_line
MULTI: dict[tuple[str, str], list[str]] = {
    ("R1-02_HR_Employee_Management", "EmployeeDetail.md"): ["รายละเอียดพนักงาน", "ลบ/เลิกจ้าง"],
    ("R1-02_HR_Employee_Management", "EmployeeForm.md"): ["สร้างพนักงาน", "แก้ไขพนักงาน"],
    ("R1-03_HR_Organization_Management", "Organization.md"): [
        "D1 —",
        "D2 —",
        "D3 —",
        "D4 —",
        "D5 —",
        "P1 —",
        "P2 —",
        "P3 —",
        "P4 —",
        "P5 —",
    ],
    ("R1-04_HR_Leave_Management", "LeaveList.md"): [
        "รายการคำขอลา",
        "สร้างคำขอลา",
        "อนุมัติคำขอ",
        "ปฏิเสธคำขอ",
        "ประเภทการลา",
        "จัดการประเภท",
        "โควต้าการลา",
        "สายอนุมัติ",
    ],
    ("R1-09_Finance_Accounting_Core", "ChartOfAccountsList.md"): [
        "ผังบัญชี: รายการ",
        "ผังบัญชี: สร้าง",
        "ผังบัญชี: แก้ไข",
        "ผังบัญชี: เปิด/ปิด",
    ],
    ("R1-09_Finance_Accounting_Core", "JournalList.md"): ["Journal: รายการ"],
    ("R1-09_Finance_Accounting_Core", "JournalEditor.md"): [
        "Journal: รายละเอียด",
        "Journal: สร้าง draft",
        "Journal: Post",
        "Journal: Reverse",
    ],
    ("R1-09_Finance_Accounting_Core", "IncomeExpenseLedger.md"): [
        "Income/Expense: สรุป",
        "Income/Expense: รายการ",
        "Income/Expense: สร้างรายการ",
    ],
}


def pick_blocks(folder: str, fname: str, subs: list[tuple[str, str]], ux_text: str) -> list[str]:
    key = (folder, fname)
    chosen: list[str] = []
    if key in MULTI:
        needles = MULTI[key]
        for title, block in subs:
            if any(n in title for n in needles):
                chosen.append(block)
        # ส่วนกลาง R1-03
        if folder == "R1-03_HR_Organization_Management":
            for t, blk in split_special_sections(ux_text):
                if "ส่วนกลาง" in t:
                    chosen.insert(0, blk)
        return chosen

    # single best
    best_s, best_b = -1, None
    for title, block in subs:
        sc = score_match(fname, title)
        if sc > best_s:
            best_s, best_b = sc, block
    if best_b and best_s >= 6:
        return [best_b]

    # fallback: first subflow with any score
    for title, block in subs:
        if score_match(fname, title) > 0:
            return [block]
    return [subs[0][1]] if subs else []


def extract_implementation_section(old_md: str) -> str:
    """Keep content after old '## 1) Permission' or '## 2) Layout' as implementation notes."""
    if "## หมายเหตุ implementation" in old_md:
        return old_md.split("## หมายเหตุ implementation", 1)[1].strip()
    # strip metadata + spec header
    cut = old_md
    if "## Spec metadata" in cut:
        cut = re.split(r"## Spec metadata.*?\n---\s*\n", cut, maxsplit=1, flags=re.S)
        if len(cut) > 1:
            cut = cut[1]
    if cut.strip().startswith("#"):
        # keep from first ## numbered or ## Permission
        m = re.search(r"(?m)^## [12]\)", cut)
        if m:
            return cut[m.start() :].strip()
    return ""


def build_doc(
    title: str,
    route: str,
    folder: str,
    fname: str,
    ux_link: str,
    ux_ref: str,
    blocks: list[str],
    impl: str,
) -> str:
    blocks_txt = "\n\n---\n\n".join(blocks) if blocks else "_ไม่พบ Sub-flow ที่ match — ตรวจสอบ UX ด้วยมือ_"
    impl_sec = ""
    if impl:
        impl_sec = f"\n\n---\n\n## หมายเหตุ implementation (erp_frontend / ของเดิม)\n\n{impl}\n"

    preview_name = fname.replace(".md", ".preview.html")
    has_preview = (PAGE / folder / preview_name).exists()

    return f"""# {title}

คู่มือแปลง UX → spec: [`{WORKFLOW_REL}`]({WORKFLOW_REL})

**Route:** `{route}`

---

## Spec metadata (UX → preview)

| Key | Value |
|-----|-------|
| **UX flow** | [`{folder}.md`]({ux_link}) |
| **UX reference** | {ux_ref} |
| **Design system** | [`design-system.md`]({DS_REL}) |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`]({GLOBAL_REL}) |

---

## สรุปสำหรับสร้าง preview.html

- อ่าน **เนื้อหาอ้างอิงจาก UX** ด้านล่างสำหรับ Goal, ฟิลด์, ปุ่ม, error path
- ใช้ pattern จาก design system (PageHeader, card, table, form) ตามประเภทหน้า
- **Preview HTML notes:** shell `app` ยกเว้นหน้า login; regions ตาม User sees ในแต่ละ Step; สถานะ `loading` · `empty` · `error` · `success` ตาม UX

| หัวข้อ | แนวทาง |
|--------|--------|
| **Shell** | โดยมาก `app` (หลัง login) |
| **สถานะ** | ตาม Error/Success ในแต่ละ Step |
| **Preview file** | {'[`' + preview_name + '`](./' + preview_name + ')' if has_preview else '`TBD`'} |

---

## เนื้อหาอ้างอิงจาก UX (Sub-flow ที่เกี่ยวข้อง)

{blocks_txt}
{impl_sec}
"""


def guess_route(folder: str, fname: str) -> str:
    # from INDEX patterns - minimal defaults
    r = {
        "EmployeeList": "/hr/employees",
        "EmployeeDetail": "/hr/employees/:id",
        "EmployeeForm": "/hr/employees/new · .../edit",
        "Organization": "/hr/organization",
        "LeaveList": "/hr/leaves",
        "Payroll": "/hr/payroll",
        "InvoiceList": "/finance/invoices",
        "InvoiceDetail": "/finance/invoices/:id",
        "InvoiceForm": "/finance/invoices/new",
        "VendorList": "/finance/vendors",
        "VendorForm": "/finance/vendors/new",
        "ApList": "/finance/ap",
        "Reports": "/finance/reports",
        "BudgetList": "/pm/budgets",
        "BudgetDetail": "/pm/budgets/:id",
        "BudgetForm": "/pm/budgets/new",
        "ExpenseList": "/pm/expenses",
        "ExpenseForm": "/pm/expenses/new",
        "ProgressList": "/pm/progress",
        "TaskForm": "/pm/progress/new",
        "Dashboard": "/pm/dashboard",
        "Users": "/settings/users",
        "Roles": "/settings/roles",
        "RoleCreate": "/settings/roles/new",
        "RoleDelete": "— (modal from /settings/roles)",
    }
    base = fname.replace(".md", "")
    if base in r:
        return r[base]
    if "Customer" in base:
        return "/finance/customers" + ("/:id" if "Detail" in base else "/new" if "Form" in base else "")
    if "GlobalDashboard" in base:
        return "/dashboard"
    if "TaxHub" in base:
        return "/finance/tax"
    if "ChartOfAccounts" in base:
        return "/finance/accounts"
    if "JournalList" in base:
        return "/finance/journal"
    if "JournalEditor" in base:
        return "/finance/journal/new · /finance/journal/:id"
    if "IncomeExpense" in base:
        return "/finance/income-expense"
    return "— (ดู Entry ใน UX ด้านล่าง)"


def guess_title(fname: str) -> str:
    return fname.replace(".md", "").replace("_", " ")


def main() -> None:
    for folder_dir in sorted(PAGE.iterdir()):
        if not folder_dir.is_dir() or folder_dir.name.startswith("_"):
            continue
        if folder_dir.name in SKIP_FOLDERS:
            continue
        ux_path = UXF / f"{folder_dir.name}.md"
        if not ux_path.exists():
            print("skip no ux", folder_dir.name)
            continue
        ux_text = ux_path.read_text(encoding="utf-8")
        subs = split_subflows(ux_text)
        if not subs:
            print("no subflows", folder_dir.name)
            continue

        for md_path in sorted(folder_dir.glob("*.md")):
            if md_path.name in SKIP_FILES:
                continue
            fname = md_path.name
            old = md_path.read_text(encoding="utf-8")
            blocks = pick_blocks(folder_dir.name, fname, subs, ux_text)
            ux_ref = " · ".join(b.split("\n", 1)[0].replace("## Sub-flow ", "")[:80] for b in blocks[:3])
            if len(blocks) > 3:
                ux_ref += f" · … (+{len(blocks) - 3})"
            impl = extract_implementation_section(old)
            title = guess_title(fname)
            route = guess_route(folder_dir.name, fname)
            ux_link = f"../../../UX_Flow/Functions/{folder_dir.name}.md"
            doc = build_doc(title, route, folder_dir.name, fname, ux_link, ux_ref, blocks, impl)
            md_path.write_text(doc, encoding="utf-8")
            print("wrote", md_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
