'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Servicio } from '@/lib/types'
import { formatCurrency, CATEGORIAS_SERVICIO } from '@/lib/helpers'
import { Search, Plus, Edit2, Trash2, X, Printer, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CatalogoPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
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
    unidad: 'unidad',
    tiempo_estimado: '2-3 días',
    disponible: true,
  })

  useEffect(() => {
    loadServicios()
  }, [])

  const loadServicios = async () => {
    const { data } = await supabase.from('servicios').select('*').order('categoria').order('nombre')
    if (data) setServicios(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (editingServicio) {
      const { error } = await supabase.from('servicios').update(form).eq('id', editingServicio.id)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Servicio actualizado')
    } else {
      const { error } = await supabase.from('servicios').insert(form)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Servicio creado')
    }

    closeModal()
    loadServicios()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este servicio del catálogo?')) return
    const { error } = await supabase.from('servicios').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Servicio eliminado')
    loadServicios()
  }

  const toggleDisponible = async (srv: Servicio) => {
    const { error } = await supabase.from('servicios').update({ disponible: !srv.disponible }).eq('id', srv.id)
    if (!error) {
      toast.success(srv.disponible ? 'Pausado' : 'Activado')
      loadServicios()
    }
  }

  const openEdit = (srv: Servicio) => {
    setEditingServicio(srv)
    setForm({
      nombre: srv.nombre,
      descripcion: srv.descripcion || '',
      precio_base: Number(srv.precio_base),
      categoria: srv.categoria,
      unidad: srv.unidad || 'unidad',
      tiempo_estimado: srv.tiempo_estimado || '2-3 días',
      disponible: srv.disponible !== false,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingServicio(null)
    setForm({
      nombre: '', descripcion: '', precio_base: 0,
      categoria: 'Folletos', unidad: 'unidad', tiempo_estimado: '2-3 días', disponible: true
    })
  }

  const filtered = servicios.filter(s => {
    if (search && !s.nombre.toLowerCase().includes(search.toLowerCase())) return false
    if (categoriaFilter && s.categoria !== categoriaFilter) return false
    return true
  })

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Catálogo de Servicios" subtitle="Productos e impresiones ofrecidas" />
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

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nuevo Servicio
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
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
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(srv)}>
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(srv.id)}>
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
                      </select>
                    </div>
                  </div>

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
                      <label>Precio Base ($)</label>
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
