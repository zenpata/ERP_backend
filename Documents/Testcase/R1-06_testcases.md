# Test Cases — R1-06 Finance: ใบแจ้งหนี้ขาย (AR Invoice)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-06 | | View invoice list | ผู้ใช้ login ด้วย role `finance_manager` | 1. เข้าเมนู Finance → Invoice<br>2. รอระบบโหลด | แสดงรายการ invoice พร้อมเลขที่, ลูกค้า, วันที่, ครบกำหนด, สถานะ, ยอดรวม | | High | |
| R1-06 | | Filter invoices by status | ผู้ใช้อยู่ที่หน้ารายการ invoice | 1. เลือก filter สถานะ (เช่น draft, sent, paid)<br>2. รอผลกรอง | แสดงเฉพาะ invoice ที่มีสถานะตรงกัน | | Medium | |
| R1-06 | | Filter invoices by customer | ผู้ใช้อยู่ที่หน้ารายการ invoice | 1. เลือก filter ลูกค้า<br>2. รอผลกรอง | แสดงเฉพาะ invoice ของลูกค้าที่เลือก | | Medium | |
| R1-06 | | Filter invoices by date range | ผู้ใช้อยู่ที่หน้ารายการ invoice | 1. กรอก issueDateFrom และ issueDateTo<br>2. คลิก Apply<br>3. รอผลกรอง | แสดงเฉพาะ invoice ที่ออกในช่วงวันที่ที่กรอง | | Medium | |
| R1-06 | | Load customer options for invoice form | ผู้ใช้เปิดฟอร์มสร้าง invoice | 1. คลิกปุ่ม "Create Invoice"<br>2. ตรวจสอบ dropdown ลูกค้า | Dropdown แสดง active customers ที่มี id, code, name, taxId ถูกต้อง | | High | |
| R1-06 | | Create invoice successfully | ผู้ใช้เปิดฟอร์มสร้าง invoice และมีลูกค้าในระบบ | 1. คลิก "Create Invoice"<br>2. เลือก customerId<br>3. กรอก issueDate, dueDate<br>4. เพิ่ม items (ชื่อ, จำนวน, ราคา)<br>5. คลิก "Save" | สร้าง invoice สำเร็จ ระบบสร้างเลขที่ invoice อัตโนมัติ นำไปหน้า detail | | High | |
| R1-06 | | Create invoice fails with missing required fields | ผู้ใช้กำลังสร้าง invoice | 1. ไม่เลือก customerId<br>2. ไม่กรอก issueDate<br>3. คลิก "Save" | แสดง validation error ระบุฟิลด์ที่ต้องกรอก | | High | |
| R1-06 | | Show credit warning for customer with overdue invoice | ผู้ใช้สร้าง invoice สำหรับลูกค้าที่มี overdue invoice | 1. เลือก customer ที่มี `hasOverdueInvoice=true`<br>2. ตรวจสอบ UI | แสดง advisory/warning ว่าลูกค้ามี overdue invoice (ไม่ block การสร้าง) | | Medium | |
| R1-06 | | View invoice detail | ผู้ใช้อยู่ที่รายการ invoice | 1. คลิกที่ invoice รายการหนึ่ง<br>2. รอหน้า detail โหลด | แสดงข้อมูล header, items, totals (subtotal, vatAmount, grandTotal), paidAmount, balanceDue และสถานะ | | High | |
| R1-06 | | Invoice totals calculated correctly | ผู้ใช้ดู invoice detail | 1. เปิด invoice ที่มี items หลายรายการ<br>2. ตรวจสอบตัวเลข subtotal, vatAmount, grandTotal | ตัวเลขสรุปของ invoice (subtotal, VAT, grand total) ถูกต้องและสอดคล้องกับ items | | High | |
| R1-06 | | Change invoice status | ผู้ใช้อยู่ที่หน้า detail ของ invoice | 1. คลิกปุ่มเปลี่ยนสถานะ (เช่น Send, Cancel)<br>2. ยืนยัน | Invoice เปลี่ยนสถานะตาม state machine ที่กำหนด | | High | |
| R1-06 | | Record customer payment on invoice | ผู้ใช้อยู่ที่หน้า detail ของ invoice ที่ยังค้างชำระ | 1. คลิกปุ่ม "Add Payment"<br>2. กรอกยอดชำระและวันที่<br>3. ยืนยัน | บันทึกการชำระเงินสำเร็จ invoice แสดง paidAmount และ balanceDue ที่อัปเดต | | High | |
| R1-06 | | View payment history on invoice | ผู้ใช้อยู่ที่หน้า detail ของ invoice ที่มีการชำระแล้ว | 1. เปิด invoice detail<br>2. ดูส่วน payment history | แสดงประวัติการชำระเงินพร้อมวันที่และยอดของแต่ละครั้ง | | Medium | |
| R1-06 | | Export invoice to PDF | ผู้ใช้อยู่ที่หน้า detail ของ invoice | 1. คลิกปุ่ม Export หรือ PDF<br>2. รอไฟล์ดาวน์โหลด | ดาวน์โหลดไฟล์ PDF ของ invoice ได้สำเร็จ | | Medium | |
| R1-06 | | Access denied for non-finance user | ผู้ใช้ login ด้วย role ที่ไม่มีสิทธิ์ finance | 1. พยายามเข้า `/finance/invoices`<br>2. รอระบบตอบสนอง | แสดง access denied หรือ redirect ไปหน้าที่เหมาะสม | | High | |
| R1-06 | | Empty state when no invoices found | ผู้ใช้อยู่ที่หน้ารายการ invoice และไม่มีข้อมูล | 1. เปิดหน้ารายการ invoice<br>2. ระบบยังไม่มี invoice ใด ๆ | แสดง empty state พร้อมปุ่ม "สร้าง Invoice" | | Low | |
