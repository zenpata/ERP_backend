# Test Cases — R1-10 Finance: รายงานสรุป (Reports Summary)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R1-10 | | Load finance reports summary page | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Reports<br>2. รอหน้าโหลด | หน้ารายงานโหลดสำเร็จ แสดง period controls และพื้นที่ KPI cards | | High | |
| R1-10 | | Apply reporting period and load KPI | ผู้ใช้อยู่ที่หน้า Finance Reports | 1. กรอก periodFrom<br>2. กรอก periodTo<br>3. คลิก "Apply Period"<br>4. รอข้อมูลโหลด | แสดง KPI cards: revenue, expense, net profit, AR outstanding, AP outstanding ตามช่วงเวลาที่เลือก | | High | |
| R1-10 | | KPI cards show correct values | ผู้ใช้ apply period และข้อมูลโหลดสำเร็จ | 1. ตรวจสอบค่าใน KPI cards แต่ละตัว<br>2. เปรียบเทียบกับข้อมูลจริงในระบบ | ค่า KPI แต่ละตัว (revenue, expense, net profit, AR, AP) ถูกต้องและสอดคล้องกับข้อมูลในระบบ | | High | |
| R1-10 | | Handle invalid period range | ผู้ใช้อยู่ที่หน้า Finance Reports | 1. กรอก periodFrom ที่หลังกว่า periodTo<br>2. คลิก "Apply Period" | แสดง validation error ว่าช่วงเวลาไม่ถูกต้อง | | Medium | |
| R1-10 | | Handle API failure with retry option | ผู้ใช้ apply period แต่ API ล้มเหลว | 1. Apply period<br>2. จำลอง API summary ล้มเหลว<br>3. สังเกต UI | แสดงข้อความ error พร้อมปุ่ม "ลองอีกครั้ง" | | High | |
| R1-10 | | Drill down from AR KPI to invoices | ผู้ใช้เห็น AR outstanding KPI | 1. คลิกที่ KPI card AR outstanding<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า AR Invoices (`/finance/invoices`) ที่แสดงข้อมูลที่เกี่ยวข้อง | | High | |
| R1-10 | | Drill down from AP KPI to AP bills | ผู้ใช้เห็น AP outstanding KPI | 1. คลิกที่ KPI card AP outstanding<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า AP (`/finance/ap`) ที่แสดงข้อมูลที่เกี่ยวข้อง | | High | |
| R1-10 | | Drill down from revenue/expense KPI to journal | ผู้ใช้เห็น revenue หรือ expense KPI | 1. คลิกที่ KPI card revenue หรือ expense<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า journal หรือ ledger ที่เกี่ยวข้อง | | Medium | |
| R1-10 | | Access denied for non-finance user | ผู้ใช้ login ด้วย role ที่ไม่มีสิทธิ์ finance | 1. พยายามเข้า `/finance/reports`<br>2. รอระบบตอบสนอง | แสดง access denied หรือ redirect | | High | |
| R1-10 | | Monthly chart loads for trend data | ผู้ใช้ apply period สำเร็จแล้ว | 1. ตรวจสอบว่ามี monthly chart แสดงหรือไม่<br>2. สังเกต trend data | ถ้า UI รองรับ monthly chart แสดงข้อมูลแนวโน้มรายเดือนภายในช่วงที่เลือก | | Low | |
| R1-10 | | Report shows R1 limitation note | ผู้ใช้เปิดหน้า Finance Reports | 1. ตรวจสอบว่ามีข้อความแจ้ง scope ของ R1 หรือไม่ | แสดงข้อความหรือ note ชัดเจนว่า งบกำไรขาดทุนเต็มรูปแบบ, Balance Sheet, Cash Flow เป็น R2 | | Low | |
| R1-10 | | Load AR Aging report tab | ผู้ใช้อยู่ที่หน้า Finance Reports | 1. คลิกแท็บ "AR Aging"<br>2. รอระบบโหลด | แสดงตาราง AR Aging แบ่งตาม bucket: 0-30 วัน, 31-60 วัน, 61-90 วัน, 90+ วัน พร้อมยอดรวมแต่ละช่วง | | High | |
| R1-10 | | AR Aging shows correct bucket totals | ผู้ใช้อยู่ที่แท็บ AR Aging | 1. ตรวจสอบยอดในแต่ละ bucket<br>2. เปรียบเทียบกับ invoice ที่ค้างชำระจริงในระบบ | ยอดใน bucket แต่ละช่วงถูกต้อง รวมเฉพาะ invoice ที่ยังไม่ชำระครบและ dueDate อยู่ในช่วงนั้น | | High | |
| R1-10 | | Filter AR Aging by customer | ผู้ใช้อยู่ที่แท็บ AR Aging | 1. เลือก customer จาก dropdown filter<br>2. รอผลกรอง | แสดงเฉพาะ AR aging ของลูกค้าที่เลือก | | Medium | |
| R1-10 | | Drill down from AR Aging row to invoice list | ผู้ใช้อยู่ที่แท็บ AR Aging | 1. คลิกแถวลูกค้าในตาราง AR Aging<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า Invoice list กรองตาม customer นั้น | | High | |
| R1-10 | | Load AP Aging report tab | ผู้ใช้อยู่ที่หน้า Finance Reports | 1. คลิกแท็บ "AP Aging"<br>2. รอระบบโหลด | แสดงตาราง AP Aging แบ่ง bucket ตาม due date ของ AP bill ที่ยังค้างชำระ | | High | |
| R1-10 | | AP Aging sort by due date | ผู้ใช้อยู่ที่แท็บ AP Aging | 1. คลิก column header "Due Date"<br>2. ตรวจสอบลำดับข้อมูล | รายการเรียงตาม due date ascending ผู้ขายที่ต้องจ่ายก่อนสุดอยู่บนสุด | | Medium | |
| R1-10 | | AP Aging highlights overdue rows | ผู้ใช้อยู่ที่แท็บ AP Aging | 1. ดูรายการใน AP Aging<br>2. ตรวจสอบแถวที่เกิน due date แล้ว | แถวที่เลย due date แสดง visual indicator (เช่น สีแดง หรือ badge) เพื่อแยกจากแถวปกติ | | Medium | |
| R1-10 | | Drill down from AP Aging row to AP bill list | ผู้ใช้อยู่ที่แท็บ AP Aging | 1. คลิกแถว vendor ในตาราง AP Aging<br>2. รอหน้าถัดไปโหลด | ระบบนำผู้ใช้ไปหน้า AP bill list กรองตาม vendor นั้น | | High | |
| R1-10 | | Load Payroll Summary report tab | ผู้ใช้อยู่ที่หน้า Finance Reports | 1. คลิกแท็บ "Payroll"<br>2. รอระบบโหลด | แสดงตารางสรุปรอบเงินเดือน พร้อม gross pay, SS, WHT, net pay แต่ละรอบ | | High | |
| R1-10 | | Filter Payroll Summary by year and month | ผู้ใช้อยู่ที่แท็บ Payroll Summary | 1. เลือกปีและเดือนจาก filter<br>2. รอผลกรอง | แสดงเฉพาะรอบเงินเดือนที่ตรงกับช่วงที่เลือก | | Medium | |
| R1-10 | | Payroll Summary shows correct component totals | ผู้ใช้อยู่ที่แท็บ Payroll Summary | 1. เปิดแท็บ Payroll Summary<br>2. ตรวจสอบยอด gross, SS, WHT, net | ยอดแต่ละ component ตรงกับข้อมูลใน Payroll run ที่ status เป็น `paid` | | High | |
| R1-10 | | Export Finance Report to Excel | ผู้ใช้อยู่ที่หน้า Finance Reports และ apply period แล้ว | 1. คลิกปุ่ม "Export Excel"<br>2. รอไฟล์ดาวน์โหลด | ดาวน์โหลดไฟล์ .xlsx สำเร็จ ข้อมูลตรงกับที่แสดงบนหน้าจอ | | High | |
| R1-10 | | Export Finance Report to PDF | ผู้ใช้อยู่ที่หน้า Finance Reports และ apply period แล้ว | 1. คลิกปุ่ม "Export PDF"<br>2. รอไฟล์ดาวน์โหลด | ดาวน์โหลดไฟล์ .pdf สำเร็จ | | Medium | |
