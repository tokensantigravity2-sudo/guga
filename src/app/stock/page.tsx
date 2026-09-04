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
    const [{ data: s, error: sErr }, { data: p }] = await Promise.all([
      supabase.from('stock').select('*').order('nombre'),
      supabase.from('proveedores').select('*').order('nombre'),
    ])
    if (sErr) toast.error('Error al cargar stock: ' + sErr.message)
    if (s) setStock(s)
    if (p) setProveedores(p)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('Nombre obligatorio'); return }
    const payload = {
      nombre: form.nombre.trim(),
      cantidad: Number(form.cantidad) || 0,
      unidad: form.unidad || 'unidad',
      minimo: Number(form.minimo) || 0,
      costo_unitario: Number(form.costo_unitario) || 0,
      proveedor_id: form.proveedor_id || null,
      categoria: form.categoria || 'Papel',
    }

    if (editingItem) {
      const { error } = await supabase.from('stock').update(payload).eq('id', editingItem.id)
      if (error) { toast.error('Error al actualizar material: ' + error.message); return }
      toast.success('Material actualizado')
    } else {
      const { error } = await supabase.from('stock').insert(payload)
      if (error) { toast.error('Error al registrar material: ' + error.message); return }
      toast.success('Material registrado')
    }

    closeModal()
    await loadData()
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el material "${nombre}" del stock?`)) return
    const { error } = await supabase.from('stock').delete().eq('id', id)
    if (error) {
      toast.error('No se pudo eliminar: ' + error.message)
      return
    }
    toast.success('Material eliminado')
    await loadData()
  }

  const handleMovimiento = async () => {
    if (!movItem || movCantidad <= 0) return
    const newCantidad = movTipo === 'entrada'
      ? Number(movItem.cantidad) + movCantidad
      : Math.max(0, Number(movItem.cantidad) - movCantidad)

    const { error } = await supabase.from('stock').update({ cantidad: newCantidad }).eq('id', movItem.id)
    if (error) {
      toast.error('Error en movimiento de stock: ' + error.message)
      return
    }
    toast.success(`${movTipo === 'entrada' ? 'Entrada' : 'Salida'} de stock registrada`)
    setShowMovModal(false)
    setMovCantidad(0)
    await loadData()
  }

  const openNewModal = () => {
    setEditingItem(null)
    setForm({
      nombre: '', cantidad: 0, unidad: 'resma', minimo: 5, costo_unitario: 0, proveedor_id: '', categoria: 'Papel'
    })
    setShowModal(true)
  }

  const openEdit = (item: StockItem) => {
    setEditingItem(item)
    setForm({
      nombre: item.nombre,
      cantidad: Number(item.cantidad || 0),
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
    setForm({
      nombre: '', cantidad: 0, unidad: 'resma', minimo: 5, costo_unitario: 0, proveedor_id: '', categoria: 'Papel'
    })
  }

  const openMovimiento = (item: StockItem, tipo: 'entrada' | 'salida') => {
    setMovItem(item)
    setMovTipo(tipo)
    setMovCantidad(0)
    setShowMovModal(true)
  }

  const filtered = stock.filter(s =>
    s.nombre.toLowerCase().includes(search.toLowerCase()) ||
    s.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  const totalValorInventario = stock.reduce((sum, item) => sum + (Number(item.cantidad || 0) * Number(item.costo_unitario || 0)), 0)
  const itemsBajoStock = stock.filter(item => Number(item.cantidad || 0) <= Number(item.minimo || 0))
  const itemsDisponibles = stock.filter(item => Number(item.cantidad || 0) > 0)

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Stock & Materiales" subtitle="Inventario de insumos de imprenta" />
      <main style={{ padding: '28px', flex: 1 }}>

        {/* Stats Grid con el Valor Total de Stock */}
        <div className="grid-stats" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}>
              <Boxes size={22} />
            </div>
            <div>
              <div className="stat-label">Valor Total del Stock</div>
              <div className="stat-value" style={{ color: '#2563eb', fontWeight: 800 }}>
                {formatCurrency(totalValorInventario)}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
              <Boxes size={22} />
            </div>
            <div>
              <div className="stat-label">Insumos con Existencias</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {itemsDisponibles.length} / {stock.length}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: itemsBajoStock.length > 0 ? 'var(--danger-muted)' : 'var(--bg-hover)', color: itemsBajoStock.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="stat-label">Nivel Bajo / Sin Stock</div>
              <div className="stat-value" style={{ color: itemsBajoStock.length > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                {itemsBajoStock.length} materiales
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Buscar material o insumo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>

          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Nuevo Material
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Material / Insumo</th>
                <th>Categoría</th>
                <th>Stock Actual</th>
                <th>Mínimo</th>
                <th>Costo Unit.</th>
                <th>Valor Total</th>
                <th>Estado</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const esBajo = Number(item.cantidad) <= Number(item.minimo)
                const valorTotal = Number(item.cantidad) * Number(item.costo_unitario || 0)
                return (
                  <tr key={item.id} style={{ background: esBajo ? 'rgba(239,68,68,0.03)' : undefined }}>
                    <td>
                      <strong style={{ fontSize: 14 }}>{item.nombre}</strong>
                    </td>
                    <td><span className="badge badge-neutral">{item.categoria || 'General'}</span></td>
                    <td>
                      <strong style={{ fontSize: 15, color: esBajo ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {item.cantidad} {item.unidad}
                      </strong>
                    </td>
                    <td>{item.minimo} {item.unidad}</td>
                    <td>{formatCurrency(item.costo_unitario || 0)}</td>
                    <td><strong style={{ color: 'var(--accent)' }}>{formatCurrency(valorTotal)}</strong></td>
                    <td>
                      {esBajo ? (
                        <span className="badge badge-danger">
                          <AlertTriangle size={10} /> ¡Bajo Stock!
                        </span>
                      ) : (
                        <span className="badge badge-success">✓ Normal</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-sm btn-success"
                          title="Entrada de stock"
                          onClick={() => openMovimiento(item, 'entrada')}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          title="Salida de stock"
                          onClick={() => openMovimiento(item, 'salida')}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button className="btn btn-sm btn-secondary" title="Editar" onClick={() => openEdit(item)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Eliminar" onClick={() => handleDelete(item.id, item.nombre)}>
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
              <p>Sin materiales en el inventario</p>
            </div>
          )}
        </div>

        {/* Modal edit/create */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingItem ? 'Editar Material' : 'Registrar Nuevo Material'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre del Material *</label>
                      <input
                        className="input"
                        placeholder="ej. Papel Couche 300g A4"
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Categoría</label>
                      <select className="input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                        <option value="Papel">Papel / Cartulina</option>
                        <option value="Vinilo">Vinilo Adhesivo</option>
                        <option value="Lona">Lona Vinílica</option>
                        <option value="Tintas">Tintas / Cartuchos</option>
                        <option value="Toner">Tóner</option>
                        <option value="Acabados">Acabados / Laminados</option>
                        <option value="Empaque">Empaque / Packaging</option>
                        <option value="Otros">Otros Insumos</option>
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
