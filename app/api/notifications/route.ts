import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userId = parseInt((session.user as any).id)
    const countOnly = req.nextUrl.searchParams.get('count') === 'true'

    if (countOnly) {
      const res = await sql`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ${userId} AND read = false
      `
      return NextResponse.json({ count: parseInt((res[0] as any).count) })
    }

    const notifications = await sql`
      SELECT n.id, n.type, n.title, n.message, n.read, n.created_at,
             n.ticket_id, t.title as ticket_title
      FROM notifications n
      LEFT JOIN tickets t ON n.ticket_id = t.id
      WHERE n.user_id = ${userId}
      ORDER BY n.created_at DESC
      LIMIT 30
    `

    return NextResponse.json(notifications)
  } catch (err) {
    console.error('GET /api/notifications:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userId = parseInt((session.user as any).id)
    const body = await req.json()
    const { ids } = body // array of IDs, or empty = mark all

    if (ids && ids.length > 0) {
      for (const id of ids) {
        await sql`
          UPDATE notifications SET read = true
          WHERE id = ${id} AND user_id = ${userId}
        `
      }
    } else {
      await sql`
        UPDATE notifications SET read = true WHERE user_id = ${userId}
      `
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/notifications:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
