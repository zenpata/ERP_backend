# Test Cases — R2-08 Settings บริษัทและรอบบัญชี (Company & Organization Settings)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-08 | | Load company settings | ผู้ใช้ login ด้วยสิทธิ์ admin | 1. เข้าเมนู Settings → Company<br>2. รอระบบโหลด | แสดงค่าปัจจุบันของข้อมูลบริษัท (singleton) ครบถ้วน | | High | |
| R2-08 | | Edit company information | ผู้ใช้อยู่ที่หน้า Company Settings | 1. แก้ไขชื่อบริษัท ที่อยู่ หรือ taxId<br>2. คลิก "Save" | ค่ากลางของเอกสารทั้งระบบถูกอัปเดตสำเร็จ | | High | |
| R2-08 | | Update VAT registration settings | ผู้ใช้อยู่ที่หน้า Company Settings | 1. เปลี่ยนค่า vatRegistered<br>2. คลิก "Save" | ระบบอัปเดต vatRegistered ซึ่งส่งผลต่อ VAT fields บนฟอร์มเอกสาร | | High | |
| R2-08 | | Update document prefixes | ผู้ใช้อยู่ที่หน้า Company Settings | 1. แก้ไข prefixes ของเอกสาร (เช่น invoice prefix, PO prefix)<br>2. คลิก "Save" | Prefixes ถูกอัปเดต เอกสารใหม่จะใช้ prefix ที่แก้ไขแล้ว | | High | |
| R2-08 | | Upload company logo | ผู้ใช้อยู่ที่หน้า Company Settings | 1. คลิก "Upload Logo"<br>2. เลือกไฟล์ภาพ (jpg/png)<br>3. ยืนยัน | ได้ logoUrl ใหม่และโลโก้แสดงในหน้าตั้งค่าและ print/export | | High | |
| R2-08 | | Upload logo fails with invalid file type | ผู้ใช้กำลังอัปโหลดโลโก้ | 1. คลิก "Upload Logo"<br>2. เลือกไฟล์ที่ไม่ใช่รูปภาพ (เช่น .pdf)<br>3. ยืนยัน | แสดง error ว่าไฟล์ไม่ถูกต้อง ระบบไม่อัปโหลด | | Medium | |
| R2-08 | | View fiscal periods list | ผู้ใช้ login ด้วยสิทธิ์ admin | 1. เข้าเมนู Settings → Fiscal Periods<br>2. รอระบบโหลด | แสดง fiscal periods ทั้งหมดพร้อมสถานะ open/closed | | High | |
| R2-08 | | Generate fiscal periods for year | ผู้ใช้มีสิทธิ์ super_admin | 1. เข้าหน้า Fiscal Periods<br>2. คลิก "Generate Year"<br>3. เลือกปี<br>4. ยืนยัน | ระบบสร้าง fiscal periods ของปีนั้นอัตโนมัติ | | High | |
| R2-08 | | Close fiscal period | ผู้ใช้มีสิทธิ์ super_admin และมี open period | 1. เลือก period ที่ต้องการปิด<br>2. คลิก "Close"<br>3. ยืนยัน | Period ถูกปิดสำเร็จ ไม่สามารถบันทึกธุรกรรมใน period นั้นได้ | | High | |
| R2-08 | | Reopen fiscal period | ผู้ใช้มีสิทธิ์ super_admin และมี closed period | 1. เลือก period ที่ต้องการเปิดใหม่<br>2. คลิก "Reopen"<br>3. ยืนยัน | Period ถูกเปิดใหม่สำเร็จ สามารถบันทึกธุรกรรมใน period นั้นได้อีกครั้ง | | High | |
| R2-08 | | Cannot close period without super_admin | ผู้ใช้ login ด้วย role ที่ไม่ใช่ super_admin | 1. เข้าหน้า Fiscal Periods<br>2. พยายามคลิก "Close" บน period | ปุ่ม Close ถูกซ่อนหรือ disable ระบบ block action | | High | |
| R2-08 | | Company settings save fails with empty required fields | ผู้ใช้กำลังแก้ไข company settings | 1. ลบชื่อบริษัทออก<br>2. คลิก "Save" | แสดง validation error ว่าต้องกรอกชื่อบริษัท | | High | |
| R2-08 | | Access denied for non-admin user | ผู้ใช้ login ด้วย role ที่ไม่ใช่ admin | 1. พยายามเข้า `/settings/company`<br>2. รอระบบตอบสนอง | แสดง access denied หรือ redirect | | High | |
| R2-08 | | Company logo displays in print documents | ผู้ใช้อัปโหลดโลโก้บริษัทสำเร็จแล้ว | 1. ดาวน์โหลด PDF ของ invoice หรือเอกสารอื่น<br>2. ตรวจสอบโลโก้ใน PDF | PDF แสดงโลโก้บริษัทล่าสุดที่อัปโหลด | | Medium | |
