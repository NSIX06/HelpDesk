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
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Novo Chamado
          </Link>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="flex-1 min-w-0 sm:min-w-48 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou número..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>

          <select
            value={priority}
            onChange={e => { setPriority(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as prioridades</option>
            {PRIORITY_OPTIONS.filter(Boolean).map(p => (
              <option key={p} value={p}>{priorityLabels[p]}</option>
            ))}
          </select>

          <select
            value={type}
            onChange={e => { setType(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os tipos</option>
            {TYPE_OPTIONS.filter(Boolean).map(t => (
              <option key={t} value={t}>{typeLabels[t]}</option>
            ))}
          </select>

          <button
            type="submit"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
        </form>
      </div>

      {/* Tickets list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Carregando...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">Nenhum chamado encontrado</p>
            <Link href="/tickets/new" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
              Criar primeiro chamado
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium w-16">#</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Título</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Prioridade</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  {isAdminOrTech && (
                    <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Solicitante</th>
                  )}
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition group">
                    <td className="px-4 py-3 text-gray-400 font-mono">#{ticket.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-medium text-gray-900 group-hover:text-blue-600 transition line-clamp-1"
                      >
                        {ticket.title}
                      </Link>
                      {ticket.category_name && (
                        <p className="text-xs text-gray-400 mt-0.5">{ticket.category_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{typeLabels[ticket.type] || ticket.type}</td>
                    <td className="px-4 py-3">
                      <Badge label={priorityLabels[ticket.priority] || ticket.priority} className={priorityColors[ticket.priority]} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={statusLabels[ticket.status] || ticket.status} className={statusColors[ticket.status]} />
                    </td>
                    {isAdminOrTech && (
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{ticket.requester_name}</td>
                    )}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden lg:table-cell">
                      {formatDate(ticket.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {tickets.map(ticket => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex flex-col gap-2 px-4 py-3.5 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-gray-900 line-clamp-2 flex-1">{ticket.title}</span>
                    <span className="text-gray-400 font-mono text-xs shrink-0">#{ticket.id}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={statusLabels[ticket.status] || ticket.status} className={statusColors[ticket.status]} />
                    <Badge label={priorityLabels[ticket.priority] || ticket.priority} className={priorityColors[ticket.priority]} />
                    <span className="text-xs text-gray-400">{typeLabels[ticket.type]}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Página {page} de {pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
