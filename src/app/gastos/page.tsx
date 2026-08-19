'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Gasto, Proveedor } from '@/lib/types'
import { formatCurrency, formatDate, CATEGORIAS_GASTO } from '@/lib/helpers'
import { Search, Plus, Edit2, Trash2, Calendar, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
  const [categoriaFilter, setCategoriaFilter] = useState('')

  const [form, setForm] = useState({
    concepto: '',
    monto: 0,
    categoria: 'Materiales',
    fecha: new Date().toISOString().split('T')[0],
    proveedor_id: '',
    notas: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase.from('gastos').select('*').order('fecha', { ascending: false }),
      supabase.from('proveedores').select('*').order('nombre'),
    ])
    if (g) setGastos(g)
    if (p) setProveedores(p)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.concepto.trim() || form.monto <= 0) {
      toast.error('Completá los campos obligatorios')
      return
    }

    const payload = { ...form, proveedor_id: form.proveedor_id || null }

    if (editingGasto) {
      const { error } = await supabase.from('gastos').update(payload).eq('id', editingGasto.id)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Gasto actualizado')
    } else {
      const { error } = await supabase.from('gastos').insert(payload)
      if (error) { toast.error('Error al registrar gasto'); return }
      toast.success('Gasto registrado')

      // Registra egreso en caja
      await supabase.from('caja_movimientos').insert({
        tipo: 'egreso',
        monto: form.monto,
        concepto: `Gasto: ${form.concepto}`,
      })
    }

    closeModal()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', id)
    toast.success('Gasto eliminado')
    loadData()
  }

  const openEdit = (gasto: Gasto) => {
    setEditingGasto(gasto)
    setForm({
      concepto: gasto.concepto,
      monto: Number(gasto.monto),
      categoria: gasto.categoria,
      fecha: gasto.fecha || new Date().toISOString().split('T')[0],
      proveedor_id: gasto.proveedor_id || '',
      notas: gasto.notas || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingGasto(null)
    setForm({
      concepto: '', monto: 0, categoria: 'Materiales',
      fecha: new Date().toISOString().split('T')[0], proveedor_id: '', notas: ''
    })
  }

  const filtered = gastos.filter(g => {
    if (search && !g.concepto.toLowerCase().includes(search.toLowerCase())) return false
    if (categoriaFilter && g.categoria !== categoriaFilter) return false
    return true
  })

  const totalGastos = filtered.reduce((sum, g) => sum + Number(g.monto), 0)

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Gastos" subtitle="Control de egresos y facturas" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Buscar gasto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
            <button
              className={`btn btn-sm ${!categoriaFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoriaFilter('')}
            >
              Todos
            </button>
            {CATEGORIAS_GASTO.map(cat => (
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
            <Plus size={16} /> Registrar Gasto
          </button>
        </div>

        {/* Total card */}
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--danger-muted)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total de Gastos (Filtro Actual)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(totalGastos)}</div>
            </div>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} registro(s)</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto / Descripción</th>
                <th>Categoría</th>
                <th>Proveedor</th>
                <th>Monto</th>
                <th style={{ width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(gasto => (
                <tr key={gasto.id}>
                  <td>
                    <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                      {formatDate(gasto.fecha || '')}
                    </div>
                  </td>
                  <td>
                    <strong>{gasto.concepto}</strong>
                    {gasto.notas && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{gasto.notas}</div>}
                  </td>
                  <td><span className="badge badge-neutral">{gasto.categoria}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {proveedores.find(p => p.id === gasto.proveedor_id)?.nombre || '—'}
                  </td>
                  <td><strong style={{ color: 'var(--danger)', fontSize: 14 }}>{formatCurrency(gasto.monto)}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(gasto)}>
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(gasto.id)}>
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
              <DollarSign size={32} />
              <p>Sin gastos registrados</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingGasto ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Concepto / Detalle *</label>
                      <input
                        className="input"
                        placeholder="ej. Compra resmas couché 300g"
                        value={form.concepto}
                        onChange={e => setForm({ ...form, concepto: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Monto ($) *</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.monto === 0 ? '' : form.monto}
                        onChange={e => setForm({ ...form, monto: e.target.value === '' ? 0 : Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Categoría</label>
                      <select className="input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                        {CATEGORIAS_GASTO.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fecha</label>
                      <input
                        className="input"
                        type="date"
                        value={form.fecha}
                        onChange={e => setForm({ ...form, fecha: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Proveedor (Opcional)</label>
                    <select className="input" value={form.proveedor_id} onChange={e => setForm({ ...form, proveedor_id: e.target.value })}>
                      <option value="">Sin proveedor asignado</option>
                      {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Notas</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 60 }}
                      placeholder="Factura N°, método de pago utilizado..."
                      value={form.notas}
                      onChange={e => setForm({ ...form, notas: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingGasto ? 'Guardar Cambios' : 'Registrar Gasto'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
