'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Servicio, Proveedor } from '@/lib/types'
import { formatCurrency, CATEGORIAS_SERVICIO } from '@/lib/helpers'
import { Search, Plus, Edit2, Trash2, X, Printer, Check, Factory, Home } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CatalogoPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null)
  const [categoriaFilter, setCategoriaFilter] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio_base: 0,
    categoria: 'Folletos',
    nuevaCategoria: '',
    unidad: 'unidad',
    tiempo_estimado: '2-3 días',
    disponible: true,
    es_tercerizado: false,
    proveedor_tercerizado_id: '',
    costo_tercerizado: 0,
  })

  useEffect(() => {
    loadServicios()
  }, [])

  const loadServicios = async () => {
    const [{ data, error }, { data: provs }] = await Promise.all([
      supabase.from('servicios').select('*').order('categoria').order('nombre'),
      supabase.from('proveedores').select('*').order('nombre')
    ])

    if (error) {
      toast.error('Error al cargar catálogo: ' + error.message)
    } else if (data) {
      setServicios(data)
    }
    if (provs) setProveedores(provs)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    const catFinal = form.categoria === 'OTRO' ? (form.nuevaCategoria.trim() || 'General') : form.categoria

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio_base: Number(form.precio_base) || 0,
      categoria: catFinal,
      unidad: form.unidad || 'unidad',
      tiempo_estimado: form.tiempo_estimado.trim() || null,
      disponible: form.disponible !== false,
      es_tercerizado: form.es_tercerizado,
      proveedor_tercerizado_id: form.es_tercerizado ? (form.proveedor_tercerizado_id || null) : null,
      costo_tercerizado: form.es_tercerizado ? (Number(form.costo_tercerizado) || 0) : 0,
    }

    if (editingServicio) {
      const { error } = await supabase
        .from('servicios')
        .update(payload)
        .eq('id', editingServicio.id)

      if (error) {
        toast.error('Error al actualizar servicio: ' + error.message)
        return
      }
      toast.success('Servicio actualizado')
    } else {
      const { error } = await supabase
        .from('servicios')
        .insert(payload)

      if (error) {
        toast.error('Error al crear servicio: ' + error.message)
        return
      }
      toast.success('Servicio creado')
    }

    closeModal()
    await loadServicios()
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el servicio "${nombre}"?`)) return

    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('No se pudo eliminar: ' + error.message)
      return
    }
    toast.success('Servicio eliminado')
    await loadServicios()
  }

  const toggleDisponible = async (srv: Servicio) => {
    const nextState = !srv.disponible
    const { error } = await supabase
      .from('servicios')
      .update({ disponible: nextState })
      .eq('id', srv.id)

    if (error) {
      toast.error('Error al cambiar disponibilidad: ' + error.message)
    } else {
      toast.success(nextState ? 'Servicio activado' : 'Servicio pausado')
      setServicios(prev => prev.map(s => s.id === srv.id ? { ...s, disponible: nextState } : s))
    }
  }

  const openNewModal = () => {
    setEditingServicio(null)
    setForm({
      nombre: '',
      descripcion: '',
      precio_base: 0,
      categoria: categoriaFilter || 'Folletos',
      nuevaCategoria: '',
      unidad: 'unidad',
      tiempo_estimado: '2-3 días',
      disponible: true,
      es_tercerizado: false,
      proveedor_tercerizado_id: '',
      costo_tercerizado: 0,
    })
    setShowModal(true)
  }

  const openEdit = (srv: Servicio) => {
    setEditingServicio(srv)
    const isStandardCat = CATEGORIAS_SERVICIO.includes(srv.categoria)
    setForm({
      nombre: srv.nombre,
      descripcion: srv.descripcion || '',
      precio_base: Number(srv.precio_base || 0),
      categoria: isStandardCat ? srv.categoria : 'OTRO',
      nuevaCategoria: isStandardCat ? '' : srv.categoria,
      unidad: srv.unidad || 'unidad',
      tiempo_estimado: srv.tiempo_estimado || '2-3 días',
      disponible: srv.disponible !== false,
      es_tercerizado: !!srv.es_tercerizado,
      proveedor_tercerizado_id: srv.proveedor_tercerizado_id || '',
      costo_tercerizado: Number(srv.costo_tercerizado || 0),
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingServicio(null)
  }

  const filtered = servicios.filter(s => {
    if (search && !s.nombre.toLowerCase().includes(search.toLowerCase())) return false
    if (categoriaFilter && s.categoria !== categoriaFilter) return false
    return true
  })

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Catálogo de Servicios" subtitle="Productos de imprenta propios y tercerizados" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Buscar servicio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
            <button
              className={`btn btn-sm ${!categoriaFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFilter('')}
            >
              Todos ({servicios.length})
            </button>
            {CATEGORIAS_SERVICIO.map(cat => (
              <button
                key={cat}
                className={`btn btn-sm ${categoriaFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCategoriaFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Nuevo Servicio
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Origen</th>
                <th>Categoría</th>
                <th>Precio Base</th>
                <th>Unidad</th>
                <th>Tiempo Est.</th>
                <th>Estado</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(srv => (
                <tr key={srv.id} style={{ opacity: srv.disponible ? 1 : 0.5 }}>
                  <td>
                    <div>
                      <strong style={{ fontSize: 14 }}>{srv.nombre}</strong>
                      {srv.descripcion && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {srv.descripcion}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {srv.es_tercerizado ? (
                      <span className="badge badge-warning" style={{ gap: 4 }}>
                        <Factory size={10} /> Tercerizado
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ gap: 4 }}>
                        <Home size={10} /> Propio
                      </span>
                    )}
                  </td>
                  <td><span className="badge badge-accent">{srv.categoria}</span></td>
                  <td><strong style={{ color: 'var(--accent)' }}>{formatCurrency(srv.precio_base)}</strong></td>
                  <td>{srv.unidad || 'unidad'}</td>
                  <td>{srv.tiempo_estimado || '—'}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${srv.disponible ? 'btn-success' : 'btn-ghost'}`}
                      onClick={() => toggleDisponible(srv)}
                    >
                      {srv.disponible ? 'Activo' : 'Pausado'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(srv)} title="Editar servicio">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(srv.id, srv.nombre)} title="Eliminar servicio">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Printer size={32} />
              <p>Sin servicios en este filtro</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingServicio ? 'Editar Servicio' : 'Nuevo Servicio de Imprenta'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">

                  {/* Origen del Servicio: Propio vs Tercerizado */}
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>Origen de Fabricación / Servicio</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={`btn ${!form.es_tercerizado ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setForm({ ...form, es_tercerizado: false })}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <Home size={15} /> Imprenta Propia
                      </button>
                      <button
                        type="button"
                        className={`btn ${form.es_tercerizado ? 'btn-warning' : 'btn-secondary'}`}
                        onClick={() => setForm({ ...form, es_tercerizado: true })}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <Factory size={15} /> Servicio Tercerizado
                      </button>
                    </div>
                  </div>

                  {form.es_tercerizado && (
                    <div className="form-grid" style={{ padding: 12, background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14 }}>
                      <div className="form-group">
                        <label>Taller / Proveedor Tercerizado</label>
                        <select
                          className="input"
                          value={form.proveedor_tercerizado_id}
                          onChange={e => setForm({ ...form, proveedor_tercerizado_id: e.target.value })}
                        >
                          <option value="">Seleccionar taller...</option>
                          {proveedores.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} {p.rubro ? `(${p.rubro})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Costo de Tercerización ($)</label>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={form.costo_tercerizado === 0 ? '' : form.costo_tercerizado}
                          onChange={e => setForm({ ...form, costo_tercerizado: e.target.value === '' ? 0 : Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre del Servicio *</label>
                      <input
                        className="input"
                        placeholder="ej. Folletos A4 Full Color"
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Categoría</label>
                      <select
                        className="input"
                        value={form.categoria}
                        onChange={e => setForm({ ...form, categoria: e.target.value })}
                      >
                        {CATEGORIAS_SERVICIO.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="OTRO">➕ Otra Categoría Personalizada...</option>
                      </select>
                    </div>
                  </div>

                  {form.categoria === 'OTRO' && (
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label>Escribir Nueva Categoría *</label>
                      <input
                        className="input"
                        placeholder="ej. Gigantografías / Sellos"
                        value={form.nuevaCategoria}
                        onChange={e => setForm({ ...form, nuevaCategoria: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 60, resize: 'vertical' }}
                      placeholder="Detalles sobre papel, impresión, acabado predeterminado..."
                      value={form.descripcion}
                      onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Precio Base de Venta ($)</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.precio_base === 0 ? '' : form.precio_base}
                        onChange={e => setForm({ ...form, precio_base: e.target.value === '' ? 0 : Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Unidad de Medida</label>
                      <select
                        className="input"
                        value={form.unidad}
                        onChange={e => setForm({ ...form, unidad: e.target.value })}
                      >
                        <option value="unidad">Unidad</option>
                        <option value="metro cuadrado">Metro Cuadrado (m²)</option>
                        <option value="resma">Resma</option>
                        <option value="caja">Caja</option>
                        <option value="talonario">Talonario</option>
                        <option value="ciento">Ciento (100u)</option>
                        <option value="millar">Millar (1000u)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tiempo Estimado de Producción</label>
                    <input
                      className="input"
                      placeholder="ej. 2-3 días hábiles"
                      value={form.tiempo_estimado}
                      onChange={e => setForm({ ...form, tiempo_estimado: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingServicio ? 'Guardar Cambios' : 'Crear Servicio'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
