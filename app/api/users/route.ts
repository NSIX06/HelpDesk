import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

const SELECT_USERS = `
  SELECT u.id, u.name, u.email, u.role, u.phone, u.active,
         u.created_at, u.updated_at, u.department_id,
         d.name as department_name
  FROM users u
  LEFT JOIN departments d ON u.department_id = d.id
`

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const activeParam = searchParams.get('active') // null | 'true' | 'false'

    // Build dynamic parameterized query using sql(string, params) call form
    const conditions: string[] = []
    const params: any[] = []

    if (search) {
      params.push('%' + search + '%')
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`)
    }
    if (role) {
      params.push(role)
      conditions.push(`u.role = $${params.length}`)
    }
    if (activeParam !== null) {
      params.push(activeParam === 'true')
      conditions.push(`u.active = $${params.length}`)
    }

    const WHERE = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const query = SELECT_USERS + WHERE + ' ORDER BY u.name ASC'

    const users = await sql(query, params)

    return NextResponse.json(users)
  } catch (err) {
    console.error('GET /api/users:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, email, password, role, department_id, phone } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const result = await sql`
      INSERT INTO users (name, email, password_hash, role, department_id, phone)
      VALUES (${name}, ${email}, ${password_hash}, ${role}, ${department_id || null}, ${phone || null})
      RETURNING id, name, email, role, department_id, phone, active, created_at
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (err) {
    console.error('POST /api/users:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
