# Overtime request — รายละเอียด อนุมัติ ปฏิเสธ

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/hr/overtime/:id` (TBD)

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R2-07_Attendance_and_Time_Tracking.md`](../../../UX_Flow/Functions/R2-07_Attendance_and_Time_Tracking.md) |
| **UX sub-flow / steps** | K — GET `.../overtime/:id`; L — approve; M — reject |
| **Design system** | [`../../design-system.md`](../../design-system.md) |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | TBD |

---

## เป้าหมายหน้าจอ

แสดงรายละเอียดคำขอ OT และให้ผู้อนุมัติอนุมัติหรือปฏิเสธพร้อมเหตุผล

## ผู้ใช้และสิทธิ์

ผู้ขอ / ผู้อนุมัติตามสายบังคับบัญชาใน BR

## โครง layout (สรุป)

สรุปชั่วโมง วันที่ พนักงาน สถานะ → ปุ่ม Approve / Reject

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[อนุมัติ]` | PATCH `.../approve` |
| `[ปฏิเสธ]` | PATCH `.../reject` + เหตุผล |
| `[กลับ]` | [`OvertimeList.md`](./OvertimeList.md) |

## Preview HTML notes

| **Shell** | `app` |
| **สถานะ** | `pending` · `approved` · `rejected` |
