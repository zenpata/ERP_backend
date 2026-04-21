# Test Cases — R1-11 PM: จัดการงบประมาณ (Budget Management)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-11 | | View budget list | ผู้ใช้ login ด้วย role `pm_manager` หรือ `finance_manager` | 1. เข้าเมนู PM → Budgets<br>2. รอระบบโหลด | แสดงรายการงบพร้อม budgetCode, amount, usedAmount, status | | High | |
| R1-11 | | Search budget by name or code | ผู้ใช้อยู่ที่หน้ารายการงบ | 1. พิมพ์ชื่อหรือ code งบในช่องค้นหา<br>2. รอผลการค้นหา | แสดงเฉพาะงบที่ตรงกับคำค้นหา | | Medium | |
| R1-11 | | Create new budget with required fields | ผู้ใช้ login ด้วยสิทธิ์ PM | 1. คลิก "Create Budget"<br>2. กรอก name, amount, startDate, endDate<br>3. คลิก "Save" | สร้างงบใหม่สำเร็จ ระบบสร้าง budgetCode อัตโนมัติ สถานะเริ่มต้นเป็น `draft` | | High | |
| R1-11 | | Create budget fails with missing amount | ผู้ใช้กำลังสร้างงบ | 1. กรอก name<br>2. ไม่กรอก amount<br>3. คลิก "Save" | แสดง validation error ว่าต้องกรอก amount | | High | |
| R1-11 | | Create budget fails with end date before start date | ผู้ใช้กำลังสร้างงบ | 1. กรอก name และ amount<br>2. เลือก startDate ที่หลังกว่า endDate<br>3. คลิก "Save" | แสดง validation error ว่า endDate ต้องหลัง startDate | | Medium | |
| R1-11 | | View budget detail and utilization | ผู้ใช้อยู่ที่หน้ารายการงบ | 1. คลิกที่งบรายการหนึ่ง<br>2. รอหน้า detail โหลด | แสดง usedAmount, remainingAmount, utilizationPct และรายการ expenses ที่ผูกกับงบนี้ | | High | |
| R1-11 | | Edit budget information | ผู้ใช้มีงบสถานะ `draft` หรือ `active` | 1. เปิดงบ<br>2. คลิก "Edit"<br>3. แก้ไข name หรือ description<br>4. คลิก "Save" | ข้อมูลงบถูกอัปเดตสำเร็จ | | Medium | |
| R1-11 | | Change budget status to active | ผู้ใช้มีงบสถานะ `draft` | 1. เปิดงบสถานะ `draft`<br>2. คลิกปุ่ม Activate หรือ Change Status<br>3. ยืนยัน | งบเปลี่ยนสถานะเป็น `active` | | High | |
| R1-11 | | Put budget on hold | ผู้ใช้มีงบสถานะ `active` | 1. เปิดงบสถานะ `active`<br>2. คลิก "On Hold"<br>3. ยืนยัน | งบเปลี่ยนสถานะเป็น `on_hold` | | Medium | |
| R1-11 | | Close budget | ผู้ใช้มีงบสถานะ `active` | 1. เปิดงบสถานะ `active`<br>2. คลิก "Close"<br>3. ยืนยัน | งบเปลี่ยนสถานะเป็น `closed` | | Medium | |
| R1-11 | | Delete draft budget | ผู้ใช้มีงบสถานะ `draft` | 1. เปิดงบสถานะ `draft`<br>2. คลิก "Delete"<br>3. ยืนยันการลบ | งบ draft ถูกลบสำเร็จ รายการอัปเดต | | High | |
| R1-11 | | Cannot delete non-draft budget | ผู้ใช้พยายามลบงบที่ไม่ใช่ draft | 1. เปิดงบสถานะ `active` หรือ `closed`<br>2. ตรวจสอบปุ่ม Delete | ปุ่ม Delete ถูกซ่อนหรือ disable สำหรับงบที่ไม่ใช่ draft | | High | |
| R1-11 | | Post budget adjustment to Finance | ผู้ใช้มีงบที่ active | 1. เปิด detail ของงบ<br>2. คลิก "Post Adjustment"<br>3. กรอกข้อมูลการปรับ<br>4. ยืนยัน | ระบบส่ง budget adjustment ไป Finance journal สำเร็จ | | Medium | |
| R1-11 | | Budget utilization percentage displayed correctly | ผู้ใช้ดู detail ของงบที่มีค่าใช้จ่าย | 1. เปิดงบที่มี expense ที่ approved แล้ว<br>2. ตรวจสอบ utilizationPct | `utilizationPct` = (usedAmount / amount) × 100 แสดงถูกต้อง | | Medium | |
| R1-11 | | Access denied for non-PM user | ผู้ใช้ login ด้วย role ที่ไม่มีสิทธิ์ PM | 1. พยายามเข้า `/pm/budgets`<br>2. รอระบบตอบสนอง | แสดง access denied หรือ redirect | | High | |
