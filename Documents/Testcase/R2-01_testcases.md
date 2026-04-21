# Test Cases — R2-01 จัดการลูกค้า (Customer Management)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-01 | | View customer list | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Customers<br>2. รอระบบโหลด | แสดงรายการลูกค้าทั้งหมดพร้อมสถานะและข้อมูลเครดิต | | High | |
| R2-01 | | Search customer by name or code | ผู้ใช้อยู่ที่หน้ารายการลูกค้า | 1. พิมพ์ชื่อหรือ code ลูกค้าในช่องค้นหา<br>2. รอผลการค้นหา | แสดงเฉพาะลูกค้าที่ตรงกับคำค้นหา | | Medium | |
| R2-01 | | Filter customers by active status | ผู้ใช้อยู่ที่หน้ารายการลูกค้า | 1. เลือก filter active / inactive<br>2. รอผลกรอง | แสดงเฉพาะลูกค้าที่มีสถานะตรงกัน | | Medium | |
| R2-01 | | Create customer with required fields | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. คลิก "Create Customer"<br>2. กรอก code, name, taxId<br>3. กรอก address, contact<br>4. กรอก creditLimit, creditTermDays<br>5. คลิก "Save" | สร้างลูกค้าใหม่สำเร็จ พร้อมใช้ใน dropdown ของเอกสารขาย | | High | |
| R2-01 | | Create customer fails with duplicate code | ผู้ใช้กำลังสร้างลูกค้าใหม่ | 1. กรอก code ที่มีในระบบแล้ว<br>2. กรอกข้อมูลอื่น<br>3. คลิก "Save" | แสดง error ว่า customer code ซ้ำ | | High | |
| R2-01 | | View customer detail with credit context | ผู้ใช้อยู่ที่หน้ารายการลูกค้า | 1. คลิกที่ลูกค้ารายการหนึ่ง<br>2. รอหน้า detail โหลด | แสดงข้อมูลลูกค้าพร้อม credit context (creditLimit, creditTermDays, hasOverdueInvoice, creditWarning) | | High | |
| R2-01 | | Edit customer information | ผู้ใช้อยู่ที่หน้า detail ลูกค้า | 1. คลิก "Edit"<br>2. แก้ไข name, contact หรือ creditLimit<br>3. คลิก "Save" | ข้อมูลลูกค้าถูกอัปเดตสำเร็จ | | High | |
| R2-01 | | Deactivate customer | ผู้ใช้มีสิทธิ์จัดการ customer | 1. เลือกลูกค้า<br>2. คลิก Toggle Active (deactivate)<br>3. ยืนยัน | ลูกค้าถูก deactivate ไม่แสดงใน dropdown เอกสารขายอีกต่อไป | | High | |
| R2-01 | | Reactivate customer | ผู้ใช้มีสิทธิ์จัดการ customer | 1. เลือกลูกค้า inactive<br>2. คลิก Toggle Active (activate)<br>3. ยืนยัน | ลูกค้าถูก activate และกลับมาใช้งานได้ | | Medium | |
| R2-01 | | Delete customer with no open invoices | ผู้ใช้อยู่ที่หน้า detail ลูกค้าที่ไม่มี open invoice | 1. คลิก "Delete"<br>2. ยืนยันการลบ | ลูกค้าถูก soft-delete สำเร็จ | | Medium | |
| R2-01 | | Delete customer blocked when has open invoices | ผู้ใช้พยายามลบลูกค้าที่มี open invoice | 1. คลิก "Delete"<br>2. ยืนยัน | ระบบ block การลบ และแจ้งว่ายังมี invoice ค้างอยู่ | | High | |
| R2-01 | | Credit warning shown in invoice creation | ผู้ใช้สร้าง invoice สำหรับลูกค้าที่มี creditWarning | 1. เปิดฟอร์มสร้าง invoice<br>2. เลือกลูกค้าที่มี `creditWarning = true` | แสดง advisory warning เรื่องเครดิต (ไม่ block การสร้าง) | | Medium | |
| R2-01 | | Overdue invoice indicator shown on customer | ผู้ใช้ดูรายการลูกค้าที่มี overdue invoice | 1. ดูรายการลูกค้า<br>2. ตรวจสอบลูกค้าที่มี hasOverdueInvoice = true | แสดง indicator/badge เตือนว่าลูกค้ามี overdue invoice | | Medium | |
| R2-01 | | Navigate from customer to related quotations | ผู้ใช้อยู่ที่หน้า detail ลูกค้า | 1. คลิกปุ่ม "Open Quotations"<br>2. รอหน้าถัดไปโหลด | ระบบนำไปหน้า quotations ที่ filter ด้วยลูกค้านี้ | | Low | |
| R2-01 | | Navigate from customer to related invoices | ผู้ใช้อยู่ที่หน้า detail ลูกค้า | 1. คลิกปุ่ม "Open Invoices"<br>2. รอหน้าถัดไปโหลด | ระบบนำไปหน้า invoices ที่ filter ด้วยลูกค้านี้ | | Low | |
