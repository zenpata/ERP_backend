# Payroll run — รายละเอียดรอบ ประมวลผล อนุมัติ จ่ายจริง payslip

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/hr/payroll/runs/:runId` (TBD)

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R1-05_HR_Payroll.md`](../../../UX_Flow/Functions/R1-05_HR_Payroll.md) |
| **UX sub-flow / steps** | D — process; E — approve; F — mark paid; G — payslips list; H — PDF export; G-SS — SS records (ถ้ามี UI) |
| **Design system** | [`../../design-system.md`](../../design-system.md) |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | [`PayrollRunDetail.preview.html`](./PayrollRunDetail.preview.html) · [`../_Shared/preview-base.css`](../_Shared/preview-base.css) · [`MD_TO_PREVIEW_HTML_MANUAL.md`](../MD_TO_PREVIEW_HTML_MANUAL.md) |

---

## เป้าหมายหน้าจอ

จัดการรอบเงินเดือนเดียว: ประมวลผล อนุมัติ ทำเครื่องหมายจ่ายแล้ว ดู payslip และส่งออก ตามลำดับ state machine ใน UX

## ผู้ใช้และสิทธิ์

`hr_admin`, `finance_manager` ตาม action

## โครง layout (สรุป)

สรุปสถานะรอบ → action bar (Process / Approve / Mark paid) → ตาราง payslips → ลิงก์ export PDF ต่อคน

## การกระทำ (CTA)

อ้าง Sub-flow D–H ใน UX — ปุ่มแสดงตาม state ปัจจุบันของ run

## สถานะพิเศษ

long-running process + polling; error ระหว่างประมวลผล; permission 403

## หมายเหตุ implementation (ถ้ามี)

[`Payroll.md`](./Payroll.md) อาจเป็นภาพรวมหลายรอบ — หน้านี้โฟกัสรอบเดียว

## Preview HTML notes

| **Shell** | `app` |
| **สถานะ** | `draft` · `processing` · `approved` · `paid` |
