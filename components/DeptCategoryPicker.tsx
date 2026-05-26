'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, X, Building2, Tag, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Department { id: number; name: string }
interface Category {
  id: number; name: string; parent_id: number | null; parent_name: string | null
  department_id: number | null; department_name: string | null
}
interface Props {
  departmentId: string; categoryId: string
  onDepartmentChange: (id: string) => void
  onCategoryChange: (id: string) => void
  disabled?: boolean
}

export function DeptCategoryPicker({ departmentId, categoryId, onDepartmentChange, onCategoryChange, disabled }: Props) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [catSearch, setCatSearch] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)

  const selectedDept = departments.find(d => String(d.id) === departmentId)
  const selectedCat = allCategories.find(c => String(c.id) === categoryId)

  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(setDepartments).catch(() => {})
    fetch('/api/categories?flat=true').then(r => r.json()).then(setAllCategories).catch(() => {})
  }, [])

  useEffect(() => {
    let cats = allCategories
    if (departmentId) cats = cats.filter(c => !c.department_id || String(c.department_id) === departmentId)
    if (catSearch.trim()) cats = cats.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    setFilteredCategories(cats)
  }, [departmentId, catSearch, allCategories])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false); setCatSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleDepartmentChange(newDeptId: string) {
    onDepartmentChange(newDeptId)
    if (categoryId) {
      const cat = allCategories.find(c => String(c.id) === categoryId)
      if (cat?.department_id && String(cat.department_id) !== newDeptId) onCategoryChange('')
    }
  }

  function handleCategorySelect(cat: Category) {
    onCategoryChange(String(cat.id))
    if (cat.department_id && !departmentId) onDepartmentChange(String(cat.department_id))
    setCatOpen(false); setCatSearch('')
  }

  const roots = filteredCategories.filter(c => !c.parent_id)
  const children = filteredCategories.filter(c => c.parent_id)
  const grouped = roots.map(root => ({ root, subs: children.filter(c => c.parent_id === root.id) }))
  const orphanChildren = children.filter(c => !roots.some(r => r.id === c.parent_id))
  const hasResults = grouped.length > 0 || orphanChildren.length > 0

  const selectCls = cn(
    'w-full bg-slate-800 border border-white/10 text-slate-200 rounded-xl px-3 py-2.5 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Department */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
          <Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
          Departamento
        </label>
        <select value={departmentId} onChange={e => handleDepartmentChange(e.target.value)} disabled={disabled} className={selectCls}>
          <option value="">Todos os departamentos</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {selectedDept && (
          <p className="text-xs text-violet-400 mt-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> {selectedDept.name}
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
          <Tag className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
          Categoria
          {departmentId && (
            <span className="ml-2 text-cyan-500 text-[10px] font-normal normal-case">filtrado</span>
          )}
        </label>

        <div className="relative" ref={catRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => { setCatOpen(o => !o); setCatSearch('') }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all bg-slate-800 border focus:outline-none',
              disabled ? 'opacity-50 cursor-not-allowed border-white/10'
                : catOpen ? 'border-violet-500/50 ring-2 ring-violet-500/30'
                : 'border-white/10 hover:border-white/20'
            )}
          >
            {selectedCat ? (
              <span className="flex-1 text-slate-200">
                {selectedCat.parent_name && <span className="text-slate-500">{selectedCat.parent_name} / </span>}
                {selectedCat.name}
              </span>
            ) : (
              <span className="flex-1 text-slate-500">Buscar ou selecionar...</span>
            )}
            {selectedCat ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onCategoryChange(''); setCatSearch('') }}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronDown className={cn('w-4 h-4 text-slate-500 transition-transform', catOpen && 'rotate-180')} />
            )}
          </button>

          {catOpen && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-slate-800 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden ring-1 ring-violet-500/10">
              <div className="p-2 border-b border-white/[0.06]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    autoFocus
                    value={catSearch}
                    onChange={e => setCatSearch(e.target.value)}
                    placeholder="Pesquisar categoria..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-900 border border-white/[0.06] rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                </div>
                {departmentId && !catSearch && (
                  <p className="text-[10px] text-slate-500 mt-1.5 px-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-cyan-500" />
                    <strong className="text-cyan-400">{selectedDept?.name}</strong> + globais
                  </p>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin">
                {!hasResults && <p className="text-sm text-slate-500 text-center py-4">Nenhuma categoria encontrada</p>}
                {grouped.map(({ root, subs }) => (
                  <div key={root.id}>
                    <button
                      type="button"
                      onClick={() => handleCategorySelect(root)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                        String(categoryId) === String(root.id)
                          ? 'bg-violet-600/20 text-violet-300'
                          : 'text-slate-300 hover:bg-white/[0.04]'
                      )}
                    >
                      <Tag className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="flex-1">{root.name}</span>
                      {root.department_name && (
                        <span className="text-[10px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded-full shrink-0">
                          {root.department_name}
                        </span>
                      )}
                      {!root.department_id && <span className="text-[10px] text-slate-600 shrink-0">global</span>}
                    </button>
                    {subs.map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleCategorySelect(sub)}
                        className={cn(
                          'w-full flex items-center gap-2 pl-7 pr-3 py-1.5 text-sm text-left transition-colors',
                          String(categoryId) === String(sub.id)
                            ? 'bg-violet-600/20 text-violet-300'
                            : 'text-slate-400 hover:bg-white/[0.04]'
                        )}
                      >
                        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                        <span className="flex-1">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
                {orphanChildren.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                      String(categoryId) === String(cat.id)
                        ? 'bg-violet-600/20 text-violet-300'
                        : 'text-slate-300 hover:bg-white/[0.04]'
                    )}
                  >
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="flex-1">{cat.name}</span>
                    {cat.parent_name && <span className="text-[10px] text-slate-500 shrink-0">{cat.parent_name}</span>}
                    {cat.department_name && (
                      <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                        {cat.department_name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {selectedCat?.department_name && !departmentId && (
          <p className="text-xs text-violet-400 mt-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Departamento preenchido automaticamente
          </p>
        )}
      </div>
    </div>
  )
}
