'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, ChevronRight, Tag, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import { Modal } from '@/components/Modal'

export default function CategoriesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as any

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/dashboard')
  }, [user, router])

  const [categories, setCategories] = useState<any[]>([])
  const [flatCategories, setFlatCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCat, setEditCat] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '', parent_id: '', active: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedRoots, setExpandedRoots] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const [tree, flat] = await Promise.all([
      fetch('/api/categories?active=false').then(r => r.json()),
      fetch('/api/categories?flat=true&active=false').then(r => r.json()),
    ])
    setCategories(Array.isArray(tree) ? tree : [])
    setFlatCategories(Array.isArray(flat) ? flat : [])
    setExpandedRoots(new Set((Array.isArray(tree) ? tree : []).map((c: any) => c.id)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate(parentId?: number) {
    setEditCat(null)
    setForm({ name: '', description: '', parent_id: parentId ? String(parentId) : '', active: true })
    setError('')
    setModalOpen(true)
  }

  function openEdit(c: any) {
    setEditCat(c)
    setForm({
      name: c.name,
      description: c.description || '',
      parent_id: c.parent_id ? String(c.parent_id) : '',
      active: c.active,
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    setError('')
    if (!form.name) { setError('Nome é obrigatório'); return }
    setSaving(true)

    const body = {
      ...form,
      parent_id: form.parent_id ? parseInt(form.parent_id) : null,
    }

    const res = editCat
      ? await fetch(`/api/categories/${editCat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

    setSaving(false)
    if (res.ok) { setModalOpen(false); load() }
    else { const d = await res.json(); setError(d.error || 'Erro ao salvar') }
  }

  async function handleToggle(c: any) {
    await fetch(`/api/categories/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, active: !c.active }),
    })
    load()
  }

  const parentOnlyCategories = flatCategories.filter((c: any) => !c.parent_id)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Categorias de Chamados"
        subtitle="Gerencie tipos e subtipos de chamados"
        action={
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Nova Categoria
          </button>
        }
      />

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {categories.length === 0 && (
            <div className="py-12 text-center text-gray-400">Nenhuma categoria cadastrada</div>
          )}
          {categories.map((cat: any) => (
            <div key={cat.id}>
              {/* Parent category */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition group">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedRoots(prev => {
                      const n = new Set(prev)
                      if (n.has(cat.id)) n.delete(cat.id); else n.add(cat.id)
                      return n
                    })}
                    className="p-0.5"
                  >
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedRoots.has(cat.id) ? 'rotate-90' : ''}`} />
                  </button>
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                    <Tag className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{cat.name}</span>
                    {cat.description && (
                      <p className="text-xs text-gray-400">{cat.description}</p>
                    )}
                  </div>
                  <Badge
                    label={cat.active ? 'Ativo' : 'Inativo'}
                    className={cat.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}
                  />
                  {cat.children?.length > 0 && (
                    <span className="text-xs text-gray-400">{cat.children.length} subtipo(s)</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openCreate(cat.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Subtipo
                  </button>
                  <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleToggle(cat)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition">
                    {cat.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Children */}
              {expandedRoots.has(cat.id) && cat.children?.map((child: any) => (
                <div
                  key={child.id}
                  className="flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-gray-50/50 hover:bg-gray-50 transition group"
                >
                  <div className="flex items-center gap-3 pl-9">
                    <div className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-md">
                      <Tag className="w-3 h-3 text-gray-500" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">{child.name}</span>
                      {child.description && (
                        <p className="text-xs text-gray-400">{child.description}</p>
                      )}
                    </div>
                    <Badge
                      label={child.active ? 'Ativo' : 'Inativo'}
                      className={child.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}
                    />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEdit(child)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggle(child)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition">
                      {child.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editCat ? 'Editar Categoria' : 'Nova Categoria'}
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
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Categoria pai (para subtipos)
            </label>
            <select
              value={form.parent_id}
              onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Nenhuma (categoria raiz)</option>
              {parentOnlyCategories
                .filter((c: any) => c.id !== editCat?.id)
                .map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
          {editCat && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="rounded"
              />
              Categoria ativa
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
              {saving ? 'Salvando...' : editCat ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
