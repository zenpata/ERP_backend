# Test Cases — R2-04 งบการเงิน (Financial Statements)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-04 | | Load financial reports hub | ผู้ใช้ login ด้วยสิทธิ์ finance | 1. เข้าเมนู Finance → Reports<br>2. รอระบบโหลด | แสดง reports hub พร้อมลิงก์ไปยัง P&L, Balance Sheet, Cash Flow, AR Aging | | High | |
| R2-04 | | View Profit and Loss report | ผู้ใช้อยู่ที่ reports hub | 1. คลิก "Open Profit & Loss"<br>2. เลือก periodFrom และ periodTo<br>3. รอรายงานโหลด | แสดงรายได้ ค่าใช้จ่าย และกำไรสุทธิตามช่วงเวลาที่เลือก | | High | |
| R2-04 | | View Balance Sheet | ผู้ใช้อยู่ที่ reports hub | 1. คลิก "Open Balance Sheet"<br>2. เลือก asOfDate<br>3. รอรายงานโหลด | แสดงสินทรัพย์ หนี้สิน และทุน ณ วันที่อ้างอิงที่เลือก | | High | |
| R2-04 | | View Cash Flow statement | ผู้ใช้อยู่ที่ reports hub | 1. คลิก "Open Cash Flow"<br>2. เลือกช่วงเวลา<br>3. รอรายงานโหลด | แสดงกระแสเงินสดแยกตามหมวด operating, investing และ financing | | High | |
| R2-04 | | P&L shows correct revenue and expense totals | ผู้ใช้อยู่ที่หน้า P&L | 1. เลือก period ที่มีธุรกรรม<br>2. ตรวจสอบตัวเลขรายได้และค่าใช้จ่าย | ตัวเลขสรุปถูกต้องและสอดคล้องกับ journal entries ในช่วงนั้น | | High | |
| R2-04 | | Balance Sheet assets equal liabilities plus equity | ผู้ใช้อยู่ที่หน้า Balance Sheet | 1. เลือก asOfDate<br>2. ตรวจสอบยอดสินทรัพย์และหนี้สิน+ทุน | สินทรัพย์รวม = หนี้สิน + ทุน (สมการงบดุลสมดุล) | | High | |
| R2-04 | | Export P&L as PDF | ผู้ใช้อยู่ที่หน้า P&L report | 1. ดู P&L report<br>2. คลิก "Export PDF"<br>3. รอไฟล์ดาวน์โหลด | ได้ไฟล์ PDF ของรายงาน P&L สำเร็จ | | High | |
| R2-04 | | Export Balance Sheet as Excel | ผู้ใช้อยู่ที่หน้า Balance Sheet | 1. ดู Balance Sheet<br>2. คลิก "Export Excel"<br>3. รอไฟล์ดาวน์โหลด | ได้ไฟล์ Excel ของ Balance Sheet สำเร็จ | | High | |
| R2-04 | | Export Cash Flow report | ผู้ใช้อยู่ที่หน้า Cash Flow | 1. ดู Cash Flow report<br>2. คลิก "Export PDF" หรือ "Export Excel"<br>3. รอไฟล์ดาวน์โหลด | ได้ไฟล์รายงาน Cash Flow ตาม format ที่เลือก | | High | |
| R2-04 | | Navigate to AR Aging from hub | ผู้ใช้อยู่ที่ reports hub | 1. คลิก "Open AR Aging"<br>2. รอหน้าถัดไปโหลด | ระบบนำไปยัง AR Aging report ใน flow R2-02 | | Medium | |
| R2-04 | | P&L fails with invalid period | ผู้ใช้กำลังดู P&L | 1. กรอก periodFrom ที่มากกว่า periodTo<br>2. รอระบบตอบสนอง | แสดง validation error ว่าช่วงเวลาไม่ถูกต้อง | | High | |
| R2-04 | | Reports load error shows retry option | ระบบ backend มีปัญหา | 1. เปิดหน้ารายงาน ขณะ API ล้มเหลว<br>2. รอระบบตอบสนอง | แสดง error state พร้อมปุ่ม retry ส่วน layout หลักยังแสดง | | High | |
| R2-04 | | Access denied for non-finance user | ผู้ใช้ login ด้วย role ที่ไม่มีสิทธิ์ finance | 1. พยายามเข้า `/finance/reports`<br>2. รอระบบตอบสนอง | แสดง access denied หรือ redirect | | High | |
| R2-04 | | Reports hub summary loads KPI | ผู้ใช้เข้า reports hub | 1. โหลดหน้า reports hub<br>2. รอ KPI โหลด | แสดง KPI summary ระดับสูง (ถ้า API รองรับ) บนหน้า hub | | Medium | |
