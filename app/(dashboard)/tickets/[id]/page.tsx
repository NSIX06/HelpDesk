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
  const [categories, setCategories] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
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
      fetch('/api/categories?flat=true').then(r => r.json()).then(setCategories)
      fetch('/api/departments').then(r => r.json()).then(setDepartments)
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!ticket) return null

  const isClosed = ticket.status === 'closed'
  const parentCats = categories.filter((c: any) => !c.parent_id)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href="/tickets" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar para chamados
        </Link>

        <div className="flex items-center gap-3">
          {/* Notification permission button */}
          {'Notification' in window && notifPermission !== 'granted' && notifPermission !== 'denied' && (
            <button
              onClick={handleRequestNotification}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition"
            >
              <Bell className="w-3.5 h-3.5" />
              Ativar notificações do PC
            </button>
          )}
          {notifPermission === 'granted' && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <Bell className="w-3.5 h-3.5" />
              Notificações ativas
            </span>
          )}
          {notifPermission === 'denied' && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <BellOff className="w-3.5 h-3.5" />
              Notificações bloqueadas
            </span>
          )}

          {/* Live indicator */}
          <div className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border',
            liveConnected
              ? 'text-green-600 bg-green-50 border-green-200'
              : 'text-gray-400 bg-gray-50 border-gray-200'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', liveConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
            {liveConnected ? 'Ao vivo' : 'Reconectando...'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main — Chat */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Ticket header */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-gray-400 font-mono text-sm">#{ticket.id}</span>
                  <Badge label={statusLabels[ticket.status] || ticket.status} className={statusColors[ticket.status]} />
                  <Badge label={priorityLabels[ticket.priority] || ticket.priority} className={priorityColors[ticket.priority]} />
                  <span className="text-xs text-gray-400">{typeLabels[ticket.type]}</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
                {ticket.description && (
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
                )}
              </div>
              {(isAdminOrTech || (!isClosed && ticket.requester_id === parseInt(user?.id))) && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">
                Atualizações ({comments.length})
              </h2>
            </div>

            {/* Messages list */}
            <div className="overflow-y-auto p-5 space-y-4 min-h-64 max-h-[500px] scrollbar-thin">
              {comments.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhuma mensagem ainda. Inicie a conversa abaixo.
                </div>
              )}
              {comments.map((c: any) => {
                const isMe = String(c.user_id) === String(user?.id)
                return (
                  <div key={c.id} className={cn('flex gap-3', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold shrink-0',
                      c.user_role === 'admin' ? 'bg-purple-500' :
                      c.user_role === 'technician' ? 'bg-blue-500' : 'bg-gray-400'
                    )}>
                      {getInitials(c.user_name || '?')}
                    </div>
                    <div className={cn('max-w-[70%] flex flex-col gap-1', isMe ? 'items-end' : 'items-start')}>
                      <div className={cn('flex items-center gap-2 text-xs text-gray-400', isMe && 'flex-row-reverse')}>
                        <span className="font-medium text-gray-600">{c.user_name}</span>
                        <span>{formatDate(c.created_at)}</span>
                        {c.is_internal && (
                          <span className="flex items-center gap-0.5 text-orange-500">
                            <Lock className="w-3 h-3" /> Interno
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm',
                        c.is_internal ? 'bg-orange-50 border border-orange-200 text-orange-900'
                          : isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
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
                                  isMe ? 'bg-blue-500 text-blue-100' : 'bg-white border border-gray-200 text-gray-700'
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
              <form onSubmit={handleSend} className="border-t border-gray-100 p-4">
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg px-3 py-1.5">
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate max-w-32">{f.original_name}</span>
                        <button type="button" onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))}>
                          <X className="w-3 h-3 hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isAdminOrTech && (
                  <label className="flex items-center gap-2 text-xs text-gray-500 mb-2 cursor-pointer w-fit select-none">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={e => setIsInternal(e.target.checked)}
                      className="rounded text-orange-500"
                    />
                    <Lock className="w-3 h-3 text-orange-400" />
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
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center justify-center w-10 h-10 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                      <input type="file" multiple className="hidden" onChange={handleFileInput} />
                    </label>
                    <button
                      type="submit"
                      disabled={sending || (!message.trim() && pendingFiles.length === 0)}
                      className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="border-t border-gray-100 p-4 text-center text-sm text-gray-400">
                Este chamado está encerrado
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Details */}
        <div className="space-y-4">
          {/* Actions */}
          {(isAdminOrTech || (!isClosed && ticket.requester_id === parseInt(user?.id))) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Ações</h3>
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
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Detalhes</h3>
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
                  {ticket.parent_category_name && <span className="text-gray-400">{ticket.parent_category_name} / </span>}
                  {ticket.category_name}
                </DetailRow>
              )}
              {ticket.department_name && <DetailRow label="Departamento">{ticket.department_name}</DetailRow>}
              <DetailRow label="Solicitante">
                <span className="text-blue-600">{ticket.requester_name}</span>
              </DetailRow>
              <DetailRow label="Técnico">
                {ticket.assignee_name || <span className="text-gray-400">Não atribuído</span>}
              </DetailRow>
              {ticket.due_date && (
                <DetailRow label="Prazo">
                  <span className={new Date(ticket.due_date) < new Date() && !isClosed ? 'text-red-600 font-medium' : ''}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Título</label>
            <input
              value={editForm.title || ''} onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              value={editForm.description || ''} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {isAdminOrTech && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {(['status', 'priority', 'type'] as const).map(field => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 capitalize">{
                      field === 'status' ? 'Status' : field === 'priority' ? 'Prioridade' : 'Tipo'
                    }</label>
                    <select
                      value={editForm[field] || ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, [field]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                  <select
                    value={editForm.category_id || ''}
                    onChange={e => setEditForm((f: any) => ({ ...f, category_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem categoria</option>
                    {parentCats.map((c: any) => (
                      <optgroup key={c.id} label={c.name}>
                        <option value={c.id}>{c.name}</option>
                        {categories.filter((s: any) => s.parent_id === c.id).map((s: any) => (
                          <option key={s.id} value={s.id}>&nbsp;&nbsp;{s.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Departamento</label>
                  <select
                    value={editForm.department_id || ''}
                    onChange={e => setEditForm((f: any) => ({ ...f, department_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem departamento</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Técnico Responsável</label>
                  <select
                    value={editForm.assignee_id || ''}
                    onChange={e => setEditForm((f: any) => ({ ...f, assignee_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Não atribuído</option>
                    {technicians.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({roleLabels[t.role]})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prazo</label>
                  <input
                    type="datetime-local" value={editForm.due_date || ''}
                    onChange={e => setEditForm((f: any) => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button
              onClick={handleEditSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
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
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 text-right">{children}</dd>
    </div>
  )
}

function ActionBtn({ onClick, color, children }: { onClick: any; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-800',
    green: 'bg-green-50 hover:bg-green-100 text-green-800',
    gray: 'bg-gray-50 hover:bg-gray-100 text-gray-700',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-800',
  }
  return (
    <button onClick={onClick} className={cn('w-full text-sm font-medium px-3 py-2 rounded-lg transition text-left', colors[color] || colors.gray)}>
      {children}
    </button>
  )
}
