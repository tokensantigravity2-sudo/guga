'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Proveedor, Gasto, ItemListaPrecio, StockItem } from '@/lib/types'
import { formatCurrency, formatDate, getInitials } from '@/lib/helpers'
import { Search, Plus, Phone, Mail, MapPin, Edit2, Trash2, Package, Tag, FileText, List, Layers, ChevronDown, MessageCircle, X, Settings } from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_RUBROS = [
  'Papel',
  'Vinilo',
  'Tintas',
  'Imprenta Tercerizada',
  'Troquelado & Acabados',
  'Encuadernacion',
  'Máquinas',
  'General',
]

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<'todos' | 'insumos' | 'tercerizados'>('todos')
  const [filterRubro, setFilterRubro] = useState('')
  const [selectedProveedorDropdown, setSelectedProveedorDropdown] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  const [proveedorStats, setProveedorStats] = useState<Map<string, number>>(new Map())

  // Gestión dinámica de Rubros (abiertos para agregar o eliminar)
  const [rubros, setRubros] = useState<string[]>(DEFAULT_RUBROS)
  const [showRubrosModal, setShowRubrosModal] = useState(false)
  const [nuevoRubro, setNuevoRubro] = useState('')
  const [inlineNuevoRubro, setInlineNuevoRubro] = useState('')
  const [showInlineAddRubro, setShowInlineAddRubro] = useState(false)

  // Historial drawer state
  const [selectedProveedorHistory, setSelectedProveedorHistory] = useState<Proveedor | null>(null)
  const [historialGastos, setHistorialGastos] = useState<Gasto[]>([])
  const [historialStock, setHistorialStock] = useState<StockItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Price List modal state
  const [showPriceListModal, setShowPriceListModal] = useState(false)
  const [selectedProveedorPriceList, setSelectedProveedorPriceList] = useState<Proveedor | null>(null)

  const getPriceListCount = (p: Proveedor): number => {
    if (p.lista_precios && Array.isArray(p.lista_precios) && p.lista_precios.length > 0) {
      return p.lista_precios.length
    }
    if (p.notas) {
      const match = p.notas.match(/\[LISTA_PRECIOS:([\s\S]*?)\]$/)
      if (match) {
        try {
          const parsed = JSON.parse(match[1])
          if (Array.isArray(parsed)) return parsed.length
        } catch {
          return 0
        }
      }
    }
    return 0
  }

  const getWhatsAppUrl = (phone?: string | null, producto?: string) => {
    if (!phone) return '#'
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('09')) {
      cleaned = '598' + cleaned.substring(1)
    } else if (cleaned.startsWith('9') && cleaned.length === 8) {
      cleaned = '598' + cleaned
    }
    const text = producto ? `Buenas, te puedo pedir ${producto}` : 'Buenas, te hago una consulta'
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`
  }
  const [priceList, setPriceList] = useState<ItemListaPrecio[]>([])
  const [newPriceItem, setNewPriceItem] = useState({ producto: '', precio: 0, unidad: 'unidad', notas: '' })

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    rubro: 'Papel',
    notas: '',
    es_tercerizado: false,
  })

  useEffect(() => {
    // Cargar rubros guardados en localStorage si existen
    try {
      const savedRubros = localStorage.getItem('guga_rubros_proveedores')
      if (savedRubros) {
        const parsed = JSON.parse(savedRubros)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRubros(parsed)
        }
      }
    } catch {}
    loadData()
  }, [])

  const handleAddRubro = (nombreRubro: string) => {
    const trimmed = nombreRubro.trim()
    if (!trimmed) {
      toast.error('Ingresá el nombre del rubro')
      return
    }
    if (rubros.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Ese rubro ya existe')
      return
    }
    const updated = [...rubros, trimmed]
    setRubros(updated)
    try {
      localStorage.setItem('guga_rubros_proveedores', JSON.stringify(updated))
    } catch {}
    setForm(f => ({ ...f, rubro: trimmed }))
    setNuevoRubro('')
    setInlineNuevoRubro('')
    setShowInlineAddRubro(false)
    toast.success(`Rubro "${trimmed}" agregado`)
  }

  const handleDeleteRubro = (rubroToDelete: string) => {
    const cantUso = proveedores.filter(p => p.rubro?.includes(rubroToDelete)).length
    if (cantUso > 0) {
      if (!confirm(`Hay ${cantUso} proveedor(es) con el rubro "${rubroToDelete}". ¿Seguro que querés eliminarlo de la lista?`)) {
        return
      }
    }
    const updated = rubros.filter(r => r !== rubroToDelete)
    setRubros(updated)
    try {
      localStorage.setItem('guga_rubros_proveedores', JSON.stringify(updated))
    } catch {}
    if (filterRubro === rubroToDelete) setFilterRubro('')
    if (form.rubro === rubroToDelete) setForm(f => ({ ...f, rubro: updated[0] || 'General' }))
    toast.success(`Rubro "${rubroToDelete}" eliminado`)
  }

  const loadData = async () => {
    const [{ data: provs, error: pErr }, { data: gastos }] = await Promise.all([
      supabase.from('proveedores').select('*').order('nombre'),
      supabase.from('gastos').select('proveedor_id, monto'),
    ])

    if (pErr) toast.error('Error al cargar proveedores: ' + pErr.message)
    if (provs) {
      setProveedores(provs)
      // Unificar rubros con los de la base de datos
      setRubros(prev => {
        const provRubros = provs.map(p => p.rubro?.replace(' (Tercerizado)', '').trim()).filter(Boolean) as string[]
        const merged = Array.from(new Set([...prev, ...provRubros]))
        return merged
      })
    }

    if (gastos) {
      const stats = new Map<string, number>()
      gastos.forEach(g => {
        if (g.proveedor_id) stats.set(g.proveedor_id, (stats.get(g.proveedor_id) || 0) + Number(g.monto))
      })
      setProveedorStats(stats)
    }
    setLoading(false)
  }

  const openHistory = async (p: Proveedor) => {
    setSelectedProveedorHistory(p)
    setLoadingHistory(true)

    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from('gastos').select('*').eq('proveedor_id', p.id).order('fecha', { ascending: false }),
      supabase.from('stock').select('*').eq('proveedor_id', p.id).order('nombre'),
    ])

    if (g) setHistorialGastos(g)
    if (s) setHistorialStock(s)
    setLoadingHistory(false)
  }

  const openPriceList = (p: Proveedor) => {
    setSelectedProveedorPriceList(p)
    // Intentar leer lista_precios de la columna, si no existe, parsear de notas
    let list = p.lista_precios || []
    if (list.length === 0 && p.notas) {
      const match = p.notas.match(/\[LISTA_PRECIOS:([\s\S]*?)\]$/)
      if (match) {
        try { list = JSON.parse(match[1]) } catch { list = [] }
      }
    }
    setPriceList(list)
    setNewPriceItem({ producto: '', precio: 0, unidad: 'unidad', notas: '' })
    setShowPriceListModal(true)
  }

  const handleAddPriceItem = () => {
    if (!newPriceItem.producto.trim() || newPriceItem.precio <= 0) {
      toast.error('Completá producto y precio mayor a 0')
      return
    }
    const updated = [...priceList, { ...newPriceItem, id: Date.now().toString() }]
    setPriceList(updated)
    setNewPriceItem({ producto: '', precio: 0, unidad: 'unidad', notas: '' })
  }

  const handleRemovePriceItem = (index: number) => {
    setPriceList(prev => prev.filter((_, i) => i !== index))
  }

  const handleSavePriceList = async () => {
    if (!selectedProveedorPriceList) return
    let { error } = await supabase
      .from('proveedores')
      .update({ lista_precios: priceList })
      .eq('id', selectedProveedorPriceList.id)

    if (error && (error.message.includes('column') || error.message.includes('schema'))) {
      // Si la columna lista_precios no existe en la BD, guardarlo en notas
      // Preservar notas originales del proveedor quitando cualquier tag anterior
      const notasOriginales = (selectedProveedorPriceList.notas || '').replace(/\[LISTA_PRECIOS:[\s\S]*?\]$/, '').trim()
      const notasStr = notasOriginales ? `${notasOriginales} [LISTA_PRECIOS:${JSON.stringify(priceList)}]` : `[LISTA_PRECIOS:${JSON.stringify(priceList)}]`
      const res = await supabase.from('proveedores').update({ notas: notasStr }).eq('id', selectedProveedorPriceList.id)
      error = res.error
    }

    if (error) {
      toast.error('Error al guardar lista de precios: ' + error.message)
      return
    }
    toast.success('Lista de precios actualizada')
    setShowPriceListModal(false)
    await loadData()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }

    let payload: any = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      direccion: form.direccion.trim() || null,
      rubro: form.rubro || 'Papel',
      notas: form.notas.trim() || null,
      es_tercerizado: form.es_tercerizado,
    }

    if (editingProveedor) {
      let { error } = await supabase.from('proveedores').update(payload).eq('id', editingProveedor.id)
      
      // Fallback si la columna es_tercerizado no existe en el schema de Supabase
      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        delete payload.es_tercerizado
        if (form.es_tercerizado && !payload.rubro.includes('Tercerizado')) {
          payload.rubro = `${payload.rubro} (Tercerizado)`
        }
        const res = await supabase.from('proveedores').update(payload).eq('id', editingProveedor.id)
        error = res.error
      }

      if (error) { toast.error('Error al actualizar proveedor: ' + error.message); return }
      toast.success('Proveedor actualizado')
    } else {
      let { error } = await supabase.from('proveedores').insert(payload)

      // Fallback si la columna es_tercerizado no existe en la BD
      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        delete payload.es_tercerizado
        if (form.es_tercerizado && !payload.rubro.includes('Tercerizado')) {
          payload.rubro = `${payload.rubro} (Tercerizado)`
        }
        const res = await supabase.from('proveedores').insert(payload)
        error = res.error
      }

      if (error) { toast.error('Error al crear proveedor: ' + error.message); return }
      toast.success('Proveedor creado con éxito')
    }

    closeModal()
    await loadData()
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar al proveedor "${nombre}"?`)) return
    const { error } = await supabase.from('proveedores').delete().eq('id', id)
    if (error) {
      toast.error('No se pudo eliminar: ' + error.message)
      return
    }
    toast.success('Proveedor eliminado')
    await loadData()
  }

  const openNewModal = () => {
    setEditingProveedor(null)
    setForm({ nombre: '', telefono: '', email: '', direccion: '', rubro: 'Papel', notas: '', es_tercerizado: false })
    setShowModal(true)
  }

  const openEdit = (p: Proveedor) => {
    setEditingProveedor(p)
    const isTerc = !!p.es_tercerizado || !!p.rubro?.includes('Tercerizado')
    setForm({
      nombre: p.nombre,
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || '',
      rubro: p.rubro?.replace(' (Tercerizado)', '') || 'Papel',
      notas: p.notas || '',
      es_tercerizado: isTerc,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProveedor(null)
    setForm({ nombre: '', telefono: '', email: '', direccion: '', rubro: 'Papel', notas: '', es_tercerizado: false })
  }

  const rubrosUnicos = [...new Set(proveedores.map(p => p.rubro).filter(Boolean))]

  const filtered = proveedores.filter(p => {
    const isTerc = p.es_tercerizado || p.rubro?.includes('Tercerizado')
    if (filterTipo === 'tercerizados' && !isTerc) return false
    if (filterTipo === 'insumos' && isTerc) return false
    if (filterRubro && p.rubro !== filterRubro) return false
    if (selectedProveedorDropdown && p.id !== selectedProveedorDropdown) return false
    return p.nombre.toLowerCase().includes(search.toLowerCase()) || p.rubro?.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Proveedores & Tercerizados" subtitle="Gestión de proveedores con lista desplegable y listas de precios" />
      <main style={{ padding: '28px', flex: 1 }}>

        {/* Top Control Bar with Dropdowns */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>

            {/* LISTA DESPLEGABLE DE PROVEEDORES */}
            <div style={{ minWidth: 220 }}>
              <select
                className="input"
                value={selectedProveedorDropdown}
                onChange={e => {
                  setSelectedProveedorDropdown(e.target.value)
                  if (e.target.value) {
                    const p = proveedores.find(pr => pr.id === e.target.value)
                    if (p) openHistory(p)
                  }
                }}
                style={{ fontWeight: 600, borderColor: 'var(--accent)' }}
              >
                <option value="">📋 Seleccionar Proveedor (Lista Desplegable)...</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>
                    {(p.es_tercerizado || p.rubro?.includes('Tercerizado')) ? '🏭' : '📦'} {p.nombre} ({p.rubro || 'General'})
                  </option>
                ))}
              </select>
            </div>

            {/* Búsqueda por texto */}
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Buscar por texto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>

            {/* LISTA DESPLEGABLE DE RUBROS + BOTÓN GESTIÓN */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                className="input"
                value={filterRubro}
                onChange={e => setFilterRubro(e.target.value)}
                style={{ width: 170 }}
              >
                <option value="">Todos los Rubros ({rubros.length})</option>
                {rubros.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowRubrosModal(true)}
                title="Administrar y editar Rubros"
                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Settings size={14} /> Rubros
              </button>
            </div>

            {/* Botones de tipo */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`btn btn-sm ${filterTipo === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setFilterTipo('todos'); setSelectedProveedorDropdown(''); setFilterRubro('') }}
              >
                Todos ({proveedores.length})
              </button>
              <button
                className={`btn btn-sm ${filterTipo === 'insumos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterTipo('insumos')}
              >
                📦 Insumos
              </button>
              <button
                className={`btn btn-sm ${filterTipo === 'tercerizados' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterTipo('tercerizados')}
              >
                🏭 Tercerizados
              </button>
            </div>
          </div>

          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Nuevo Proveedor / Tercerizado
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Proveedor / Taller</th>
                <th>Contacto</th>
                <th>Tipo & Rubro</th>
                <th>Lista de Precios</th>
                <th>Total Gastado</th>
                <th>Dirección</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isTerc = p.es_tercerizado || p.rubro?.includes('Tercerizado')
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => openHistory(p)}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: isTerc ? 'var(--warning-muted)' : 'var(--info-muted)',
                          color: isTerc ? 'var(--warning)' : 'var(--info)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, flexShrink: 0
                        }}>
                          {getInitials(p.nombre)}
                        </div>
                        <div>
                          <strong>{p.nombre}</strong>
                          {isTerc && (
                            <div style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>
                              🏭 Servicio Tercerizado
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {p.telefono && (
                        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={12} style={{ color: 'var(--text-muted)' }} /> {p.telefono}
                          </span>
                          <a
                            href={getWhatsAppUrl(p.telefono)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#25D366',
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              textDecoration: 'none'
                            }}
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle size={11} /> WhatsApp
                          </a>
                        </div>
                      )}
                      {p.email && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Mail size={12} /> {p.email}
                        </div>
                      )}
                    </td>
                    <td><span className="badge badge-info">{p.rubro || 'General'}</span></td>
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ fontSize: 12, color: 'var(--accent)', gap: 4 }}
                        onClick={() => openPriceList(p)}
                      >
                        <List size={13} /> {getPriceListCount(p)} precios
                      </button>
                    </td>
                    <td><strong style={{ color: 'var(--danger)' }}>{formatCurrency(proveedorStats.get(p.id) || 0)}</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.direccion || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openHistory(p)} title="Ver Historial de Compras">
                          <FileText size={13} />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)} title="Editar">
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Package size={32} />
              <p>Sin proveedores en este filtro</p>
            </div>
          )}
        </div>

        {/* Modal Price List */}
        {showPriceListModal && selectedProveedorPriceList && (
          <div className="modal-backdrop" onClick={() => setShowPriceListModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700 }}>🏷️ Lista de Precios Pactados</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedProveedorPriceList.nombre}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPriceListModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                {/* Form to add item */}
                <div style={{
                  display: 'flex', gap: 8, marginBottom: 14, padding: 10,
                  background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)'
                }}>
                  <input
                    className="input"
                    placeholder="Insumo / Trabajo (ej. Resma 300g)"
                    value={newPriceItem.producto}
                    onChange={e => setNewPriceItem({ ...newPriceItem, producto: e.target.value })}
                    style={{ flex: 2 }}
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Precio ($)"
                    value={newPriceItem.precio === 0 ? '' : newPriceItem.precio}
                    onChange={e => setNewPriceItem({ ...newPriceItem, precio: e.target.value === '' ? 0 : Number(e.target.value) })}
                    style={{ width: 110 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleAddPriceItem}>
                    + Agregar
                  </button>
                </div>

                {/* Table of prices */}
                <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                  {priceList.length > 0 ? (
                    <table style={{ width: '100%', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>Insumo / Servicio</th>
                          <th>Precio Pactado</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceList.map((item, idx) => (
                          <tr key={idx}>
                            <td><strong>{item.producto}</strong></td>
                            <td><strong style={{ color: 'var(--accent)' }}>{formatCurrency(item.precio)}</strong></td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                {selectedProveedorPriceList.telefono && (
                                  <a
                                    href={getWhatsAppUrl(selectedProveedorPriceList.telefono, item.producto)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm"
                                    style={{
                                      background: '#25D366',
                                      color: '#fff',
                                      border: 'none',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: '3px 8px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      textDecoration: 'none',
                                      borderRadius: 6
                                    }}
                                    title={`Pedir "${item.producto}" por WhatsApp`}
                                  >
                                    <MessageCircle size={12} /> Pedir
                                  </a>
                                )}
                                <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleRemovePriceItem(idx)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state" style={{ padding: 20 }}>
                      <List size={24} />
                      <p style={{ fontSize: 12 }}>Sin ítems en la lista de precios</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPriceListModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSavePriceList}>Guardar Lista</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Historial Completo del Proveedor */}
        {selectedProveedorHistory && (
          <div className="modal-backdrop" onClick={() => setSelectedProveedorHistory(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700 }}>📜 Historial de Proveedor</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedProveedorHistory.nombre}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProveedorHistory(null)}>✕</button>
              </div>
              <div className="modal-body">
                {loadingHistory ? (
                  <div className="spinner" style={{ margin: '20px auto' }} />
                ) : (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Gastos y Compras ({historialGastos.length})</h3>
                    {historialGastos.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                        {historialGastos.map(g => (
                          <div key={g.id} style={{
                            padding: 8, background: 'var(--bg-hover)', borderRadius: 8,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5
                          }}>
                            <div>
                              <strong>{g.concepto}</strong>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.fecha ? formatDate(g.fecha) : ''} • {g.categoria}</div>
                            </div>
                            <strong style={{ color: 'var(--danger)', fontSize: 14 }}>{formatCurrency(g.monto)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Sin gastos registrados con este proveedor</p>
                    )}

                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Insumos en Stock ({historialStock.length})</h3>
                    {historialStock.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {historialStock.map(s => (
                          <div key={s.id} style={{
                            padding: 8, background: 'var(--bg-hover)', borderRadius: 8,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5
                          }}>
                            <span>{s.nombre} ({s.cantidad} {s.unidad})</span>
                            <strong style={{ color: 'var(--accent)' }}>Costo: {formatCurrency(s.costo_unitario || 0)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin materiales en stock vinculados</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Edit / Create */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor / Tercerizado'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre del Proveedor / Taller *</label>
                      <input
                        className="input"
                        placeholder="ej. Taller de Troquelado SRL / Papelera Central"
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ margin: 0 }}>Rubro Principal</label>
                        <button
                          type="button"
                          onClick={() => setShowInlineAddRubro(!showInlineAddRubro)}
                          style={{
                            background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
                            fontSize: 11.5, fontWeight: 600, padding: 0
                          }}
                        >
                          {showInlineAddRubro ? 'Cancelar' : '+ Agregar Rubro'}
                        </button>
                      </div>

                      {showInlineAddRubro ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            className="input"
                            placeholder="Nombre del nuevo rubro..."
                            value={inlineNuevoRubro}
                            onChange={e => setInlineNuevoRubro(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddRubro(inlineNuevoRubro)
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAddRubro(inlineNuevoRubro)}
                          >
                            Guardar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select
                            className="input"
                            value={form.rubro}
                            onChange={e => setForm({ ...form, rubro: e.target.value })}
                            style={{ flex: 1 }}
                          >
                            {rubros.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowRubrosModal(true)}
                            title="Administrar Rubros (Agregar / Eliminar)"
                          >
                            ⚙️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checkbox es_tercerizado */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)',
                    marginBottom: 12
                  }}>
                    <input
                      type="checkbox"
                      id="tercerizado_chk"
                      checked={form.es_tercerizado}
                      onChange={e => setForm({ ...form, es_tercerizado: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <label htmlFor="tercerizado_chk" style={{ margin: 0, cursor: 'pointer', textTransform: 'none', fontSize: 13, fontWeight: 600 }}>
                      🏭 Es un taller o proveedor de SERVICIOS TERCERIZADOS
                    </label>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input
                        className="input"
                        placeholder="ej. 2400 1234"
                        value={form.telefono}
                        onChange={e => setForm({ ...form, telefono: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        className="input"
                        type="email"
                        placeholder="ej. ventas@papelera.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Dirección</label>
                    <input
                      className="input"
                      placeholder="ej. Av. Italia 5678"
                      value={form.direccion}
                      onChange={e => setForm({ ...form, direccion: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Notas / Condiciones de Entrega</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 60 }}
                      placeholder="Días de despacho, condiciones de crédito..."
                      value={form.notas}
                      onChange={e => setForm({ ...form, notas: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Administrar Rubros */}
        {showRubrosModal && (
          <div className="modal-backdrop" onClick={() => setShowRubrosModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 700 }}>
                  🏷️ Administrar Rubros de Proveedores
                </h3>
                <button type="button" onClick={() => setShowRubrosModal(false)} className="btn btn-ghost btn-sm">
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Podés agregar nuevos rubros a medida que los necesites o eliminar los que ya no utilices.
                </p>

                {/* Input para agregar nuevo rubro */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    className="input"
                    placeholder="Escribir nuevo rubro (ej. Serigrafía / Remeras / Flete)..."
                    value={nuevoRubro}
                    onChange={e => setNuevoRubro(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddRubro(nuevoRubro)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleAddRubro(nuevoRubro)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <Plus size={15} /> Agregar
                  </button>
                </div>

                {/* Lista de rubros disponibles */}
                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rubros.map(r => {
                    const cant = proveedores.filter(p => p.rubro?.includes(r)).length
                    return (
                      <div
                        key={r}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8,
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{r}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            ({cant} {cant === 1 ? 'proveedor' : 'proveedores'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteRubro(r)}
                          style={{
                            background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer',
                            padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4
                          }}
                          title="Eliminar este rubro"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={() => setShowRubrosModal(false)}>
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
