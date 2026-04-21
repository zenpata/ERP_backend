# Test Cases — R1-14 PM: Dashboard

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-14 | | Load PM dashboard successfully | ผู้ใช้ login ด้วยสิทธิ์ PM | 1. เข้าเมนู PM → Dashboard<br>2. รอทุก widget โหลด | แสดง KPI cards งาน, รายการงานล่าสุด, ภาพรวมงบ และภาพรวมค่าใช้จ่ายครบในหน้าเดียว | | High | |
| R1-14 | | Task KPI shows correct counts | ผู้ใช้อยู่ที่ PM Dashboard | 1. ดู KPI section ของงาน<br>2. ตรวจสอบตัวเลข | แสดงจำนวนงานทั้งหมด, average progress %, overdue count ถูกต้อง | | High | |
| R1-14 | | Recent tasks section loads | ผู้ใช้อยู่ที่ PM Dashboard | 1. ดู section งานล่าสุด<br>2. ตรวจสอบรายการ | แสดงรายการงานล่าสุดพร้อมลิงก์ไปหน้ารายละเอียด | | High | |
| R1-14 | | Budget overview shows utilization | ผู้ใช้อยู่ที่ PM Dashboard | 1. ดู section ภาพรวมงบ<br>2. ตรวจสอบข้อมูล | แสดงสรุปงบ (จำนวนงบ, utilization summary) ถูกต้อง | | High | |
| R1-14 | | Expense overview shows status summary | ผู้ใช้อยู่ที่ PM Dashboard | 1. ดู section ภาพรวมค่าใช้จ่าย<br>2. ตรวจสอบข้อมูล | แสดงสรุปค่าใช้จ่าย (pending, approved, total) ถูกต้อง | | High | |
| R1-14 | | Drill down from task KPI to progress page | ผู้ใช้อยู่ที่ PM Dashboard | 1. คลิกที่ task KPI card หรือปุ่ม "Open Progress"<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า `/pm/progress` | | High | |
| R1-14 | | Drill down from budget overview to budgets page | ผู้ใช้อยู่ที่ PM Dashboard | 1. คลิกที่ budget overview section<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า `/pm/budgets` | | High | |
| R1-14 | | Drill down from expense overview to expenses page | ผู้ใช้อยู่ที่ PM Dashboard | 1. คลิกที่ expense overview section<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า `/pm/expenses` | | High | |
| R1-14 | | Refresh dashboard reloads all widgets | ผู้ใช้อยู่ที่ PM Dashboard | 1. คลิกปุ่ม "Refresh"<br>2. รอ widgets โหลดใหม่ | ข้อมูลทุก widget ถูกโหลดใหม่จาก API | | Medium | |
| R1-14 | | Partial widget failure does not crash page | หนึ่ง endpoint ใน dashboard ล้มเหลว | 1. จำลอง API ของ expense summary ตอบ 500<br>2. รอ dashboard โหลด | Dashboard ยังโหลดได้ แต่ widget ที่ fail แสดง error/empty state ส่วนอื่นทำงานปกติ | | High | |
| R1-14 | | Dashboard hides unauthorized widgets | ผู้ใช้มีสิทธิ์เฉพาะบาง widget | 1. Login ด้วย role ที่ไม่มีสิทธิ์ดู budgets<br>2. เปิด PM Dashboard | Widget ที่ไม่มีสิทธิ์ถูกซ่อน ผู้ใช้ไม่เห็นข้อมูลที่ไม่มีสิทธิ์เข้าถึง | | High | |
| R1-14 | | Recent tasks link navigates to task detail | ผู้ใช้อยู่ที่ PM Dashboard และเห็น recent tasks | 1. คลิกที่งานใดงานหนึ่งใน recent tasks<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า detail ของงานที่คลิก | | Medium | |
| R1-14 | | Date range filter changes dashboard data | ผู้ใช้อยู่ที่ PM Dashboard | 1. เลือก date range filter (เช่น Jan 1 – Mar 31)<br>2. รอ widgets โหลดใหม่<br>3. ตรวจสอบข้อมูล KPI และ chart | ข้อมูลทุก widget แสดงเฉพาะข้อมูลในช่วงวันที่ที่เลือก ไม่แสดงข้อมูลนอกช่วง | | High | |
| R1-14 | | Budget alert drills down to budgets filtered by high utilization | ผู้ใช้เห็น budget section ที่มีงบใช้ไปมากกว่า 80% | 1. คลิก card หรือ alert ที่เกี่ยวกับงบที่ใช้เกิน 80%<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า `/pm/budgets` พร้อม filter utilization > 80% | | Medium | |
