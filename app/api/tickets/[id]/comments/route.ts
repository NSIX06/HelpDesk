import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { notifyTicketParticipants } from '@/lib/notifications'

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
    const ticketId = parseInt(id)

    let comments
    if (isAdminOrTech) {
      comments = await sql`
        SELECT
          tc.id, tc.ticket_id, tc.user_id, tc.content, tc.is_internal, tc.created_at,
          u.name as user_name, u.role as user_role,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', ta.id,
                'original_name', ta.original_name,
                'file_size', ta.file_size,
                'mime_type', ta.mime_type,
                'created_at', ta.created_at
              )
            ) FILTER (WHERE ta.id IS NOT NULL),
            '[]'
          ) as attachments
        FROM ticket_comments tc
        JOIN users u ON tc.user_id = u.id
        LEFT JOIN ticket_attachments ta ON ta.comment_id = tc.id
        WHERE tc.ticket_id = ${ticketId}
        GROUP BY tc.id, u.name, u.role
        ORDER BY tc.created_at ASC
      `
    } else {
      comments = await sql`
        SELECT
          tc.id, tc.ticket_id, tc.user_id, tc.content, tc.is_internal, tc.created_at,
          u.name as user_name, u.role as user_role,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', ta.id,
                'original_name', ta.original_name,
                'file_size', ta.file_size,
                'mime_type', ta.mime_type,
                'created_at', ta.created_at
              )
            ) FILTER (WHERE ta.id IS NOT NULL),
            '[]'
          ) as attachments
        FROM ticket_comments tc
        JOIN users u ON tc.user_id = u.id
        LEFT JOIN ticket_attachments ta ON ta.comment_id = tc.id
        WHERE tc.ticket_id = ${ticketId} AND tc.is_internal = false
        GROUP BY tc.id, u.name, u.role
        ORDER BY tc.created_at ASC
      `
    }

    return NextResponse.json(comments)
  } catch (err) {
    console.error('GET /api/tickets/[id]/comments:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const sessionUser = session.user as any
    const isAdminOrTech = sessionUser.role === 'admin' || sessionUser.role === 'technician'
    const ticketId = parseInt(id)

    const body = await req.json()
    const { content, is_internal, attachments } = body

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 })
    }

    const internal = isAdminOrTech && is_internal === true

    const commentResult = await sql`
      INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal)
      VALUES (${ticketId}, ${parseInt(sessionUser.id)}, ${content || ''}, ${internal})
      RETURNING id
    `

    const commentId = (commentResult[0] as any).id

    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        await sql`
          INSERT INTO ticket_attachments (ticket_id, comment_id, original_name, file_data, file_size, mime_type, uploaded_by)
          VALUES (${ticketId}, ${commentId}, ${att.original_name}, ${att.file_data}, ${att.file_size || null}, ${att.mime_type || null}, ${parseInt(sessionUser.id)})
        `
      }
    }

    await sql`UPDATE tickets SET updated_at = NOW() WHERE id = ${ticketId}`

    // Get ticket title for notification
    const ticketData = await sql`SELECT title FROM tickets WHERE id = ${ticketId}`
    const ticketTitle = (ticketData[0] as any)?.title || `Chamado #${ticketId}`

    // Notify all participants (except the commenter) — fire and forget
    if (!internal) {
      notifyTicketParticipants({
        ticketId,
        excludeUserId: parseInt(sessionUser.id),
        type: 'new_comment',
        title: `Nova mensagem em: ${ticketTitle}`,
        message: content ? content.slice(0, 120) : 'Novo anexo adicionado',
      }).catch(console.error)
    }

    return NextResponse.json({ id: commentId }, { status: 201 })
  } catch (err) {
    console.error('POST /api/tickets/[id]/comments:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
