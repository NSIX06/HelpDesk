import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const sessionUser = session.user as any
    const isAdminOrTech = sessionUser.role === 'admin' || sessionUser.role === 'technician'
    const userId = parseInt(sessionUser.id)
    const ticketId = parseInt(id)

    const result = await sql`
      SELECT
        t.*,
        u_req.name as requester_name, u_req.email as requester_email,
        u_ass.name as assignee_name, u_ass.email as assignee_email,
        c.name as category_name,
        p.name as parent_category_name,
        d.name as department_name
      FROM tickets t
      LEFT JOIN users u_req ON t.requester_id = u_req.id
      LEFT JOIN users u_ass ON t.assignee_id = u_ass.id
      LEFT JOIN ticket_categories c ON t.category_id = c.id
      LEFT JOIN ticket_categories p ON c.parent_id = p.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.id = ${ticketId}
    `

    if (!result.length) return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 })

    const ticket = result[0] as any
    if (!isAdminOrTech && ticket.requester_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(ticket)
  } catch (err) {
    console.error('GET /api/tickets/[id]:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const sessionUser = session.user as any
    const isAdminOrTech = sessionUser.role === 'admin' || sessionUser.role === 'technician'
    const userId = parseInt(sessionUser.id)
    const ticketId = parseInt(id)

    const existing = await sql`SELECT * FROM tickets WHERE id = ${ticketId}`
    if (!existing.length) return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 })

    const ticket = existing[0] as any
    if (!isAdminOrTech && ticket.requester_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, status, priority, type, category_id, department_id, assignee_id, due_date } = body

    const newStatus = status || ticket.status
    const now = new Date().toISOString()
    const resolved_at = newStatus === 'resolved' && ticket.status !== 'resolved' ? now : ticket.resolved_at
    const closed_at = newStatus === 'closed' && ticket.status !== 'closed' ? now : ticket.closed_at

    if (isAdminOrTech) {
      await sql`
        UPDATE tickets
        SET
          title = ${title || ticket.title},
          description = ${description !== undefined ? description : ticket.description},
          status = ${newStatus},
          priority = ${priority || ticket.priority},
          type = ${type || ticket.type},
          category_id = ${category_id !== undefined ? (category_id || null) : ticket.category_id},
          department_id = ${department_id !== undefined ? (department_id || null) : ticket.department_id},
          assignee_id = ${assignee_id !== undefined ? (assignee_id || null) : ticket.assignee_id},
          due_date = ${due_date !== undefined ? (due_date || null) : ticket.due_date},
          resolved_at = ${resolved_at},
          closed_at = ${closed_at},
          updated_at = NOW()
        WHERE id = ${ticketId}
      `
    } else {
      const allowedStatus = newStatus === 'closed' ? 'closed' : ticket.status
      const userClosedAt = allowedStatus === 'closed' && ticket.status !== 'closed' ? now : ticket.closed_at
      await sql`
        UPDATE tickets
        SET
          title = ${title || ticket.title},
          description = ${description !== undefined ? description : ticket.description},
          status = ${allowedStatus},
          closed_at = ${userClosedAt},
          updated_at = NOW()
        WHERE id = ${ticketId}
      `
    }

    const updated = await sql`SELECT * FROM tickets WHERE id = ${ticketId}`
    return NextResponse.json(updated[0])
  } catch (err) {
    console.error('PUT /api/tickets/[id]:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
