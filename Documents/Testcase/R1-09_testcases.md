# Test Cases — R1-09 Finance: บัญชีแกนกลาง (Accounting Core)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-09 | | View chart of accounts list | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Accounts<br>2. รอระบบโหลด | แสดงรายการ chart of accounts ทั้งหมดพร้อม account code, name, category, active status | | High | |
| R1-09 | | Create new account | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. คลิก "Create Account"<br>2. กรอก account code และ name<br>3. เลือก category<br>4. คลิก "Save" | สร้าง account ใหม่สำเร็จ พร้อมใช้ใน journal entries | | High | |
| R1-09 | | Create account fails with duplicate code | ผู้ใช้กำลังสร้าง account | 1. กรอก code ที่มีในระบบแล้ว<br>2. คลิก "Save" | แสดง error ว่า account code ซ้ำ | | High | |
| R1-09 | | Update account details | ผู้ใช้อยู่ที่ detail ของ account | 1. คลิก "Edit"<br>2. แก้ไข name หรือ description<br>3. คลิก "Save" | ข้อมูล account ถูกอัปเดตสำเร็จ | | Medium | |
| R1-09 | | Toggle account active status | ผู้ใช้อยู่ที่หน้า accounts | 1. เลือก account<br>2. Toggle active/inactive<br>3. ยืนยัน | สถานะของ account ถูกเปลี่ยนสำเร็จ | | Medium | |
| R1-09 | | View journal list | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Journal<br>2. รอระบบโหลด | แสดงรายการ journal entries พร้อมสถานะ (draft, posted) และ source module | | High | |
| R1-09 | | Filter journals by status | ผู้ใช้อยู่ที่หน้ารายการ journal | 1. เลือก filter status (draft / posted)<br>2. รอผลกรอง | แสดงเฉพาะ journals ที่มีสถานะตรงกัน | | Medium | |
| R1-09 | | Create draft journal with balanced lines | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. คลิก "Create Journal"<br>2. กรอก date<br>3. เพิ่ม journal lines (debit/credit)<br>4. ตรวจสอบว่า debit = credit<br>5. คลิก "Save Draft" | สร้าง draft journal สำเร็จ แสดงใน journal list สถานะ `draft` | | High | |
| R1-09 | | Create journal fails when debit not equal credit | ผู้ใช้กำลังสร้าง journal | 1. เพิ่ม journal lines ที่ debit ≠ credit<br>2. คลิก "Save Draft" | แสดง validation error ว่า debit และ credit ต้องเท่ากัน | | High | |
| R1-09 | | Post draft journal | ผู้ใช้มี journal สถานะ `draft` | 1. เปิด draft journal<br>2. ตรวจสอบ lines<br>3. คลิก "Post"<br>4. ยืนยัน | Journal เปลี่ยนสถานะเป็น `posted` และถูก lock ไม่สามารถแก้ไขได้ | | High | |
| R1-09 | | Reverse posted journal | ผู้ใช้มี journal สถานะ `posted` | 1. เปิด posted journal<br>2. คลิก "Reverse"<br>3. ยืนยัน | ระบบสร้าง reversal journal ใหม่ที่ผูกกับ journal ต้นทาง | | High | |
| R1-09 | | Cannot edit posted journal | ผู้ใช้พยายามแก้ไข posted journal | 1. เปิด journal สถานะ `posted`<br>2. พยายามแก้ไข lines | ปุ่ม Edit ถูกซ่อนหรือ disable journal ที่ posted ไม่สามารถแก้ไขได้ | | High | |
| R1-09 | | View income-expense ledger | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าหน้า Income-Expense Ledger<br>2. รอระบบโหลด | แสดงสรุป income, expense และ entries ตามช่วงเวลา | | High | |
| R1-09 | | Auto-post from payroll integration | Payroll run ถูก mark paid แล้ว | 1. ตรวจสอบ journal list หลัง payroll mark paid<br>2. ค้นหา journal ที่มี source = payroll | ระบบสร้าง journal entry อัตโนมัติสำหรับ payroll ที่จ่ายแล้ว | | High | |
| R1-09 | | Trace auto-posted journal to source | ผู้ใช้ต้องการตรวจสอบ journal ที่มาจาก module อื่น | 1. เปิด journal ที่ auto-post<br>2. ตรวจสอบ source mapping | แสดงข้อมูล source module และ source document ที่ journal นี้อ้างอิง | | Medium | |
| R1-09 | | Retry failed auto-post | ระบบพยายาม auto-post แต่ล้มเหลว | 1. ตรวจสอบ integration trace ที่ fail<br>2. คลิก "Retry Post" | ระบบพยายาม post journal ซ้ำสำหรับ source document ที่ fail | | Medium | |
