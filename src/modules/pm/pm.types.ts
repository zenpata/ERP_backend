// ============================================================
// pm.types.ts — TypeScript types สำหรับ PM module
// ============================================================

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type Project = {
  id: string
  code: string
  name: string
  description: string | null
  customerId: string | null
  status: ProjectStatus
  startDate: Date | null
  endDate: Date | null
  budget: string | null
  createdAt: Date
  updatedAt: Date
}

export type Task = {
  id: string
  projectId: string
  milestoneId: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string | null // EmployeeRef.id
  estimatedHours: string | null
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export type Milestone = {
  id: string
  projectId: string
  name: string
  dueDate: Date
  status: 'pending' | 'completed' | 'overdue'
  createdAt: Date
  updatedAt: Date
}

export type Timesheet = {
  id: string
  projectId: string
  taskId: string | null
  employeeId: string // EmployeeRef.id
  date: Date
  hours: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}
