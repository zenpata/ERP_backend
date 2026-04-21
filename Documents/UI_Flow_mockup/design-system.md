# ERP Frontend Design System (Main Reference)

เอกสารนี้สรุปจากโค้ดจริงใน `erp_frontend` เพื่อใช้เป็นมาตรฐานหลักสำหรับสร้างหน้าใหม่ในอนาคต  
เทคสแต็กหลัก: Tailwind CSS + CSS Variables (token-driven)

---

## 1) Foundation Tokens

### 1.1 Color Tokens (Semantic)
ใช้ semantic token เท่านั้นในการทำ UI ทั่วไป (หลีกเลี่ยง hard-coded color ถ้าไม่จำเป็น)

- `background`, `foreground`
- `card`, `card-foreground`
- `primary`, `primary-foreground`
- `secondary`, `secondary-foreground`
- `muted`, `muted-foreground`
- `accent`, `accent-foreground`
- `destructive`, `destructive-foreground`
- `border`, `input`, `ring`

รองรับ Light/Dark mode ผ่าน `.dark` โดยเปลี่ยนค่า CSS variable ที่ root

### 1.2 Radius Tokens
- Global base radius: `--radius = 0.5rem` (8px)
- Tailwind mapping:
  - `rounded-lg` = `var(--radius)` (8px)
  - `rounded-md` = `calc(var(--radius) - 2px)` (6px)
  - `rounded-sm` = `calc(var(--radius) - 4px)` (4px)

นอกจากนี้ในโปรเจกต์มีการใช้ `rounded-xl` และ `rounded-2xl` สำหรับ container/card ที่ต้องการ visual emphasis

### 1.3 Typography Foundation
- Font หลักทั้งระบบ: `'Sarabun', 'Noto Sans Thai', system-ui, sans-serif`
- น้ำหนักที่ใช้บ่อย:
  - `font-bold` (หัวข้อสำคัญ/KPI)
  - `font-semibold` (section title/header)
  - `font-medium` (label/button/table header บางกรณี)
- ขนาดตัวอักษรที่ใช้จริง:
  - `text-xs` (helper/meta/badge)
  - `text-sm` (default body, form, table)
  - `text-lg` (header title รอง)
  - `text-xl`, `text-2xl` (KPI/page hero numbers)

> ข้อกำหนด: หน้าใหม่ให้ใช้ `text-sm` เป็น body default เสมอ ยกเว้นหัวข้อหรือ KPI

---

## 2) Spacing System

โปรเจกต์อิง spacing scale ของ Tailwind (4px base) และใช้ค่าซ้ำชัดเจน

### 2.1 Spacing ที่ใช้บ่อย
- Internal padding card/section: `p-4`, `p-5`, `p-6`
- Page/content spacing: `space-y-6`
- กลุ่มฟอร์ม/element ใน section: `space-y-4`, `gap-4`
- Field stack: `space-y-1`
- Compact action: `gap-1`, `gap-1.5`, `gap-2`
- Table cell spacing มาตรฐาน: `px-4 py-3`
- Input หลัก: `px-3 py-2` หรือ `py-2.5` (login)

### 2.2 Layout Spacing
- Main shell content: `main` ใช้ `p-6`
- Header bar: `h-16`, `px-6`
- Sidebar width: `w-56`

---

## 3) Page Layout Patterns (ต้องใช้เป็นมาตรฐาน)

### 3.1 Page Root Pattern
โครงหน้า list/form ใหม่ให้ใช้:

- Root: `div.space-y-6` (หรือ `space-y-4` เมื่อหน้า dense)
- ส่วนบน: `PageHeader` (title + optional actions)
- ส่วน content: card/section แยกชัดเจนด้วย `rounded-xl border bg-card`

### 3.2 Section Card Pattern
ใช้กับ form section, dashboard blocks, grouped content:

- Container: `rounded-xl border bg-card`
- Section header (ถ้ามี): `border-b bg-muted/40 px-5 py-3`
- Section body: `p-4` หรือ `p-5`

### 3.3 KPI/Stat Card Pattern
- Card: `rounded-xl border bg-card p-4`
- Value: `text-xl` หรือ `text-2xl font-bold`
- Label/Subtext: `text-sm` หรือ `text-xs text-muted-foreground`

---

## 4) Component Rules

### 4.1 Page Header
ใช้ `PageHeader` เป็นค่ามาตรฐาน

- Title: `text-2xl font-semibold tracking-tight`
- Description: `text-sm text-muted-foreground`
- Action group: `flex items-center gap-2`

### 4.2 Buttons
#### Primary Button
- Base: `rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground`
- Hover: `hover:bg-primary/90`
- Disabled: `disabled:opacity-50`

#### Secondary/Outline Button
- Base: `rounded-md border border-input px-4 py-2 text-sm font-medium`
- Hover: `hover:bg-muted` หรือ `hover:bg-accent`

#### Icon Button
- Base: `rounded-md p-1.5` หรือ `rounded-lg p-2`
- สีเริ่มต้น: `text-muted-foreground`
- Hover: `hover:bg-accent` + (optionally) `hover:text-foreground`

### 4.3 Status Badge
ใช้ `StatusBadge` component เท่านั้น

- Shape: `rounded-full px-2.5 py-0.5 text-xs font-medium`
- Variant:
  - `default` (secondary)
  - `success` (green)
  - `warning` (yellow)
  - `destructive` (red semantic)
  - `outline`

### 4.4 Breadcrumb
- Base: `mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground`
- Active item: `font-medium text-foreground`

---

## 5) Form Style Rules

### 5.1 Form Container
- มาตรฐานหลัก: `space-y-4 rounded-xl border bg-card p-6` (single panel)
- หรือหลาย section: `space-y-6` + section card pattern

### 5.2 Field Structure
รูปแบบมาตรฐาน:

- Wrapper: `div` หรือ `label.block.space-y-1.text-sm`
- Label: `text-sm font-medium text-foreground`
- Required mark: `text-destructive`
- Error text: `mt-1 text-xs text-destructive`
- Hint/meta: `text-xs text-muted-foreground`

### 5.3 Input / Select / Textarea
#### Recommended standard (บังคับใช้กับหน้าใหม่)
- `w-full rounded-md border border-input bg-background px-3 py-2 text-sm`

#### Focus state
- ถ้าเป็นช่อง search หรือช่องที่ต้องเน้น interaction:
  - `focus:outline-none focus:ring-2 focus:ring-ring`

#### Disabled
- `disabled:opacity-60` (หรือ `disabled:opacity-50` ตามบริบท)

### 5.4 Form Grid
- โครงสองคอลัมน์หลัก: `grid gap-4 md:grid-cols-2`
- บางหน้า responsive filter: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`

---

## 6) Table Style Rules

### 6.1 Standard DataTable (แนะนำให้ใช้ก่อน)
ใช้ `DataTable` component เป็น default สำหรับตารางทั่วไป

- Wrapper: `w-full overflow-auto rounded-md border`
- Table text: `text-sm`
- Header row: `border-b bg-muted/50`
- Header cell: `px-4 py-3 text-left font-medium text-muted-foreground`
- Body row: `border-b transition-colors hover:bg-muted/50`
- Body cell: `px-4 py-3`
- Empty state row: `h-24 text-center text-muted-foreground`
- Clickable row: เพิ่ม `cursor-pointer`

### 6.2 Custom Table (กรณีพิเศษ)
ถ้าต้อง custom sorting/action inline:

- ต้องคง typography/spacing ใกล้ DataTable (`text-sm`, `px-4 py-3`)
- ต้องมี hover row state
- ต้องมี empty state ที่อ่านง่าย

---

## 7) Feedback & State Patterns

### 7.1 Error Alert
- Pattern มาตรฐาน:
  - `rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive`
- ข้อความ error field-level ใช้ `text-xs text-destructive`

### 7.2 Success/Info Banner
- Success มักใช้ emerald tone ใน modal/form:
  - `rounded-md border ... bg-emerald-... text-sm`
- Info/Warning ใช้ amber tone ตามบริบท (เช่น session expired)

### 7.3 Loading/Empty
- Loading block: center + `text-sm text-muted-foreground`
- Empty table/list: `text-muted-foreground` + ระยะหายใจชัดเจน (`py-6`/`h-24`)

---

## 8) Navigation / Shell Rules

### 8.1 App Shell
- โครงหลัก: `flex h-screen overflow-hidden bg-background`
- Sidebar fixed left + content column
- Main content scroll ภายใน `main` (`overflow-y-auto`)

### 8.2 Sidebar
- ธีม sidebar ใช้ dark surface (`bg-zinc-900 text-zinc-100`) แยกจาก page background
- Group title เป็น uppercase + small tracking (`text-xs uppercase tracking-wider`)
- Active menu: `bg-primary text-primary-foreground`

### 8.3 Header
- Header bar: `h-16 border-b bg-card px-6`
- Title: `text-lg font-semibold`

---

## 9) สิ่งที่มีอยู่แล้ว + สิ่งที่ยังไม่สม่ำเสมอ

### มีอยู่แล้ว (ใช้ต่อได้ทันที)
- Semantic color tokens ครบพื้นฐาน (light/dark)
- Card/table/form pattern ชัดในหลายโมดูล
- `PageHeader`, `DataTable`, `StatusBadge` เป็น reusable component ที่ควรยึดเป็นมาตรฐาน

### ยังไม่สม่ำเสมอ (ควรปรับในงานใหม่)
- ฟอร์มบางหน้าใช้ `border` เฉยๆ ไม่ใส่ `border-input`/`bg-background`
- Focus ring ยังใช้ไม่ครบทุก input
- Radius มีทั้ง `md/lg/xl/2xl` ปะปน (ควรนิยามตามประเภท component ให้ตายตัว)
- มีการใช้ `bg-popover` และ `text-popover-foreground` แต่ยังไม่เห็น token ประกาศในไฟล์ token หลัก

---

## 10) Rule บังคับสำหรับหน้าใหม่ (TL;DR)

1. ใช้ `PageHeader` ทุกหน้า
2. ใช้ `space-y-6` เป็น page rhythm เริ่มต้น
3. ใช้ card pattern: `rounded-xl border bg-card` สำหรับ section หลัก
4. ใช้ input มาตรฐาน: `rounded-md border border-input bg-background px-3 py-2 text-sm`
5. ใส่ focus state (`focus:ring-2 focus:ring-ring`) กับ input/search ที่มี interaction
6. ใช้ `DataTable` ก่อนเสมอ ถ้า requirement ไม่พิเศษ
7. ใช้สีผ่าน semantic tokens (`primary`, `muted`, `destructive`, ฯลฯ) ไม่ hard-code สี
8. ใช้ error/alert pattern เดียวกันทั้งระบบ
9. ใช้ `StatusBadge` แสดงสถานะ หลีกเลี่ยง badge แบบเขียนเอง
10. รักษา typography scale โดยให้ body default เป็น `text-sm`

---

## 11) Starter Snippets (นำไปใช้ได้ทันที)

### Page Skeleton
```tsx
<div className="space-y-6">
  <PageHeader title="Page Title" actions={<button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Create</button>} />
  <section className="rounded-xl border bg-card p-6">
    {/* content */}
  </section>
</div>
```

### Standard Form Field
```tsx
<label className="block space-y-1 text-sm">
  <span className="font-medium text-foreground">Label</span>
  <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
  <p className="text-xs text-destructive">Error message</p>
</label>
```

### Standard Error Alert
```tsx
<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
  เกิดข้อผิดพลาด กรุณาลองใหม่
</p>
```
