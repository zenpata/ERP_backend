# Test Cases — R2-07 HR: เวลาเข้างาน ตารางงาน OT และวันหยุด (Attendance & Time Tracking)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-07 | | View work schedules list | ผู้ใช้ login ด้วยสิทธิ์ hr_admin | 1. เข้าเมนู HR → Work Schedules<br>2. รอระบบโหลด | แสดงรายการ work schedules ทั้งหมด | | High | |
| R2-07 | | Create work schedule | ผู้ใช้มีสิทธิ์จัดการ work schedules | 1. คลิก "Create Schedule"<br>2. กรอก workdays, work hours<br>3. คลิก "Save" | Work schedule ใหม่ถูกสร้างสำเร็จ | | High | |
| R2-07 | | Assign work schedule to employee | ผู้ใช้มี schedule และพนักงานในระบบ | 1. เลือก schedule ที่ต้องการ<br>2. คลิก "Assign"<br>3. เลือกพนักงาน<br>4. ยืนยัน | พนักงานถูกผูกกับ work schedule ที่เลือก | | High | |
| R2-07 | | Record employee check-in | ผู้ใช้ (HR หรือพนักงาน) มีสิทธิ์บันทึก attendance | 1. คลิก "Check-in"<br>2. ระบุพนักงานและวันที่<br>3. ยืนยัน | ระบบสร้าง attendance record ของวันนั้น | | High | |
| R2-07 | | Record employee check-out | ผู้ใช้มี attendance record ของวันที่ check-in แล้ว | 1. เปิด attendance record ที่มี check-in แล้ว<br>2. คลิก "Check-out"<br>3. ยืนยัน | ระบบบันทึก check-out time และคำนวณ workingHours และ otHours | | High | |
| R2-07 | | View attendance list with filters | ผู้ใช้ login ด้วยสิทธิ์ hr_admin | 1. เข้าเมนู HR → Attendance<br>2. กรองตามพนักงานหรือช่วงวัน<br>3. รอผลกรอง | แสดง attendance log และสรุปการทำงานตาม filter ที่เลือก | | High | |
| R2-07 | | Create OT request | พนักงานต้องการทำ OT | 1. คลิก "Create OT Request"<br>2. กรอก date, hours, reason<br>3. คลิก "Submit" | OT request ถูกสร้างและรอการอนุมัติ | | High | |
| R2-07 | | Approve OT request | ผู้ใช้มีสิทธิ์อนุมัติ OT และมี pending OT request | 1. เปิด OT request ที่รออนุมัติ<br>2. คลิก "Approve"<br>3. ยืนยัน | OT request ถูก approve และ OT hours ถูกนับเข้าระบบ | | High | |
| R2-07 | | Reject OT request | ผู้ใช้มีสิทธิ์อนุมัติ OT | 1. เปิด OT request ที่รออนุมัติ<br>2. คลิก "Reject"<br>3. กรอกเหตุผล<br>4. ยืนยัน | OT request ถูก reject และไม่นับ OT hours | | High | |
| R2-07 | | Manage holidays | ผู้ใช้มีสิทธิ์ hr_admin | 1. เข้าเมนู HR → Holidays<br>2. คลิก "Add Holiday"<br>3. กรอก date, name<br>4. คลิก "Save" | วันหยุดถูกเพิ่มสำเร็จ ใช้ใน attendance/payroll | | High | |
| R2-07 | | Attendance data feeds payroll processing | payroll run เริ่มต้นหลังจากมี attendance data | 1. สร้าง payroll run<br>2. ตรวจสอบว่า payroll ดึง attendance + approved OT | Payroll คำนวณ daily-rate, absent deduction และ OT pay จาก attendance data ได้ถูกต้อง | | High | |
| R2-07 | | Check-in fails for duplicate record | พนักงาน check-in วันเดียวซ้ำกัน | 1. พยายาม check-in สำหรับพนักงานที่ check-in วันนั้นแล้ว | ระบบแสดง error ว่ามี attendance record ของวันนั้นแล้ว | | High | |
| R2-07 | | Check-out fails without prior check-in | พนักงานยังไม่ได้ check-in | 1. พยายาม check-out โดยไม่มี record check-in<br>2. รอระบบตอบสนอง | ระบบแสดง error ว่าไม่พบ check-in record | | High | |
| R2-07 | | OT request fails without work schedule | พนักงานไม่มี work schedule ที่ assign | 1. สร้าง OT request สำหรับพนักงานที่ไม่มี schedule<br>2. คลิก "Submit" | ระบบแสดง error ว่าพนักงานต้องมี work schedule ก่อน | | Medium | |
| R2-07 | | Delete holiday | ผู้ใช้มีสิทธิ์ hr_admin | 1. เลือกวันหยุดที่ต้องการลบ<br>2. คลิก "Delete"<br>3. ยืนยัน | วันหยุดถูกลบสำเร็จ ไม่แสดงในรายการอีกต่อไป | | Medium | |
