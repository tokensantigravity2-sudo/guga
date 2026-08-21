'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Gasto, Proveedor } from '@/lib/types'
import { formatCurrency, formatDate, CATEGORIAS_GASTO } from '@/lib/helpers'
import { Search, Plus, Edit2, Trash2, DollarSign, Calendar, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)

  const [form, setForm] = useState({
    concepto: '',
    monto: 0,
    categoria: 'Materiales',
    nuevaCategoria: '',
    fecha: new Date().toISOString().split('T')[0],
    proveedor_id: '',
    notas: '',
    estado_pago: 'pagado' as 'pagado' | 'fiado',
    fecha_vencimiento: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: g, error: gErr }, { data: p }] = await Promise.all([
      supabase.from('gastos').select('*').order('fecha', { ascending: false }),
      supabase.from('proveedores').select('*').order('nombre'),
    ])

    if (gErr) toast.error('Error al cargar gastos: ' + gErr.message)
    if (g) setGastos(g)
    if (p) setProveedores(p)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.concepto.trim() || form.monto <= 0) {
      toast.error('Completá concepto y monto mayor a 0')
      return
    }

    const catFinal = form.categoria === 'OTRO' ? (form.nuevaCategoria.trim() || 'Otros') : form.categoria

    const payload = {
      concepto: form.concepto.trim(),
      monto: Number(form.monto),
      categoria: catFinal,
      fecha: form.fecha,
      proveedor_id: form.proveedor_id || null,
      notas: form.notas.trim() || null,
      estado_pago: form.estado_pago,
      fecha_vencimiento: form.estado_pago === 'fiado' ? (form.fecha_vencimiento || null) : null,
    }

    if (editingGasto) {
      const { error } = await supabase.from('gastos').update(payload).eq('id', editingGasto.id)
      if (error) { toast.error('Error al actualizar gasto: ' + error.message); return }
      toast.success('Gasto actualizado')
    } else {
      const { data: newGasto, error } = await supabase.from('gastos').insert(payload).select().single()
      if (error) { toast.error('Error al registrar gasto: ' + error.message); return }

      // Si es pagado en efectivo al instante, registrar egreso en caja
      if (form.estado_pago === 'pagado') {
        await supabase.from('caja_movimientos').insert({
          tipo: 'egreso',
          monto: Number(form.monto),
          concepto: `Gasto: ${form.concepto}`,
          referencia_id: newGasto.id,
        })
      }

      toast.success(form.estado_pago === 'fiado' ? 'Gasto registrado a crédito (Fiado)' : 'Gasto pagado registrado')
    }

    closeModal()
    await loadData()
  }

  const handleDelete = async (id: string, concepto: string) => {
    if (!confirm(`¿Eliminar el gasto "${concepto}"?`)) return
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar gasto: ' + error.message)
      return
    }
    toast.success('Gasto eliminado')
    await loadData()
  }

  const toggleMarcarPagado = async (g: Gasto) => {
    const { error } = await supabase.from('gastos').update({ estado_pago: 'pagado' }).eq('id', g.id)
    if (error) {
      toast.error('Error al marcar pagado: ' + error.message)
      return
    }
    // Registrar egreso en caja al saldar la deuda
    await supabase.from('caja_movimientos').insert({
      tipo: 'egreso',
      monto: Number(g.monto),
      concepto: `Saldado de Gasto Fiado: ${g.concepto}`,
      referencia_id: g.id,
    })

    toast.success('¡Gasto marcado como pagado!')
    await loadData()
  }

  const openNewModal = () => {
    setEditingGasto(null)
    setForm({
      concepto: '',
      monto: 0,
      categoria: 'Materiales',
      nuevaCategoria: '',
      fecha: new Date().toISOString().split('T')[0],
      proveedor_id: '',
      notas: '',
      estado_pago: 'pagado',
      fecha_vencimiento: '',
    })
    setShowModal(true)
  }

  const openEdit = (g: Gasto) => {
    setEditingGasto(g)
    const isStandardCat = CATEGORIAS_GASTO.includes(g.categoria)
    setForm({
      concepto: g.concepto,
      monto: Number(g.monto),
      categoria: isStandardCat ? g.categoria : 'OTRO',
      nuevaCategoria: isStandardCat ? '' : g.categoria,
      fecha: g.fecha || new Date().toISOString().split('T')[0],
      proveedor_id: g.proveedor_id || '',
      notas: g.notas || '',
      estado_pago: g.estado_pago || 'pagado',
      fecha_vencimiento: g.fecha_vencimiento || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingGasto(null)
  }

  const filtered = gastos.filter(g =>
    g.concepto.toLowerCase().includes(search.toLowerCase()) ||
    g.categoria.toLowerCase().includes(search.toLowerCase())
  )

  const totalMes = gastos.reduce((sum, g) => sum + Number(g.monto), 0)
  const totalFiado = gastos.filter(g => g.estado_pago === 'fiado').reduce((sum, g) => sum + Number(g.monto), 0)

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Gastos & Egresos" subtitle="Registro de compras, facturas y pagos" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Buscar gasto o categoría..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>

          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Registrar Gasto
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid-stats" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div className="stat-label">Total Egresos Registrados</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totalMes)}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>
              <Clock size={20} />
            </div>
            <div>
              <div className="stat-label">Gastos Fiados / Deudas Pendientes</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{formatCurrency(totalFiado)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {gastos.filter(g => g.estado_pago === 'fiado').length} pendiente(s) de pago
              </div>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Proveedor</th>
                <th>Fecha Gasto</th>
                <th>Estado de Pago</th>
                <th>Monto</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id}>
                  <td>
                    <div>
                      <strong style={{ fontSize: 14 }}>{g.concepto}</strong>
                      {g.notas && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {g.notas}
                        </div>
                      )}
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">{g.categoria}</span></td>
                  <td>{proveedores.find(p => p.id === g.proveedor_id)?.nombre || '—'}</td>
                  <td>{g.fecha ? formatDate(g.fecha) : '—'}</td>
                  <td>
                    {g.estado_pago === 'fiado' ? (
                      <span className="badge badge-warning" style={{ gap: 4 }}>
                        <Clock size={10} /> Fiado {g.fecha_vencimiento ? `(Vence: ${formatDate(g.fecha_vencimiento)})` : ''}
                      </span>
                    ) : (
                      <span className="badge badge-success">✓ Pagado</span>
                    )}
                  </td>
                  <td><strong style={{ color: 'var(--danger)', fontSize: 15 }}>{formatCurrency(g.monto)}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {g.estado_pago === 'fiado' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => toggleMarcarPagado(g)}
                          title="Marcar como saldado/pagado"
                        >
                          <CheckCircle2 size={13} />
                        </button>
                      )}
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(g)} title="Editar">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(g.id, g.concepto)} title="Eliminar">
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
                <h2>{editingGasto ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Concepto / Detalle *</label>
                      <input
                        className="input"
                        placeholder="ej. Compra resmas papel A4 75g"
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
                      <label>Categoría de Gasto</label>
                      <select className="input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                        {CATEGORIAS_GASTO.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="OTRO">➕ Otra Categoría Personalizada...</option>
                      </select>
                    </div>
                    {form.categoria === 'OTRO' && (
                      <div className="form-group">
                        <label>Escribir Nueva Categoría *</label>
                        <input
                          className="input"
                          placeholder="ej. Licencia Software / Packaging"
                          value={form.nuevaCategoria}
                          onChange={e => setForm({ ...form, nuevaCategoria: e.target.value })}
                          required
                        />
                      </div>
                    )}
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

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Condición de Pago</label>
                      <select
                        className="input"
                        value={form.estado_pago}
                        onChange={e => setForm({ ...form, estado_pago: e.target.value as any })}
                      >
                        <option value="pagado">✓ Pagado al contado (Efectivo / Caja)</option>
                        <option value="fiado">⏳ Gasto Fiado / A Crédito (Pendiente)</option>
                      </select>
                    </div>

                    {form.estado_pago === 'fiado' && (
                      <div className="form-group">
                        <label>Fecha de Vencimiento *</label>
                        <input
                          className="input"
                          type="date"
                          value={form.fecha_vencimiento}
                          onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <select className="input" value={form.proveedor_id} onChange={e => setForm({ ...form, proveedor_id: e.target.value })}>
                      <option value="">Sin proveedor asignado</option>
                      {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Notas Adicionales</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 50 }}
                      placeholder="Número de factura, garantía, observaciones..."
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
