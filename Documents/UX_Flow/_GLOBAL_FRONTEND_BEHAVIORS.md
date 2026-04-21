# UX Flow Global Frontend Behaviors

ใช้เอกสารนี้เป็นมาตรฐานร่วมของทุกไฟล์ใน `Documents/UX_Flow/Functions` เพื่อลดการเขียนซ้ำและลดความต่างของพฤติกรรมข้ามโมดูล

---

## Required Header References

ทุกไฟล์ควรอ้างอิงอย่างน้อย:

- Business requirement (BR)
- SD_Flow หรือ API source
- Related screens / mockups หรือระบุ `TBD`
- เอกสารนี้ เมื่อ flow มี loading/error/permission/action ที่ซ้ำกับโมดูลอื่น

---

## Document Structure Standard

- มี `## E2E Scenario Flow` ที่อธิบายภาพรวมทั้ง function
- มี `## ชื่อ Flow & ขอบเขต` ระดับเอกสารเพียงครั้งเดียว
- แต่ละ sub-flow ใช้ `## Sub-flow ...`
- แต่ละ step ใช้ `### Step ...`
- ถ้าเป็น read-only/list-only step ให้ระบุ `User Action` แบบสั้นและเป็นของจริง ห้ามปล่อย placeholder เช่น `primary_input` หรือ `[Primary Action]`

---

## Loading And Empty States

- List page:
  - โหลดครั้งแรกใช้ skeleton หรือ table placeholder
  - โหลดไม่สำเร็จแสดง retry โดยคง filter เดิม
  - ถ้าไม่มีข้อมูล ให้บอกสาเหตุและ CTA หลัก เช่น `Create`, `Import`, หรือ link ไป setup
- Detail page:
  - ถ้าโหลดไม่สำเร็จเพราะ `404` ให้พาผู้ใช้กลับ list ได้ง่าย
  - ถ้า partial section fail ให้แยก error เป็นราย section ไม่ทำทั้งหน้าพัง เว้นแต่ data หลักหายจริง
- Dashboard:
  - อนุญาต partial failure ราย widget
  - ถ้ามี cache/staleness ให้แสดง `Last updated` หรือข้อความเรื่อง freshness

---

## Permission And Auth

- `401`:
  - พยายาม recover session ตาม auth flow
  - ถ้า recover ไม่ได้ ค่อยพาไป login
- `403`:
  - Route-level: ใช้ access denied page หรือ block page ที่ชัดเจน
  - Component-level: ซ่อนหรือ disable action ตาม permission
  - ห้ามพึ่ง FE อย่างเดียว Backend ยังต้อง enforce
- Read-only access:
  - ให้เห็นข้อมูลที่มีสิทธิ์อ่านได้
  - ซ่อน mutating actions แต่ไม่ซ่อน context สำคัญที่ช่วยให้เข้าใจข้อมูล

---

## Validation And Conflicts

- Client validation ใช้เพื่อลด error ที่เดาได้ เช่น required field, date range, amount > 0
- Server validation เป็น source of truth เสมอ
- `409 conflict`:
  - แสดงว่าข้อมูลเปลี่ยนจากที่ผู้ใช้เปิดไว้
  - มี action อย่างน้อยหนึ่งข้อ: `Refresh`, `Reload latest`, หรือ `Open latest detail`
- Soft warning:
  - ใช้กับกรณีที่ระบบยังยอมให้ไปต่อได้ เช่น credit warning, amount variance vs PO, stale cache
  - ต้องอธิบายว่าผลกระทบคืออะไรและยังทำต่อได้หรือไม่

---

## Unsaved Changes

- ฟอร์มที่มีหลาย field หรือหลาย section ต้องเตือนก่อนออกจากหน้าเมื่อมี draft เปลี่ยนแปลง
- ถ้าเป็น modal form ให้เตือนก่อนปิดเมื่อมีการแก้ข้อมูลแล้ว
- ถ้าฟอร์ม save สำเร็จแล้ว ต้อง clear dirty state ทันที

---

## Audit And Traceability

- ถ้า entity นั้นมี audit trail หรือ downstream posting:
  - ควรมี link ไปหน้าประวัติหรือหน้าต้นทางที่เกี่ยวข้อง
  - success state ควรแสดง id/reference สำคัญ เช่น `journalEntryId`, `documentNo`, `certificateNo`
- ถ้าเป็น cross-module integration trigger หรือ drilldown navigation:
  - ระบุ deep link ปลายทางชัดเจน
  - ระบุ source of truth ว่าข้อมูลไหนมาจาก module ต้นทาง

---

## Retry And Long-Running Actions

- ปุ่มที่ยิง action สำคัญ เช่น process payroll, export, reconcile, post integration:
  - disable ทันทีหลังคลิก
  - แสดง progress หรือ state ที่อ่านได้
  - ถ้ามี retry ต้องบอกว่าปลอดภัยต่อการกดซ้ำหรือไม่
- ถ้า action สำเร็จบางส่วน:
  - แยกผลสำเร็จหลักกับงานต่อเนื่องที่ล้มเหลว
  - ให้เส้นทาง retry และ manual recovery path ชัดเจน
