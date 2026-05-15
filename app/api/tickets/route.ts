import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sessionUser = session.user as any
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const type = searchParams.get('type') || ''
    const search = searchParams.get('search') || ''
    const department = searchParams.get('department') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const isAdminOrTech =
      sessionUser.role === 'admin' || sessionUser.role === 'technician'
    const userId = parseInt(sessionUser.id)

    const conditions: string[] = []
    const params: any[] = []

    if (!isAdminOrTech) {
      params.push(userId)
      conditions.push(`t.requester_id = $${params.length}`)
    }
    if (status) {
      params.push(status)
      conditions.push(`t.status = $${params.length}`)
    }
    if (priority) {
      params.push(priority)
      conditions.push(`t.priority = $${params.length}`)
    }
    if (type) {
      params.push(type)
      conditions.push(`t.type = $${params.length}`)
    }
    if (department) {
      params.push(parseInt(department))
      conditions.push(`t.department_id = $${params.length}`)
    }
    if (search) {
      params.push('%' + search + '%')
      conditions.push(`(t.title ILIKE $${params.length} OR CAST(t.id AS TEXT) ILIKE $${params.length})`)
    }

    const WHERE = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

    const ticketsQuery = `
      SELECT
        t.id, t.title, t.status, t.priority, t.type,
        t.created_at, t.updated_at, t.due_date, t.resolved_at, t.closed_at,
        t.requester_id, t.assignee_id, t.category_id, t.department_id,
        u_req.name as requester_name, u_req.email as requester_email,
        u_ass.name as assignee_name,
        c.name as category_name,
        d.name as department_name,
        COUNT(DISTINCT tc.id) as comment_count,
        COUNT(DISTINCT ta.id) as attachment_count
      FROM tickets t
      LEFT JOIN users u_req ON t.requester_id = u_req.id
      LEFT JOIN users u_ass ON t.assignee_id = u_ass.id
      LEFT JOIN ticket_categories c ON t.category_id = c.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN ticket_comments tc ON tc.ticket_id = t.id
      LEFT JOIN ticket_attachments ta ON ta.ticket_id = t.id
      ${WHERE}
      GROUP BY t.id, u_req.name, u_req.email, u_ass.name, c.name, d.name
      ORDER BY t.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tickets t
      ${WHERE}
    `

    const [tickets, countResult] = await Promise.all([
      sql(ticketsQuery, [...params, limit, offset]),
      sql(countQuery, params),
    ])

    return NextResponse.json({
      tickets,
      total: parseInt((countResult[0] as any).total),
      page,
      limit,
      pages: Math.ceil(parseInt((countResult[0] as any).total) / limit),
    })
  } catch (err) {
    console.error('GET /api/tickets:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sessionUser = session.user as any
    const body = await req.json()
    const { title, description, priority, type, category_id, department_id, assignee_id, due_date } = body

    if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })

    const result = await sql`
      INSERT INTO tickets (title, description, priority, type, category_id, department_id, requester_id, assignee_id, due_date)
      VALUES (
        ${title},
        ${description || null},
        ${priority || 'medium'},
        ${type || 'incident'},
        ${category_id || null},
        ${department_id || null},
        ${parseInt(sessionUser.id)},
        ${assignee_id || null},
        ${due_date || null}
      )
      RETURNING id
    `

    return NextResponse.json({ id: (result[0] as any).id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/tickets:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
