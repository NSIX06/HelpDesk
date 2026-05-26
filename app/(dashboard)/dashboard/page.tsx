'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Ticket, Clock, CheckCircle2, XCircle,
  AlertTriangle, TrendingUp, ChevronRight, RefreshCw
} from 'lucide-react'
import { statusLabels, statusColors, priorityLabels, priorityColors, formatDate } from '@/lib/utils'
import { Badge } from '@/components/Badge'

interface DashboardData {
  stats: Record<string, number>
  priorityStats: Array<{ priority: string; count: string }>
  recentTickets: any[]
  myAssignedTickets: any[]
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/dashboard')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats || {}

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Aqui está um resumo dos chamados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <Link
            href="/tickets/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Novo Chamado
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total || 0} icon={Ticket} color="bg-blue-100 text-blue-600" />
        <StatCard label="Novos" value={stats.new || 0} icon={AlertTriangle} color="bg-purple-100 text-purple-600" />
        <StatCard label="Em Andamento" value={stats.in_progress || 0} icon={Clock} color="bg-yellow-100 text-yellow-600" />
        <StatCard label="Resolvidos" value={(stats.resolved || 0) + (stats.closed || 0)} icon={CheckCircle2} color="bg-green-100 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Chamados Recentes</h2>
            <Link href="/tickets" className="text-blue-600 text-sm hover:text-blue-700 flex items-center gap-1">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.recentTickets?.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">Nenhum chamado encontrado</div>
            )}
            {data?.recentTickets?.map((t: any) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group"
              >
                <span className="text-gray-400 text-xs font-mono w-10 shrink-0">#{t.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition">
                    {t.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    label={priorityLabels[t.priority] || t.priority}
                    className={priorityColors[t.priority]}
                  />
                  <Badge
                    label={statusLabels[t.status] || t.status}
                    className={statusColors[t.status]}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar stats */}
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Status dos Chamados</h2>
            <div className="space-y-3">
              {Object.entries(statusLabels).map(([key, label]) => {
                const count = stats[key] || 0
                const total = stats.total || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Priority breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Por Prioridade (abertos)</h2>
            <div className="space-y-2">
              {data?.priorityStats?.map((p: any) => (
                <div key={p.priority} className="flex items-center justify-between">
                  <Badge
                    label={priorityLabels[p.priority] || p.priority}
                    className={priorityColors[p.priority]}
                  />
                  <span className="text-sm font-semibold text-gray-900">{p.count}</span>
                </div>
              ))}
              {!data?.priorityStats?.length && (
                <p className="text-sm text-gray-400 text-center py-2">Nenhum chamado aberto</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* My assigned tickets (admin/tech) */}
      {(data?.myAssignedTickets?.length ?? 0) > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Atribuídos a Mim</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.myAssignedTickets?.map((t: any) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group"
              >
                <span className="text-gray-400 text-xs font-mono w-10 shrink-0">#{t.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                    {t.title}
                  </p>
                  <p className="text-xs text-gray-400">{t.requester_name}</p>
                </div>
                <Badge label={statusLabels[t.status] || t.status} className={statusColors[t.status]} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
