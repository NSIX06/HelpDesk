import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const ticketId = parseInt(id)
  const sessionUser = session.user as any
  const isAdminOrTech = sessionUser.role === 'admin' || sessionUser.role === 'technician'

  // Start from the comment ID the client provides (avoids duplicates)
  const afterParam = req.nextUrl.searchParams.get('after')
  let lastCommentId = afterParam ? parseInt(afterParam) : 0

  // If no after param, get the current max ID
  if (!afterParam) {
    try {
      const res = await sql`
        SELECT COALESCE(MAX(id), 0) as max_id FROM ticket_comments WHERE ticket_id = ${ticketId}
      `
      lastCommentId = parseInt((res[0] as any).max_id)
    } catch {
      lastCommentId = 0
    }
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Controller already closed
        }
      }

      // Heartbeat to keep the connection alive
      send({ type: 'connected', ticketId })

      const pollInterval = setInterval(async () => {
        try {
          // Fetch new comments since last check
          let newComments: any[]
          if (isAdminOrTech) {
            newComments = await sql`
              SELECT
                tc.id, tc.ticket_id, tc.user_id, tc.content, tc.is_internal, tc.created_at,
                u.name as user_name, u.role as user_role,
                '[]'::json as attachments
              FROM ticket_comments tc
              JOIN users u ON tc.user_id = u.id
              WHERE tc.ticket_id = ${ticketId} AND tc.id > ${lastCommentId}
              ORDER BY tc.created_at ASC
            `
          } else {
            newComments = await sql`
              SELECT
                tc.id, tc.ticket_id, tc.user_id, tc.content, tc.is_internal, tc.created_at,
                u.name as user_name, u.role as user_role,
                '[]'::json as attachments
              FROM ticket_comments tc
              JOIN users u ON tc.user_id = u.id
              WHERE tc.ticket_id = ${ticketId} AND tc.id > ${lastCommentId} AND tc.is_internal = false
              ORDER BY tc.created_at ASC
            `
          }

          if (newComments.length > 0) {
            lastCommentId = newComments[newComments.length - 1].id
            send({ type: 'comments', data: newComments })
          }
        } catch (err) {
          // DB error — send heartbeat so client knows connection is alive
          send({ type: 'ping' })
        }
      }, 2500)

      // Heartbeat every 20s to prevent proxy/browser timeout
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, 20000)

      req.signal.addEventListener('abort', () => {
        clearInterval(pollInterval)
        clearInterval(heartbeatInterval)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
