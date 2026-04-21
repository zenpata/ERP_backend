# Test Cases — R2-13 Global Dashboard (ภาพรวมองค์กร)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-13 | | Load global dashboard successfully | ผู้ใช้ login ด้วยสิทธิ์ที่มีสิทธิ์เข้า dashboard | 1. เข้าหน้า `/dashboard`<br>2. รอทุก widget โหลด | หน้า dashboard แสดง skeleton แล้วเติม widgets ตาม summary payload | | High | |
| R2-13 | | Finance KPI widgets displayed correctly | ผู้ใช้อยู่ที่ global dashboard และมีสิทธิ์ finance | 1. ดู section Finance KPI<br>2. ตรวจสอบข้อมูล | แสดง revenue, expense, AR overdue, AP outstanding และ cash balance ถูกต้อง | | High | |
| R2-13 | | HR KPI widgets displayed correctly | ผู้ใช้อยู่ที่ global dashboard และมีสิทธิ์ HR | 1. ดู section HR KPI<br>2. ตรวจสอบข้อมูล | แสดง headcount, pending leave requests, next payroll date และ pending OT ถูกต้อง | | High | |
| R2-13 | | PM KPI widgets displayed correctly | ผู้ใช้อยู่ที่ global dashboard และมีสิทธิ์ PM | 1. ดู section PM KPI<br>2. ตรวจสอบข้อมูล | แสดง active budgets, tasks in progress/overdue และ budget utilization ถูกต้อง | | High | |
| R2-13 | | Alerts panel displayed on dashboard | ผู้ใช้อยู่ที่ global dashboard | 1. ดู alerts panel<br>2. ตรวจสอบรายการ alerts | แสดงรายการ alerts พร้อม count ที่ต้อง action | | High | |
| R2-13 | | Drill down from finance widget to finance module | ผู้ใช้อยู่ที่ global dashboard | 1. คลิกที่ finance KPI widget<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปยังหน้า finance ที่เกี่ยวข้อง | | High | |
| R2-13 | | Drill down from HR widget to HR module | ผู้ใช้อยู่ที่ global dashboard | 1. คลิกที่ HR KPI widget<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปยังหน้า HR ที่เกี่ยวข้อง | | High | |
| R2-13 | | Drill down from PM widget to PM module | ผู้ใช้อยู่ที่ global dashboard | 1. คลิกที่ PM KPI widget<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปยังหน้า PM ที่เกี่ยวข้อง | | High | |
| R2-13 | | Drill down from alert to action page | ผู้ใช้อยู่ที่ global dashboard | 1. คลิกที่ alert item ในแผง alerts<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปยังหน้าที่ต้อง action (เช่น invoice overdue, leave pending) | | High | |
| R2-13 | | Widgets hidden for unauthorized modules | ผู้ใช้ login ด้วย role ที่มีสิทธิ์บางโมดูลเท่านั้น | 1. Login ด้วย role ที่ไม่มีสิทธิ์ finance<br>2. เปิด global dashboard | Finance widgets ถูกซ่อน ผู้ใช้เห็นเฉพาะ widgets ที่มีสิทธิ์ | | High | |
| R2-13 | | Dashboard loads with single API call | ผู้ใช้เปิดหน้า dashboard | 1. เปิด `/dashboard`<br>2. ตรวจสอบ network requests | Dashboard โหลดข้อมูลทั้งหมดจาก `GET /api/dashboard/summary` เดียว | | Medium | |
| R2-13 | | Partial widget failure does not crash page | หนึ่ง section ใน summary ล้มเหลว | 1. จำลอง partial error ใน API response<br>2. รอ dashboard โหลด | Dashboard ยังโหลดได้ widgets ที่มีข้อมูลแสดงปกติ ส่วนที่ fail แสดง error state | | High | |
| R2-13 | | Dashboard refresh reloads all widgets | ผู้ใช้อยู่ที่ global dashboard | 1. คลิกปุ่ม "Refresh" (ถ้ามี)<br>2. รอ widgets โหลดใหม่ | ข้อมูลทุก widget ถูกโหลดใหม่จาก API | | Medium | |
| R2-13 | | Access denied for unauthenticated user | ผู้ใช้ยังไม่ได้ login | 1. พยายามเข้า `/dashboard` โดยไม่มี token<br>2. รอระบบตอบสนอง | ระบบ redirect ไปหน้า login | | High | |
