import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { name, description, parent_id, active } = body

    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

    const result = await sql`
      UPDATE ticket_categories
      SET name = ${name}, description = ${description || null},
          parent_id = ${parent_id || null}, active = ${active ?? true},
          updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `

    if (!result.length) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    return NextResponse.json(result[0])
  } catch (err) {
    console.error('PUT /api/categories/[id]:', err)
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
    await sql`UPDATE ticket_categories SET active = false, updated_at = NOW() WHERE id = ${parseInt(id)}`
    return NextResponse.json({ message: 'Categoria desativada' })
  } catch (err) {
    console.error('DELETE /api/categories/[id]:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
