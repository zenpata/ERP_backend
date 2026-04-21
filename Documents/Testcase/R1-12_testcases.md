# Test Cases — R1-12 PM: จัดการค่าใช้จ่าย (Expense Management)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-12 | | View expense list | ผู้ใช้ login ด้วยสิทธิ์ PM | 1. เข้าเมนู PM → Expenses<br>2. รอระบบโหลด | แสดงรายการค่าใช้จ่ายพร้อมงบที่ผูก, ยอด, สถานะ | | High | |
| R1-12 | | Filter expenses by status | ผู้ใช้อยู่ที่หน้ารายการ expenses | 1. เลือก filter สถานะ (draft, submitted, approved, rejected)<br>2. รอผลกรอง | แสดงเฉพาะ expenses ที่มีสถานะตรงกัน | | Medium | |
| R1-12 | | Load active budgets for expense form | ผู้ใช้เปิดฟอร์มสร้าง expense | 1. คลิก "Create Expense"<br>2. ตรวจสอบ dropdown งบประมาณ | Dropdown แสดงเฉพาะงบที่มีสถานะ `active` | | High | |
| R1-12 | | Create expense linked to budget | ผู้ใช้มีงบ active ในระบบ | 1. คลิก "Create Expense"<br>2. เลือก budgetId<br>3. กรอก title, amount, date<br>4. คลิก "Save" | สร้าง expense ใหม่สำเร็จ สถานะเริ่มต้นเป็น `draft` ผูกกับงบที่เลือก | | High | |
| R1-12 | | Create expense fails with missing required fields | ผู้ใช้กำลังสร้าง expense | 1. ไม่เลือก budgetId<br>2. ไม่กรอก amount<br>3. คลิก "Save" | แสดง validation error ระบุฟิลด์ที่ต้องกรอก | | High | |
| R1-12 | | Attach receipt to expense | ผู้ใช้กำลังสร้างหรือแก้ไข expense | 1. เปิดฟอร์ม expense<br>2. คลิกปุ่มแนบไฟล์<br>3. เลือกไฟล์ใบเสร็จ<br>4. คลิก "Save" | ไฟล์ใบเสร็จถูกแนบและบันทึกพร้อมกับ expense | | Medium | |
| R1-12 | | View expense detail | ผู้ใช้อยู่ที่รายการ expenses | 1. คลิกที่ expense รายการหนึ่ง<br>2. รอหน้า detail โหลด | แสดง status, budget context, ใบเสร็จและ action ที่ทำได้ตามสถานะ | | High | |
| R1-12 | | Edit draft expense | ผู้ใช้มี expense สถานะ `draft` | 1. เปิด expense สถานะ `draft`<br>2. คลิก "Edit"<br>3. แก้ไข amount หรือ title<br>4. คลิก "Save" | Expense ถูกแก้ไขสำเร็จ | | High | |
| R1-12 | | Submit expense for approval | ผู้ใช้มี expense สถานะ `draft` | 1. เปิด expense สถานะ `draft`<br>2. คลิก "Submit"<br>3. ยืนยัน | สถานะ expense เปลี่ยนเป็น `submitted` | | High | |
| R1-12 | | Approve expense | ผู้ใช้มีสิทธิ์อนุมัติ และมี expense สถานะ `submitted` | 1. เปิด expense สถานะ `submitted`<br>2. คลิก "Approve"<br>3. ยืนยัน | สถานะเปลี่ยนเป็น `approved` และ `usedAmount` ของงบที่ผูกถูกอัปเดต | | High | |
| R1-12 | | Budget used amount updated after expense approved | ผู้ใช้ approve expense สำเร็จ | 1. ตรวจสอบ usedAmount ของงบที่ผูกกับ expense ที่ approved<br>2. เปรียบเทียบค่าก่อนและหลัง approve | `usedAmount` ของงบเพิ่มขึ้นเท่ากับ amount ของ expense ที่ approved | | High | |
| R1-12 | | Finance triggered after expense approved | ผู้ใช้ approve expense สำเร็จ | 1. Approve expense<br>2. ตรวจสอบ Finance journal | ระบบ trigger integration ไป Finance สร้าง journal entry สำหรับ expense ที่อนุมัติแล้ว | | High | |
| R1-12 | | Reject expense with reason | ผู้ใช้มีสิทธิ์อนุมัติ | 1. เปิด expense สถานะ `submitted`<br>2. คลิก "Reject"<br>3. กรอกเหตุผล<br>4. ยืนยัน | สถานะ expense เปลี่ยนเป็น `rejected` พร้อมเหตุผล | | High | |
| R1-12 | | Delete draft expense | ผู้ใช้มี expense สถานะ `draft` | 1. เปิด expense สถานะ `draft`<br>2. คลิก "Delete"<br>3. ยืนยัน | Expense draft ถูกลบสำเร็จ | | High | |
| R1-12 | | Cannot edit submitted or approved expense | ผู้ใช้พยายามแก้ไข expense ที่ไม่ใช่ draft | 1. เปิด expense สถานะ `submitted` หรือ `approved`<br>2. ตรวจสอบปุ่ม Edit | ปุ่ม Edit ถูกซ่อนหรือ disable | | High | |
| R1-12 | | Expense amount warning when exceeds budget | ผู้ใช้สร้าง expense ที่ amount เกินกว่างบที่เหลือ | 1. สร้าง expense ด้วย amount ที่มากกว่า remainingAmount ของงบ<br>2. คลิก "Save" | แสดง warning หรือ block พร้อมแจ้งว่ายอดเกินงบ ตาม business rule | | Medium | |
| R1-12 | | Rejected expense can be edited and resubmitted | pm_manager มี expense ที่ถูก reject | 1. เปิด expense ที่มีสถานะ `rejected`<br>2. คลิกปุ่ม "Edit"<br>3. แก้ไขข้อมูลตามเหตุผลที่ถูก reject<br>4. คลิก "Save"<br>5. คลิก "Submit" อีกครั้ง | Expense สามารถแก้ไขได้เมื่อสถานะเป็น `rejected` และเมื่อ submit ใหม่สถานะเปลี่ยนกลับเป็น `submitted` | | High | |
