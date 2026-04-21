# Test Cases — R2-09 พิมพ์ / ส่งออกเอกสาร (Document Print & Export)

| folder | jira | title | precondition | steps | expected_result | squad | priority | automation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R2-09 | | Print invoice PDF | ผู้ใช้อยู่ที่หน้า detail ของ invoice | 1. คลิก "Print PDF"<br>2. รอไฟล์สร้าง | ดาวน์โหลดหรือเปิด PDF ของ invoice สำเร็จ | | High | |
| R2-09 | | Preview invoice HTML | ผู้ใช้อยู่ที่หน้า detail ของ invoice | 1. คลิก "Preview"<br>2. รอ preview โหลด | เปิด preview ของ invoice ในรูป HTML บน browser ได้ | | High | |
| R2-09 | | Download AP bill PDF | ผู้ใช้อยู่ที่หน้า detail ของ AP bill | 1. คลิก "Download PDF"<br>2. รอไฟล์สร้าง | ได้ไฟล์ PDF ของ AP bill สำเร็จ | | High | |
| R2-09 | | Download PO PDF | ผู้ใช้อยู่ที่หน้า detail ของ Purchase Order | 1. คลิก "Print PDF"<br>2. รอไฟล์สร้าง | ได้ไฟล์ PDF ของ PO สำหรับส่ง vendor | | High | |
| R2-09 | | Download Quotation PDF | ผู้ใช้อยู่ที่หน้า detail ของ Quotation | 1. คลิก "Print PDF"<br>2. รอไฟล์สร้าง | ได้ไฟล์ PDF ใบเสนอราคาสำเร็จ | | High | |
| R2-09 | | Print WHT certificate PDF | ผู้ใช้อยู่ที่หน้า WHT certificates | 1. เลือก WHT certificate<br>2. คลิก "Print"<br>3. รอไฟล์สร้าง | ได้ไฟล์ PDF ใบรับรองหัก ณ ที่จ่ายสำเร็จ | | High | |
| R2-09 | | Download individual payslip | ผู้ใช้อยู่ที่หน้า payroll run | 1. เลือก payslip ของพนักงานคนหนึ่ง<br>2. คลิก "Download"<br>3. รอไฟล์สร้าง | ได้ไฟล์ PDF payslip รายบุคคลสำเร็จ | | High | |
| R2-09 | | Export all payslips as ZIP | ผู้ใช้อยู่ที่หน้า payroll run ที่มีสถานะ processed หรือ paid | 1. คลิก "Export All Payslips"<br>2. รอไฟล์สร้าง | ได้ไฟล์ ZIP ที่รวม payslips ทั้งชุดสำเร็จ | | High | |
| R2-09 | | Export financial report as PDF | ผู้ใช้อยู่ที่หน้ารายงานการเงิน (P&L, Balance Sheet, Cash Flow) | 1. คลิก "Export PDF"<br>2. รอไฟล์สร้าง | ได้ไฟล์ PDF ของรายงานการเงินสำเร็จ | | High | |
| R2-09 | | Export financial report as Excel | ผู้ใช้อยู่ที่หน้ารายงานการเงิน | 1. คลิก "Export Excel"<br>2. รอไฟล์สร้าง | ได้ไฟล์ Excel ของรายงานการเงินสำเร็จ | | High | |
| R2-09 | | Export fails with 403 permission error | ผู้ใช้ไม่มีสิทธิ์เข้าถึงเอกสารต้นทาง | 1. พยายามดาวน์โหลด PDF ของเอกสารที่ไม่มีสิทธิ์<br>2. รอระบบตอบสนอง | ระบบแสดง 403 error และไม่ดาวน์โหลดไฟล์ | | High | |
| R2-09 | | Export fails with 404 document not found | เอกสารต้นทางไม่มีในระบบ | 1. พยายามดาวน์โหลด PDF ของเอกสารที่ถูกลบแล้ว<br>2. รอระบบตอบสนอง | ระบบแสดง 404 error และแจ้งว่าไม่พบเอกสาร | | High | |
| R2-09 | | Export shows loading indicator during file generation | ผู้ใช้คลิก export บนเอกสาร | 1. คลิก "Export PDF"<br>2. ดูสถานะระหว่างรอ | แสดง loading indicator ขณะสร้างไฟล์ และแสดง toast สำเร็จเมื่อดาวน์โหลดเสร็จ | | Medium | |
| R2-09 | | File download uses correct filename | ผู้ใช้ดาวน์โหลด PDF สำเร็จ | 1. ดาวน์โหลด PDF ของ invoice<br>2. ตรวจสอบชื่อไฟล์ | ชื่อไฟล์มี invoice number หรือ reference ที่ระบุชัดเจน | | Medium | |
