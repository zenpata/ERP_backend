# Test Cases — R1-08 Finance: บัญชีเจ้าหนี้ (Accounts Payable)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-08 | | View AP bill list | ผู้ใช้ login ด้วย role `finance_manager` | 1. เข้าเมนู Finance → AP<br>2. รอระบบโหลด | แสดงรายการ AP bills พร้อม vendor, วันที่, สถานะ, ยอดรวม | | High | |
| R1-08 | | Filter AP bills by status | ผู้ใช้อยู่ที่หน้ารายการ AP | 1. เลือก filter สถานะ (draft, submitted, approved, rejected, partially_paid, paid)<br>2. รอผลกรอง | แสดงเฉพาะ AP bill ที่มีสถานะตรงกัน | | Medium | |
| R1-08 | | Create AP bill with vendor and items | ผู้ใช้ login ด้วยสิทธิ์ finance และมี vendor ในระบบ | 1. คลิก "Create Bill"<br>2. เลือก vendor จาก dropdown<br>3. กรอก invoiceDate, dueDate<br>4. เพิ่ม items (description, amount)<br>5. คลิก "Save" | สร้าง AP bill ใหม่สำเร็จ สถานะเริ่มต้นเป็น `draft` | | High | |
| R1-08 | | Create AP bill fails with missing required fields | ผู้ใช้กำลังสร้าง AP bill | 1. ไม่เลือก vendor<br>2. ไม่กรอก invoiceDate<br>3. คลิก "Save" | แสดง validation error ระบุฟิลด์ที่ต้องกรอก | | High | |
| R1-08 | | Create vendor inline from AP form | ผู้ใช้กำลังสร้าง AP bill แต่ vendor ยังไม่มีในระบบ | 1. ในฟอร์ม AP คลิก "สร้าง Vendor ใหม่"<br>2. กรอกข้อมูล vendor<br>3. คลิก "Create Vendor" | Vendor ถูกสร้างใหม่สำเร็จและถูกเลือกอัตโนมัติในฟอร์ม AP | | Medium | |
| R1-08 | | View AP bill detail | ผู้ใช้อยู่ที่รายการ AP bills | 1. คลิกที่ AP bill รายการหนึ่ง<br>2. รอหน้า detail โหลด | แสดงข้อมูล header, items, paidAmount, remainingAmount, paymentCount, statusSummary | | High | |
| R1-08 | | AP bill shows correct remaining amount | ผู้ใช้ดู detail ของ AP bill ที่มีการจ่ายบางส่วน | 1. เปิด AP bill ที่มี partial payment<br>2. ตรวจสอบ remainingAmount | `remainingAmount` ที่แสดงตรงกับ `totalAmount - paidAmount` จาก BE | | High | |
| R1-08 | | Submit AP bill for approval | ผู้ใช้มี AP bill สถานะ `draft` | 1. เปิด AP bill สถานะ `draft`<br>2. คลิกปุ่ม "Submit"<br>3. ยืนยัน | สถานะ AP bill เปลี่ยนเป็น `submitted` | | High | |
| R1-08 | | Approve AP bill | ผู้ใช้มีสิทธิ์อนุมัติและมี AP bill สถานะ `submitted` | 1. เปิด AP bill สถานะ `submitted`<br>2. คลิกปุ่ม "Approve"<br>3. ยืนยัน | สถานะ AP bill เปลี่ยนเป็น `approved` | | High | |
| R1-08 | | Reject AP bill with reason | ผู้ใช้มีสิทธิ์อนุมัติ | 1. เปิด AP bill สถานะ `submitted`<br>2. คลิกปุ่ม "Reject"<br>3. กรอกเหตุผล<br>4. ยืนยัน | สถานะ AP bill เปลี่ยนเป็น `rejected` พร้อมเหตุผลที่ระบุ | | High | |
| R1-08 | | Record full payment on AP bill | ผู้ใช้มี AP bill สถานะ `approved` | 1. เปิด AP bill สถานะ `approved`<br>2. คลิก "Add Payment"<br>3. กรอกยอดเต็มจำนวน<br>4. ยืนยัน | สถานะ AP bill เปลี่ยนเป็น `paid` paidAmount เท่ากับ totalAmount | | High | |
| R1-08 | | Record partial payment on AP bill | ผู้ใช้มี AP bill สถานะ `approved` | 1. เปิด AP bill สถานะ `approved`<br>2. คลิก "Add Payment"<br>3. กรอกยอดบางส่วน<br>4. ยืนยัน | สถานะ AP bill เปลี่ยนเป็น `partially_paid` remainingAmount ลดลงตามที่จ่าย | | High | |
| R1-08 | | Payment amount exceeds remaining fails | ผู้ใช้กำลังบันทึกการจ่าย AP bill | 1. เปิด AP bill ที่มี remainingAmount = 1000<br>2. คลิก "Add Payment"<br>3. กรอกยอด 2000 (เกินกว่าที่เหลือ)<br>4. ยืนยัน | แสดง error ว่ายอดจ่ายเกินกว่ายอดคงเหลือ | | High | |
| R1-08 | | Invalid status transition blocked | ผู้ใช้พยายาม skip สถานะ AP bill | 1. เปิด AP bill สถานะ `draft`<br>2. พยายาม approve โดยไม่ submit ก่อน | ระบบ block การ transition ที่ไม่ถูกลำดับ | | High | |
| R1-08 | | Export AP bill to PDF | ผู้ใช้อยู่ที่หน้า detail ของ AP bill | 1. คลิกปุ่ม Export หรือ PDF<br>2. รอไฟล์ดาวน์โหลด | ดาวน์โหลดไฟล์ PDF ของ AP bill ได้สำเร็จ | | Medium | |
| R1-08 | | AP bill shows overdue status | ผู้ใช้ดู AP bill ที่เกินกำหนดชำระ | 1. เปิด AP bill ที่ dueDate ผ่านไปแล้วและยังไม่ชำระ<br>2. ตรวจสอบ statusSummary | แสดง `isOverdue = true` หรือ badge overdue ใน AP bill detail | | Medium | |
