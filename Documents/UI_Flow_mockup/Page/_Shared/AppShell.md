# App Shell (Authenticated Layout)

ถอดจาก `erp_frontend/src/shared/components/layout/AppShell.tsx`, `Header.tsx`, `Sidebar.tsx`

---



## Spec metadata (UX → preview)

| Key | Value |
|-----|-------|
| **UX flow** | [`R1-01_Auth_Login_and_Session.md`](../../../UX_Flow/Functions/R1-01_Auth_Login_and_Session.md) |
| **UX reference** | หลัง login — E2E `SCR3` Protected App Shell; Sub-flow session & navigation ใน R1-01 |
| **Design system** | [`design-system.md`](../../design-system.md) |
| **Global FE behaviors** | [`_GLOBAL_FRONTEND_BEHAVIORS.md`](../../../UX_Flow/_GLOBAL_FRONTEND_BEHAVIORS.md) |

---
## 1) พฤติกรรม

- ถ้าไม่ login → redirect ไป `/login`
- ถ้า login → แสดง `Sidebar` + คอลัมน์ขวา (`Header` + `main` + `<Outlet />`)

---

## 2) โครงร่างหลัก (`AppShell`)

- Root: `flex h-screen overflow-hidden bg-background`
- `AuthHydrate` (hydrate auth)
- `Sidebar` — ความกว้าง `w-56 shrink-0 border-r`
- คอลัมน์ขวา: `flex flex-1 flex-col overflow-hidden`
  - `Header` — `h-16 shrink-0 border-b bg-card px-6`
  - `main` — `flex-1 overflow-y-auto p-6` รองรับ scroll เนื้อหาหน้า

---

## 3) Sidebar

- พื้นหลัง dark: `bg-zinc-900 text-zinc-100`
- หัวแบรนด์: ไอคอน `Briefcase` ในกล่อง `rounded-lg bg-primary`, ชื่อ `app.name`, บรรทัดรอง "SME Edition"
- Navigation: กลุ่ม HR / PM / Finance / Settings — ปุ่ม toggle เปิด-ปิดกลุ่ม (`ChevronDown` rotate)
- รายการลิงก์: `NavLink` ไป path ตาม `navGroups` (HR บางรายการ filter ด้วย permission)
- ท้าย sidebar: ปุ่ม logout (`LogOut`)

---

## 4) Header

- ชื่อหน้า: `useRouteTitle()` → `text-lg font-semibold`
- ขวา: ปุ่ม notification (`Bell` + จุดแดง `bg-destructive`), dropdown บัญชีผู้ใช้ (Radix)
  - รายการ: เปลี่ยนรหัสผ่าน → เปิด `ChangePasswordModal`

---

## 5) i18n

- Sidebar/Header ใช้ namespace `common` (`useTranslation('common')`)

---

## 6) Component tree (ย่อ)

1. AppShell  
2. Sidebar (brand + nav groups + logout)  
3. Column: Header (title + notif + user menu)  
4. `main` → child route (`Outlet`)

---

## 7) Preview

เปิดไฟล์ [AppShell.preview.html](./AppShell.preview.html) (สไตล์: [preview-base.css](./preview-base.css))
