# Test Cases — R1-13 PM: ความคืบหน้าและงาน (Progress / Tasks)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-13 | | View task list with KPI summary | ผู้ใช้ login ด้วยสิทธิ์ PM | 1. เข้าเมนู PM → Progress<br>2. รอระบบโหลด | แสดงรายการงานพร้อม KPI summary (จำนวนงาน, average progress, overdue count) | | High | |
| R1-13 | | Filter tasks by status | ผู้ใช้อยู่ที่หน้ารายการงาน | 1. เลือก filter status (todo, in_progress, done)<br>2. รอผลกรอง | แสดงเฉพาะงานที่มีสถานะตรงกัน | | Medium | |
| R1-13 | | Filter tasks by assignee | ผู้ใช้อยู่ที่หน้ารายการงาน | 1. เลือก filter ผู้รับผิดชอบ<br>2. รอผลกรอง | แสดงเฉพาะงานที่มอบหมายให้กับผู้ที่เลือก | | Medium | |
| R1-13 | | Create task with required fields | ผู้ใช้ login ด้วยสิทธิ์ PM | 1. คลิก "Create Task"<br>2. กรอก title<br>3. เลือก assignee (พนักงาน active)<br>4. เลือก priority<br>5. กรอก dueDate<br>6. คลิก "Save" | สร้างงานใหม่สำเร็จ แสดงในรายการ | | High | |
| R1-13 | | Create task fails with inactive assignee | ผู้ใช้กำลังสร้างงาน | 1. เลือก assignee ที่ไม่ใช่พนักงาน active<br>2. กรอกข้อมูลอื่น<br>3. คลิก "Save" | แสดง validation error ว่า assignee ต้องเป็นพนักงาน active | | High | |
| R1-13 | | Create task fails with missing title | ผู้ใช้กำลังสร้างงาน | 1. ไม่กรอก title<br>2. กรอกข้อมูลอื่น<br>3. คลิก "Save" | แสดง validation error ว่าต้องกรอก title | | High | |
| R1-13 | | Edit task information | ผู้ใช้มีงานในระบบ | 1. เลือกงาน<br>2. คลิก "Edit"<br>3. แก้ไข title หรือ priority<br>4. คลิก "Save" | ข้อมูลงานถูกอัปเดตสำเร็จ | | Medium | |
| R1-13 | | Update task status | ผู้ใช้อยู่ที่หน้างาน | 1. เลือกงาน<br>2. คลิก "Change Status"<br>3. เลือกสถานะใหม่ (เช่น in_progress)<br>4. ยืนยัน | สถานะงานถูกอัปเดตสำเร็จ | | High | |
| R1-13 | | Update task progress percentage | ผู้ใช้อยู่ที่หน้างาน | 1. เลือกงาน<br>2. คลิก "Update Progress"<br>3. กรอก progressPct (0-100)<br>4. ยืนยัน | % ความคืบหน้าของงานถูกอัปเดตสำเร็จ | | High | |
| R1-13 | | Update progress fails with value out of range | ผู้ใช้กำลังอัปเดต progress | 1. กรอก progressPct เป็น 150 (เกิน 100)<br>2. ยืนยัน | แสดง validation error ว่า progressPct ต้องอยู่ระหว่าง 0-100 | | Medium | |
| R1-13 | | Mark task as completed | ผู้ใช้มีงานสถานะ in_progress | 1. เลือกงาน<br>2. เปลี่ยนสถานะเป็น `done`<br>3. ยืนยัน | งานเปลี่ยนสถานะเป็น `done` และ completedDate ถูกบันทึก | | High | |
| R1-13 | | Overdue tasks shown with indicator | ผู้ใช้อยู่ที่หน้ารายการงาน | 1. ดูรายการงานที่ dueDate ผ่านไปแล้วและยังไม่เสร็จ | งานที่ overdue แสดง badge หรือ indicator แจ้งเตือนความล่าช้า | | High | |
| R1-13 | | Delete task | ผู้ใช้มีงานในระบบ | 1. เลือกงาน<br>2. คลิก "Delete"<br>3. ยืนยันการลบ | งานถูกลบสำเร็จ รายการและ KPI summary ถูก refresh | | Medium | |
| R1-13 | | Task linked to budget shows budget context | ผู้ใช้ดูรายละเอียดงานที่ผูกกับงบ | 1. เปิดงานที่มี budgetId<br>2. ดูส่วน budget context | แสดงข้อมูลงบที่ผูกกับงาน (budgetCode, amount, remaining) | | Medium | |
| R1-13 | | KPI overdue count matches actual overdue tasks | ผู้ใช้ดูหน้า progress workspace | 1. ตรวจสอบ KPI overdue count<br>2. นับงานที่ overdue จริงในรายการ | ค่า overdue count ใน KPI ตรงกับจำนวนงาน overdue จริงในรายการ | | Medium | |
