# Test Cases — R2-10 การแจ้งเตือนและ Workflow Alerts (Notification & Workflow Alerts)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-10 | | Unread notification count shown in header | ผู้ใช้ login เข้าระบบ | 1. โหลด app shell<br>2. ดู bell icon ใน header | Bell icon แสดง badge พร้อมจำนวน unread notifications ที่ถูกต้อง | | High | |
| R2-10 | | Open notification bell dropdown | ผู้ใช้อยู่ที่ app shell | 1. คลิก bell icon<br>2. รอ dropdown โหลด | แสดง 5 รายการล่าสุดพร้อมลิงก์ไปหน้าเต็ม | | High | |
| R2-10 | | Mark single notification as read | ผู้ใช้เห็น notification ที่ยังไม่อ่าน | 1. คลิกที่ notification item<br>2. รอระบบตอบสนอง | Notification ถูก mark read และ unread count ลดลง 1 | | High | |
| R2-10 | | Mark all notifications as read | ผู้ใช้มี unread notifications หลายรายการ | 1. เปิด bell dropdown หรือหน้า notifications<br>2. คลิก "Mark All Read"<br>3. รอระบบตอบสนอง | Notifications ทั้งหมดถูก mark read และ unread count เป็น 0 | | High | |
| R2-10 | | View full notifications inbox | ผู้ใช้อยู่ที่ app shell | 1. คลิก bell หรือลิงก์ไป `/notifications`<br>2. รอหน้าโหลด | แสดงรายการ notifications แบบ paginated พร้อม filter unread-only | | High | |
| R2-10 | | Notification actionUrl navigates to correct page | ผู้ใช้อยู่ที่หน้า notifications | 1. คลิกที่ notification item ที่มี actionUrl<br>2. รอระบบตอบสนอง | ระบบนำผู้ใช้ไปยังหน้าที่ระบุใน actionUrl | | High | |
| R2-10 | | Filter inbox by unread only | ผู้ใช้อยู่ที่หน้า notifications | 1. เปิดหน้า `/notifications`<br>2. เปิด toggle "Unread Only"<br>3. รอผลกรอง | แสดงเฉพาะ notifications ที่ยังไม่อ่าน | | Medium | |
| R2-10 | | View notification settings | ผู้ใช้ login เข้าระบบ | 1. เข้าเมนู Settings → Notifications<br>2. รอหน้าโหลด | แสดงรายการ event types พร้อม toggle in-app และ email | | High | |
| R2-10 | | Save notification channel preferences | ผู้ใช้อยู่ที่หน้า notification settings | 1. ปรับ toggle in-app/email ต่อ event type ที่ต้องการ<br>2. คลิก "Save Preferences" | Channel preferences ถูกบันทึกสำเร็จ | | High | |
| R2-10 | | Receive workflow alert for leave approval | ผู้บังคับบัญชามี pending leave request ของทีม | 1. ส่ง leave request<br>2. ตรวจสอบ notifications ของผู้บังคับบัญชา | ผู้บังคับบัญชาได้รับ notification แจ้ง leave request ใหม่ | | High | |
| R2-10 | | Receive workflow alert for overdue invoice | ผู้ใช้ finance มี invoice ที่ overdue | 1. Invoice ถึงวันครบกำหนดโดยไม่ได้ชำระ<br>2. ตรวจสอบ notifications | ผู้ใช้ที่เกี่ยวข้องได้รับ overdue alert | | High | |
| R2-10 | | Notification load error shows error state | ระบบ backend มีปัญหา | 1. เปิด bell dropdown ขณะ API ล้มเหลว<br>2. รอระบบตอบสนอง | แสดง error state ใน dropdown ผู้ใช้สามารถ retry ได้ | | Medium | |
| R2-10 | | Unread count updates after mark all read | ผู้ใช้กด mark all read สำเร็จ | 1. กด "Mark All Read"<br>2. ดู bell badge | Bell badge แสดง 0 หรือหายไปหลัง mark all read | | High | |
