import { useState } from "react";
import {
  Users, Building2, Settings, DollarSign, BarChart3,
  ChevronRight, ChevronDown, Search, Plus, Eye, Edit2,
  Trash2, LogOut, Bell, TrendingUp, Briefcase, Clock,
  CheckCircle, AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────
const mockEmployees = [
  { id: 1, code: "EMP-001", name_th: "สมชาย ใจดี", dept: "Engineering", position: "Senior Dev", type: "monthly", status: "active", hire_date: "2023-01-15" },
  { id: 2, code: "EMP-002", name_th: "สมหญิง รักดี", dept: "HR", position: "HR Manager", type: "monthly", status: "active", hire_date: "2022-06-01" },
  { id: 3, code: "EMP-003", name_th: "มานพ ขยัน", dept: "Finance", position: "Accountant", type: "monthly", status: "active", hire_date: "2024-03-10" },
  { id: 4, code: "EMP-004", name_th: "สุดา มีชัย", dept: "Engineering", position: "QA Engineer", type: "contract", status: "active", hire_date: "2024-07-01" },
  { id: 5, code: "EMP-005", name_th: "ประเสริฐ ดีงาม", dept: "PM", position: "Project Manager", type: "monthly", status: "resigned", hire_date: "2021-09-15" },
];

const mockBudgets = [
  { id: "BDG-001", project: "ERP Phase 1 — HR Module", total: 500000, type: "Fixed Price", status: "Active", module: ["HR"], owner: "สมชาย ใจดี", start: "2026-04-01", end: "2026-09-30", spent: 125000 },
  { id: "BDG-002", project: "ERP Phase 1 — Finance Module", total: 750000, type: "Time & Material", status: "Approved", module: ["Finance"], owner: "มานพ ขยัน", start: "2026-05-01", end: "2026-11-30", spent: 0 },
  { id: "BDG-003", project: "ERP Integration & UAT", total: 200000, type: "Fixed Price", status: "Draft", module: ["Integration", "PM"], owner: "สมชาย ใจดี", start: "2026-10-01", end: "2026-12-31", spent: 0 },
];

const mockExpenses = [
  { id: "EXP-001", name: "Server Infrastructure", budget: "BDG-001", amount: 80000, date: "2026-04-05", category: "Software/License", method: "Transfer", status: "Paid", requested_by: "สมชาย ใจดี" },
  { id: "EXP-002", name: "UX Consultant", budget: "BDG-001", amount: 45000, date: "2026-04-10", category: "Labor", method: "Transfer", status: "Approved", requested_by: "สมชาย ใจดี" },
  { id: "EXP-003", name: "Training Workshop", budget: "BDG-001", amount: 15000, date: "2026-04-12", category: "Training", method: "Cash", status: "Pending Approval", requested_by: "สมหญิง รักดี" },
  { id: "EXP-004", name: "Office Supplies", budget: "BDG-001", amount: 3500, date: "2026-04-08", category: "Office Supply", method: "Cash", status: "Draft", requested_by: "มานพ ขยัน" },
];

const mockTasks = [
  { id: "TSK-001", task: "Employee CRUD API", module: "HR", phase: "Development", status: "Done", priority: "High", progress: 100, start: "2026-04-01", target: "2026-04-10", assignee: "สมชาย ใจดี" },
  { id: "TSK-002", task: "Leave Management UI", module: "HR", phase: "Development", status: "In Progress", priority: "High", progress: 65, start: "2026-04-08", target: "2026-04-20", assignee: "สุดา มีชัย" },
  { id: "TSK-003", task: "Budget Module API", module: "Finance", phase: "Development", status: "In Progress", priority: "Medium", progress: 40, start: "2026-04-05", target: "2026-04-25", assignee: "สมชาย ใจดี" },
  { id: "TSK-004", task: "Expense Approval Flow", module: "PM", phase: "Design", status: "Not Started", priority: "Medium", progress: 0, start: "2026-04-15", target: "2026-05-01", assignee: "ประเสริฐ ดีงาม" },
  { id: "TSK-005", task: "DB Schema & Migration", module: "HR", phase: "Development", status: "Done", priority: "High", progress: 100, start: "2026-03-25", target: "2026-04-05", assignee: "สมชาย ใจดี" },
];

// ─────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────
const statusColors = {
  active: "bg-green-100 text-green-700",
  Active: "bg-green-100 text-green-700",
  Done: "bg-green-100 text-green-700",
  Paid: "bg-green-100 text-green-700",
  resigned: "bg-gray-100 text-gray-500",
  terminated: "bg-red-100 text-red-600",
  "Not Started": "bg-gray-100 text-gray-500",
  "In Progress": "bg-blue-100 text-blue-700",
  "On Hold": "bg-yellow-100 text-yellow-700",
  Draft: "bg-gray-100 text-gray-600",
  Approved: "bg-blue-100 text-blue-700",
  "Pending Approval": "bg-yellow-100 text-yellow-700",
  Rejected: "bg-red-100 text-red-600",
  Closed: "bg-gray-100 text-gray-400",
  monthly: "bg-indigo-100 text-indigo-700",
  contract: "bg-orange-100 text-orange-700",
  daily: "bg-cyan-100 text-cyan-700",
  inactive: "bg-gray-100 text-gray-400",
};

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-600"}`}>
    {status}
  </span>
);

const PriorityBadge = ({ priority }) => {
  const map = { High: "bg-red-100 text-red-600", Medium: "bg-yellow-100 text-yellow-700", Low: "bg-gray-100 text-gray-500" };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[priority] || "bg-gray-100 text-gray-500"}`}>{priority}</span>;
};

const ProgressBar = ({ value }) => (
  <div className="flex items-center gap-2 min-w-24">
    <div className="flex-1 bg-gray-200 rounded-full h-2">
      <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${value}%` }} />
    </div>
    <span className="text-xs text-gray-500 w-7 text-right">{value}%</span>
  </div>
);

const Field = ({ label, type = "text", placeholder, required, hint, span2 }) => (
  <div className={span2 ? "col-span-2" : ""}>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {type === "textarea" ? (
      <textarea rows={3} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    ) : type === "select" ? (
      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
        <option value="">— เลือก —</option>
        {placeholder && placeholder.split(",").map(o => <option key={o.trim()}>{o.trim()}</option>)}
      </select>
    ) : (
      <input type={type} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
    )}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const Card = ({ title, children, action }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    {title && (
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {action}
      </div>
    )}
    {children}
  </div>
);

const FormCard = ({ title, children }) => (
  <Card title={title}>
    <div className="p-5 grid grid-cols-2 gap-4">{children}</div>
  </Card>
);

const Breadcrumb = ({ items, setCurrentPage }) => (
  <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-1.5">
        {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
        {item.page ? (
          <button onClick={() => setCurrentPage(item.page)} className="hover:text-blue-600">{item.label}</button>
        ) : (
          <span className="text-gray-900 font-medium">{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);

const Table = ({ headers, children, footer }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          {headers.map(h => (
            <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
    {footer && <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">{footer}</div>}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", icon: Icon }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "border border-gray-300 text-gray-600 hover:bg-gray-50",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "text-gray-400 hover:text-blue-600 hover:bg-blue-50",
    success: "bg-green-600 hover:bg-green-700 text-white",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", icon: "p-1.5" };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-lg font-medium transition-colors ${variants[variant]} ${sizes[size]}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Briefcase className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ERP System</h1>
        <p className="text-gray-400 text-sm mt-1">สำหรับ SME ไทย · Modular Edition</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" defaultValue="admin@company.com" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" defaultValue="••••••••" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={onLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
          เข้าสู่ระบบ
        </button>
      </div>
      <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-400 space-y-0.5">
        <div className="font-semibold text-gray-500 mb-1">Demo Accounts</div>
        <div>admin@erp.com — super_admin</div>
        <div>hr@erp.com — hr_admin</div>
        <div>emp@erp.com — employee</div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
const NAV = [
  { key: "hr", label: "HR Module", icon: Users, children: [
    { key: "hr-employees", label: "รายชื่อพนักงาน" },
    { key: "hr-org", label: "แผนก & ตำแหน่ง" },
  ]},
  { key: "pm", label: "PM Module", icon: BarChart3, children: [
    { key: "pm-dashboard", label: "Dashboard" },
    { key: "pm-budgets", label: "Budget" },
    { key: "pm-expenses", label: "Expense" },
    { key: "pm-progress", label: "Progress" },
  ]},
  { key: "settings", label: "Settings", icon: Settings, children: [
    { key: "settings-users", label: "จัดการ User" },
    { key: "settings-roles", label: "Roles & Permissions" },
  ]},
];

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const [open, setOpen] = useState({ hr: true, pm: true, settings: false });
  return (
    <aside className="w-56 bg-gray-900 flex flex-col flex-shrink-0 h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">ERP System</div>
            <div className="text-xs text-gray-400">SME Edition</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {NAV.map(g => (
          <div key={g.key}>
            <button
              onClick={() => setOpen(s => ({ ...s, [g.key]: !s[g.key] }))}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-400 hover:text-gray-200 uppercase tracking-wider"
            >
              <div className="flex items-center gap-2"><g.icon className="w-3.5 h-3.5" />{g.label}</div>
              <ChevronDown className={`w-3 h-3 transition-transform ${open[g.key] ? "rotate-180" : ""}`} />
            </button>
            {open[g.key] && g.children.map(item => (
              <button
                key={item.key}
                onClick={() => setCurrentPage(item.key)}
                className={`w-full text-left px-6 py-2 text-sm transition-colors ${
                  currentPage === item.key
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >{item.label}</button>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-700/60">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">สม</div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">สมชาย ใจดี</div>
            <div className="text-xs text-gray-400">super_admin</div>
          </div>
        </div>
        <button className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200">
          <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
        </button>
      </div>
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────
const PAGE_LABELS = {
  "hr-employees": "รายชื่อพนักงาน",
  "hr-employee-form": "เพิ่ม / แก้ไขพนักงาน",
  "hr-employee-profile": "โปรไฟล์พนักงาน",
  "hr-org": "แผนก & ตำแหน่ง",
  "pm-dashboard": "PM Dashboard",
  "pm-budgets": "Project Budget",
  "pm-budget-form": "สร้าง Budget",
  "pm-budget-detail": "Budget Detail",
  "pm-expenses": "Expense Records",
  "pm-expense-form": "เพิ่ม Expense",
  "pm-progress": "Project Progress",
  "pm-task-form": "สร้าง Task",
  "settings-users": "จัดการ User",
  "settings-roles": "Roles & Permissions",
};

const Header = ({ currentPage }) => (
  <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
    <h1 className="text-lg font-semibold text-gray-900">{PAGE_LABELS[currentPage] || currentPage}</h1>
    <div className="flex items-center gap-3">
      <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>
      <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">สม</div>
    </div>
  </header>
);

// ─────────────────────────────────────────────────────────────
// HR: EMPLOYEE LIST
// ─────────────────────────────────────────────────────────────
const HrEmployeesPage = ({ setCurrentPage }) => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = mockEmployees.filter(e =>
    (status === "all" || e.status === status) &&
    (e.name_th.includes(search) || e.code.includes(search))
  );

  const stats = [
    { label: "ทั้งหมด", value: mockEmployees.length, color: "text-blue-600" },
    { label: "Active", value: mockEmployees.filter(e => e.status === "active").length, color: "text-green-600" },
    { label: "Contract", value: mockEmployees.filter(e => e.type === "contract").length, color: "text-orange-500" },
    { label: "Resigned", value: mockEmployees.filter(e => e.status === "resigned").length, color: "text-gray-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, รหัสพนักงาน..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
          <option value="all">สถานะทั้งหมด</option>
          <option value="active">Active</option>
          <option value="resigned">Resigned</option>
          <option value="terminated">Terminated</option>
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
          <option>แผนกทั้งหมด</option>
          <option>Engineering</option>
          <option>HR</option>
          <option>Finance</option>
        </select>
        <Btn icon={Plus} onClick={() => setCurrentPage("hr-employee-form")}>เพิ่มพนักงาน</Btn>
      </div>

      {/* Table */}
      <Card>
        <Table
          headers={["รหัส", "ชื่อ-นามสกุล", "แผนก", "ตำแหน่ง", "ประเภท", "วันเริ่มงาน", "สถานะ", "Actions"]}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">แสดง {filtered.length} จาก {mockEmployees.length} รายการ</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100">ก่อนหน้า</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
                <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100">ถัดไป</button>
              </div>
            </div>
          }
        >
          {filtered.map((emp, i) => (
            <tr key={emp.id} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? "bg-gray-50/40" : ""}`}>
              <td className="px-4 py-3 text-xs font-mono text-gray-500">{emp.code}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">{emp.name_th[0]}</div>
                  <span className="text-sm font-medium text-gray-900">{emp.name_th}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{emp.dept}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{emp.position}</td>
              <td className="px-4 py-3"><StatusBadge status={emp.type} /></td>
              <td className="px-4 py-3 text-xs text-gray-400">{emp.hire_date}</td>
              <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-0.5">
                  <Btn variant="ghost" size="icon" onClick={() => setCurrentPage("hr-employee-profile")}><Eye className="w-4 h-4" /></Btn>
                  <Btn variant="ghost" size="icon" onClick={() => setCurrentPage("hr-employee-form")}><Edit2 className="w-4 h-4" /></Btn>
                  <Btn variant="ghost" size="icon"><Trash2 className="w-4 h-4" /></Btn>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HR: EMPLOYEE FORM
// ─────────────────────────────────────────────────────────────
const HrEmployeeFormPage = ({ setCurrentPage }) => (
  <div className="space-y-4 max-w-3xl">
    <Breadcrumb items={[{ label: "รายชื่อพนักงาน", page: "hr-employees" }, { label: "เพิ่มพนักงานใหม่" }]} setCurrentPage={setCurrentPage} />

    <FormCard title="ข้อมูลส่วนตัว">
      <Field label="รหัสพนักงาน" placeholder="Auto-generated" hint="ระบบจะสร้างให้อัตโนมัติ (EMP-xxx)" />
      <Field label="เลขบัตรประชาชน" placeholder="1234567890123" required hint="13 หลัก ไม่มีขีด" />
      <Field label="ชื่อ (ภาษาไทย)" placeholder="สมชาย" required />
      <Field label="นามสกุล (ภาษาไทย)" placeholder="ใจดี" required />
      <Field label="ชื่อ (English)" placeholder="Somchai" />
      <Field label="นามสกุล (English)" placeholder="Jaidee" />
      <Field label="ชื่อเล่น" placeholder="ชาย" />
      <Field label="วันเกิด" type="date" />
      <Field label="เพศ" type="select" placeholder="ชาย, หญิง, อื่น ๆ" required />
      <Field label="เบอร์โทร" placeholder="081-234-5678" />
      <Field label="Email" type="email" placeholder="somchai@company.com" />
      <Field label="ที่อยู่" type="textarea" placeholder="บ้านเลขที่, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด รหัสไปรษณีย์" span2 />
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">รูปโปรไฟล์</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center text-sm text-gray-400 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-colors">
          คลิกเพื่ออัปโหลดรูปภาพ (JPG, PNG ขนาดไม่เกิน 2MB)
        </div>
      </div>
    </FormCard>

    <FormCard title="ข้อมูลการทำงาน">
      <Field label="แผนก" type="select" placeholder="Engineering, HR, Finance, PM" required />
      <Field label="ตำแหน่ง" type="select" placeholder="Senior Dev, HR Manager, Accountant" required />
      <Field label="ประเภทพนักงาน" type="select" placeholder="monthly, daily, contract" required />
      <Field label="วันที่เริ่มงาน" type="date" required />
      <Field label="วันสิ้นสุดสัญญา" type="date" hint="สำหรับ contract เท่านั้น" />
      <Field label="หัวหน้างาน" type="select" placeholder="สมหญิง รักดี, ประเสริฐ ดีงาม" />
      <Field label="สถานะพนักงาน" type="select" placeholder="active, resigned, terminated, inactive" required />
    </FormCard>

    <FormCard title="ข้อมูลการเงิน">
      <Field label="เงินเดือนพื้นฐาน (THB)" type="number" placeholder="25,000" required />
      <Field label="ธนาคาร" type="select" placeholder="กสิกร, กรุงเทพ, ไทยพาณิชย์, กรุงไทย, ทหารไทย" />
      <Field label="เลขที่บัญชี" placeholder="xxx-x-xxxxx-x" />
      <Field label="ชื่อบัญชี" placeholder="ชื่อ-นามสกุล ตามบัญชี" />
      <div className="col-span-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
          สมัครประกันสังคม (ปกส.)
        </label>
      </div>
    </FormCard>

    <div className="flex items-center justify-end gap-3 pb-4">
      <Btn variant="secondary" onClick={() => setCurrentPage("hr-employees")}>ยกเลิก</Btn>
      <Btn>บันทึกข้อมูล</Btn>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// HR: EMPLOYEE PROFILE
// ─────────────────────────────────────────────────────────────
const HrEmployeeProfilePage = ({ setCurrentPage }) => {
  const [tab, setTab] = useState("personal");
  const tabs = [
    { key: "personal", label: "ข้อมูลส่วนตัว" },
    { key: "work", label: "ข้อมูลการทำงาน" },
    { key: "financial", label: "ข้อมูลการเงิน" },
  ];
  const personalFields = [
    ["รหัสพนักงาน", "EMP-001"], ["เลขบัตรประชาชน", "1-2345-67890-12-3"],
    ["ชื่อ (TH)", "สมชาย ใจดี"], ["ชื่อ (EN)", "Somchai Jaidee"],
    ["ชื่อเล่น", "ชาย"], ["วันเกิด", "15 มกราคม 2533"],
    ["เพศ", "ชาย"], ["เบอร์โทร", "081-234-5678"],
    ["Email", "somchai@company.com"],
  ];
  const workFields = [
    ["แผนก", "Engineering"], ["ตำแหน่ง", "Senior Developer"],
    ["ประเภท", "Monthly"], ["วันเริ่มงาน", "15 มกราคม 2023"],
    ["หัวหน้างาน", "ประเสริฐ ดีงาม"], ["สถานะ", "Active"],
  ];
  const finFields = [
    ["เงินเดือน", "฿ **,***"], ["ธนาคาร", "กสิกรไทย"],
    ["เลขบัญชี", "***-*-**345-*"], ["ชื่อบัญชี", "สมชาย ใจดี"],
    ["ประกันสังคม", "✓ สมัครแล้ว"],
  ];
  const dataMap = { personal: personalFields, work: workFields, financial: finFields };

  return (
    <div className="space-y-4 max-w-2xl">
      <Breadcrumb items={[{ label: "รายชื่อพนักงาน", page: "hr-employees" }, { label: "EMP-001 สมชาย ใจดี" }]} setCurrentPage={setCurrentPage} />

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-5">
        <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl font-bold text-indigo-600 flex-shrink-0">ส</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900">สมชาย ใจดี</h2>
          <p className="text-sm text-gray-400 mt-0.5">Somchai Jaidee · EMP-001</p>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status="active" />
            <span className="text-xs text-gray-400">Engineering · Senior Developer</span>
          </div>
        </div>
        <Btn icon={Edit2} variant="secondary" onClick={() => setCurrentPage("hr-employee-form")}>แก้ไขข้อมูล</Btn>
      </div>

      {/* Tabs */}
      <Card>
        <div className="border-b border-gray-200 flex">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {dataMap[tab].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-gray-400 mb-0.5">{label}</div>
              <div className="text-sm font-medium text-gray-900">{value}</div>
            </div>
          ))}
          {tab === "personal" && (
            <div className="col-span-2">
              <div className="text-xs text-gray-400 mb-0.5">ที่อยู่</div>
              <div className="text-sm font-medium text-gray-900">123/45 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HR: ORGANIZATION
// ─────────────────────────────────────────────────────────────
const HrOrgPage = () => {
  const depts = ["Engineering", "HR", "Finance", "Project Management", "Sales & Marketing"];
  const positions = [
    { name: "Senior Developer", dept: "Engineering", level: 3 },
    { name: "Junior Developer", dept: "Engineering", level: 1 },
    { name: "HR Manager", dept: "HR", level: 4 },
    { name: "HR Staff", dept: "HR", level: 2 },
    { name: "Accountant", dept: "Finance", level: 2 },
    { name: "Project Manager", dept: "Project Management", level: 4 },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 max-w-4xl">
      <Card title="แผนก (Departments)" action={<Btn size="sm" icon={Plus} variant="secondary">เพิ่มแผนก</Btn>}>
        <div className="divide-y divide-gray-100">
          {depts.map(d => (
            <div key={d} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{d}</span>
              </div>
              <div className="flex gap-0.5">
                <Btn variant="ghost" size="icon"><Edit2 className="w-3.5 h-3.5" /></Btn>
                <Btn variant="ghost" size="icon"><Trash2 className="w-3.5 h-3.5" /></Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="ตำแหน่ง (Positions)" action={<Btn size="sm" icon={Plus} variant="secondary">เพิ่มตำแหน่ง</Btn>}>
        <div className="divide-y divide-gray-100">
          {positions.map(p => (
            <div key={p.name} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
              <div>
                <div className="text-sm font-medium text-gray-800">{p.name}</div>
                <div className="text-xs text-gray-400">{p.dept} · Level {p.level}</div>
              </div>
              <div className="flex gap-0.5">
                <Btn variant="ghost" size="icon"><Edit2 className="w-3.5 h-3.5" /></Btn>
                <Btn variant="ghost" size="icon"><Trash2 className="w-3.5 h-3.5" /></Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PM: DASHBOARD
// ─────────────────────────────────────────────────────────────
const PmDashboardPage = ({ setCurrentPage }) => {
  const moduleProgress = [
    { name: "HR", progress: 68, tasks: 12, done: 8 },
    { name: "Finance", progress: 40, tasks: 10, done: 4 },
    { name: "PM", progress: 25, tasks: 8, done: 2 },
    { name: "Integration", progress: 0, tasks: 5, done: 0 },
  ];
  const kpis = [
    { label: "Total Budget", value: "฿1,450,000", sub: "3 projects", icon: DollarSign, color: "bg-blue-50 text-blue-600" },
    { label: "Spent", value: "฿125,000", sub: "8.6% utilized", icon: TrendingUp, color: "bg-green-50 text-green-600" },
    { label: "Tasks Done", value: "14 / 35", sub: "40% complete", icon: CheckCircle, color: "bg-indigo-50 text-indigo-600" },
    { label: "Pending Expense", value: "2 รายการ", sub: "฿60,000 รออนุมัติ", icon: Clock, color: "bg-yellow-50 text-yellow-600" },
  ];
  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${k.color}`}>
              <k.icon className="w-5 h-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            <div className="text-xs text-gray-400">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Module Progress */}
      <Card title="Overall Progress by Module">
        <div className="p-5 space-y-4">
          {moduleProgress.map(m => (
            <div key={m.name}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-gray-700">{m.name} Module</span>
                <span className="text-gray-400">{m.done}/{m.tasks} tasks · {m.progress}%</span>
              </div>
              <div className="bg-gray-100 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${m.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="งานล่าสุด" action={<button onClick={() => setCurrentPage("pm-progress")} className="text-xs text-blue-600 hover:underline">ดูทั้งหมด</button>}>
          <div className="divide-y divide-gray-100">
            {mockTasks.slice(0, 4).map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">{t.task}</div>
                  <div className="text-xs text-gray-400">{t.module} · {t.assignee}</div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Budget Overview" action={<button onClick={() => setCurrentPage("pm-budgets")} className="text-xs text-blue-600 hover:underline">ดูทั้งหมด</button>}>
          <div className="divide-y divide-gray-100">
            {mockBudgets.map(b => (
              <div key={b.id} className="px-5 py-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-800 truncate flex-1 mr-2">{b.project}</span>
                  <StatusBadge status={b.status} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>฿{b.spent.toLocaleString()} / ฿{b.total.toLocaleString()}</span>
                  <span>{Math.round(b.spent / b.total * 100)}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${b.spent / b.total * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PM: BUDGET LIST
// ─────────────────────────────────────────────────────────────
const PmBudgetsPage = ({ setCurrentPage }) => (
  <div className="space-y-4">
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-40 relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="ค้นหาชื่อโปรเจค..." />
      </div>
      <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
        <option>สถานะทั้งหมด</option>
        <option>Draft</option><option>Approved</option><option>Active</option><option>Closed</option>
      </select>
      <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
        <option>Module ทั้งหมด</option>
        <option>HR</option><option>Finance</option><option>PM</option><option>Integration</option>
      </select>
      <Btn icon={Plus} onClick={() => setCurrentPage("pm-budget-form")}>สร้าง Budget</Btn>
    </div>

    <Card>
      <Table headers={["Budget ID", "Project Name", "Total (THB)", "Type", "Module", "Owner", "Status", "Actions"]}>
        {mockBudgets.map(b => (
          <tr key={b.id} className="border-b border-gray-100 hover:bg-blue-50/30">
            <td className="px-4 py-3 text-xs font-mono text-gray-500">{b.id}</td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs">
              <div className="truncate max-w-48">{b.project}</div>
            </td>
            <td className="px-4 py-3 text-sm font-medium text-gray-700">฿{b.total.toLocaleString()}</td>
            <td className="px-4 py-3 text-xs text-gray-500">{b.type}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1 flex-wrap">
                {b.module.map(m => <span key={m} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">{m}</span>)}
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{b.owner}</td>
            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
            <td className="px-4 py-3">
              <div className="flex gap-0.5">
                <Btn variant="ghost" size="icon" onClick={() => setCurrentPage("pm-budget-detail")}><Eye className="w-4 h-4" /></Btn>
                <Btn variant="ghost" size="icon" onClick={() => setCurrentPage("pm-budget-form")}><Edit2 className="w-4 h-4" /></Btn>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </Card>
  </div>
);

// ─────────────────────────────────────────────────────────────
// PM: BUDGET FORM
// ─────────────────────────────────────────────────────────────
const PmBudgetFormPage = ({ setCurrentPage }) => (
  <div className="space-y-4 max-w-2xl">
    <Breadcrumb items={[{ label: "Budget", page: "pm-budgets" }, { label: "สร้าง Budget ใหม่" }]} setCurrentPage={setCurrentPage} />

    <FormCard title="ข้อมูล Budget">
      <Field label="Budget ID" placeholder="Auto-generated (BDG-xxx)" hint="ระบบสร้างให้อัตโนมัติ" />
      <Field label="ประเภท Budget" type="select" placeholder="Fixed Price, Time & Material, Retainer" required />
      <Field label="ชื่อ Project" placeholder="เช่น ERP Phase 1 — HR Module" required span2 />
      <Field label="งบประมาณรวม (THB)" type="number" placeholder="500,000" required />
      <Field label="Owner / ผู้รับผิดชอบ" placeholder="ชื่อผู้รับผิดชอบหลัก" required />
      <Field label="วันเริ่มต้น" type="date" required />
      <Field label="วันสิ้นสุด" type="date" required />
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">Module <span className="text-red-500">*</span></label>
        <div className="flex gap-4 flex-wrap">
          {["HR", "Finance", "PM", "Integration", "Other"].map(m => (
            <label key={m} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded text-blue-600" /> {m}
            </label>
          ))}
        </div>
      </div>
      <Field label="หมายเหตุ" type="textarea" placeholder="รายละเอียดเพิ่มเติม..." span2 />
    </FormCard>

    <div className="flex items-center justify-end gap-3 pb-4">
      <Btn variant="secondary" onClick={() => setCurrentPage("pm-budgets")}>ยกเลิก</Btn>
      <Btn variant="secondary">บันทึก Draft</Btn>
      <Btn>บันทึกและส่ง Approve</Btn>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// PM: BUDGET DETAIL
// ─────────────────────────────────────────────────────────────
const PmBudgetDetailPage = ({ setCurrentPage }) => {
  const b = mockBudgets[0];
  const remaining = b.total - b.spent;
  const pct = Math.round(b.spent / b.total * 100);
  const catBreakdown = [
    { cat: "Software/License", amount: 80000 },
    { cat: "Labor", amount: 45000 },
    { cat: "Training", amount: 0 },
    { cat: "Office Supply", amount: 0 },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <Breadcrumb items={[{ label: "Budget", page: "pm-budgets" }, { label: b.id }]} setCurrentPage={setCurrentPage} />

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-gray-400">{b.id}</span>
            <StatusBadge status={b.status} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{b.project}</h2>
          <p className="text-sm text-gray-400 mt-1">{b.type} · Owner: {b.owner} · {b.start} ถึง {b.end}</p>
        </div>
        <div className="flex gap-2">
          <Btn icon={Plus} variant="secondary" onClick={() => setCurrentPage("pm-expense-form")}>เพิ่ม Expense</Btn>
          <Btn>เปลี่ยน Status</Btn>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "งบประมาณทั้งหมด", value: `฿${b.total.toLocaleString()}`, color: "text-gray-900" },
          { label: "ใช้ไปแล้ว", value: `฿${b.spent.toLocaleString()}`, color: "text-red-600" },
          { label: "คงเหลือ", value: `฿${remaining.toLocaleString()}`, color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Utilization */}
      <Card title="Budget Utilization">
        <div className="p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">ยอดใช้จ่ายรวม</span>
            <span className="font-semibold text-gray-900">{pct}% used</span>
          </div>
          <div className="bg-gray-100 rounded-full h-4 overflow-hidden mb-4">
            <div className={`h-4 rounded-full transition-all ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {catBreakdown.map(c => (
              <div key={c.cat} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">{c.cat}</div>
                <div className="text-sm font-semibold text-gray-800">฿{c.amount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Expenses */}
      <Card title={`รายการ Expense ที่ผูก (${mockExpenses.length} รายการ)`}>
        <Table headers={["Expense ID", "ชื่อ", "จำนวน (THB)", "Category", "วันที่", "สถานะ"]}>
          {mockExpenses.map(e => (
            <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 text-xs font-mono text-gray-400">{e.id}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{e.name}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">฿{e.amount.toLocaleString()}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{e.category}</td>
              <td className="px-4 py-3 text-xs text-gray-400">{e.date}</td>
              <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PM: EXPENSE LIST
// ─────────────────────────────────────────────────────────────
const PmExpensesPage = ({ setCurrentPage }) => {
  const statusStats = [
    { label: "Draft", count: 1, color: "text-gray-500" },
    { label: "Pending Approval", count: 1, color: "text-yellow-600" },
    { label: "Approved", count: 1, color: "text-blue-600" },
    { label: "Paid", count: 1, color: "text-green-600" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {statusStats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-40 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="ค้นหารายการ Expense..." />
        </div>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
          <option>สถานะทั้งหมด</option>
          <option>Draft</option><option>Pending Approval</option><option>Approved</option><option>Paid</option>
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
          <option>Category ทั้งหมด</option>
          <option>Labor</option><option>Software/License</option><option>Training</option>
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
          <option>Budget ทั้งหมด</option>
          {mockBudgets.map(b => <option key={b.id}>{b.id}</option>)}
        </select>
        <Btn icon={Plus} onClick={() => setCurrentPage("pm-expense-form")}>เพิ่ม Expense</Btn>
      </div>

      <Card>
        <Table headers={["Expense ID", "ชื่อรายการ", "Budget", "จำนวน (THB)", "Category", "วันที่", "ผู้ขอ", "สถานะ", "Actions"]}>
          {mockExpenses.map(e => (
            <tr key={e.id} className="border-b border-gray-100 hover:bg-blue-50/30">
              <td className="px-4 py-3 text-xs font-mono text-gray-400">{e.id}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.name}</td>
              <td className="px-4 py-3 text-xs text-indigo-600 font-medium">{e.budget}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">฿{e.amount.toLocaleString()}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{e.category}</td>
              <td className="px-4 py-3 text-xs text-gray-400">{e.date}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{e.requested_by}</td>
              <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn variant="ghost" size="icon"><Eye className="w-4 h-4" /></Btn>
                  {e.status === "Draft" && <Btn variant="ghost" size="icon" onClick={() => setCurrentPage("pm-expense-form")}><Edit2 className="w-4 h-4" /></Btn>}
                  {e.status === "Pending Approval" && (
                    <button className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-medium">Approve</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PM: EXPENSE FORM
// ─────────────────────────────────────────────────────────────
const PmExpenseFormPage = ({ setCurrentPage }) => (
  <div className="space-y-4 max-w-2xl">
    <Breadcrumb items={[{ label: "Expense", page: "pm-expenses" }, { label: "เพิ่ม Expense ใหม่" }]} setCurrentPage={setCurrentPage} />

    <FormCard title="ข้อมูล Expense">
      <Field label="ชื่อรายการ" placeholder="เช่น Server Infrastructure Q2" required span2 />
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Project Budget <span className="text-red-500">*</span></label>
        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option>— เลือก Budget (เฉพาะ Active เท่านั้น) —</option>
          {mockBudgets.filter(b => b.status === "Active").map(b => (
            <option key={b.id}>{b.id} — {b.project}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">แสดงเฉพาะ Budget ที่ Status = Active</p>
      </div>
      <Field label="จำนวนเงิน (THB)" type="number" placeholder="50,000" required hint="ระบบจะตรวจสอบว่าไม่เกิน remaining budget" />
      <Field label="วันที่เบิกจ่าย" type="date" required />
      <Field label="Category" type="select" placeholder="Equipment, Labor, Travel, Software/License, Office Supply, Training, Other" required />
      <Field label="Payment Method" type="select" placeholder="Transfer, Cash, Credit Card, Cheque" required />
      <Field label="ผู้ขอเบิก (Requested By)" placeholder="ชื่อผู้ขอ" required />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Receipt / เอกสาร</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center text-sm text-gray-400 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-colors">
          คลิกเพื่ออัปโหลดใบเสร็จหรือเอกสาร
        </div>
      </div>
      <Field label="หมายเหตุ" type="textarea" placeholder="รายละเอียดเพิ่มเติม..." span2 />
    </FormCard>

    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-700">จำนวนเงินรวมกับยอดที่ Approved/Paid อยู่แล้วต้องไม่เกิน Total Budget ของโปรเจค (BDG-001: คงเหลือ ฿375,000)</p>
    </div>

    <div className="flex items-center justify-end gap-3 pb-4">
      <Btn variant="secondary" onClick={() => setCurrentPage("pm-expenses")}>ยกเลิก</Btn>
      <Btn variant="secondary">บันทึก Draft</Btn>
      <Btn>ส่ง Pending Approval</Btn>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// PM: PROGRESS
// ─────────────────────────────────────────────────────────────
const PmProgressPage = ({ setCurrentPage }) => {
  const modules = ["HR", "Finance", "PM", "Integration"];
  const moduleStats = modules.map(m => {
    const mt = mockTasks.filter(t => t.module === m);
    const avg = mt.length ? Math.round(mt.reduce((s, t) => s + t.progress, 0) / mt.length) : 0;
    return { name: m, avg, count: mt.length };
  });

  return (
    <div className="space-y-4">
      {/* Module Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Overall Progress by Module</h3>
        <div className="grid grid-cols-4 gap-5">
          {moduleStats.map(m => (
            <div key={m.name}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-gray-700">{m.name}</span>
                <span className="text-gray-400">{m.avg}%</span>
              </div>
              <div className="bg-gray-100 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${m.avg}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-1">{m.count} tasks</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-40 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="ค้นหา Task..." />
        </div>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
          <option>Module ทั้งหมด</option>
          {modules.map(m => <option key={m}>{m}</option>)}
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
          <option>Status ทั้งหมด</option>
          <option>Not Started</option><option>In Progress</option><option>Done</option><option>On Hold</option>
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
          <option>Priority ทั้งหมด</option>
          <option>High</option><option>Medium</option><option>Low</option>
        </select>
        <Btn icon={Plus} onClick={() => setCurrentPage("pm-task-form")}>เพิ่ม Task</Btn>
      </div>

      {/* Table */}
      <Card>
        <Table headers={["Task ID", "Task / Feature", "Module", "Phase", "Priority", "Progress", "Target Date", "Assignee", "Status"]}>
          {mockTasks.map(t => (
            <tr key={t.id} className="border-b border-gray-100 hover:bg-blue-50/30">
              <td className="px-4 py-3 text-xs font-mono text-gray-400">{t.id}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.task}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium">{t.module}</span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">{t.phase}</td>
              <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
              <td className="px-4 py-3"><ProgressBar value={t.progress} /></td>
              <td className="px-4 py-3 text-xs text-gray-400">{t.target}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{t.assignee}</td>
              <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PM: TASK FORM
// ─────────────────────────────────────────────────────────────
const PmTaskFormPage = ({ setCurrentPage }) => {
  const [progress, setProgress] = useState(0);
  return (
    <div className="space-y-4 max-w-2xl">
      <Breadcrumb items={[{ label: "Progress", page: "pm-progress" }, { label: "สร้าง Task ใหม่" }]} setCurrentPage={setCurrentPage} />

      <FormCard title="ข้อมูล Task">
        <Field label="ชื่อ Task / Feature" placeholder="เช่น Employee CRUD API" required span2 />
        <Field label="Module" type="select" placeholder="HR, Finance, PM, Integration, UAT, Other" required />
        <Field label="Phase" type="select" placeholder="Analysis, Design, Development, Testing, UAT, Go-Live" required />
        <Field label="Status" type="select" placeholder="Not Started, In Progress, On Hold, Done, Cancelled" required />
        <Field label="Priority" type="select" placeholder="High, Medium, Low" required />
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Progress % <span className="text-gray-400 font-normal">(0–100)</span>
          </label>
          <div className="flex items-center gap-4">
            <input type="range" min={0} max={100} value={progress} onChange={e => setProgress(+e.target.value)} className="flex-1 accent-blue-600" />
            <div className="w-14 text-center text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg py-1">{progress}%</div>
          </div>
        </div>
        <Field label="วันเริ่มต้น" type="date" required />
        <Field label="Target Date" type="date" required />
        <Field label="Assignee" placeholder="ชื่อผู้รับผิดชอบ" span2 />
        <Field label="หมายเหตุ" type="textarea" placeholder="รายละเอียดเพิ่มเติม (ต้องระบุเมื่อ Status = On Hold)" span2 />
      </FormCard>

      <div className="flex items-center justify-end gap-3 pb-4">
        <Btn variant="secondary" onClick={() => setCurrentPage("pm-progress")}>ยกเลิก</Btn>
        <Btn>บันทึก Task</Btn>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SETTINGS: USERS
// ─────────────────────────────────────────────────────────────
const SettingsUsersPage = () => {
  const users = [
    { email: "admin@erp.com", employee: "—", roles: ["super_admin"], active: true, lastLogin: "2026-04-11 09:15" },
    { email: "hr@erp.com", employee: "สมหญิง รักดี", roles: ["hr_admin"], active: true, lastLogin: "2026-04-10 14:30" },
    { email: "emp@erp.com", employee: "สมชาย ใจดี", roles: ["employee"], active: true, lastLogin: "2026-04-09 08:00" },
    { email: "manager@erp.com", employee: "ประเสริฐ ดีงาม", roles: ["manager"], active: false, lastLogin: "2026-03-30 16:00" },
  ];
  return (
    <Card title="จัดการ User Accounts" action={<Btn size="sm" icon={Plus} variant="secondary">เพิ่ม User</Btn>}>
      <Table headers={["Email", "Employee ที่ผูก", "Roles", "Active", "Last Login", "Actions"]}>
        {users.map(u => (
          <tr key={u.email} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-5 py-3 text-sm text-gray-700">{u.email}</td>
            <td className="px-5 py-3 text-sm text-gray-500">{u.employee}</td>
            <td className="px-5 py-3">
              <div className="flex gap-1">{u.roles.map(r => <span key={r} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-medium">{r}</span>)}</div>
            </td>
            <td className="px-5 py-3">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${u.active ? "bg-green-500" : "bg-gray-300"}`} />
            </td>
            <td className="px-5 py-3 text-xs text-gray-400">{u.lastLogin}</td>
            <td className="px-5 py-3">
              <div className="flex gap-1.5">
                <button className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Assign Role</button>
                <button className="text-xs px-2.5 py-1 border border-red-100 rounded-lg hover:bg-red-50 text-red-500">Deactivate</button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────
// SETTINGS: ROLES & PERMISSIONS
// ─────────────────────────────────────────────────────────────
const SettingsRolesPage = () => {
  const roles = [
    { name: "super_admin", desc: "จัดการทุกอย่างในระบบ", system: true, users: 1 },
    { name: "hr_admin", desc: "จัดการ HR module ทั้งหมด", system: true, users: 1 },
    { name: "hr_staff", desc: "บันทึก/ดูข้อมูล HR บางส่วน", system: true, users: 0 },
    { name: "manager", desc: "อนุมัติลา, ดูรายงานทีม", system: true, users: 2 },
    { name: "employee", desc: "Self-service เท่านั้น", system: true, users: 12 },
  ];
  const resources = ["employee:view", "employee:create", "employee:edit", "leave:approve", "payroll:process", "role:manage"];
  const matrix = {
    super_admin: [true, true, true, true, true, true],
    hr_admin:    [true, true, true, true, true, false],
    hr_staff:    [true, false, false, false, false, false],
    manager:     [true, false, false, true, false, false],
    employee:    [false, false, false, false, false, false],
  };
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="grid grid-cols-3 gap-3">
        {roles.map(r => (
          <div key={r.name} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm font-mono font-semibold text-gray-800">{r.name}</span>
              {r.system && <span className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-500 rounded font-medium">system</span>}
            </div>
            <div className="text-xs text-gray-400 mb-2">{r.desc}</div>
            <div className="text-xs text-gray-500">{r.users} users assigned</div>
          </div>
        ))}
      </div>

      <Card title="Permission Matrix (HR Module)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-gray-500 font-semibold">Permission</th>
                {roles.map(r => <th key={r.name} className="px-4 py-3 text-gray-600 text-center font-mono font-semibold">{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {resources.map((res, i) => (
                <tr key={res} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-700 font-mono">{res}</td>
                  {roles.map(r => (
                    <td key={r.name} className="px-4 py-3 text-center">
                      {matrix[r.name][i]
                        ? <CheckCircle className="w-4 h-4 text-green-500 inline" />
                        : <span className="text-gray-200 text-base">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PAGE ROUTER
// ─────────────────────────────────────────────────────────────
const renderPage = (page, setCurrentPage) => {
  const pages = {
    "hr-employees":       <HrEmployeesPage setCurrentPage={setCurrentPage} />,
    "hr-employee-form":   <HrEmployeeFormPage setCurrentPage={setCurrentPage} />,
    "hr-employee-profile":<HrEmployeeProfilePage setCurrentPage={setCurrentPage} />,
    "hr-org":             <HrOrgPage />,
    "pm-dashboard":       <PmDashboardPage setCurrentPage={setCurrentPage} />,
    "pm-budgets":         <PmBudgetsPage setCurrentPage={setCurrentPage} />,
    "pm-budget-form":     <PmBudgetFormPage setCurrentPage={setCurrentPage} />,
    "pm-budget-detail":   <PmBudgetDetailPage setCurrentPage={setCurrentPage} />,
    "pm-expenses":        <PmExpensesPage setCurrentPage={setCurrentPage} />,
    "pm-expense-form":    <PmExpenseFormPage setCurrentPage={setCurrentPage} />,
    "pm-progress":        <PmProgressPage setCurrentPage={setCurrentPage} />,
    "pm-task-form":       <PmTaskFormPage setCurrentPage={setCurrentPage} />,
    "settings-users":     <SettingsUsersPage />,
    "settings-roles":     <SettingsRolesPage />,
  };
  return pages[page] || <div className="text-gray-400 p-4">Page not found: {page}</div>;
};

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("login");

  if (page === "login") {
    return <LoginPage onLogin={() => setPage("pm-dashboard")} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sidebar currentPage={page} setCurrentPage={setPage} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header currentPage={page} />
        <main className="flex-1 overflow-y-auto p-5 bg-gray-100">
          {renderPage(page, setPage)}
        </main>
      </div>
    </div>
  );
}
