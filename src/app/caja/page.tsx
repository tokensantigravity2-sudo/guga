'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { CajaMovimiento, Cliente } from '@/lib/types'
import { formatCurrency, formatDateTime, CATEGORIAS_GASTO } from '@/lib/helpers'
import {
  Plus, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown,
  Edit2, Trash2, User, CreditCard, Receipt, FileText, CheckCircle2, XCircle, Search, X
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function CajaPage() {
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMov, setEditingMov] = useState<CajaMovimiento | null>(null)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])

  // Search client state in modal
  const [clienteSearch, setClienteSearch] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

  const [form, setForm] = useState({
    tipo: 'ingreso' as 'ingreso' | 'egreso',
    monto: 0,
    concepto: '',
    categoria_egreso: 'Materiales',
    otraCategoriaEgreso: '',
    metodo_pago: 'efectivo',
    facturado: false,
  })

  useEffect(() => {
    loadData()
  }, [filterDate])

  const extractMetodo = (mov: any): string => {
    if (mov.metodo_pago && mov.metodo_pago !== 'efectivo') {
      return mov.metodo_pago
    }
    const concepto = mov.concepto || ''
    if (concepto.includes('Pago:')) {
      const match = concepto.match(/Pago:\s*([a-zA-Z_]+)/i)
      if (match && match[1]) {
        const parsed = match[1].toLowerCase().trim()
        if (['tarjeta', 'transferencia', 'cuenta_corriente', 'efectivo'].includes(parsed)) {
          return parsed
        }
      }
    }
    return mov.metodo_pago || 'efectivo'
  }

  const loadData = async () => {
    setLoading(true)
    const startOfDay = `${filterDate}T00:00:00`
    const endOfDay = `${filterDate}T23:59:59`

    const [{ data: movs, error: mErr }, { data: peds }, { data: clts }] = await Promise.all([
      supabase
        .from('caja_movimientos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('pedidos')
        .select('id, numero, cliente_id, cliente_nombre, total, subtotal, descuento, metodo_pago, estado, notas, created_at')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('clientes').select('id, nombre, rut, telefono, email').order('nombre'),
    ])

    if (mErr) toast.error('Error al cargar caja: ' + mErr.message)

    // Filtrar movimientos de caja por la fecha elegida
    let allMovs: CajaMovimiento[] = []
    if (movs) {
      allMovs = movs.map(m => ({ ...m, metodo_pago: extractMetodo(m) })).filter(m => {
        const d = (m.fecha || m.created_at || '').substring(0, 10)
        return d === filterDate
      })
    }

    // Ordenar movimientos reales por fecha descendente
    allMovs.sort((a, b) => new Date(b.fecha || b.created_at || 0).getTime() - new Date(a.fecha || a.created_at || 0).getTime())

    setMovimientos(allMovs)
    if (clts) setClientes(clts)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.monto <= 0 || !form.concepto.trim()) {
      toast.error('Completá concepto y monto mayor a 0')
      return
    }

    const clientNameFinal = selectedCliente ? selectedCliente.nombre : (clienteSearch.trim() || 'Consumidor Final')
    const catEgresoFinal = form.categoria_egreso === 'OTRO' ? (form.otraCategoriaEgreso.trim() || 'Otros') : form.categoria_egreso

    let payload: any = {
      tipo: form.tipo,
      monto: Number(form.monto),
      concepto: form.concepto.trim(),
      cliente_id: selectedCliente?.id || null,
      cliente_nombre: clientNameFinal,
      metodo_pago: form.metodo_pago || 'efectivo',
      facturado: !!form.facturado,
    }

    if (editingMov) {
      let { error } = await supabase.from('caja_movimientos').update(payload).eq('id', editingMov.id)

      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        // Fallback si la tabla caja_movimientos carece de columnas cliente_id, cliente_nombre, etc.
        const cleanPayload = {
          tipo: form.tipo,
          monto: Number(form.monto),
          concepto: `${form.concepto.trim()} [Cliente: ${clientNameFinal} | Pago: ${form.metodo_pago || 'efectivo'}${form.facturado ? ' | Facturado' : ''}]`,
        }
        const res = await supabase.from('caja_movimientos').update(cleanPayload).eq('id', editingMov.id)
        error = res.error
      }

      if (error) { toast.error('Error al actualizar movimiento: ' + error.message); return }

      // Si es un egreso con referencia de gasto, actualizar el gasto
      if (editingMov.referencia_id && form.tipo === 'egreso') {
        await supabase.from('gastos').update({
          monto: form.monto,
          concepto: form.concepto,
          categoria: catEgresoFinal,
        }).eq('id', editingMov.referencia_id)
      }

      toast.success('Movimiento actualizado')
    } else {
      let refId: string | null = null

      // Si es un egreso de caja, crear también el registro en gastos
      if (form.tipo === 'egreso') {
        const { data: newGasto } = await supabase.from('gastos').insert({
          concepto: `Salida de Caja: ${form.concepto.trim()}`,
          monto: Number(form.monto),
          categoria: catEgresoFinal,
          fecha: filterDate,
          estado_pago: 'pagado',
          notas: `Registrado desde Caja Diaria por cliente/proveedor: ${clientNameFinal}`
        }).select().single()

        if (newGasto) refId = newGasto.id
      }

      let insertPayload: any = {
        ...payload,
        referencia_id: refId,
        fecha: `${filterDate}T${new Date().toISOString().split('T')[1] || '12:00:00.000Z'}`
      }

      let { error } = await supabase.from('caja_movimientos').insert(insertPayload)

      if (error && (error.message.includes('column') || error.message.includes('schema') || error.code === 'PGRST204')) {
        // Fallback si la tabla caja_movimientos carece de columnas cliente_id, cliente_nombre, etc.
        const cleanInsert = {
          tipo: form.tipo,
          monto: Number(form.monto),
          concepto: `${form.concepto.trim()} [Cliente: ${clientNameFinal} | Pago: ${form.metodo_pago || 'efectivo'}${form.facturado ? ' | Facturado' : ''}]`,
          referencia_id: refId,
          fecha: `${filterDate}T${new Date().toISOString().split('T')[1] || '12:00:00.000Z'}`
        }
        const res = await supabase.from('caja_movimientos').insert(cleanInsert)
        error = res.error
      }

      if (error) { toast.error('Error al registrar movimiento: ' + error.message); return }
      toast.success(form.tipo === 'ingreso' ? 'Entrada registrada en caja' : 'Salida de caja registrada y reflejada en Gastos')
    }

    closeModal()
    await loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento de caja?')) return

    // Consultar el movimiento antes de borrar para ver si estaba vinculado a un pedido
    const { data: movToDelete } = await supabase.from('caja_movimientos').select('*').eq('id', id).single()

    const { error } = await supabase.from('caja_movimientos').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar movimiento: ' + error.message)
      return
    }

    // Si estaba vinculado a un pedido, desmarcarlo como cobrado en el pedido sin cancelar el pedido
    if (movToDelete?.referencia_id) {
      const { data: linkedPed } = await supabase.from('pedidos').select('id, notas').eq('id', movToDelete.referencia_id).single()
      if (linkedPed) {
        const cleanNotas = (linkedPed.notas || '').replace(/\[COBRADO:true\]/g, '').trim()
        await supabase.from('pedidos').update({
          cobrado: false,
          notas: cleanNotas || null
        }).eq('id', linkedPed.id)
      }
    }

    toast.success('Movimiento eliminado de caja')
    await loadData()
  }

  const openNewModal = () => {
    setEditingMov(null)
    setSelectedCliente(null)
    setClienteSearch('')
    setForm({
      tipo: 'ingreso',
      monto: 0,
      concepto: '',
      categoria_egreso: 'Materiales',
      otraCategoriaEgreso: '',
      metodo_pago: 'efectivo',
      facturado: false,
    })
    setShowModal(true)
  }

  const openEditModal = (mov: CajaMovimiento) => {
    setEditingMov(mov)
    let conceptoLimpio = mov.concepto || ''
    let clientName = mov.cliente_nombre || ''
    let metodo = mov.metodo_pago || 'efectivo'
    let isFact = !!mov.facturado

    if (conceptoLimpio.includes('[Cliente:')) {
      const match = conceptoLimpio.match(/\[Cliente:\s*(.*?)\s*\|\s*Pago:\s*(.*?)\s*(\|\s*Facturado)?\]/)
      if (match) {
        if (!clientName) clientName = match[1]
        if (!metodo) metodo = match[2] as any
        if (match[3]) isFact = true
      }
      conceptoLimpio = conceptoLimpio.replace(/\[Cliente:.*?\]/, '').trim()
    }

    const matchClient = clientes.find(c => c.id === mov.cliente_id || c.nombre === clientName)
    setSelectedCliente(matchClient || null)
    setClienteSearch(clientName)
    setForm({
      tipo: mov.tipo,
      monto: Number(mov.monto),
      concepto: conceptoLimpio,
      categoria_egreso: 'Materiales',
      otraCategoriaEgreso: '',
      metodo_pago: metodo,
      facturado: isFact,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingMov(null)
    setSelectedCliente(null)
    setClienteSearch('')
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

  // Búsqueda de clientes por Nombre, Teléfono o RUT
  const filteredClientesModal = clientes.filter(c => {
    const q = clienteSearch.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q) ||
      c.rut?.toLowerCase().includes(q)
    )
  })

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
                          {extractMetodo(mov) === 'tarjeta' ? '💳 Tarjeta' : extractMetodo(mov) === 'transferencia' ? '🏦 Transferencia' : extractMetodo(mov) === 'cuenta_corriente' ? '📜 Cta. Corriente' : '💵 Efectivo'}
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

                  {/* Search Bar for Client by RUT, Phone, or Name */}
                  <div className="form-group" style={{ position: 'relative', marginBottom: 12 }}>
                    <label style={{ marginBottom: 4 }}>Cliente / Empresa (Buscar por RUT, Teléfono o Nombre)</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        className="input"
                        placeholder="Buscar por RUT, Teléfono o Nombre..."
                        value={selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.rut ? `(RUT: ${selectedCliente.rut})` : ''}` : clienteSearch}
                        onChange={e => {
                          setClienteSearch(e.target.value)
                          setSelectedCliente(null)
                          setShowClienteDropdown(true)
                        }}
                        onFocus={() => setShowClienteDropdown(true)}
                        style={{ paddingLeft: 30 }}
                      />
                      {selectedCliente && (
                        <button
                          type="button"
                          onClick={() => { setSelectedCliente(null); setClienteSearch('') }}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {showClienteDropdown && (clienteSearch || filteredClientesModal.length > 0) && !selectedCliente && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                        borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto',
                        zIndex: 30, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        <div
                          onClick={() => {
                            setSelectedCliente(null)
                            setShowClienteDropdown(false)
                          }}
                          style={{
                            padding: '8px 12px', borderBottom: '1px solid var(--border)',
                            cursor: 'pointer', fontSize: 12.5, color: 'var(--text-muted)'
                          }}
                        >
                          Consumidor Final / Sin cliente registrado
                        </div>
                        {filteredClientesModal.slice(0, 6).map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCliente(c)
                              setClienteSearch('')
                              setShowClienteDropdown(false)
                            }}
                            style={{
                              padding: '8px 12px', borderBottom: '1px solid var(--border)',
                              cursor: 'pointer', fontSize: 12.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                          >
                            <div>
                              <strong>{c.nombre}</strong>
                              {c.rut && <div style={{ fontSize: 11, color: 'var(--accent)' }}>RUT: {c.rut}</div>}
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{c.telefono}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Si es Salida / Egreso, seleccionar Motivo/Categoría igual que en Gastos */}
                  {form.tipo === 'egreso' && (
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label>Categoría / Motivo de Salida (se reflejará en Gastos) *</label>
                      <select
                        className="input"
                        value={form.categoria_egreso}
                        onChange={e => setForm({ ...form, categoria_egreso: e.target.value })}
                      >
                        {CATEGORIAS_GASTO.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="OTRO">➕ Otra Categoría Personalizada...</option>
                      </select>
                    </div>
                  )}

                  {form.tipo === 'egreso' && form.categoria_egreso === 'OTRO' && (
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label>Escribir Nueva Categoría de Egreso *</label>
                      <input
                        className="input"
                        placeholder="ej. Pago Flete / Reparación Maquinaria"
                        value={form.otraCategoriaEgreso}
                        onChange={e => setForm({ ...form, otraCategoriaEgreso: e.target.value })}
                        required
                      />
                    </div>
                  )}

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

                  {/* Medio de Pago & Monto */}
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
