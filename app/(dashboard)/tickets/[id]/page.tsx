'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  ArrowLeft, Send, Paperclip, X, Download, Lock,
  CheckCircle2, Edit2, Save, Bell, BellOff
} from 'lucide-react'
import {
  statusLabels, statusColors, priorityLabels, priorityColors,
  typeLabels, roleLabels, formatDate, formatFileSize, getInitials, cn
} from '@/lib/utils'
import { Badge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { DeptCategoryPicker } from '@/components/DeptCategoryPicker'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// ─── Browser notification helpers ─────────────────────────────────────────────

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function showBrowserNotification(title: string, body: string, ticketId: number) {
  if (Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return // only when tab is hidden

  const n = new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: `ticket-${ticketId}`,
  })
  n.onclick = () => {
    window.focus()
    n.close()
  }
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user as any
  const isAdminOrTech = user?.role === 'admin' || user?.role === 'technician'
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const lastCommentIdRef = useRef<number>(0)

  const [ticket, setTicket] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<any[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [technicians, setTechnicians] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [liveConnected, setLiveConnected] = useState(false)

  const loadTicket = useCallback(async () => {
    const res = await fetch(`/api/tickets/${params.id}`)
    if (res.ok) {
      const t = await res.json()
      setTicket(t)
      setEditForm({
        title: t.title, description: t.description || '',
        status: t.status, priority: t.priority, type: t.type,
        category_id: t.category_id || '', department_id: t.department_id || '',
        assignee_id: t.assignee_id || '',
        due_date: t.due_date ? t.due_date.slice(0, 16) : '',
      })
    } else {
      router.push('/tickets')
    }
  }, [params.id, router])

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/tickets/${params.id}/comments`)
    if (res.ok) {
      const data = await res.json()
      setComments(data)
      if (data.length > 0) {
        lastCommentIdRef.current = data[data.length - 1].id
      }
    }
  }, [params.id])

  // ── SSE connection ──────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const url = `/api/tickets/${params.id}/stream?after=${lastCommentIdRef.current}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => setLiveConnected(true)

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)

        if (payload.type === 'connected') {
          setLiveConnected(true)
          return
        }

        if (payload.type === 'comments' && payload.data?.length > 0) {
          const newComments: any[] = payload.data

          setComments(prev => {
            // Deduplicate by ID
            const existingIds = new Set(prev.map((c: any) => c.id))
            const fresh = newComments.filter(c => !existingIds.has(c.id))
            if (fresh.length === 0) return prev
            return [...prev, ...fresh]
          })

          lastCommentIdRef.current = newComments[newComments.length - 1].id

          // Browser notification for messages from other users
          const fromOthers = newComments.filter(c => String(c.user_id) !== String(user?.id))
          if (fromOthers.length > 0) {
            const last = fromOthers[fromOthers.length - 1]
            showBrowserNotification(
              `Nova mensagem de ${last.user_name}`,
              last.content || 'Novo anexo',
              parseInt(params.id as string)
            )
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      setLiveConnected(false)
      es.close()
      // Reconnect after 5 seconds
      setTimeout(connectSSE, 5000)
    }
  }, [params.id, user?.id])

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadTicket(), loadComments()])
      setLoading(false)
    }
    init()
  }, [loadTicket, loadComments])

  // Start SSE after initial load
  useEffect(() => {
    if (!loading && user) {
      connectSSE()
    }
    return () => {
      eventSourceRef.current?.close()
    }
  }, [loading, connectSSE, user])

  // Notification permission check
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  // Scroll to bottom on new comments
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  // Reload edit modal data
  useEffect(() => {
    if (editOpen) {
      fetch('/api/users?active=true').then(r => r.json()).then(u =>
        setTechnicians(u.filter((x: any) => x.role !== 'user'))
      )
    }
  }, [editOpen])

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() && pendingFiles.length === 0) return
    setSending(true)

    await fetch(`/api/tickets/${params.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message, is_internal: isInternal, attachments: pendingFiles }),
    })

    setMessage('')
    setPendingFiles([])
    setIsInternal(false)
    setSending(false)
    // SSE will pick up the new comment automatically
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { alert(`"${file.name}" excede 5MB`); continue }
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPendingFiles(prev => [...prev, {
          original_name: file.name, file_data: ev.target?.result,
          file_size: file.size, mime_type: file.type,
        }])
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  async function handleStatusChange(newStatus: string) {
    await fetch(`/api/tickets/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    await loadTicket()
  }

  async function handleEditSave() {
    setSaving(true)
    await fetch(`/api/tickets/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        category_id: editForm.category_id || null,
        department_id: editForm.department_id || null,
        assignee_id: editForm.assignee_id || null,
        due_date: editForm.due_date || null,
      }),
    })
    await loadTicket()
    setSaving(false)
    setEditOpen(false)
  }

  async function handleRequestNotification() {
    const granted = await requestNotificationPermission()
    setNotifPermission(granted ? 'granted' : 'denied')
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!ticket) return null

  const isClosed = ticket.status === 'closed'

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href="/tickets" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar para chamados
        </Link>

        <div className="flex items-center gap-3">
          {/* Notification permission button */}
          {'Notification' in window && notifPermission !== 'granted' && notifPermission !== 'denied' && (
            <button
              onClick={handleRequestNotification}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-200 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/[0.04] transition-all"
            >
              <Bell className="w-3.5 h-3.5" />
              Ativar notificações do PC
            </button>
          )}
          {notifPermission === 'granted' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
              <Bell className="w-3.5 h-3.5" />
              Notificações ativas
            </span>
          )}
          {notifPermission === 'denied' && (
            <span className="text-slate-500 text-xs flex items-center gap-1.5">
              <BellOff className="w-3.5 h-3.5" />
              Notificações bloqueadas
            </span>
          )}

          {/* Live indicator */}
          <div className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border',
            liveConnected
              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
              : 'text-slate-500 bg-slate-800 border-slate-700'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', liveConnected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600')} />
            {liveConnected ? 'Ao vivo' : 'Reconectando...'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main — Chat */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Ticket header */}
          <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-slate-600 font-mono text-sm">#{ticket.id}</span>
                  <Badge label={statusLabels[ticket.status] || ticket.status} className={statusColors[ticket.status]} />
                  <Badge label={priorityLabels[ticket.priority] || ticket.priority} className={priorityColors[ticket.priority]} />
                  <span className="text-xs text-slate-400">{typeLabels[ticket.type]}</span>
                </div>
                <h1 className="text-xl font-bold text-slate-100" style={{ fontFamily: 'Montserrat, sans-serif' }}>{ticket.title}</h1>
                {ticket.description && (
                  <p className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">{ticket.description}</p>
                )}
              </div>
              {(isAdminOrTech || (!isClosed && ticket.requester_id === parseInt(user?.id))) && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-200 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/[0.04] transition-all shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="bg-slate-900 border border-white/[0.06] rounded-2xl flex flex-col">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-semibold text-slate-100 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Atualizações ({comments.length})
              </h2>
            </div>

            {/* Messages list */}
            <div className="overflow-y-auto p-5 space-y-4 min-h-64 max-h-[500px] scrollbar-thin divide-white/[0.04]">
              {comments.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhuma mensagem ainda. Inicie a conversa abaixo.
                </div>
              )}
              {comments.map((c: any) => {
                const isMe = String(c.user_id) === String(user?.id)
                return (
                  <div key={c.id} className={cn('flex gap-3', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold shrink-0',
                      isMe ? 'bg-gradient-to-br from-violet-600 to-purple-700' :
                      c.user_role === 'admin' ? 'bg-purple-600' :
                      c.user_role === 'technician' ? 'bg-cyan-600' : 'bg-slate-600'
                    )}>
                      {getInitials(c.user_name || '?')}
                    </div>
                    <div className={cn('max-w-[70%] flex flex-col gap-1', isMe ? 'items-end' : 'items-start')}>
                      <div className={cn('flex items-center gap-2 text-xs text-slate-600', isMe && 'flex-row-reverse')}>
                        <span className="font-medium text-slate-300">{c.user_name}</span>
                        <span>{formatDate(c.created_at)}</span>
                        {c.is_internal && (
                          <span className="flex items-center gap-0.5 text-amber-400">
                            <Lock className="w-3 h-3" /> Interno
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm',
                        c.is_internal ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
                          : isMe ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white' : 'bg-slate-800 text-slate-200'
                      )}>
                        {c.content && <p className="whitespace-pre-wrap">{c.content}</p>}
                        {c.attachments && c.attachments.length > 0 && (
                          <div className={cn('space-y-1.5', c.content && 'mt-2')}>
                            {c.attachments.map((a: any) => (
                              <a
                                key={a.id}
                                href={`/api/tickets/${params.id}/attachments/${a.id}`}
                                download={a.original_name}
                                className={cn(
                                  'flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:opacity-80 transition',
                                  isMe ? 'bg-violet-500/40 text-violet-200' : 'bg-slate-700 border border-white/10 text-slate-300'
                                )}
                              >
                                <Download className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{a.original_name}</span>
                                <span className="shrink-0 opacity-70">{formatFileSize(a.file_size)}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {!isClosed ? (
              <form onSubmit={handleSend} className="border-t border-white/[0.06] p-4">
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-violet-500/15 text-violet-300 text-xs rounded-xl px-3 py-1.5 ring-1 ring-violet-500/30">
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate max-w-32">{f.original_name}</span>
                        <button type="button" onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))}>
                          <X className="w-3 h-3 hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isAdminOrTech && (
                  <label className="flex items-center gap-2 text-xs text-slate-400 mb-2 cursor-pointer w-fit select-none">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={e => setIsInternal(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <Lock className="w-3 h-3 text-amber-400" />
                    Nota interna (visível apenas para técnicos)
                  </label>
                )}

                <div className="flex gap-2">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any) }
                    }}
                    placeholder="Digite sua mensagem... (Enter envia, Shift+Enter nova linha)"
                    rows={2}
                    className="flex-1 bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
                  />
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center justify-center w-10 h-10 bg-slate-800 border border-white/10 rounded-xl hover:bg-slate-700 cursor-pointer transition-all">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <input type="file" multiple className="hidden" onChange={handleFileInput} />
                    </label>
                    <button
                      type="submit"
                      disabled={sending || (!message.trim() && pendingFiles.length === 0)}
                      className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl transition-all disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="border-t border-white/[0.06] p-4 text-center text-sm text-slate-500">
                Este chamado está encerrado
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Details */}
        <div className="space-y-4">
          {/* Actions */}
          {(isAdminOrTech || (!isClosed && ticket.requester_id === parseInt(user?.id))) && (
            <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-4">
              <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Ações</h3>
              <div className="space-y-2">
                {isAdminOrTech && ticket.status === 'new' && (
                  <ActionBtn onClick={() => handleStatusChange('in_progress')} color="yellow">
                    Iniciar Atendimento
                  </ActionBtn>
                )}
                {isAdminOrTech && ticket.status === 'in_progress' && (
                  <ActionBtn onClick={() => handleStatusChange('pending')} color="orange">
                    Aguardando Cliente
                  </ActionBtn>
                )}
                {isAdminOrTech && (ticket.status === 'in_progress' || ticket.status === 'pending') && (
                  <ActionBtn onClick={() => handleStatusChange('resolved')} color="green">
                    <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                    Marcar como Resolvido
                  </ActionBtn>
                )}
                {!isClosed && (
                  <ActionBtn
                    onClick={() => confirm('Encerrar este chamado?') && handleStatusChange('closed')}
                    color="gray"
                  >
                    Encerrar Chamado
                  </ActionBtn>
                )}
                {isAdminOrTech && isClosed && (
                  <ActionBtn onClick={() => handleStatusChange('in_progress')} color="blue">
                    Reabrir Chamado
                  </ActionBtn>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Detalhes</h3>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Status">
                <Badge label={statusLabels[ticket.status]} className={statusColors[ticket.status]} />
              </DetailRow>
              <DetailRow label="Prioridade">
                <Badge label={priorityLabels[ticket.priority]} className={priorityColors[ticket.priority]} />
              </DetailRow>
              <DetailRow label="Tipo">{typeLabels[ticket.type]}</DetailRow>
              {ticket.category_name && (
                <DetailRow label="Categoria">
                  {ticket.parent_category_name && <span className="text-slate-500">{ticket.parent_category_name} / </span>}
                  {ticket.category_name}
                </DetailRow>
              )}
              {ticket.department_name && <DetailRow label="Departamento">{ticket.department_name}</DetailRow>}
              <DetailRow label="Solicitante">
                <span className="text-violet-400">{ticket.requester_name}</span>
              </DetailRow>
              <DetailRow label="Técnico">
                {ticket.assignee_name || <span className="text-slate-600 italic">Não atribuído</span>}
              </DetailRow>
              {ticket.due_date && (
                <DetailRow label="Prazo">
                  <span className={new Date(ticket.due_date) < new Date() && !isClosed ? 'text-red-400 font-medium' : ''}>
                    {formatDate(ticket.due_date)}
                  </span>
                </DetailRow>
              )}
              <DetailRow label="Criado em">{formatDate(ticket.created_at)}</DetailRow>
              <DetailRow label="Atualizado em">{formatDate(ticket.updated_at)}</DetailRow>
              {ticket.resolved_at && <DetailRow label="Resolvido em">{formatDate(ticket.resolved_at)}</DetailRow>}
              {ticket.closed_at && <DetailRow label="Encerrado em">{formatDate(ticket.closed_at)}</DetailRow>}
            </dl>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Chamado" size="xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Título</label>
            <input
              value={editForm.title || ''} onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Descrição</label>
            <textarea
              value={editForm.description || ''} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
            />
          </div>
          {isAdminOrTech && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['status', 'priority', 'type'] as const).map(field => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{
                      field === 'status' ? 'Status' : field === 'priority' ? 'Prioridade' : 'Tipo'
                    }</label>
                    <select
                      value={editForm[field] || ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, [field]: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    >
                      {field === 'status' && <>
                        <option value="new">Novo</option>
                        <option value="in_progress">Em Andamento</option>
                        <option value="pending">Pendente</option>
                        <option value="resolved">Resolvido</option>
                        <option value="closed">Fechado</option>
                      </>}
                      {field === 'priority' && <>
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="critical">Crítica</option>
                      </>}
                      {field === 'type' && <>
                        <option value="incident">Incidente</option>
                        <option value="request">Requisição</option>
                        <option value="problem">Problema</option>
                        <option value="change">Mudança</option>
                      </>}
                    </select>
                  </div>
                ))}
              </div>
              <div className="bg-slate-800/50 border border-white/[0.06] rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Classificação</p>
                <DeptCategoryPicker
                  departmentId={editForm.department_id || ''}
                  categoryId={editForm.category_id || ''}
                  onDepartmentChange={v => setEditForm((f: any) => ({ ...f, department_id: v }))}
                  onCategoryChange={v => setEditForm((f: any) => ({ ...f, category_id: v }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Técnico Responsável</label>
                  <select
                    value={editForm.assignee_id || ''}
                    onChange={e => setEditForm((f: any) => ({ ...f, assignee_id: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  >
                    <option value="">Não atribuído</option>
                    {technicians.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({roleLabels[t.role]})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Prazo</label>
                  <input
                    type="datetime-local" value={editForm.due_date || ''}
                    onChange={e => setEditForm((f: any) => ({ ...f, due_date: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  />
                </div>
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditOpen(false)} className="bg-slate-800 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-xl px-4 py-2 text-sm font-medium transition-all">
              Cancelar
            </button>
            <button
              onClick={handleEditSave} disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.35)] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-xs text-slate-500 uppercase tracking-wide font-semibold shrink-0">{label}</dt>
      <dd className="text-sm text-slate-300 text-right">{children}</dd>
    </div>
  )
}

function ActionBtn({ onClick, color, children }: { onClick: any; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    yellow: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30',
    orange: 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30',
    green: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30',
    gray: 'bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-slate-300 border border-white/10',
    blue: 'bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30',
  }
  return (
    <button onClick={onClick} className={cn('rounded-xl px-3 py-2 text-sm font-medium w-full text-left transition-all', colors[color] || colors.gray)}>
      {children}
    </button>
  )
}
