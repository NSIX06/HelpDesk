'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, ToggleLeft, ToggleRight, AlertCircle, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { formatDate } from '@/lib/utils'

export default function DepartmentsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as any

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/dashboard')
  }, [user, router])

  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDept, setEditDept] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '', active: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetch('/api/departments?active=false').then(r => r.json())
    setDepartments(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditDept(null)
    setForm({ name: '', description: '', active: true })
    setError('')
    setModalOpen(true)
  }

  function openEdit(d: any) {
    setEditDept(d)
    setForm({ name: d.name, description: d.description || '', active: d.active })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    setError('')
    if (!form.name) { setError('Nome é obrigatório'); return }
    setSaving(true)

    const res = editDept
      ? await fetch(`/api/departments/${editDept.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      : await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })

    setSaving(false)
    if (res.ok) { setModalOpen(false); load() }
    else { const d = await res.json(); setError(d.error || 'Erro ao salvar') }
  }

  async function handleToggle(d: any) {
    await fetch(`/api/departments/${d.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, active: !d.active }),
    })
    load()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Departamentos"
        subtitle={`${departments.length} departamento(s)`}
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Novo Departamento
          </button>
        }
      />

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Nenhum departamento cadastrado
            </div>
          )}
          {departments.map((d: any) => (
            <div
              key={d.id}
              className={`bg-white rounded-xl border shadow-sm p-5 ${d.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{d.name}</h3>
                    <Badge
                      label={d.active ? 'Ativo' : 'Inativo'}
                      className={d.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}
                    />
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(d)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(d)}
                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                    title={d.active ? 'Desativar' : 'Ativar'}
                  >
                    {d.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {d.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{d.description}</p>
              )}
              <div className="flex gap-4 text-xs text-gray-400">
                <span>{d.user_count || 0} usuário(s)</span>
                <span>{d.ticket_count || 0} chamado(s)</span>
              </div>
              <p className="text-xs text-gray-300 mt-2">{formatDate(d.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editDept ? 'Editar Departamento' : 'Novo Departamento'}
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {editDept && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="rounded"
              />
              Departamento ativo
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
            >
              {saving ? 'Salvando...' : editDept ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
