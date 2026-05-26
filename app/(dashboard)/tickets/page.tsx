'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Search, Filter, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'
import {
  statusLabels, statusColors, priorityLabels, priorityColors,
  typeLabels, formatDate
} from '@/lib/utils'

const STATUS_OPTIONS = ['', 'new', 'in_progress', 'pending', 'resolved', 'closed']
const PRIORITY_OPTIONS = ['', 'low', 'medium', 'high', 'critical']
const TYPE_OPTIONS = ['', 'incident', 'request', 'problem', 'change']

export default function TicketsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isAdminOrTech = user?.role === 'admin' || user?.role === 'technician'

  const [tickets, setTickets] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [type, setType] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      search,
      status,
      priority,
      type,
    })
    const res = await fetch(`/api/tickets?${params}`)
    if (res.ok) {
      const data = await res.json()
      setTickets(data.tickets)
      setTotal(data.total)
      setPages(data.pages)
    }
    setLoading(false)
  }, [page, search, status, priority, type])

  useEffect(() => { load() }, [load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load()
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Chamados"
        subtitle={`${total} chamado(s) encontrado(s)`}
        action={
          <Link
            href="/tickets/new"
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.35)]"
          >
            <Plus className="w-4 h-4" />
            Novo Chamado
          </Link>
        }
      />

      {/* Filters */}
      <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-4 mb-5">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="flex-1 min-w-0 sm:min-w-48 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou número..."
              className="w-full pl-9 pr-4 bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>

          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>

          <select
            value={priority}
            onChange={e => { setPriority(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          >
            <option value="">Todas as prioridades</option>
            {PRIORITY_OPTIONS.filter(Boolean).map(p => (
              <option key={p} value={p}>{priorityLabels[p]}</option>
            ))}
          </select>

          <select
            value={type}
            onChange={e => { setType(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          >
            <option value="">Todos os tipos</option>
            {TYPE_OPTIONS.filter(Boolean).map(t => (
              <option key={t} value={t}>{typeLabels[t]}</option>
            ))}
          </select>

          <button
            type="submit"
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
        </form>
      </div>

      {/* Tickets list */}
      <div className="bg-slate-900 border border-white/[0.06] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-7 h-7 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Carregando...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-600">Nenhum chamado encontrado</p>
            <Link href="/tickets/new" className="mt-3 inline-block text-violet-400 text-sm hover:underline">
              Criar primeiro chamado
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider w-16">#</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Título</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Prioridade</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                  {isAdminOrTech && (
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Solicitante</th>
                  )}
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {tickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-white/[0.02] transition group">
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">#{ticket.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-medium text-slate-200 group-hover:text-violet-300 transition-colors line-clamp-1"
                      >
                        {ticket.title}
                      </Link>
                      {ticket.category_name && (
                        <p className="text-xs text-slate-500 mt-0.5">{ticket.category_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{typeLabels[ticket.type] || ticket.type}</td>
                    <td className="px-4 py-3">
                      <Badge label={priorityLabels[ticket.priority] || ticket.priority} className={priorityColors[ticket.priority]} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={statusLabels[ticket.status] || ticket.status} className={statusColors[ticket.status]} />
                    </td>
                    {isAdminOrTech && (
                      <td className="px-4 py-3 text-slate-300 hidden lg:table-cell">{ticket.requester_name}</td>
                    )}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden lg:table-cell">
                      {formatDate(ticket.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-white/[0.04]">
              {tickets.map(ticket => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex flex-col gap-2 px-4 py-3.5 hover:bg-white/[0.03] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-200 line-clamp-2 flex-1">{ticket.title}</span>
                    <span className="text-slate-600 font-mono text-xs shrink-0">#{ticket.id}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={statusLabels[ticket.status] || ticket.status} className={statusColors[ticket.status]} />
                    <Badge label={priorityLabels[ticket.priority] || ticket.priority} className={priorityColors[ticket.priority]} />
                    <span className="text-xs text-slate-500">{typeLabels[ticket.type]}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    {isAdminOrTech && <span>{ticket.requester_name}</span>}
                    <span className="ml-auto">{formatDate(ticket.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-sm text-slate-500">
              Página {page} de {pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 bg-slate-800 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-xl text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="flex items-center gap-1 bg-slate-800 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-xl text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
