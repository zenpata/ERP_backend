# Test Cases — R1-16 Settings: บทบาทและสิทธิ์ (Role and Permission)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-16 | | View roles list | ผู้ใช้ login ด้วย role `super_admin` | 1. เข้าเมนู Settings → Roles<br>2. รอระบบโหลด | แสดงรายการ roles ทั้งหมดพร้อม isSystem flag และจำนวน permissions | | High | |
| R1-16 | | Create custom role | ผู้ใช้มีสิทธิ์จัดการ roles | 1. คลิก "Create Role"<br>2. กรอก name<br>3. กรอก description<br>4. คลิก "Save" | สร้าง custom role ใหม่สำเร็จ แสดงในรายการ | | High | |
| R1-16 | | Create role fails with duplicate name | ผู้ใช้กำลังสร้าง role | 1. กรอก name ที่มีในระบบแล้ว<br>2. คลิก "Save" | แสดง error ว่า role name ซ้ำ | | Medium | |
| R1-16 | | Edit custom role name and description | ผู้ใช้มี custom role ที่ไม่ใช่ system role | 1. เลือก custom role<br>2. คลิก "Edit"<br>3. แก้ไข name หรือ description<br>4. คลิก "Save" | ข้อมูล role ถูกอัปเดตสำเร็จ | | Medium | |
| R1-16 | | Cannot edit system role | ผู้ใช้พยายามแก้ไข system role (เช่น `super_admin`) | 1. เลือก system role<br>2. พยายามคลิก "Edit" | ปุ่ม Edit ถูกซ่อนหรือ disable ระบบ block การแก้ไข system role | | High | |
| R1-16 | | Load permission matrix for role | ผู้ใช้เลือก role ที่ต้องการ | 1. เลือก role<br>2. คลิก "Open Matrix" หรือ "Permissions"<br>3. รอ permissions โหลด | แสดง permission matrix แสดง permissions ทั้งหมดพร้อมสถานะ grant/revoke | | High | |
| R1-16 | | Save permission matrix for role | ผู้ใช้เปิด permission matrix ของ role | 1. ปรับ permissions ที่ต้องการ (grant/revoke)<br>2. คลิก "Save Matrix"<br>3. ยืนยัน | Permissions ของ role ถูกอัปเดตแบบ replace ทั้งชุด และมี audit log บันทึก | | High | |
| R1-16 | | Audit log recorded when permissions change | ผู้ใช้ save permission matrix | 1. แก้ไข permission matrix<br>2. Save<br>3. ตรวจสอบ audit log | Audit log บันทึกว่าใครเปลี่ยน permissions อะไร เมื่อไหร่ | | High | |
| R1-16 | | Delete custom role with no users | ผู้ใช้มี custom role ที่ไม่มี users ใช้งาน | 1. เลือก custom role<br>2. คลิก "Delete"<br>3. ยืนยัน | Role ถูกลบสำเร็จ ไม่แสดงในรายการอีกต่อไป | | High | |
| R1-16 | | Delete role blocked when has assigned users | ผู้ใช้พยายามลบ role ที่มี users ใช้งานอยู่ | 1. เลือก role ที่มี users<br>2. คลิก "Delete"<br>3. ยืนยัน | ระบบ block การลบ และแจ้งว่ายังมี users ที่ใช้ role นี้อยู่ | | High | |
| R1-16 | | Cannot delete system role | ผู้ใช้พยายามลบ system role | 1. เลือก system role (isSystem=true)<br>2. คลิก "Delete" | ปุ่ม Delete ถูกซ่อนหรือ disable ระบบ block การลบ system role | | High | |
| R1-16 | | Permission changes take effect immediately for logged-in users | ผู้ใช้มี role ที่ permissions เพิ่งถูกเปลี่ยน | 1. Admin เปลี่ยน permission ของ role<br>2. User ที่มี role นั้น refresh หรือทำ action<br>3. ตรวจสอบการเข้าถึง | User ได้รับผลกระทบจากการเปลี่ยน permissions ทันทีหรือหลัง session refresh | | High | |
| R1-16 | | Access denied for non-admin user | ผู้ใช้ login ด้วย role ที่ไม่ใช่ admin | 1. พยายามเข้า `/settings/roles`<br>2. รอระบบตอบสนอง | แสดง access denied หรือ redirect | | High | |
| R1-16 | | Bulk assign role to multiple users | ผู้ใช้ login ด้วย role `super_admin` และอยู่ที่หน้า Users list | 1. เลือก users หลายคนด้วย checkbox<br>2. คลิกปุ่ม "Bulk Assign Role"<br>3. เลือก role ที่ต้องการจาก dropdown<br>4. คลิก "ยืนยัน" | Users ที่เลือกทั้งหมดได้รับ role ที่กำหนด ระบบแสดง toast สำเร็จ | | High | |
| R1-16 | | Bulk assign role fails when no users selected | ผู้ใช้อยู่ที่หน้า Users list | 1. ไม่เลือก user ใดเลย<br>2. ตรวจสอบปุ่ม "Bulk Assign Role" | ปุ่ม "Bulk Assign Role" ถูก disable เมื่อไม่มี user ถูกเลือก | | Medium | |
