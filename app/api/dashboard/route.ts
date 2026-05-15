import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sessionUser = session.user as any
    const isAdminOrTech =
      sessionUser.role === 'admin' || sessionUser.role === 'technician'
    const userId = parseInt(sessionUser.id)

    let statusStats: any[], priorityStats: any[], recentTickets: any[], myTickets: any[]

    if (isAdminOrTech) {
      ;[statusStats, priorityStats, recentTickets, myTickets] = await Promise.all([
        sql`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`,
        sql`SELECT priority, COUNT(*) as count FROM tickets WHERE status NOT IN ('closed','resolved') GROUP BY priority`,
        sql`
          SELECT t.id, t.title, t.status, t.priority, t.created_at, u.name as requester_name
          FROM tickets t JOIN users u ON t.requester_id = u.id
          ORDER BY t.created_at DESC LIMIT 5
        `,
        sql`
          SELECT t.id, t.title, t.status, t.priority, t.created_at, u.name as requester_name
          FROM tickets t JOIN users u ON t.requester_id = u.id
          WHERE t.assignee_id = ${userId} AND t.status NOT IN ('closed','resolved')
          ORDER BY t.created_at DESC LIMIT 5
        `,
      ])
    } else {
      ;[statusStats, priorityStats, recentTickets] = await Promise.all([
        sql`SELECT status, COUNT(*) as count FROM tickets WHERE requester_id = ${userId} GROUP BY status`,
        sql`SELECT priority, COUNT(*) as count FROM tickets WHERE requester_id = ${userId} AND status NOT IN ('closed','resolved') GROUP BY priority`,
        sql`
          SELECT t.id, t.title, t.status, t.priority, t.created_at, u.name as requester_name
          FROM tickets t JOIN users u ON t.requester_id = u.id
          WHERE t.requester_id = ${userId}
          ORDER BY t.created_at DESC LIMIT 5
        `,
      ])
      myTickets = []
    }

    const stats: Record<string, number> = { total: 0, new: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 }
    for (const row of statusStats as any[]) {
      const s = row.status as keyof typeof stats
      if (s in stats) {
        stats[s] = parseInt(row.count)
        stats.total += parseInt(row.count)
      }
    }

    return NextResponse.json({
      stats,
      priorityStats,
      recentTickets,
      myAssignedTickets: isAdminOrTech ? myTickets : [],
    })
  } catch (err) {
    console.error('GET /api/dashboard:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
