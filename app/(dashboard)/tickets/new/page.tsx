'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { DeptCategoryPicker } from '@/components/DeptCategoryPicker'

export default function NewTicketPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user as any
  const isAdminOrTech = user?.role === 'admin' || user?.role === 'technician'

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    type: 'incident',
    category_id: '',
    department_id: '',
    assignee_id: '',
    due_date: '',
  })
  const [technicians, setTechnicians] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAdminOrTech) {
      fetch('/api/users?active=true').then(r => r.json()).then(u =>
        setTechnicians(u.filter((x: any) => x.role !== 'user'))
      )
    }
  }, [isAdminOrTech])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        category_id: form.category_id || null,
        department_id: form.department_id || null,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
      }),
    })

    setSubmitting(false)
    if (res.ok) {
      const data = await res.json()
      router.push(`/tickets/${data.id}`)
    } else {
      const data = await res.json()
      setError(data.error || 'Erro ao criar chamado')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/tickets"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para chamados
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Abrir Novo Chamado</h1>
        <p className="text-gray-500 text-sm mt-1">Preencha as informações do seu chamado</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            placeholder="Descreva brevemente o problema ou solicitação"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={5}
            placeholder="Descreva com detalhes o problema, quando ocorre, passos para reproduzir..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Tipo + Prioridade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="incident">Incidente</option>
              <option value="request">Requisição</option>
              <option value="problem">Problema</option>
              <option value="change">Mudança</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prioridade</label>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
        </div>

        {/* Departamento + Categoria (bidirecional) */}
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">
            Classificação
          </p>
          <DeptCategoryPicker
            departmentId={form.department_id}
            categoryId={form.category_id}
            onDepartmentChange={v => setForm(f => ({ ...f, department_id: v }))}
            onCategoryChange={v => {
              setForm(f => ({ ...f, category_id: v }))
            }}
          />
        </div>

        {/* Atribuição e Prazo (somente admin/técnico) */}
        {isAdminOrTech && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Atribuir a</label>
              <select
                value={form.assignee_id}
                onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Não atribuído</option>
                {technicians.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prazo</label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/tickets"
            className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
          >
            {submitting ? 'Criando...' : 'Criar Chamado'}
          </button>
        </div>
      </form>
    </div>
  )
}
