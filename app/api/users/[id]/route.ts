import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
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
    if (sessionUser.role !== 'admin' && sessionUser.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await sql`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.active, u.created_at, u.updated_at,
             d.name as department_name, u.department_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ${parseInt(id)}
    `

    if (!result.length) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    return NextResponse.json(result[0])
  } catch (err) {
    console.error('GET /api/users/[id]:', err)
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
    const isAdmin = sessionUser.role === 'admin'
    const isSelf = sessionUser.id === id

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, password, role, department_id, phone, active } = body

    if (password) {
      const password_hash = await bcrypt.hash(password, 12)
      if (isAdmin) {
        await sql`
          UPDATE users
          SET name = ${name}, email = ${email}, password_hash = ${password_hash},
              role = ${role}, department_id = ${department_id || null},
              phone = ${phone || null}, active = ${active ?? true}, updated_at = NOW()
          WHERE id = ${parseInt(id)}
        `
      } else {
        await sql`
          UPDATE users
          SET name = ${name}, password_hash = ${password_hash},
              phone = ${phone || null}, updated_at = NOW()
          WHERE id = ${parseInt(id)}
        `
      }
    } else {
      if (isAdmin) {
        await sql`
          UPDATE users
          SET name = ${name}, email = ${email}, role = ${role},
              department_id = ${department_id || null}, phone = ${phone || null},
              active = ${active ?? true}, updated_at = NOW()
          WHERE id = ${parseInt(id)}
        `
      } else {
        await sql`
          UPDATE users
          SET name = ${name}, phone = ${phone || null}, updated_at = NOW()
          WHERE id = ${parseInt(id)}
        `
      }
    }

    const result = await sql`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.active, u.created_at, u.updated_at,
             d.name as department_name, u.department_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ${parseInt(id)}
    `

    return NextResponse.json(result[0])
  } catch (err) {
    console.error('PUT /api/users/[id]:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const sessionUser = session.user as any

    if (sessionUser.id === id) {
      return NextResponse.json({ error: 'Não é possível desativar seu próprio usuário' }, { status: 400 })
    }

    await sql`UPDATE users SET active = false, updated_at = NOW() WHERE id = ${parseInt(id)}`
    return NextResponse.json({ message: 'Usuário desativado com sucesso' })
  } catch (err) {
    console.error('DELETE /api/users/[id]:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
