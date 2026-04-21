# Test Cases — R1-07 Finance: จัดการ Vendor (Vendor Management)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-07 | | Load vendor options for AP form | ผู้ใช้เปิดฟอร์ม AP หรือหน้าที่ต้องเลือก vendor | 1. เปิดฟอร์มที่มี vendor dropdown<br>2. ตรวจสอบ dropdown | แสดงเฉพาะ vendor ที่ active (`isActive=true`) พร้อม code, name, taxId | | High | |
| R1-07 | | Inactive vendor not shown in dropdown | ผู้ใช้เปิด dropdown vendor | 1. เปิด dropdown เลือก vendor<br>2. ตรวจสอบว่า vendor ที่ inactive แสดงหรือไม่ | Vendor ที่ถูก deactivate ไม่แสดงใน dropdown options | | High | |
| R1-07 | | View vendor list | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Vendors<br>2. รอระบบโหลด | แสดงรายการ vendor ทั้งหมดในตาราง พร้อม code, name, taxId, status | | High | |
| R1-07 | | Search vendor by name | ผู้ใช้อยู่ที่หน้ารายการ vendor | 1. พิมพ์ชื่อ vendor ในช่องค้นหา<br>2. รอผลการค้นหา | แสดงเฉพาะ vendor ที่ชื่อตรงกับคำค้นหา | | Medium | |
| R1-07 | | Filter vendor list by active status | ผู้ใช้อยู่ที่หน้ารายการ vendor | 1. เลือก filter `isActive`<br>2. รอผลกรอง | แสดงเฉพาะ vendor ที่มีสถานะตามที่กรอง | | Medium | |
| R1-07 | | Create vendor with required fields | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. คลิก "Create Vendor"<br>2. กรอก code ที่ไม่ซ้ำ<br>3. กรอก name<br>4. กรอก taxId<br>5. กรอก paymentTermDays<br>6. คลิก "Save" | สร้าง vendor ใหม่สำเร็จ พร้อมใช้ใน AP ต่อไป | | High | |
| R1-07 | | Create vendor fails with duplicate code | ผู้ใช้กำลังสร้าง vendor ใหม่ | 1. กรอก code ที่มีในระบบแล้ว<br>2. กรอกข้อมูลอื่น<br>3. คลิก "Save" | แสดง error ว่า vendor code ซ้ำ ระบบไม่บันทึก | | High | |
| R1-07 | | Create vendor fails with duplicate taxId | ผู้ใช้กำลังสร้าง vendor ใหม่ | 1. กรอก taxId 13 หลักที่มีในระบบแล้ว<br>2. กรอก code และ name ใหม่ที่ไม่ซ้ำ<br>3. คลิก "Save" | แสดง error ว่า taxId นี้มีอยู่แล้วในระบบ ระบบไม่บันทึก | | High | |
| R1-07 | | Create vendor fails with missing required fields | ผู้ใช้กำลังสร้าง vendor ใหม่ | 1. ไม่กรอก name หรือ code<br>2. คลิก "Save" | แสดง validation error ระบุฟิลด์ที่ต้องกรอก | | High | |
| R1-07 | | View vendor detail | ผู้ใช้อยู่ที่หน้ารายการ vendor | 1. คลิกที่ vendor ในรายการ<br>2. รอหน้า detail โหลด | แสดงข้อมูลละเอียดของ vendor พร้อม action buttons | | High | |
| R1-07 | | Edit vendor information | ผู้ใช้อยู่ที่หน้า detail หรือ list ของ vendor | 1. คลิก "Edit" ของ vendor<br>2. แก้ไข name, contact หรือ paymentTermDays<br>3. คลิก "Save" | ข้อมูล vendor ถูกอัปเดตสำเร็จ | | High | |
| R1-07 | | Deactivate active vendor | ผู้ใช้อยู่ที่หน้า vendor | 1. เลือก vendor ที่ active<br>2. คลิก Toggle Active (deactivate)<br>3. ยืนยัน | Vendor ถูกเปลี่ยนเป็น inactive ไม่แสดงใน dropdown อีกต่อไป | | High | |
| R1-07 | | Reactivate inactive vendor | ผู้ใช้อยู่ที่หน้า vendor | 1. เลือก vendor ที่ inactive<br>2. คลิก Toggle Active (activate)<br>3. ยืนยัน | Vendor ถูก reactivate และกลับมาแสดงใน dropdown | | Medium | |
| R1-07 | | Delete vendor with no open AP bills | ผู้ใช้อยู่ที่หน้า detail ของ vendor | 1. คลิก "Delete"<br>2. ยืนยันการลบ | Vendor ถูก soft-delete สำเร็จ ไม่แสดงใน list ปกติอีกต่อไป | | Medium | |
| R1-07 | | Delete vendor blocked when has open AP bills | ผู้ใช้พยายามลบ vendor ที่มี AP bill ที่เปิดค้างอยู่ | 1. คลิก "Delete" ของ vendor ที่มี open AP<br>2. ยืนยันการลบ | ระบบ block การลบ พร้อมแสดงข้อความว่ายังมี AP bill ที่เปิดค้างอยู่ | | High | |
| R1-07 | | Soft-deleted vendor not shown in list by default | ผู้ใช้เพิ่ง soft-delete vendor | 1. ลบ vendor<br>2. ดูรายการ vendor ปกติ | Vendor ที่ถูก soft-delete ไม่แสดงใน list default | | Medium | |
