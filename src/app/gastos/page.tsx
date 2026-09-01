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
  const [mesFilter, setMesFilter] = useState<string>(new Date().toISOString().substring(0, 7))
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

  const isGastoFiado = (g: Gasto) => {
    return g.estado_pago === 'fiado' ||
      (g.notas ? (g.notas.includes('[FIADO]') || g.notas.includes('[PENDIENTE]') || g.notas.toLowerCase().includes('fiado')) : false)
  }

  const getVencimientoFiado = (g: Gasto) => {
    if (g.fecha_vencimiento) return g.fecha_vencimiento
    const match = (g.notas || '').match(/\[Vence:\s*(.+?)\]/)
    return match ? match[1] : null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.concepto.trim() || form.monto <= 0) {
      toast.error('Completá concepto y monto mayor a 0')
      return
    }

    const catFinal = form.categoria === 'OTRO' ? (form.nuevaCategoria.trim() || 'Otros') : form.categoria

    let cleanNotas = (form.notas || '')
      .replace(/\[FIADO.*?\]/g, '')
      .replace(/\[Vence:.*?\]/g, '')
      .trim()

    if (form.estado_pago === 'fiado') {
      const venceTag = form.fecha_vencimiento ? `[Vence: ${form.fecha_vencimiento}]` : ''
      cleanNotas = `[FIADO] ${venceTag} ${cleanNotas}`.trim()
    }

    let payload: any = {
      concepto: form.concepto.trim(),
      monto: Number(form.monto),
      categoria: catFinal,
      fecha: form.fecha,
      proveedor_id: form.proveedor_id || null,
      notas: cleanNotas || null,
      estado_pago: form.estado_pago,
      fecha_vencimiento: form.estado_pago === 'fiado' ? (form.fecha_vencimiento || null) : null,
    }

    if (editingGasto) {
      let { error } = await supabase.from('gastos').update(payload).eq('id', editingGasto.id)
      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        delete payload.estado_pago
        delete payload.fecha_vencimiento
        const res = await supabase.from('gastos').update(payload).eq('id', editingGasto.id)
        error = res.error
      }

      if (error) {
        toast.error('Error al actualizar gasto: ' + error.message)
        return
      }
      toast.success('Gasto actualizado correctamente')
    } else {
      let { data: newGasto, error } = await supabase.from('gastos').insert(payload).select().single()
      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        delete payload.estado_pago
        delete payload.fecha_vencimiento
        const res = await supabase.from('gastos').insert(payload).select().single()
        newGasto = res.data
        error = res.error
      }

      if (error) {
        toast.error('Error al registrar gasto: ' + error.message)
        return
      }

      // Si es pagado al contado, registrar egreso en caja
      if (form.estado_pago === 'pagado') {
        let movEgreso: any = {
          tipo: 'egreso',
          monto: Number(form.monto),
          concepto: `Gasto: ${form.concepto.trim()}`,
          referencia_id: newGasto?.id || null,
          fecha: new Date().toISOString(),
        }
        await supabase.from('caja_movimientos').insert(movEgreso)
      }

      toast.success(form.estado_pago === 'fiado' ? '⏳ Gasto registrado como FIADO / PENDIENTE' : '🟢 Gasto registrado y pagado')
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
    let cleanNotas = (g.notas || '')
      .replace(/\[FIADO.*?\]/g, '')
      .replace(/\[Vence:.*?\]/g, '')
      .trim()

    let payload: any = {
      estado_pago: 'pagado',
      fecha_vencimiento: null,
      notas: cleanNotas || null
    }

    let { error } = await supabase.from('gastos').update(payload).eq('id', g.id)
    if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
      delete payload.estado_pago
      delete payload.fecha_vencimiento
      const res = await supabase.from('gastos').update(payload).eq('id', g.id)
      error = res.error
    }

    if (error) {
      toast.error('Error al marcar pagado: ' + error.message)
      return
    }

    // Registrar egreso en caja al saldar la deuda
    await supabase.from('caja_movimientos').insert({
      tipo: 'egreso',
      monto: Number(g.monto),
      concepto: `Saldado de Deuda / Fiado: ${g.concepto}`,
      referencia_id: g.id,
      fecha: new Date().toISOString()
    })

    toast.success('💰 ¡Deuda saldada! Gasto marcado como PAGADO y registrado en Caja')
    await loadData()
  }

  const generarGastosFijosRecurrentes = async () => {
    if (!mesFilter) {
      toast.error('Seleccioná un mes en el filtro para generar los gastos fijos')
      return
    }

    const [year, month] = mesFilter.split('-')
    const prevDate = new Date(Number(year), Number(month) - 2, 1)
    const prevMesStr = prevDate.toISOString().substring(0, 7)

    const { data: prevGastos, error: pErr } = await supabase
      .from('gastos')
      .select('*')
      .gte('fecha', `${prevMesStr}-01`)
      .lte('fecha', `${prevMesStr}-31`)

    if (pErr || !prevGastos || prevGastos.length === 0) {
      toast.error(`No hay gastos registrados en el mes anterior (${prevMesStr}) para copiar`)
      return
    }

    const fijos = prevGastos.filter(g =>
      ['Alquiler', 'Servicios', 'Personal', 'Impuestos', 'Mantenimiento Máquinas'].includes(g.categoria) ||
      (g.notas && g.notas.toLowerCase().includes('fijo'))
    )

    if (fijos.length === 0) {
      toast.error('No se encontraron gastos fijos en el mes anterior')
      return
    }

    if (!confirm(`¿Deseas copiar ${fijos.length} gastos fijos del mes ${prevMesStr} al mes ${mesFilter}?`)) {
      return
    }

    const nuevosGastos = fijos.map(g => ({
      concepto: g.concepto,
      monto: Number(g.monto),
      categoria: g.categoria,
      proveedor_id: g.proveedor_id || null,
      fecha: `${mesFilter}-05`,
      notas: g.notas || 'Gasto fijo mensual recurrente'
    }))

    const { error: insErr } = await supabase.from('gastos').insert(nuevosGastos)
    if (insErr) {
      toast.error('Error al generar gastos fijos: ' + insErr.message)
      return
    }

    toast.success(`Se generaron ${nuevosGastos.length} gastos fijos para ${mesFilter}`)
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
    const fiado = isGastoFiado(g)
    const venc = getVencimientoFiado(g)

    let cleanNotas = (g.notas || '')
      .replace(/\[FIADO.*?\]/g, '')
      .replace(/\[Vence:.*?\]/g, '')
      .trim()

    setForm({
      concepto: g.concepto,
      monto: Number(g.monto),
      categoria: isStandardCat ? g.categoria : 'OTRO',
      nuevaCategoria: isStandardCat ? '' : g.categoria,
      fecha: g.fecha || new Date().toISOString().split('T')[0],
      proveedor_id: g.proveedor_id || '',
      notas: cleanNotas,
      estado_pago: fiado ? 'fiado' : 'pagado',
      fecha_vencimiento: venc || '',
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
  const totalFiado = gastos.filter(g => isGastoFiado(g)).reduce((sum, g) => sum + Number(g.monto), 0)
  const countFiados = gastos.filter(g => isGastoFiado(g)).length

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Gastos & Egresos" subtitle="Registro de compras, facturas y pagos" />
      <main style={{ padding: '28px', flex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Gastos Fijos y Operativos</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total filtrado: <strong>{formatCurrency(totalMes)}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {mesFilter && (
              <button className="btn btn-secondary" onClick={generarGastosFijosRecurrentes} title="Copiar gastos fijos del mes anterior a este mes">
                🔄 Copiar Gastos Fijos del Mes
              </button>
            )}
            <button className="btn btn-primary" onClick={openNewModal}>
              <Plus size={16} /> Registrar Gasto
            </button>
          </div>
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
                {countFiados} pendiente(s) de pago
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
              {filtered.map(g => {
                const fiado = isGastoFiado(g)
                const venc = getVencimientoFiado(g)
                const notasLimpias = (g.notas || '').replace(/\[FIADO.*?\]/g, '').replace(/\[Vence:.*?\]/g, '').trim()
                return (
                  <tr key={g.id}>
                    <td>
                      <div>
                        <strong style={{ fontSize: 14 }}>{g.concepto}</strong>
                        {notasLimpias && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {notasLimpias}
                          </div>
                        )}
                      </div>
                    </td>
                    <td><span className="badge badge-neutral">{g.categoria}</span></td>
                    <td>{proveedores.find(p => p.id === g.proveedor_id)?.nombre || '—'}</td>
                    <td>{g.fecha ? formatDate(g.fecha) : '—'}</td>
                    <td>
                      {fiado ? (
                        <span className="badge badge-warning" style={{ gap: 5, padding: '4px 9px', fontWeight: 700 }}>
                          <Clock size={12} /> ⏳ Fiado / Pendiente {venc ? `(Vence: ${formatDate(venc)})` : ''}
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ gap: 4, padding: '4px 9px', fontWeight: 700 }}>
                          ✓ Pagado
                        </span>
                      )}
                    </td>
                    <td><strong style={{ color: 'var(--danger)', fontSize: 15 }}>{formatCurrency(g.monto)}</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {fiado && (
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
                )
              })}
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
