# Test Cases — R2-05 เงินสด / บัญชีธนาคาร (Cash & Bank Management)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-05 | | View bank accounts list | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Bank Accounts<br>2. รอระบบโหลด | แสดงรายการบัญชีธนาคารทั้งหมดพร้อม currentBalance | | High | |
| R2-05 | | Create bank account | ผู้ใช้มีสิทธิ์จัดการ bank accounts | 1. คลิก "Create Account"<br>2. กรอก code, accountNo, bank<br>3. กรอก GL link (optional)<br>4. คลิก "Save" | สร้างบัญชีธนาคารใหม่สำเร็จ พร้อมใช้ใน AR/AP | | High | |
| R2-05 | | Edit bank account information | ผู้ใช้มีบัญชีธนาคารในระบบ | 1. เลือกบัญชีธนาคาร<br>2. คลิก "Edit"<br>3. แก้ไขข้อมูลที่ต้องการ<br>4. คลิก "Save" | ข้อมูลบัญชีธนาคารถูกอัปเดตสำเร็จ | | Medium | |
| R2-05 | | View bank account detail with transaction history | ผู้ใช้อยู่ที่หน้ารายการบัญชี | 1. คลิกที่บัญชีธนาคารรายการหนึ่ง<br>2. รอหน้า detail โหลด | แสดงข้อมูลบัญชีพร้อม movement history และ currentBalance | | High | |
| R2-05 | | Add manual deposit transaction | ผู้ใช้อยู่ที่หน้า detail ของบัญชีธนาคาร | 1. คลิก "Add Transaction"<br>2. เลือก type เป็น deposit<br>3. กรอก date, amount, description, reference<br>4. คลิก "Save Transaction" | ระบบเพิ่ม deposit record และคำนวณ currentBalance ใหม่ | | High | |
| R2-05 | | Add manual withdrawal transaction | ผู้ใช้อยู่ที่หน้า detail ของบัญชีธนาคาร | 1. คลิก "Add Transaction"<br>2. เลือก type เป็น withdrawal<br>3. กรอกข้อมูลครบ<br>4. คลิก "Save Transaction" | ระบบเพิ่ม withdrawal record และหักยอดจาก currentBalance | | High | |
| R2-05 | | Reconcile transaction | ผู้ใช้อยู่ที่หน้า detail ของบัญชีธนาคาร | 1. เลือกรายการที่ยืนยันจาก bank statement<br>2. คลิก "Reconcile"<br>3. ยืนยัน | รายการถูก mark ว่ากระทบยอดแล้ว | | High | |
| R2-05 | | Bank account available as option in AR payment | ผู้ใช้กำลังบันทึกรับชำระ AR | 1. เปิดฟอร์มบันทึก AR payment<br>2. ดู dropdown bankAccountId | แสดงเฉพาะบัญชี active ใน dropdown | | High | |
| R2-05 | | Bank account available as option in AP payment | ผู้ใช้กำลังบันทึกจ่าย AP | 1. เปิดฟอร์มบันทึก AP payment<br>2. ดู dropdown bankAccountId | แสดงเฉพาะบัญชี active ใน dropdown | | High | |
| R2-05 | | Transaction fails with invalid amount | ผู้ใช้กำลังเพิ่ม manual transaction | 1. คลิก "Add Transaction"<br>2. กรอก amount เป็น 0 หรือค่าลบ<br>3. คลิก "Save Transaction" | แสดง validation error ว่า amount ต้องมากกว่า 0 | | High | |
| R2-05 | | Transaction fails on inactive account | ผู้ใช้พยายามเพิ่ม transaction บนบัญชีที่ inactive | 1. เลือกบัญชีที่ inactive<br>2. พยายามเพิ่ม transaction | ระบบ block action และแจ้งว่าบัญชี inactive | | High | |
| R2-05 | | Reconcile fails with incomplete data | ผู้ใช้พยายาม reconcile รายการที่ยังไม่พร้อม | 1. เลือกรายการที่ยังไม่ครบข้อมูล<br>2. คลิก "Reconcile" | ระบบแจ้ง reconcile fail และไม่ mark รายการ | | Medium | |
| R2-05 | | Create bank account fails with duplicate code | ผู้ใช้กำลังสร้างบัญชีธนาคาร | 1. กรอก code ที่มีในระบบแล้ว<br>2. คลิก "Save" | แสดง error ว่า account code ซ้ำ | | Medium | |
| R2-05 | | Balance recalculated after transaction saved | ผู้ใช้บันทึก manual transaction สำเร็จ | 1. บันทึก transaction<br>2. ดู currentBalance ของบัญชี | currentBalance ถูกคำนวณใหม่ถูกต้องหลังบันทึก transaction | | High | |
| R2-05 | | Access denied for non-finance user | ผู้ใช้ login ด้วย role ที่ไม่มีสิทธิ์ finance | 1. พยายามเข้า `/finance/bank-accounts`<br>2. รอระบบตอบสนอง | แสดง access denied หรือ redirect | | High | |
