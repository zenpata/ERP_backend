# Test Cases — R2-11 ใบเสนอราคา และใบสั่งขาย (Sales Order & Quotation)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-11 | | View quotation list | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Quotations<br>2. รอระบบโหลด | แสดงรายการ quotations ทั้งหมดพร้อมสถานะ customer และวันที่ | | High | |
| R2-11 | | Filter quotations by status | ผู้ใช้อยู่ที่หน้า quotation list | 1. เลือก filter status<br>2. รอผลกรอง | แสดงเฉพาะ quotations ที่มีสถานะตรงกัน | | Medium | |
| R2-11 | | Create quotation with required fields | ผู้ใช้มีสิทธิ์ finance และมีลูกค้า active ในระบบ | 1. คลิก "Create QT"<br>2. เลือก customer<br>3. กรอก validUntil<br>4. เพิ่ม items<br>5. คลิก "Save" | Quotation ใหม่ถูกสร้างสำเร็จสถานะ `draft` | | High | |
| R2-11 | | Credit warning shown when selecting customer with credit issue | ผู้ใช้กำลังสร้าง quotation | 1. เปิดฟอร์มสร้าง quotation<br>2. เลือกลูกค้าที่มี creditWarning = true | แสดง advisory warning เรื่องเครดิต (ไม่ block การสร้าง) | | Medium | |
| R2-11 | | Change quotation status | ผู้ใช้มี quotation ในระบบ | 1. เปิด quotation detail<br>2. คลิก "Change Status"<br>3. เลือกสถานะใหม่ (เช่น sent, accepted, rejected)<br>4. ยืนยัน | Quotation เปลี่ยนสถานะตาม workflow ที่อนุญาต | | High | |
| R2-11 | | Convert quotation to sales order | ผู้ใช้มี quotation ในสถานะที่อนุญาตให้ convert | 1. เปิด quotation detail<br>2. คลิก "Convert to SO"<br>3. ยืนยัน | ได้ Sales Order ใหม่และ quotation เปลี่ยนสถานะเป็น `accepted` | | High | |
| R2-11 | | Download quotation PDF | ผู้ใช้อยู่ที่หน้า detail ของ quotation | 1. คลิก "Print PDF"<br>2. รอไฟล์สร้าง | ได้ไฟล์ PDF ใบเสนอราคาสำเร็จ | | High | |
| R2-11 | | View sales order list | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Sales Orders<br>2. รอระบบโหลด | แสดงรายการ sales orders ทั้งหมดพร้อมสถานะและ linked quotation | | High | |
| R2-11 | | Create sales order directly | ผู้ใช้มีสิทธิ์ finance | 1. คลิก "Create SO"<br>2. เลือก customer<br>3. เพิ่ม items<br>4. คลิก "Save" | Sales Order ใหม่ถูกสร้างสำเร็จ | | High | |
| R2-11 | | Confirm sales order | ผู้ใช้มี SO ในสถานะ draft | 1. เปิด SO detail<br>2. คลิก "Confirm"<br>3. ยืนยัน | SO เปลี่ยนสถานะเป็น `confirmed` | | High | |
| R2-11 | | Convert sales order to invoice | ผู้ใช้มี SO ในสถานะที่อนุญาตให้ convert | 1. เปิด SO detail<br>2. คลิก "Convert to Invoice"<br>3. ยืนยัน | ได้ Invoice ใหม่และ SO ถูกอัปเดตสถานะ | | High | |
| R2-11 | | Quotation creation fails without customer | ผู้ใช้กำลังสร้าง quotation | 1. ไม่เลือก customer<br>2. กรอกข้อมูลอื่น<br>3. คลิก "Save" | แสดง validation error ว่าต้องเลือก customer | | High | |
| R2-11 | | Invalid status transition blocked | ผู้ใช้พยายาม convert quotation ที่ยังไม่ถึงสถานะที่อนุญาต | 1. เปิด quotation ที่สถานะ draft<br>2. พยายาม "Convert to SO" | ระบบแสดง error ว่า transition ไม่ถูกต้อง | | High | |
| R2-11 | | Cancel sales order | ผู้ใช้มีสิทธิ์ยกเลิก SO | 1. เปิด SO detail<br>2. คลิก "Cancel"<br>3. ยืนยัน | SO ถูกยกเลิกสำเร็จและเปลี่ยนสถานะ | | High | |
| R2-11 | | View SO with linked quotation context | ผู้ใช้อยู่ที่หน้า detail ของ SO ที่ convert มาจาก QT | 1. เปิด SO detail<br>2. ดู section linked quotation | แสดง quotation อ้างอิงพร้อมลิงก์ไปหน้า detail ของ QT | | Medium | |
