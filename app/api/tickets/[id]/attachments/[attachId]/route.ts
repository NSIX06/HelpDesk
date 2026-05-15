import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, attachId } = await params

    const result = await sql`
      SELECT * FROM ticket_attachments
      WHERE id = ${parseInt(attachId)} AND ticket_id = ${parseInt(id)}
    `

    if (!result.length) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })

    const attachment = result[0] as any
    const base64Data = attachment.file_data.replace(/^data:[^;]+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.original_name)}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('GET /api/tickets/[id]/attachments/[attachId]:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
