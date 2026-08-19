'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { StockItem, Proveedor } from '@/lib/types'
import { formatCurrency } from '@/lib/helpers'
import { Search, Plus, Edit2, Trash2, Boxes, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [showMovModal, setShowMovModal] = useState(false)
  const [movItem, setMovItem] = useState<StockItem | null>(null)
  const [movCantidad, setMovCantidad] = useState(0)
  const [movTipo, setMovTipo] = useState<'entrada' | 'salida'>('entrada')

  const [form, setForm] = useState({
    nombre: '',
    cantidad: 0,
    unidad: 'resma',
    minimo: 5,
    costo_unitario: 0,
    proveedor_id: '',
    categoria: 'Papel',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('stock').select('*').order('nombre'),
      supabase.from('proveedores').select('*').order('nombre'),
    ])
    if (s) setStock(s)
    if (p) setProveedores(p)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('Nombre obligatorio'); return }
    const payload = { ...form, proveedor_id: form.proveedor_id || null }

    if (editingItem) {
      const { error } = await supabase.from('stock').update(payload).eq('id', editingItem.id)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Material actualizado')
    } else {
      const { error } = await supabase.from('stock').insert(payload)
      if (error) { toast.error('Error al registrar material'); return }
      toast.success('Material registrado')
    }

    closeModal()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este material del stock?')) return
    await supabase.from('stock').delete().eq('id', id)
    toast.success('Material eliminado')
    loadData()
  }

  const handleMovimiento = async () => {
    if (!movItem || movCantidad <= 0) return
    const newCantidad = movTipo === 'entrada'
      ? Number(movItem.cantidad) + movCantidad
      : Math.max(0, Number(movItem.cantidad) - movCantidad)

    await supabase.from('stock').update({ cantidad: newCantidad }).eq('id', movItem.id)
    toast.success(`${movTipo === 'entrada' ? 'Entrada' : 'Salida'} de stock registrada`)
    setShowMovModal(false)
    setMovCantidad(0)
    loadData()
  }

  const openEdit = (item: StockItem) => {
    setEditingItem(item)
    setForm({
      nombre: item.nombre,
      cantidad: Number(item.cantidad),
      unidad: item.unidad || 'resma',
      minimo: Number(item.minimo || 5),
      costo_unitario: Number(item.costo_unitario || 0),
      proveedor_id: item.proveedor_id || '',
      categoria: item.categoria || 'Papel',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setForm({ nombre: '', cantidad: 0, unidad: 'resma', minimo: 5, costo_unitario: 0, proveedor_id: '', categoria: 'Papel' })
  }

  const filtered = stock.filter(s => s.nombre.toLowerCase().includes(search.toLowerCase()))
  const bajoStock = stock.filter(s => Number(s.cantidad) <= Number(s.minimo))

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Materiales & Stock" subtitle="Inventario de insumos de imprenta" />
      <main style={{ padding: '28px', flex: 1 }}>

        {bajoStock.length > 0 && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Alertas de Stock Bajo:</strong> Hay {bajoStock.length} material(es) por debajo del mínimo recomendado ({bajoStock.map(b => b.nombre).join(', ')}).
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Buscar material..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nuevo Material
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Categoría</th>
                <th>Stock Actual</th>
                <th>Mínimo</th>
                <th>Unidad</th>
                <th>Costo Unit.</th>
                <th>Valor Total</th>
                <th>Proveedor</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isBajo = Number(item.cantidad) <= Number(item.minimo)
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Boxes size={16} style={{ color: isBajo ? 'var(--danger)' : 'var(--success)' }} />
                        <strong>{item.nombre}</strong>
                        {isBajo && <span className="badge badge-danger">BAJO</span>}
                      </div>
                    </td>
                    <td><span className="badge badge-neutral">{item.categoria || 'Papel'}</span></td>
                    <td>
                      <strong style={{ fontSize: 14, color: isBajo ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {item.cantidad}
                      </strong>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.minimo}</td>
                    <td>{item.unidad}</td>
                    <td>{formatCurrency(item.costo_unitario || 0)}</td>
                    <td><strong>{formatCurrency((item.costo_unitario || 0) * item.cantidad)}</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {proveedores.find(p => p.id === item.proveedor_id)?.nombre || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-sm btn-success"
                          style={{ padding: '4px 8px' }}
                          onClick={() => { setMovItem(item); setMovTipo('entrada'); setShowMovModal(true) }}
                          title="Entrada"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '4px 8px' }}
                          onClick={() => { setMovItem(item); setMovTipo('salida'); setShowMovModal(true) }}
                          title="Salida"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button className="btn btn-sm btn-secondary" style={{ padding: '4px 8px' }} onClick={() => openEdit(item)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(item.id)}>
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
              <Boxes size={32} />
              <p>Sin materiales registrados</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingItem ? 'Editar Material' : 'Nuevo Material / Insumo'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre del Material *</label>
                      <input
                        className="input"
                        placeholder="ej. Papel Couché 300g A4"
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Categoría</label>
                      <select className="input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                        <option value="Papel">Papel / Cartulina</option>
                        <option value="Vinilo">Vinilo</option>
                        <option value="Lona">Lona</option>
                        <option value="Tintas">Tintas / Tóner</option>
                        <option value="Acabados">Acabados (Laminado, Barniz)</option>
                        <option value="Empaque">Empaque / Cajas</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Cantidad Inicial</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="0"
                        value={form.cantidad === 0 ? '' : form.cantidad}
                        onChange={e => setForm({ ...form, cantidad: e.target.value === '' ? 0 : Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Unidad</label>
                      <select className="input" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
                        <option value="resma">Resma</option>
                        <option value="rollo">Rollo</option>
                        <option value="unidad">Unidad</option>
                        <option value="cartucho">Cartucho</option>
                        <option value="caja">Caja</option>
                        <option value="kg">Kg</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mínimo Recomendado</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="0"
                        value={form.minimo === 0 ? '' : form.minimo}
                        onChange={e => setForm({ ...form, minimo: e.target.value === '' ? 0 : Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Costo Unitario ($)</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="0.00"
                        value={form.costo_unitario === 0 ? '' : form.costo_unitario}
                        onChange={e => setForm({ ...form, costo_unitario: e.target.value === '' ? 0 : Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Proveedor Habitual</label>
                      <select className="input" value={form.proveedor_id} onChange={e => setForm({ ...form, proveedor_id: e.target.value })}>
                        <option value="">Sin proveedor asignado</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingItem ? 'Guardar Cambios' : 'Registrar Material'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Movement Modal */}
        {showMovModal && movItem && (
          <div className="modal-backdrop" onClick={() => setShowMovModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <h2>{movTipo === 'entrada' ? '📥 Entrada' : '📤 Salida'} de Stock</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowMovModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  <strong>{movItem.nombre}</strong> — Stock actual: <strong>{movItem.cantidad} {movItem.unidad}</strong>
                </p>
                <div className="form-group">
                  <label>Cantidad a {movTipo === 'entrada' ? 'ingresar' : 'retirar'}</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={movCantidad === 0 ? '' : movCantidad}
                    onChange={e => setMovCantidad(e.target.value === '' ? 0 : Number(e.target.value))}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowMovModal(false)}>Cancelar</button>
                <button className={`btn ${movTipo === 'entrada' ? 'btn-success' : 'btn-danger'}`} onClick={handleMovimiento}>
                  Confirmar {movTipo === 'entrada' ? 'Entrada' : 'Salida'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
