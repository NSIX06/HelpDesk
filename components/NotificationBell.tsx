'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Ticket, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Notification {
  id: number
  type: string
  title: string
  message: string | null
  read: boolean
  created_at: string
  ticket_id: number | null
  ticket_title: string | null
}

const typeColors: Record<string, string> = {
  new_comment:     'bg-violet-600',
  status_changed:  'bg-emerald-600',
  assigned:        'bg-cyan-600',
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?count=true')
      if (res.ok) { const d = await res.json(); setCount(d.count || 0) }
    } catch {}
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setNotifications(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadCount()
    const interval = setInterval(loadCount, 30000)
    return () => clearInterval(interval)
  }, [loadCount])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleOpen() {
    setOpen(o => !o)
    if (!open) await loadNotifications()
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function handleNotificationClick(n: Notification) {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [n.id] }),
    })
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    setCount(prev => Math.max(0, prev - (n.read ? 0 : 1)))
    if (n.ticket_id) { setOpen(false); router.push(`/tickets/${n.ticket_id}`) }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-200"
        title="Notificações"
      >
        <Bell className="w-4.5 h-4.5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[9px] font-bold rounded-full px-1">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full ml-2 top-0 w-80 bg-slate-900 border border-white/[0.08] rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-violet-500/10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Notificações
              </h3>
              {count > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold ring-1 ring-violet-500/30">
                  {count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button onClick={markAllRead} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" /> Lidas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {loading && (
              <div className="py-8 text-center">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-10 text-center text-slate-500 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhuma notificação
              </div>
            )}
            {!loading && notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-white/[0.04]',
                  !n.read ? 'bg-violet-500/5 hover:bg-violet-500/10' : 'hover:bg-white/[0.03]'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-xl shrink-0 mt-0.5 text-white',
                  typeColors[n.type] || 'bg-slate-700'
                )}>
                  <Ticket className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-snug', n.read ? 'text-slate-400' : 'text-slate-200 font-medium')}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-1">{formatDate(n.created_at)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-violet-500 rounded-full shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
