import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const sql = neon(process.env.DATABASE_URL)

export type UserRole = 'admin' | 'technician' | 'user'
export type TicketStatus = 'new' | 'in_progress' | 'pending' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketType = 'incident' | 'request' | 'problem' | 'change'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  department_id: number | null
  department_name?: string
  phone: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: number
  name: string
  description: string | null
  active: boolean
  created_at: string
  updated_at: string
  user_count?: number
  ticket_count?: number
}

export interface TicketCategory {
  id: number
  name: string
  description: string | null
  parent_id: number | null
  parent_name?: string
  active: boolean
  created_at: string
  children?: TicketCategory[]
}

export interface Ticket {
  id: number
  title: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  type: TicketType
  category_id: number | null
  category_name?: string
  department_id: number | null
  department_name?: string
  requester_id: number
  requester_name?: string
  requester_email?: string
  assignee_id: number | null
  assignee_name?: string
  due_date: string | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  comment_count?: number
  attachment_count?: number
}

export interface TicketComment {
  id: number
  ticket_id: number
  user_id: number
  user_name?: string
  user_role?: string
  content: string
  is_internal: boolean
  created_at: string
  attachments?: TicketAttachment[]
}

export interface TicketAttachment {
  id: number
  ticket_id: number
  comment_id: number | null
  original_name: string
  file_data: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: number
  uploader_name?: string
  created_at: string
}
