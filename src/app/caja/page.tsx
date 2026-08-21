'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { CajaMovimiento, Cliente } from '@/lib/types'
import { formatCurrency, formatDateTime } from '@/lib/helpers'
import {
  Plus, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown,
  Edit2, Trash2, User, CreditCard, Receipt, FileText, CheckCircle2, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function CajaPage() {
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMov, setEditingMov] = useState<CajaMovimiento | null>(null)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])

  const [form, setForm] = useState({
    tipo: 'ingreso' as 'ingreso' | 'egreso',
    monto: 0,
    concepto: '',
    cliente_id: '',
    cliente_nombre: '',
    metodo_pago: 'efectivo',
    facturado: false,
  })

  useEffect(() => {
    loadData()
  }, [filterDate])

  const loadData = async () => {
    const startOfDay = `${filterDate}T00:00:00`
    const endOfDay = `${filterDate}T23:59:59`

    const [{ data: movs, error: mErr }, { data: clts }] = await Promise.all([
      supabase
        .from('caja_movimientos')
        .select('*')
        .gte('fecha', startOfDay)
        .lte('fecha', endOfDay)
        .order('fecha', { ascending: false }),
      supabase.from('clientes').select('*').order('nombre'),
    ])

    if (mErr) toast.error('Error al cargar caja: ' + mErr.message)
    if (movs) setMovimientos(movs)
    if (clts) setClientes(clts)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.monto <= 0 || !form.concepto.trim()) {
      toast.error('Completá concepto y monto mayor a 0')
      return
    }

    const selectedClientObj = clientes.find(c => c.id === form.cliente_id)
    const clientNameFinal = selectedClientObj ? selectedClientObj.nombre : (form.cliente_nombre.trim() || 'Consumidor Final')

    const payload = {
      tipo: form.tipo,
      monto: Number(form.monto),
      concepto: form.concepto.trim(),
      cliente_id: form.cliente_id || null,
      cliente_nombre: clientNameFinal,
      metodo_pago: form.metodo_pago || 'efectivo',
      facturado: !!form.facturado,
    }

    if (editingMov) {
      const { error } = await supabase.from('caja_movimientos').update(payload).eq('id', editingMov.id)
      if (error) { toast.error('Error al actualizar movimiento: ' + error.message); return }

      // Si tenía referencia de gasto y era egreso, actualizar gasto
      if (editingMov.referencia_id && form.tipo === 'egreso') {
        await supabase.from('gastos').update({ monto: form.monto, concepto: form.concepto }).eq('id', editingMov.referencia_id)
      }

      toast.success('Movimiento actualizado')
    } else {
      const { error } = await supabase.from('caja_movimientos').insert(payload)
      if (error) { toast.error('Error al registrar movimiento: ' + error.message); return }
      toast.success('Movimiento registrado en caja')
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
    setForm({
      tipo: 'ingreso',
      monto: 0,
      concepto: '',
      cliente_id: '',
      cliente_nombre: '',
      metodo_pago: 'efectivo',
      facturado: false,
    })
    setShowModal(true)
  }

  const openEditModal = (mov: CajaMovimiento) => {
    setEditingMov(mov)
    setForm({
      tipo: mov.tipo,
      monto: Number(mov.monto),
      concepto: mov.concepto || '',
      cliente_id: mov.cliente_id || '',
      cliente_nombre: mov.cliente_nombre || '',
      metodo_pago: mov.metodo_pago || 'efectivo',
      facturado: !!mov.facturado,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingMov(null)
  }

  const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + Number(m.monto), 0)
  const egresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + Number(m.monto), 0)
  const saldo = ingresos - egresos

  const METODOS_LABEL: Record<string, string> = {
    efectivo: '💵 Efectivo',
    tarjeta: '💳 Tarjeta',
    transferencia: '🏦 Transferencia',
    cuenta_corriente: '📝 Cta. Corriente',
  }

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Caja Diaria" subtitle="Control de entradas (ingresos) y salidas (egresos) de caja" />
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
              <div className="stat-label">Ingresos / Entradas</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(ingresos)}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>
              <TrendingDown size={20} />
            </div>
            <div>
              <div className="stat-label">Egresos / Salidas</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(egresos)}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              <Wallet size={20} />
            </div>
            <div>
              <div className="stat-label">Saldo / Balance del Día</div>
              <div className="stat-value" style={{ color: saldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(saldo)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Movimientos Registrados ({movimientos.length})</div>

          {movimientos.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Cliente / Empresa</th>
                    <th>Descripción / Concepto</th>
                    <th>Medio de Pago</th>
                    <th>Facturado</th>
                    <th>Hora / Fecha</th>
                    <th>Monto</th>
                    <th style={{ width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(mov => (
                    <tr key={mov.id}>
                      <td>
                        {mov.tipo === 'ingreso' ? (
                          <span className="badge badge-success" style={{ gap: 4 }}>
                            <ArrowUpCircle size={12} /> Entrada
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ gap: 4 }}>
                            <ArrowDownCircle size={12} /> Salida
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{mov.cliente_nombre || 'Consumidor Final'}</strong>
                      </td>
                      <td>{mov.concepto}</td>
                      <td>
                        <span className="badge badge-neutral">
                          {METODOS_LABEL[mov.metodo_pago || 'efectivo'] || mov.metodo_pago}
                        </span>
                      </td>
                      <td>
                        {mov.facturado ? (
                          <span className="badge badge-accent" style={{ gap: 4 }}>
                            <Receipt size={10} /> Sí (Factura)
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ color: 'var(--text-muted)' }}>
                            No
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDateTime(mov.fecha || '')}
                      </td>
                      <td>
                        <strong style={{
                          fontSize: 15,
                          color: mov.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(mov.monto)}
                        </strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(mov)} title="Editar">
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(mov.id)} title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div className="modal-header">
                <h2>{editingMov ? 'Editar Movimiento' : 'Nuevo Movimiento de Caja'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">

                  {/* Entrada / Salida toggle */}
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>Tipo de Movimiento *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={`btn ${form.tipo === 'ingreso' ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => setForm({ ...form, tipo: 'ingreso' })}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <ArrowUpCircle size={16} /> 🟢 Entrada / Ingreso
                      </button>
                      <button
                        type="button"
                        className={`btn ${form.tipo === 'egreso' ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => setForm({ ...form, tipo: 'egreso' })}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <ArrowDownCircle size={16} /> 🔴 Salida / Egreso
                      </button>
                    </div>
                  </div>

                  {/* Cliente / Empresa dropdown */}
                  <div className="form-group">
                    <label>Cliente / Empresa (Opcional)</label>
                    <select
                      className="input"
                      value={form.cliente_id}
                      onChange={e => {
                        const cid = e.target.value
                        const clt = clientes.find(c => c.id === cid)
                        setForm({
                          ...form,
                          cliente_id: cid,
                          cliente_nombre: clt ? clt.nombre : ''
                        })
                      }}
                    >
                      <option value="">Consumidor Final / Sin cliente registrado</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} {c.rut ? `(RUT: ${c.rut})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Descripción / Concepto */}
                  <div className="form-group">
                    <label>Descripción / Concepto *</label>
                    <input
                      className="input"
                      placeholder="ej. Cobro seña impresiones / Compra cambio"
                      value={form.concepto}
                      onChange={e => setForm({ ...form, concepto: e.target.value })}
                      required
                    />
                  </div>

                  {/* Medio de Pago & Facturado */}
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Medio de Pago</label>
                      <select
                        className="input"
                        value={form.metodo_pago}
                        onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                      >
                        <option value="efectivo">💵 Efectivo</option>
                        <option value="tarjeta">💳 Tarjeta</option>
                        <option value="transferencia">🏦 Transferencia Bancaria</option>
                        <option value="cuenta_corriente">📝 Cta. Corriente</option>
                      </select>
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

                  {/* Checkbox Facturado */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)',
                    marginBottom: 12
                  }}>
                    <input
                      type="checkbox"
                      id="facturado_chk"
                      checked={form.facturado}
                      onChange={e => setForm({ ...form, facturado: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <label htmlFor="facturado_chk" style={{ margin: 0, cursor: 'pointer', textTransform: 'none', fontSize: 13, fontWeight: 600 }}>
                      📄 Facturado con RUT / Factura Oficial
                    </label>
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
