# Test Cases — R2-06 ใบสั่งซื้อ (Purchase Order)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-06 | | View purchase order list | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Purchase Orders<br>2. รอระบบโหลด | แสดงรายการ PO ทั้งหมดพร้อมสถานะ vendor และวันที่ | | High | |
| R2-06 | | Filter purchase orders by status | ผู้ใช้อยู่ที่หน้า PO list | 1. เลือก filter status (draft, submitted, approved, received, closed)<br>2. รอผลกรอง | แสดงเฉพาะ PO ที่มีสถานะตรงกัน | | Medium | |
| R2-06 | | Filter purchase orders by vendor | ผู้ใช้อยู่ที่หน้า PO list | 1. เลือก vendor ใน filter<br>2. รอผลกรอง | แสดงเฉพาะ PO ของ vendor ที่เลือก | | Medium | |
| R2-06 | | Create PO draft with required fields | ผู้ใช้มีสิทธิ์จัดการ PO | 1. คลิก "Create PO"<br>2. เลือก vendor<br>3. เพิ่ม items<br>4. กรอก expectedDeliveryDate<br>5. เลือก budget link (optional)<br>6. คลิก "Save" | PO ใหม่ถูกสร้างสำเร็จสถานะ `draft` | | High | |
| R2-06 | | Edit PO draft before submission | ผู้ใช้มี PO ในสถานะ draft | 1. เปิด PO detail<br>2. คลิก "Edit"<br>3. ปรับรายการ items หรือหมายเหตุ<br>4. คลิก "Save" | Draft PO ถูกอัปเดตสำเร็จก่อน submit | | High | |
| R2-06 | | Submit PO for approval | ผู้ใช้มี PO ในสถานะ draft | 1. เปิด PO detail<br>2. คลิก "Submit"<br>3. ยืนยัน | PO เปลี่ยนสถานะเป็น `submitted` เข้า workflow อนุมัติ | | High | |
| R2-06 | | Approve purchase order | ผู้ใช้มีสิทธิ์อนุมัติ PO และ PO อยู่ในสถานะ submitted | 1. เปิด PO detail<br>2. คลิก "Approve"<br>3. ยืนยัน | PO เปลี่ยนสถานะเป็น `approved` | | High | |
| R2-06 | | Cancel purchase order | ผู้ใช้มีสิทธิ์ยกเลิก PO | 1. เปิด PO detail<br>2. คลิก "Cancel"<br>3. ยืนยัน | PO ถูกยกเลิกและเปลี่ยนสถานะเป็น `cancelled` | | High | |
| R2-06 | | Create goods receipt from approved PO | ผู้ใช้มี PO ในสถานะ approved | 1. เปิด PO detail<br>2. คลิก "Create GR"<br>3. กรอกข้อมูลการรับสินค้า<br>4. ยืนยัน | ระบบสร้าง goods receipt และอัปเดต receivedQty บน PO | | High | |
| R2-06 | | View linked AP bills from PO detail | ผู้ใช้อยู่ที่หน้า detail ของ PO ที่มี AP bill | 1. เปิด PO detail<br>2. ดู section linked AP bills | แสดง AP bills ที่ผูกกับ PO พร้อมบริบท 3-way matching | | High | |
| R2-06 | | Download PO PDF | ผู้ใช้อยู่ที่หน้า detail ของ PO | 1. คลิก "Print PDF"<br>2. รอไฟล์สร้าง | ได้ไฟล์ PDF ใบสั่งซื้อสำหรับส่ง vendor | | High | |
| R2-06 | | Cannot create GR before PO is approved | ผู้ใช้พยายามสร้าง goods receipt จาก PO ที่ยังไม่ approved | 1. เปิด PO draft หรือ submitted<br>2. พยายามคลิก "Create GR" | ปุ่ม Create GR ถูกซ่อนหรือ disable ระบบ block action | | High | |
| R2-06 | | Cannot edit PO after submission | ผู้ใช้พยายามแก้ไข PO ที่ submit แล้ว | 1. เปิด PO ที่สถานะ submitted หรือ approved<br>2. พยายามคลิก "Edit" | ปุ่ม Edit ถูกซ่อนหรือ disable ระบบ block การแก้ไข | | High | |
| R2-06 | | Create PO fails without vendor | ผู้ใช้กำลังสร้าง PO | 1. ไม่เลือก vendor<br>2. กรอกข้อมูลอื่น<br>3. คลิก "Save" | แสดง validation error ว่าต้องเลือก vendor | | High | |
| R2-06 | | PO creation with invalid budget link | ผู้ใช้กำลังสร้าง PO และเลือก budget link | 1. เลือก projectBudgetId ที่ไม่มีงบเหลือหรือ invalid<br>2. คลิก "Save" | ระบบแสดง validation error เรื่อง budget link ไม่ถูกต้อง | | Medium | |
