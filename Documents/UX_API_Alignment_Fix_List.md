# UX/API Alignment Fix List

เอกสารนี้สรุปจากรอบ review เทียบ `Documents/UX_Flow/Functions`, `Documents/Requirements`, และ `Documents/SD_Flow`

เป้าหมายคือ list ว่า `ต้องแก้อะไรบ้าง` และ `แก้ยังไง` เพื่อปิด doc drift ระหว่าง 3 ชั้น:
- `Requirements`
- `SD_Flow`
- `UX_Flow`

## วิธีใช้
- ถ้า `Requirements` กับ `SD_Flow` ตรงกันอยู่แล้ว แต่ `UX_Flow` ไม่ตรง: ให้แก้ `UX_Flow` ตาม canonical source
- ถ้า `Requirements` ยังไม่ล็อก behavior หรือ field สำคัญ: ให้แก้ `Requirements` ก่อน แล้วค่อย sync ลง `SD_Flow` และ `UX_Flow`
- ถ้า field ถูกใช้ใน `UX_Flow` / `SD_Flow` แต่ไม่มี storage/schema รองรับใน `Requirements`: ให้ถือเป็น backend/storage gap และต้องตัดสินใจที่ `Requirements` ก่อน
- ห้ามปิดสถานะใน checklist snapshot จนกว่า `Requirements + SD_Flow + UX_Flow` จะตรงกันจริง

## Recommended Edit Order
1. แก้ naming/query/body mismatch ที่มี canonical source ชัดอยู่แล้วก่อน
2. ตัดสินใจเรื่อง lifecycle/endpoint contract ที่ยังไม่ล็อกชัด
3. ตัดสินใจเรื่อง storage/schema gap
4. ค่อยอัปเดต snapshot docs เช่น checklist และ coverage review

## Priority 0 - แก้ก่อน

### 1. Audit filters ใช้ชื่อไม่ตรง canonical
- Files to edit:
  - `Documents/UX_Flow/Functions/R2-12_Audit_Trail.md`
- Canonical source:
  - `Documents/Requirements/Release_2.md`
  - `Documents/SD_Flow/User_Login/settings_admin_r2.md`
- Problem:
  - เนื้อหาใน UX ยังใช้ `userId`, `dateFrom`, `dateTo`
  - แต่ canonical lock ใช้ `actorId`, `startDate`, `endDate`
- Fix:
  - เปลี่ยน filter controls, query examples, และ step descriptions ใน `R2-12_Audit_Trail.md` ให้ใช้ `actorId`, `startDate`, `endDate`
  - ถ้าต้องเก็บ note เรื่อง legacy naming ให้ใส่เป็น note ว่า FE map จาก UI internal state ได้ แต่ API boundary ต้องใช้ canonical names เท่านั้น
- Done when:
  - ทุกจุดใน UX file ใช้ `module`, `entityType`, `actorId`, `action`, `startDate`, `endDate` ตรงกับ Requirements/SD

### 2. Auth logout / change-password body ยังไม่ตรง contract
- Files to edit:
  - `Documents/UX_Flow/Functions/R1-01_Auth_Login_and_Session.md`
- Canonical source:
  - `Documents/Requirements/Release_1.md`
  - `Documents/SD_Flow/User_Login/login.md`
- Problem:
  - logout step ไม่ระบุ `refreshToken` และ `allDevices`
  - change-password step บอกว่า `confirmNewPassword` เป็น FE-only และไม่ส่ง API
  - แต่ canonical contract ล็อก `confirmPassword` เป็น request field
- Fix:
  - แก้ sub-flow logout ให้ระบุ request body `{ refreshToken, allDevices }`
  - แก้ sub-flow change password ให้ส่ง `currentPassword`, `newPassword`, `confirmPassword`
  - ปรับ wording จาก `confirmNewPassword` ให้ map ชัดว่า field UI ต้อง submit เป็น `confirmPassword`
- Done when:
  - UX request fields ตรงกับ request body ใน Requirements/SD ทุกจุด

### 3. Notifications ใช้ field/event catalog ไม่ตรง
- Files to edit:
  - `Documents/UX_Flow/Functions/R2-10_Notification_Workflow_Alerts.md`
- Canonical source:
  - `Documents/Requirements/Release_2.md`
  - `Documents/SD_Flow/User_Login/settings_admin_r2.md`
  - `Documents/UX_API_Canonical_Field_and_Scope_Mapping.md`
- Problem:
  - ใช้ `type` แทน `eventType`
  - ใช้ `dateRange` ในเชิง API ทั้งที่ canonical เป็น `dateFrom` / `dateTo`
  - `PUT /api/settings/notification-configs` ยังอธิบาย body เป็น bare array
  - coverage lock ยังมี `AP_PAYMENT_DUE` ซึ่งไม่อยู่ใน event catalog ล่าสุด
- Fix:
  - เปลี่ยน filter/API boundary ให้ใช้ `eventType`, `dateFrom`, `dateTo`
  - เปลี่ยน body ตัวอย่างเป็น:
    - `{ "configs": [{ "eventType": "...", "channelInApp": true, "channelEmail": false }] }`
  - เปลี่ยน event catalog ใน UX ให้ตรงกับ Requirements/SD:
    - `AP_APPROVAL_REQUIRED`, `AP_APPROVED`, `AP_REJECTED`
    - ไม่ใช้ `AP_PAYMENT_DUE`
- Done when:
  - ชื่อ field และ event catalog ใน UX ตรงกับ SD/Requirements 100%

### 4. Purchase Order naming drift หลายจุด
- Files to edit:
  - `Documents/UX_Flow/Functions/R2-06_Purchase_Order.md`
  - `Documents/UX_Flow/Functions/R1-08_Finance_Accounts_Payable.md`
- Canonical source:
  - `Documents/SD_Flow/Finance/purchase_orders.md`
  - `Documents/Requirements/Release_2.md`
- Problem:
  - UX ใช้ `poDate` แทน `issueDate`
  - UX ใช้ `expectedDate` แทน `expectedDeliveryDate`
  - UX ใช้ `changeReason` แทน `reason`
  - UX ฝั่ง PO/AP deep link ใช้ `purchaseOrderId` แทน `poId`
  - flow สร้าง GR ยังไม่ list `receivedBy`
- Fix:
  - เปลี่ยน field names ใน PO create/update/status ให้ตรงกับ SD:
    - `issueDate`
    - `expectedDeliveryDate`
    - `reason`
    - `poId`
  - เพิ่ม `receivedBy` ใน GR create form และ request body
  - ถ้า `departmentId` อยู่ใน SD contract แล้ว ให้เพิ่มใน UX create form หรือ mark ชัดว่า optional
- Done when:
  - Request fields ใน PO/GR/AP linkage ใช้ชื่อเดียวกันทุกไฟล์

### 5. Accounting core filters / error code ไม่ตรง SD
- Files to edit:
  - `Documents/UX_Flow/Functions/R1-09_Finance_Accounting_Core.md`
- Canonical source:
  - `Documents/SD_Flow/Finance/accounting_core.md`
  - `Documents/UX_API_Canonical_Field_and_Scope_Mapping.md`
- Problem:
  - source mappings / categories ใช้ `includeInactive` แต่ SD ล็อก `isActive`
  - recovery flow ใช้ `MAPPING_NOT_FOUND` แต่ canonical error code คือ `SOURCE_MAPPING_NOT_FOUND`
- Fix:
  - เปลี่ยน list filters เป็น `isActive`
  - เปลี่ยน recovery copy/examples ให้ใช้ `SOURCE_MAPPING_NOT_FOUND`
- Done when:
  - UX filter names และ error code ตรงกับ SD addendum

### 6. Leave date filter naming ยัง drift
- Files to edit:
  - `Documents/UX_Flow/Functions/R1-04_HR_Leave_Management.md`
  - `Documents/SD_Flow/HR/leaves.md` ถ้ายังมี wording ก้ำกึ่ง
- Canonical source:
  - `Documents/Requirements/Release_1.md`
  - `Documents/UX_API_Canonical_Field_and_Scope_Mapping.md`
- Problem:
  - UX บางจุดยังใช้ `from` / `to`
  - canonical query semantics ใช้ `dateFrom` / `dateTo`
- Fix:
  - เปลี่ยนตัวอย่าง query, form filter, และคำอธิบาย step ให้ใช้ `dateFrom` / `dateTo`
- Done when:
  - leave list filter naming ตรงกันทุกชั้น

## Priority 1 - ต้องตัดสินใจ contract ก่อน

### 7. Payroll lifecycle ยังไม่ล็อกว่า sync หรือ async
- Files to edit:
  - `Documents/Requirements/Release_1.md`
  - `Documents/SD_Flow/HR/payroll.md`
  - `Documents/UX_Flow/Functions/R1-05_HR_Payroll.md`
- Problem:
  - UX และ SD พูดถึง `jobId` / polling
  - แต่ยังไม่มี status endpoint ที่ล็อกชัด
  - SD addendum ยังใช้ `PATCH` สำหรับ `approve` / `mark-paid` ทั้งที่ inventory และ UX/Requirements ใช้ `POST`
- Fix:
  - ตัดสินใจหนึ่งแบบแล้วใช้ทั้ง 3 ชั้น:
    - แบบ A: `process` เป็น sync only
    - แบบ B: `process` รองรับ async พร้อม `jobId` และมี status endpoint ชัด
  - ถ้าเลือก async:
    - เพิ่ม endpoint สำหรับ polling เช่น `GET /api/hr/payroll/runs/:runId` หรือ endpoint status โดยเฉพาะใน Requirements + SD + UX
  - แก้ `PATCH` -> `POST` ใน `SD_Flow/HR/payroll.md` สำหรับ `approve` และ `mark-paid`
  - เติม request body ให้ครบใน Requirements:
    - `confirmProcess`
    - pre-check summary ของ approve
    - `paidAt`
- Done when:
  - lifecycle, methods, request bodies, polling behavior ถูกล็อกตรงกันทั้ง 3 ชั้น

### 8. AP payment จะรองรับ bank linkage ตอนนี้หรือยัง
- Files to edit:
  - `Documents/UX_Flow/Functions/R1-08_Finance_Accounts_Payable.md`
  - `Documents/SD_Flow/Finance/ap.md`
  - ถ้าต้องขยาย requirement เพิ่ม ให้แก้ `Documents/Requirements/Release_2.md`
- Problem:
  - UX payment modal ยังไม่มี `bankAccountId`
  - แต่ SD addendum พูดถึง bank posting / `bankTransactionId`
- Fix:
  - เลือกหนึ่งทาง:
    - ถ้าจะรองรับ bank path ตอนนี้: เพิ่ม `bankAccountId` ใน UX + SD และอ้าง source `GET /api/finance/bank-accounts/options`
    - ถ้ายังไม่รองรับ: mark bank posting เป็น `reference only` / `R2-only` ใน UX และ SD ให้ชัด
- Done when:
  - payment flow ไม่มี ambiguity ว่าต้องส่ง `bankAccountId` หรือไม่

### 9. WHT payroll-origin filter ยังไม่ลง contract
- Files to edit:
  - `Documents/SD_Flow/Finance/tax.md`
  - `Documents/UX_Flow/Functions/R2-03_Thai_Tax_VAT_WHT.md`
- Problem:
  - UX อยาก filter `sourceModule=payroll`
  - แต่ SD ยังล็อก query ของ `GET /api/finance/tax/wht-certificates` แค่ `page`, `limit`, `pndForm`, `month`, `year`
- Fix:
  - เลือกหนึ่งทาง:
    - เพิ่ม `sourceModule` หรือ `origin` เข้า SD + Requirements
    - หรือถ้าไม่เพิ่ม query จริง ให้แก้ UX ให้ใช้ canonical fallback:
      - `pndForm=PND1`
      - `month`
      - `year`
  - ฟอร์ม create WHT ต้องเติม `incomeType` ให้เป็น required field ใน UX ด้วย
- Done when:
  - payroll-origin WHT มี filter strategy เดียวกันทุกชั้น

### 10. Company settings PUT body ยัง under-spec ใน UX
- Files to edit:
  - `Documents/UX_Flow/Functions/R2-08_Company_Organization_Settings.md`
- Canonical source:
  - `Documents/SD_Flow/User_Login/settings_admin_r2.md`
- Problem:
  - UX list เฉพาะบาง field ตอน save
  - แต่ SD ล็อกว่า `PUT /api/settings/company` ใช้ field เดียวกับ `GET` ยกเว้น `id`
- Fix:
  - ขยาย step save ให้ list field ครบ:
    - `companyName`
    - `companyNameEn`
    - `taxId`
    - `address`
    - `phone`
    - `email`
    - `website`
    - `logoUrl`
    - `currency`
    - `fiscalYearStart`
    - `vatRegistered`
    - `vatNo`
    - `defaultVatRate`
    - `invoicePrefix`
    - `poPrefix`
    - `quotPrefix`
    - `soPrefix`
  - ระบุแยกให้ชัดว่า field ไหน required / optional
- Done when:
  - UX save payload ครบเท่ากับ SD contract

## Priority 1 - backend/storage gap

### 11. PM `projectId` ยังไม่มี source of truth ชัดใน Requirements
- Files to edit:
  - `Documents/Requirements/Release_1.md`
  - `Documents/SD_Flow/PM/budgets.md`
  - `Documents/SD_Flow/PM/progress.md`
  - `Documents/UX_Flow/Functions/R1-11_PM_Budget_Management.md`
  - `Documents/UX_Flow/Functions/R1-13_PM_Progress_Tasks.md`
  - `Documents/UX_Flow/Functions/R1-14_PM_Dashboard.md`
- Problem:
  - SD/UX ใช้ `projectId` ใน budget/progress/dashboard filters
  - แต่ schema ใน `Release_1.md` ของ `pm_budgets` และ `pm_progress_tasks` ยังไม่มี field นี้
- Fix:
  - ตัดสินใจที่ Requirements ก่อน:
    - ถ้าจะมี `projectId` จริง: เพิ่ม field ใน schema + business rules + API docs
    - ถ้ายังไม่มีจริงใน R1: เอา `projectId` ออกจาก UX/SD หรือ mark เป็น deployment-dependent อย่างชัดเจน
- Done when:
  - project scoping มี persistence story ที่ตรงกันทั้ง 3 ชั้น

### 12. Dashboard example ยังไม่ใส่ `meta`
- Files to edit:
  - `Documents/UX_Flow/Functions/R2-13_Global_Dashboard.md`
- Canonical source:
  - `Documents/Requirements/Release_2.md`
  - `Documents/SD_Flow/PM/global_dashboard.md`
- Problem:
  - example response ใน UX มี `finance`, `hr`, `pm`, `alerts`
  - แต่ยังไม่มี `meta.asOf`, `meta.freshnessSeconds`, `meta.permissionTrimmedModules`, `meta.widgetVisibilityMode`
- Fix:
  - เพิ่ม `meta` ในตัวอย่าง payload และ step ที่อธิบาย freshness / last updated
- Done when:
  - UX example และ rendering guidance รองรับ metadata ครบตาม SD/Requirements

### 13. Fiscal close reason / reopen semantics ยังไม่ map ชัด
- Files to edit:
  - `Documents/UX_Flow/Functions/R2-08_Company_Organization_Settings.md`
- Canonical source:
  - `Documents/SD_Flow/User_Login/settings_admin_r2.md`
- Problem:
  - close flow มีแต่ `confirmPeriodLabel`
  - SD ล็อก close body มี `reason?`
  - reopen ใช้ `reopenReason`
- Fix:
  - ระบุให้ชัดว่า:
    - `confirmPeriodLabel` เป็น FE confirmation field
    - `reason` เป็น optional API field สำหรับ close
    - `reopenReason` เป็น API field สำหรับ reopen
- Done when:
  - FE confirm fields กับ API body fields ถูกแยกบทบาทชัด

## Priority 2 - cleanup หลังแก้หลักเสร็จ

### 14. Reopen snapshot docs ที่ตอนนี้ยัง optimistic เกินจริง
- Files to edit:
  - `Documents/UX_API_Remaining_Gaps_Checklist.md`
  - `Documents/UX_API_Data_Coverage_Checklist_By_File.md`
  - ถ้าต้องการ update review summary ด้วย ให้แก้ `Documents/UX_API_Data_Coverage_Review.md`
- Problem:
  - snapshot docs ตอนนี้บอกหลายเรื่องว่า `Solved`
  - แต่ source docs ยังมี drift จริงในหลาย feature
- Fix:
  - reopen เฉพาะหัวข้อที่ยัง mismatch จริง เช่น:
    - auth password/logout body
    - audit filters
    - notification event/filter/body
    - payroll lifecycle
    - PO naming + GR payload
    - PM `projectId` persistence
  - หลังแก้ source docs ครบแล้วค่อยปิดกลับเป็น `Solved`
- Done when:
  - snapshot status สะท้อน source docs ปัจจุบันจริง ไม่ใช่สถานะเป้าหมาย

## Quick Replacement List

ใช้ list นี้เป็น checklist สำหรับแก้ชื่อ field/query ที่ drift เร็ว ๆ

- `userId` -> `actorId` ใน audit filters
- `dateFrom` / `dateTo` -> `startDate` / `endDate` ใน audit filters
- `type` -> `eventType` ใน notifications
- `dateRange` -> `dateFrom` / `dateTo` ที่ API boundary
- `poDate` -> `issueDate`
- `expectedDate` -> `expectedDeliveryDate`
- `changeReason` -> `reason`
- `purchaseOrderId` -> `poId`
- `MAPPING_NOT_FOUND` -> `SOURCE_MAPPING_NOT_FOUND`
- `from` / `to` -> `dateFrom` / `dateTo` ใน leave filters
- `confirmNewPassword` -> submit as `confirmPassword`

## Suggested Working Plan
1. แก้ UX-only mismatches ก่อน:
   - `R1-01`
   - `R2-10`
   - `R2-12`
   - `R2-13`
   - `R2-08`
   - `R1-09`
   - `R1-04`
2. จากนั้นแก้ contract decisions:
   - `R1-05` + `SD_Flow/HR/payroll.md` + `Requirements/Release_1.md`
   - `R1-08` + `SD_Flow/Finance/ap.md`
   - `R2-03` + `SD_Flow/Finance/tax.md`
   - `R2-06` + จุดเชื่อม `R1-08`
3. ตัดสินใจเรื่อง storage/schema:
   - PM `projectId` ใน `Release_1.md`
4. ปิดท้ายด้วย update snapshot docs

## Completion Rule
ถือว่าปิดหนึ่งหัวข้อได้เมื่อครบทั้ง 3 ข้อ:
- `Requirements` ระบุ canonical field / behavior / persistence
- `SD_Flow` ระบุ request/response/query/body/error ที่ใช้ implement ได้จริง
- `UX_Flow` ใช้ชื่อ field, source endpoint, และ step behavior ตรงกับสองชั้นบน
