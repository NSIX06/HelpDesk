import { sql } from './db'

export async function createNotification({
  userId,
  ticketId,
  type,
  title,
  message,
}: {
  userId: number
  ticketId: number
  type: string
  title: string
  message?: string
}) {
  try {
    await sql`
      INSERT INTO notifications (user_id, ticket_id, type, title, message)
      VALUES (${userId}, ${ticketId}, ${type}, ${title}, ${message || null})
    `
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}

export async function notifyTicketParticipants({
  ticketId,
  excludeUserId,
  type,
  title,
  message,
}: {
  ticketId: number
  excludeUserId: number
  type: string
  title: string
  message?: string
}) {
  try {
    // Get requester and assignee
    const ticket = await sql`
      SELECT requester_id, assignee_id FROM tickets WHERE id = ${ticketId}
    `
    if (!ticket.length) return

    const { requester_id, assignee_id } = ticket[0] as any
    const targets = new Set<number>()

    if (requester_id && requester_id !== excludeUserId) targets.add(requester_id)
    if (assignee_id && assignee_id !== excludeUserId) targets.add(assignee_id)

    // Also get users who commented on this ticket
    const commenters = await sql`
      SELECT DISTINCT user_id FROM ticket_comments
      WHERE ticket_id = ${ticketId} AND user_id != ${excludeUserId}
    `
    for (const c of commenters as any[]) targets.add(c.user_id)

    for (const userId of targets) {
      await createNotification({ userId, ticketId, type, title, message })
    }
  } catch (err) {
    console.error('Failed to notify participants:', err)
  }
}
