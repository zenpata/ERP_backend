# Work schedule — รายละเอียด แก้ไข มอบหมาย

คู่มือแปลง UX → spec: [`../../UX_TO_UI_SPEC_WORKFLOW.md`](../../UX_TO_UI_SPEC_WORKFLOW.md)

**Route:** `/hr/work-schedules/:id` (TBD)

---

## Metadata

| Key | Value |
|-----|--------|
| **UX flow** | [`R2-07_Attendance_and_Time_Tracking.md`](../../../UX_Flow/Functions/R2-07_Attendance_and_Time_Tracking.md) |
| **UX sub-flow / steps** | C — GET+PATCH `.../work-schedules/:id`; D — assign `.../assign` |
| **Design system** | [`../../design-system.md`](../../design-system.md) |
| **Global FE behaviors** | [`../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |
| **Preview** | TBD |

---

## เป้าหมายหน้าจอ

ดูและแก้ไขตารางงาน รวมถึงมอบหมายให้พนักงานตามชุดที่ UX กำหนด

## ผู้ใช้และสิทธิ์

`hr_admin`, `super_admin`; พนักงานอาจอ่านได้ตาม BR

## โครง layout (สรุป)

สรุปตารางงาน → ฟอร์มแก้ไข → ส่วนมอบหมาย (multi-select employee / ช่วงวันที่ ตาม API)

## เนื้อหาและฟิลด์

อ้าง Sub-flow C, D ใน UX — ฟิลด์ตาม schema `work-schedules`

## การกระทำ (CTA)

| Control | Behavior |
|---------|----------|
| `[บันทึก]` | PATCH schedule |
| `[มอบหมาย]` | POST assign |
| `[กลับ]` | [`WorkScheduleList.md`](./WorkScheduleList.md) |

## สถานะพิเศษ

validation; 409 ชนกับตารางอื่น (ถ้ามี)

## Preview HTML notes

| **Shell** | `app` |
| **Regions** | header → form → assign panel |
