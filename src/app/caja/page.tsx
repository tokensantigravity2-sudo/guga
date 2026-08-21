'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { CajaMovimiento } from '@/lib/types'
import { formatCurrency, formatDateTime } from '@/lib/helpers'
import { Plus, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CajaPage() {
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMov, setEditingMov] = useState<CajaMovimiento | null>(null)
  const [form, setForm] = useState({ tipo: 'ingreso', monto: 0, concepto: '' })
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [filterDate])

  const loadData = async () => {
    const startOfDay = `${filterDate}T00:00:00`
    const endOfDay = `${filterDate}T23:59:59`

    const { data, error } = await supabase
      .from('caja_movimientos')
      .select('*')
      .gte('fecha', startOfDay)
      .lte('fecha', endOfDay)
      .order('fecha', { ascending: false })

    if (error) toast.error('Error al cargar caja: ' + error.message)
    if (data) setMovimientos(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.monto <= 0 || !form.concepto.trim()) {
      toast.error('Completá todos los campos correctamente')
      return
    }

    const payload = {
      tipo: form.tipo,
      monto: Number(form.monto),
      concepto: form.concepto.trim(),
    }

    if (editingMov) {
      const { error } = await supabase.from('caja_movimientos').update(payload).eq('id', editingMov.id)
      if (error) { toast.error('Error al actualizar movimiento: ' + error.message); return }

      // Si era un egreso con referencia de gasto, actualizar el gasto
      if (editingMov.referencia_id && form.tipo === 'egreso') {
        await supabase.from('gastos').update({ monto: form.monto, concepto: form.concepto }).eq('id', editingMov.referencia_id)
      }

      toast.success('Movimiento actualizado')
    } else {
      const { error } = await supabase.from('caja_movimientos').insert(payload)
      if (error) { toast.error('Error al registrar movimiento: ' + error.message); return }
      toast.success('Movimiento de caja registrado')
    }

    closeModal()
    await loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento de caja?')) return
    const { error } = await supabase.from('caja_movimientos').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar movimiento: ' + error.message)
      return
    }
    toast.success('Movimiento eliminado')
    await loadData()
  }

  const openNewModal = () => {
    setEditingMov(null)
    setForm({ tipo: 'ingreso', monto: 0, concepto: '' })
    setShowModal(true)
  }

  const openEditModal = (mov: CajaMovimiento) => {
    setEditingMov(mov)
    setForm({
      tipo: mov.tipo,
      monto: Number(mov.monto),
      concepto: mov.concepto || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingMov(null)
    setForm({ tipo: 'ingreso', monto: 0, concepto: '' })
  }

  const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + Number(m.monto), 0)
  const egresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + Number(m.monto), 0)
  const saldo = ingresos - egresos

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Caja Diaria" subtitle="Control de ingresos y egresos de efectivo" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ margin: 0, fontSize: 13 }}>Fecha:</label>
            <input
              className="input"
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={{ width: 170 }}
            />
          </div>

          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Nuevo Movimiento
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid-stats" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="stat-label">Ingresos del Día</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(ingresos)}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>
              <TrendingDown size={20} />
            </div>
            <div>
              <div className="stat-label">Egresos del Día</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(egresos)}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              <Wallet size={20} />
            </div>
            <div>
              <div className="stat-label">Balance / Saldo</div>
              <div className="stat-value" style={{ color: saldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(saldo)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Movimientos Registrados ({movimientos.length})</div>

          {movimientos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {movimientos.map(mov => (
                <div
                  key={mov.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-hover)',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {mov.tipo === 'ingreso' ? (
                      <ArrowUpCircle size={22} style={{ color: 'var(--success)' }} />
                    ) : (
                      <ArrowDownCircle size={22} style={{ color: 'var(--danger)' }} />
                    )}
                    <div>
                      <strong style={{ fontSize: 14 }}>{mov.concepto}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatDateTime(mov.fecha || '')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: 16,
                      color: mov.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(mov.monto)}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(mov)} title="Editar movimiento">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(mov.id)} title="Eliminar movimiento">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Wallet size={32} />
              <p>Sin movimientos registrados para este día</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h2>{editingMov ? 'Editar Movimiento de Caja' : 'Nuevo Movimiento de Caja'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Tipo de Movimiento</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={`btn ${form.tipo === 'ingreso' ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => setForm({ ...form, tipo: 'ingreso' })}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <ArrowUpCircle size={16} /> Ingreso
                      </button>
                      <button
                        type="button"
                        className={`btn ${form.tipo === 'egreso' ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => setForm({ ...form, tipo: 'egreso' })}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <ArrowDownCircle size={16} /> Egreso
                      </button>
                    </div>
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

                  <div className="form-group">
                    <label>Concepto / Detalle *</label>
                    <input
                      className="input"
                      placeholder="ej. Cobro seña folletos / Compra cambio"
                      value={form.concepto}
                      onChange={e => setForm({ ...form, concepto: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingMov ? 'Guardar Cambios' : 'Registrar Movimiento'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
