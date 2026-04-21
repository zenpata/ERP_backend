# Test Cases — R2-12 Audit Trail (ประวัติการกระทำข้ามโมดูล)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-12 | | Load global audit log viewer | ผู้ใช้ login ด้วย role admin | 1. เข้าเมนู Settings → Audit Logs<br>2. รอระบบโหลด | แสดง audit log รายการล่าสุดพร้อม pagination | | High | |
| R2-12 | | Filter audit logs by module | ผู้ใช้อยู่ที่หน้า audit logs | 1. เลือก module filter (เช่น Finance, HR, PM)<br>2. รอผลกรอง | แสดงเฉพาะ logs ของ module ที่เลือก | | High | |
| R2-12 | | Filter audit logs by action type | ผู้ใช้อยู่ที่หน้า audit logs | 1. เลือก action filter (เช่น CREATE, UPDATE, DELETE)<br>2. รอผลกรอง | แสดงเฉพาะ logs ที่มี action ตรงกัน | | High | |
| R2-12 | | Filter audit logs by actor | ผู้ใช้อยู่ที่หน้า audit logs | 1. เลือกหรือกรอก actorId<br>2. รอผลกรอง | แสดงเฉพาะ logs ที่ผู้ใช้คนนั้นกระทำ | | High | |
| R2-12 | | Filter audit logs by date range | ผู้ใช้อยู่ที่หน้า audit logs | 1. กรอก startDate และ endDate<br>2. รอผลกรอง | แสดงเฉพาะ logs ในช่วงเวลาที่เลือก | | High | |
| R2-12 | | View entity audit history from detail page | ผู้ใช้อยู่ที่หน้า detail ของ invoice/employee/AP bill | 1. คลิกปุ่ม "History" หรือแท็บ audit<br>2. รอ entity history โหลด | แสดง audit trail ของ record เดียวนั้น เรียงตามเวลา | | High | |
| R2-12 | | Audit log shows before and after values | ผู้ใช้เปิดดู audit log ที่มีการเปลี่ยนค่า | 1. เปิดรายการ log ที่มี UPDATE action<br>2. ดู detail ของ log item | แสดง old values และ new values ของ fields ที่เปลี่ยน | | High | |
| R2-12 | | Audit log records status changes on invoices | ผู้ใช้เปลี่ยนสถานะ invoice | 1. เปลี่ยนสถานะ invoice<br>2. เปิด audit log ของ invoice นั้น | Log บันทึก status change พร้อม old/new values และ actor | | High | |
| R2-12 | | Audit log records permission matrix changes | Admin เปลี่ยน permission ของ role | 1. แก้ไข permission matrix ของ role<br>2. ตรวจสอบ audit log | Log บันทึกว่าใครเปลี่ยน permissions อะไร เมื่อไหร่ | | High | |
| R2-12 | | Distinguish system-generated actions in audit log | ผู้ดูแลดู audit log | 1. ค้น logs ที่ actorId ว่างหรือเป็น system<br>2. ตรวจสอบรายการ | แยกเหตุการณ์จาก system action ออกจาก user action ได้ | | Medium | |
| R2-12 | | Paginate through audit logs | ผู้ใช้อยู่ที่หน้า audit logs ที่มีหลายรายการ | 1. เลื่อนไปหน้าถัดไปของ log list<br>2. รอหน้าโหลด | ระบบแสดง log รายการถัดไปตาม pagination | | Medium | |
| R2-12 | | Access denied for non-admin user | ผู้ใช้ login ด้วย role ที่ไม่ใช่ admin | 1. พยายามเข้า `/settings/audit-logs`<br>2. รอระบบตอบสนอง | แสดง access denied หรือ redirect | | High | |
| R2-12 | | Audit log query with invalid filter shows error | ผู้ใช้กรอก filter ไม่ถูกต้อง | 1. กรอก date range ที่ผิดรูปแบบ<br>2. รอระบบตอบสนอง | แสดง validation error และไม่โหลด logs | | Medium | |
