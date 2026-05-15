import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('active') !== 'false'

    let departments
    if (activeOnly) {
      departments = await sql`
        SELECT d.id, d.name, d.description, d.active, d.created_at, d.updated_at,
               COUNT(DISTINCT u.id) as user_count,
               COUNT(DISTINCT t.id) as ticket_count
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.active = true
        LEFT JOIN tickets t ON t.department_id = d.id
        WHERE d.active = true
        GROUP BY d.id
        ORDER BY d.name ASC
      `
    } else {
      departments = await sql`
        SELECT d.id, d.name, d.description, d.active, d.created_at, d.updated_at,
               COUNT(DISTINCT u.id) as user_count,
               COUNT(DISTINCT t.id) as ticket_count
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.active = true
        LEFT JOIN tickets t ON t.department_id = d.id
        GROUP BY d.id
        ORDER BY d.name ASC
      `
    }

    return NextResponse.json(departments)
  } catch (err) {
    console.error('GET /api/departments:', err)
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
    const { name, description } = body

    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

    const result = await sql`
      INSERT INTO departments (name, description)
      VALUES (${name}, ${description || null})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (err) {
    console.error('POST /api/departments:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
