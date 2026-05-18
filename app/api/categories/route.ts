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
    const flat = searchParams.get('flat') === 'true'
    const departmentId = searchParams.get('department_id') || ''
    const search = searchParams.get('search') || ''

    // Build conditions
    const conditions: string[] = []
    const params: any[] = []

    if (activeOnly) {
      conditions.push('c.active = true')
    }

    // Filter by department:
    // - categories that belong to that department
    // - OR categories with no department (global/universal)
    if (departmentId) {
      params.push(parseInt(departmentId))
      conditions.push(`(c.department_id = $${params.length} OR c.department_id IS NULL)`)
    }

    if (search) {
      params.push('%' + search + '%')
      conditions.push(`c.name ILIKE $${params.length}`)
    }

    const WHERE = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

    const query = `
      SELECT
        c.id, c.name, c.description, c.parent_id, c.active,
        c.department_id, c.created_at,
        p.name as parent_name,
        d.name as department_name
      FROM ticket_categories c
      LEFT JOIN ticket_categories p ON c.parent_id = p.id
      LEFT JOIN departments d ON c.department_id = d.id
      ${WHERE}
      ORDER BY COALESCE(c.parent_id, c.id), c.parent_id NULLS FIRST, c.name ASC
    `

    const categories = await sql(query, params)

    if (flat) return NextResponse.json(categories)

    // Build tree (only root + their children)
    const roots = (categories as any[]).filter(c => !c.parent_id)
    const tree = roots.map(root => ({
      ...root,
      children: (categories as any[]).filter(c => c.parent_id === root.id),
    }))

    return NextResponse.json(tree)
  } catch (err) {
    console.error('GET /api/categories:', err)
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
    const { name, description, parent_id, department_id } = body

    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

    const result = await sql`
      INSERT INTO ticket_categories (name, description, parent_id, department_id)
      VALUES (${name}, ${description || null}, ${parent_id || null}, ${department_id || null})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (err) {
    console.error('POST /api/categories:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
