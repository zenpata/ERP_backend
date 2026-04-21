# Test Cases — R2-03 ภาษีไทย: VAT และหัก ณ ที่จ่าย (Thai Tax: VAT & WHT)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-03 | | View tax rates list | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Tax<br>2. รอระบบโหลด | แสดงรายการ VAT และ WHT rates ทั้งหมดพร้อมสถานะ active/inactive | | High | |
| R2-03 | | Create new tax rate | ผู้ใช้มีสิทธิ์จัดการ tax rates | 1. คลิก "Create Rate"<br>2. กรอก type (VAT/WHT), code, rate<br>3. กรอก pndForm, incomeType<br>4. คลิก "Save" | สร้าง tax rate ใหม่สำเร็จ พร้อมใช้งานในเอกสาร | | High | |
| R2-03 | | Create tax rate fails with duplicate | ผู้ใช้กำลังสร้าง tax rate ใหม่ | 1. กรอก code ที่มีในระบบแล้ว<br>2. กรอกข้อมูลอื่น<br>3. คลิก "Save" | แสดง error ว่า rate code ซ้ำ ระบบไม่บันทึก | | High | |
| R2-03 | | Edit existing tax rate | ผู้ใช้มี tax rate ในระบบ | 1. เลือก tax rate ที่ต้องการแก้ไข<br>2. คลิก "Edit"<br>3. แก้ไขค่าที่ต้องการ<br>4. คลิก "Save" | Tax rate ถูกอัปเดตสำเร็จ | | Medium | |
| R2-03 | | Activate/deactivate tax rate | ผู้ใช้มีสิทธิ์จัดการ tax rates | 1. เลือก tax rate<br>2. คลิก Toggle Activate<br>3. ยืนยัน | Tax rate เปลี่ยนสถานะ active/inactive และแสดงผลในรายการ | | Medium | |
| R2-03 | | View VAT summary report | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้า Finance → Tax → VAT Report<br>2. เลือก month และ year<br>3. รอรายงานโหลด | แสดง outputVat, inputVat และ netVatPayable ของเดือนที่เลือก | | High | |
| R2-03 | | VAT summary shows correct values | ผู้ใช้อยู่ที่หน้า VAT summary | 1. เลือก period ที่มีธุรกรรม VAT<br>2. ตรวจสอบตัวเลข | ตัวเลข outputVat, inputVat, netVatPayable ถูกต้องตาม invoices/AP bills ที่มี VAT | | High | |
| R2-03 | | Create WHT certificate | ผู้ใช้อยู่ที่หน้า WHT | 1. เข้า Finance → Tax → WHT<br>2. คลิก "Create Certificate"<br>3. ระบุ AP bill หรือข้อมูลจ่าย<br>4. คลิก "Save" | ได้เลขใบรับรองหัก ณ ที่จ่าย พร้อมรายการ | | High | |
| R2-03 | | Download WHT certificate PDF | ผู้ใช้มีใบรับรอง WHT ในระบบ | 1. เปิดรายการ WHT certificates<br>2. เลือก certificate ที่ต้องการ<br>3. คลิก "Print PDF" | ดาวน์โหลดหรือเปิด PDF ใบรับรองหัก ณ ที่จ่ายสำเร็จ | | High | |
| R2-03 | | View PND report | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้า Finance → Tax → PND Report<br>2. เลือก form type, month, year<br>3. รอรายงานโหลด | แสดงยอดรวม grouped ตาม pndForm และ incomeType | | High | |
| R2-03 | | Export PND report | ผู้ใช้อยู่ที่หน้า PND Report | 1. ดู PND report<br>2. คลิก "Export"<br>3. รอไฟล์ดาวน์โหลด | ได้ไฟล์รายงาน PND ตาม format ที่กำหนด | | High | |
| R2-03 | | VAT hidden for non-registered company | บริษัทไม่ได้จด VAT (vatRegistered = false) | 1. เปิดฟอร์มสร้าง Invoice<br>2. ดู fields ที่เกี่ยวกับ VAT | Fields VAT ถูกซ่อนหรือ disable บนฟอร์ม Invoice | | High | |
| R2-03 | | Tax rate fails with incomplete fields | ผู้ใช้กำลังสร้าง tax rate | 1. ไม่กรอก rate หรือ code<br>2. คลิก "Save" | แสดง validation error ระบุ field ที่ต้องกรอก | | High | |
| R2-03 | | WHT creation fails without source document | ผู้ใช้กำลังสร้าง WHT certificate | 1. พยายามสร้าง certificate โดยไม่มีข้อมูล AP bill หรือเอกสารต้นทาง<br>2. คลิก "Save" | ระบบแสดง source error ว่าไม่พบเอกสารต้นทาง | | Medium | |
| R2-03 | | VAT summary with invalid period | ผู้ใช้เลือกช่วงเวลาไม่ถูกต้อง | 1. เข้าหน้า VAT Summary<br>2. ไม่เลือก period หรือเลือก period ไม่ครบ<br>3. รอระบบตอบสนอง | ระบบแสดง validation error ว่าต้องระบุ month และ year | | Medium | |
