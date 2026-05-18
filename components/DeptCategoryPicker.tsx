'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ChevronDown, X, Building2, Tag, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Department {
  id: number
  name: string
}

interface Category {
  id: number
  name: string
  parent_id: number | null
  parent_name: string | null
  department_id: number | null
  department_name: string | null
}

interface Props {
  departmentId: string
  categoryId: string
  onDepartmentChange: (id: string) => void
  onCategoryChange: (id: string) => void
  disabled?: boolean
}

export function DeptCategoryPicker({
  departmentId,
  categoryId,
  onDepartmentChange,
  onCategoryChange,
  disabled,
}: Props) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])

  // Category search state
  const [catSearch, setCatSearch] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)

  const selectedDept = departments.find(d => String(d.id) === departmentId)
  const selectedCat = allCategories.find(c => String(c.id) === categoryId)

  // Load departments and all categories once
  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(setDepartments).catch(() => {})
    fetch('/api/categories?flat=true').then(r => r.json()).then(setAllCategories).catch(() => {})
  }, [])

  // Filter categories whenever dept or search changes
  useEffect(() => {
    let cats = allCategories

    if (departmentId) {
      // Show categories for this dept + global (no dept)
      cats = cats.filter(c => !c.department_id || String(c.department_id) === departmentId)
    }

    if (catSearch.trim()) {
      cats = cats.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    }

    setFilteredCategories(cats)
  }, [departmentId, catSearch, allCategories])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false)
        setCatSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleDepartmentChange(newDeptId: string) {
    onDepartmentChange(newDeptId)

    // If selected category doesn't belong to the new dept, clear it
    if (categoryId) {
      const cat = allCategories.find(c => String(c.id) === categoryId)
      if (cat?.department_id && String(cat.department_id) !== newDeptId) {
        onCategoryChange('')
      }
    }
  }

  function handleCategorySelect(cat: Category) {
    onCategoryChange(String(cat.id))

    // Auto-fill department if the category has one
    if (cat.department_id && !departmentId) {
      onDepartmentChange(String(cat.department_id))
    }

    setCatOpen(false)
    setCatSearch('')
  }

  function clearCategory() {
    onCategoryChange('')
    setCatSearch('')
  }

  // Group filtered categories by parent
  const roots = filteredCategories.filter(c => !c.parent_id)
  const children = filteredCategories.filter(c => c.parent_id)

  const grouped: { root: Category; subs: Category[] }[] = roots.map(root => ({
    root,
    subs: children.filter(c => c.parent_id === root.id),
  }))

  // If searching, also show orphan children whose parent didn't match
  const orphanChildren = children.filter(c => !roots.some(r => r.id === c.parent_id))
  const hasResults = grouped.length > 0 || orphanChildren.length > 0

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Department selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <Building2 className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
          Departamento
        </label>
        <select
          value={departmentId}
          onChange={e => handleDepartmentChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">Todos os departamentos</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {selectedDept && (
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> {selectedDept.name}
          </p>
        )}
      </div>

      {/* Category search + select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <Tag className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
          Categoria
          {departmentId && (
            <span className="ml-2 text-xs text-blue-500 font-normal">
              filtrado por departamento
            </span>
          )}
        </label>

        <div className="relative" ref={catRef}>
          {/* Trigger button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => { setCatOpen(o => !o); setCatSearch('') }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm text-left transition',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                : 'border-gray-200 hover:border-gray-300 bg-white',
              catOpen && 'ring-2 ring-blue-500 border-transparent'
            )}
          >
            {selectedCat ? (
              <span className="flex-1 text-gray-900">
                {selectedCat.parent_name && (
                  <span className="text-gray-400">{selectedCat.parent_name} / </span>
                )}
                {selectedCat.name}
              </span>
            ) : (
              <span className="flex-1 text-gray-400">Buscar ou selecionar...</span>
            )}
            {selectedCat ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); clearCategory() }}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', catOpen && 'rotate-180')} />
            )}
          </button>

          {/* Dropdown */}
          {catOpen && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {/* Search input */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    value={catSearch}
                    onChange={e => setCatSearch(e.target.value)}
                    placeholder="Pesquisar categoria..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {departmentId && !catSearch && (
                  <p className="text-xs text-gray-400 mt-1.5 px-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-blue-400" />
                    Mostrando categorias de <strong className="text-blue-600">{selectedDept?.name}</strong> + globais
                  </p>
                )}
              </div>

              {/* Category list */}
              <div className="max-h-52 overflow-y-auto">
                {!hasResults && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Nenhuma categoria encontrada
                  </p>
                )}

                {grouped.map(({ root, subs }) => (
                  <div key={root.id}>
                    {/* Root category */}
                    <button
                      type="button"
                      onClick={() => handleCategorySelect(root)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50 transition',
                        String(categoryId) === String(root.id) && 'bg-blue-50 text-blue-700 font-medium'
                      )}
                    >
                      <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="flex-1">{root.name}</span>
                      {root.department_name && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                          {root.department_name}
                        </span>
                      )}
                      {!root.department_id && (
                        <span className="text-xs text-gray-300 shrink-0">global</span>
                      )}
                    </button>

                    {/* Sub-categories */}
                    {subs.map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleCategorySelect(sub)}
                        className={cn(
                          'w-full flex items-center gap-2 pl-7 pr-3 py-1.5 text-sm text-left hover:bg-blue-50 transition',
                          String(categoryId) === String(sub.id) && 'bg-blue-50 text-blue-700 font-medium'
                        )}
                      >
                        <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                        <span className="flex-1 text-gray-700">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                ))}

                {/* Orphan children (when searching) */}
                {orphanChildren.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50 transition',
                      String(categoryId) === String(cat.id) && 'bg-blue-50 text-blue-700 font-medium'
                    )}
                  >
                    <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="flex-1">{cat.name}</span>
                    {cat.parent_name && (
                      <span className="text-xs text-gray-400 shrink-0">{cat.parent_name}</span>
                    )}
                    {cat.department_name && (
                      <span className="text-xs text-blue-500 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full shrink-0">
                        {cat.department_name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Auto-filled hint */}
        {selectedCat?.department_name && !departmentId && (
          <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            Departamento preenchido automaticamente
          </p>
        )}
      </div>
    </div>
  )
}
