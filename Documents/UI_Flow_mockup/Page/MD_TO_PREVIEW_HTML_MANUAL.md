# คู่มือ: แปลง page spec (`.md`) → static preview (`.preview.html`)

เอกสารนี้เป็นแกนสำหรับทุกโฟลเดอร์ใต้ `Documents/UI_Flow_mockup/Page/` — ใช้คู่กับ [`_PAGE_SPEC_TEMPLATE.md`](./_PAGE_SPEC_TEMPLATE.md) และ [`UX_TO_UI_SPEC_WORKFLOW.md`](../UX_TO_UI_SPEC_WORKFLOW.md)

## หลักการ

| หลักการ | รายละเอียด |
|---------|-------------|
| **1 spec = 1 preview** | ไฟล์ `FooBar.md` คู่กับ `FooBar.preview.html` ในโฟลเดอร์เดียวกัน |
| **Static เท่านั้น** | ไม่เรียก API; ใช้ checkbox/radio สลับสถานะ |
| **Design tokens** | ลิงก์ [`_Shared/preview-base.css`](./_Shared/preview-base.css) — หลีกเลี่ยงสีแบบฮาร์ดโค้ดใน markup ยกเว้นจำเป็น |
| **สอดคล้อง UX spec** | อ่านส่วน **Preview HTML notes** ในไฟล์ `.md` เป็นบลูปรินต์หลัก |

## ขั้นตอนแปลง (checklist)

1. **อ่าน metadata ใน `.md`** — Route, shell type (`standalone` / `app` / `modal`), regions, สถานะที่ต้อง mock
2. **เลือกโครง HTML**
   - `standalone`: พื้นหลังเต็มจอ (เช่น login) — ดู [`R1-01_Auth_Login_and_Session/Login.preview.html`](./R1-01_Auth_Login_and_Session/Login.preview.html)
   - `app`: [`_Shared/AppShell.preview.html`](./_Shared/AppShell.preview.html) หรือคัดลอกโครง `.shell` + sidebar + header มาเฉพาะที่จำเป็น
   - `modal`: `.modal-backdrop` + `.modal-dialog` ใน `preview-base.css`
3. **สร้างไฟล์** `<ชื่อเดียวกับ md>.preview.html` พร้อม:
   - `<html lang="th">`, charset, viewport
   - `<title>… — Preview</title>`
   - `<link rel="stylesheet" href="../_Shared/preview-base.css" />` (ปรับ `../` ตามความลึกของโฟลเดอร์)
4. **ใส่แผงควบคุม (แนะนำ)** — `control-panel` เหมือนตัวอย่าง Login เพื่อสลับ loading / error / dark mode
5. **อัปเดตแถว Preview ใน `.md`** — ลิงก์ไปยัง `.preview.html` และ `preview-base.css` (และ AppShell ถ้าอ้าง)

## โครงสร้างไฟล์ที่แนะนำ

```text
Page/
  _Shared/
    preview-base.css
    AppShell.preview.html
  Some_Module/
    FeaturePage.md
    FeaturePage.preview.html
```

## Path ของ CSS

| ตำแหน่ง spec | `href` |
|---------------|--------|
| `Page/R1-xx_*/PageName.preview.html` | `../_Shared/preview-base.css` |
| ถ้าอยู่ลึกกว่านั้น (ไม่แนะนำ) | เพิ่ม `../` ให้ถึง `Page/` แล้วต่อ `_Shared/...` |

ไฟล์ [`_Shared/AppShell.preview.html`](./_Shared/AppShell.preview.html) ใช้ `href="preview-base.css"` เพราะอยู่โฟลเดอร์เดียวกับ CSS

## Class ที่ใช้บ่อย (จาก `preview-base.css`)

- ปุ่ม: `.btn`, `.btn-primary`, `.btn-danger`, `.btn-sm`
- ฟอร์ม: `.label`, `.input`, `.field`, `.hint`, `.error-text`
- Shell: `.shell`, `.sidebar`, `.header-bar`, `.main-content`
- Modal: `.modal-backdrop`, `.modal-dialog`, `.modal-dialog__head|__body|__foot`
- โหลด: `.skeleton-line`, `.skeleton-stack`, `.overlay-busy`, `.spinner`
- แบนเนอร์ dev: `.preview-banner`, `.preview-toggle`

## การอัปเดต `_PAGE_SPEC_TEMPLATE.md`

เมื่อสร้าง spec ใหม่ ให้ใส่แถว **Preview** ใน Metadata ชี้ไปที่ `*.preview.html` และเก็บส่วน **Preview HTML notes** ให้ครบ เพื่อคนเขียน HTML ไม่ต้องเดา shell/สถานะ

## ตัวอย่างอ้างอิงใน repo

| ไฟล์ | Shell / รูปแบบ |
|------|----------------|
| [`R1-01_Auth_Login_and_Session/Login.preview.html`](./R1-01_Auth_Login_and_Session/Login.preview.html) | `standalone` + ฟอร์ม + สถานะ session/error/loading |
| [`R1-01_Auth_Login_and_Session/ChangePassword.preview.html`](./R1-01_Auth_Login_and_Session/ChangePassword.preview.html) | `modal` + ฟอร์ม 3 ช่อง + submitting / inline error / toast |
| [`R1-01_Auth_Login_and_Session/LogoutConfirm.preview.html`](./R1-01_Auth_Login_and_Session/LogoutConfirm.preview.html) | `modal` + toggle ทุกอุปกรณ์ + submitting |
| [`R1-01_Auth_Login_and_Session/SessionBootstrap.preview.html`](./R1-01_Auth_Login_and_Session/SessionBootstrap.preview.html) | `app` + skeleton + overlay + error retry |
| [`_Shared/AppShell.preview.html`](./_Shared/AppShell.preview.html) | Shell มาตรฐานสำหรับคัดลอกโครง |

---

*ลบส่วนที่ไม่ใช้ใน preview ได้ แต่ควรเก็บแผงควบคุมสถานะไว้ถ้าช่วยให้ทีมเห็นพฤติกรรมตาม UX*
