'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { CajaMovimiento, Cliente, Pedido } from '@/lib/types'
import { formatCurrency, formatDateTime, formatDate, CATEGORIAS_GASTO, getTodayStr } from '@/lib/helpers'
import {
  Plus, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown,
  Edit2, Trash2, User, CreditCard, Receipt, FileText, CheckCircle2, XCircle,
  Search, X, Calendar, ArrowLeft, ArrowRight, Layers, ListFilter, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

export interface CajaDiariaResumen {
  fecha: string
  ingresos: number
  egresos: number
  saldo: number
  cantidadMovimientos: number
  efectivo: number
  transferencia: number
  tarjeta: number
  cuenta_corriente: number
  movimientos: CajaMovimiento[]
}

export default function CajaPage() {
  const [allMovimientos, setAllMovimientos] = useState<CajaMovimiento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMov, setEditingMov] = useState<CajaMovimiento | null>(null)
  const [filterDate, setFilterDate] = useState(getTodayStr())
  const [activeTab, setActiveTab] = useState<'diaria' | 'todas_cajas' | 'todos_movimientos'>('diaria')

  // Search & filter state for "todos_movimientos"
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMetodo, setFilterMetodo] = useState<'todos' | 'efectivo' | 'transferencia' | 'tarjeta' | 'cuenta_corriente'>('todos')
  const [filterTipoMov, setFilterTipoMov] = useState<'todos' | 'ingreso' | 'egreso'>('todos')

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
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const paramFecha = params.get('fecha')
      const paramTab = params.get('tab')
      if (paramFecha) {
        setFilterDate(paramFecha)
        setActiveTab('diaria')
      } else if (paramTab === 'historial' || paramTab === 'todas_cajas') {
        setActiveTab('todas_cajas')
      } else if (paramTab === 'movimientos') {
        setActiveTab('todos_movimientos')
      }
    }
    loadData()
  }, [])

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
    try {
      const [{ data: movs, error: mErr }, { data: peds }, { data: clts }] = await Promise.all([
        supabase
          .from('caja_movimientos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('pedidos')
          .select('id, numero, cliente_id, cliente_nombre, total, subtotal, descuento, metodo_pago, estado, notas, created_at')
          .not('estado', 'eq', 'cancelado')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('clientes').select('id, nombre, rut, telefono, email').order('nombre'),
      ])

      if (mErr) toast.error('Error al cargar caja: ' + mErr.message)

      let rawMovs: CajaMovimiento[] = (movs || []).map(m => ({ ...m, metodo_pago: extractMetodo(m) }))

      // Reconciliar pedidos cobrados: si algún pedido figura como cobrado pero no tiene fila en caja_movimientos, sincronizarlo
      const existingRefIds = new Set(rawMovs.map(m => m.referencia_id).filter(Boolean))
      const missingToInsert: any[] = []

      if (peds) {
        peds.forEach(p => {
          if (p.estado === 'cancelado' || p.estado === 'presupuesto') return
          const isCobrado = (p as any).cobrado === true || (p.notas || '').includes('[COBRADO:true]')
          if (isCobrado && !existingRefIds.has(p.id)) {
            const fecha = p.created_at || new Date().toISOString()
            const metodo = p.metodo_pago || 'efectivo'
            const concepto = `[Pago: ${metodo}] Cobro 100% Pedido #${p.numero} - ${p.cliente_nombre || 'Consumidor Final'}`
            const newSyntheticMov: CajaMovimiento = {
              id: `ped-syn-${p.id}`,
              tipo: 'ingreso',
              monto: Number(p.total) || 0,
              concepto,
              referencia_id: p.id,
              fecha,
              created_at: fecha,
              metodo_pago: metodo,
              cliente_nombre: p.cliente_nombre || 'Consumidor Final',
            }
            rawMovs.push(newSyntheticMov)
            missingToInsert.push({
              tipo: 'ingreso',
              monto: Number(p.total) || 0,
              concepto,
              referencia_id: p.id,
              fecha,
              created_at: fecha,
            })
          }
        })
      }

      if (missingToInsert.length > 0) {
        supabase.from('caja_movimientos').insert(missingToInsert).then(({ error }) => {
          if (error) console.error('Error auto-inserting missing caja_movimientos', error)
        })
      }

      rawMovs.sort((a, b) => new Date(b.fecha || b.created_at || 0).getTime() - new Date(a.fecha || a.created_at || 0).getTime())

      setAllMovimientos(rawMovs)
      if (clts) setClientes(clts)

      if (typeof window !== 'undefined' && !new URLSearchParams(window.location.search).get('fecha')) {
        const todayStr = getTodayStr()
        const hasToday = rawMovs.some(m => (m.fecha || m.created_at || '').substring(0, 10) === todayStr)
        if (!hasToday && rawMovs.length > 0) {
          const mostRecentDate = (rawMovs[0].fecha || rawMovs[0].created_at || '').substring(0, 10)
          if (mostRecentDate) {
            setFilterDate(mostRecentDate)
          }
        }
      }
    } catch (err: any) {
      console.error('Error cargando datos de caja:', err)
    } finally {
      setLoading(false)
    }
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

  // Búsqueda de clientes por Nombre, Teléfono o RUT
  const filteredClientesModal = clientes.filter(c => {
    const q = clienteSearch.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q) ||
      c.rut?.toLowerCase().includes(q)
    )
  })

  // Agrupación de todas las cajas por jornada/día
  const cajasDiarias: CajaDiariaResumen[] = useMemo(() => {
    const map: Record<string, CajaDiariaResumen> = {}

    allMovimientos.forEach(m => {
      const f = (m.fecha || m.created_at || '').substring(0, 10)
      if (!f) return
      if (!map[f]) {
        map[f] = {
          fecha: f,
          ingresos: 0,
          egresos: 0,
          saldo: 0,
          cantidadMovimientos: 0,
          efectivo: 0,
          transferencia: 0,
          tarjeta: 0,
          cuenta_corriente: 0,
          movimientos: []
        }
      }
      map[f].cantidadMovimientos++
      map[f].movimientos.push(m)

      const monto = Number(m.monto || 0)
      const metodo = extractMetodo(m)

      if (m.tipo === 'ingreso') {
        map[f].ingresos += monto
        map[f].saldo += monto
        if (metodo === 'transferencia') map[f].transferencia += monto
        else if (metodo === 'tarjeta') map[f].tarjeta += monto
        else if (metodo === 'cuenta_corriente') map[f].cuenta_corriente += monto
        else map[f].efectivo += monto
      } else {
        map[f].egresos += monto
        map[f].saldo -= monto
      }
    })

    return Object.values(map).sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [allMovimientos])

  // Estadísticas globales históricas de toda la caja
  const totalHistoricoIngresos = useMemo(() => {
    return allMovimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + Number(m.monto || 0), 0)
  }, [allMovimientos])

  const totalHistoricoEgresos = useMemo(() => {
    return allMovimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + Number(m.monto || 0), 0)
  }, [allMovimientos])

  const totalHistoricoSaldo = totalHistoricoIngresos - totalHistoricoEgresos

  // Movimientos filtrados para el día seleccionado en la pestaña "Caja por Día"
  const movimientosDelDia = useMemo(() => {
    return allMovimientos.filter(m => {
      const d = (m.fecha || m.created_at || '').substring(0, 10)
      return d === filterDate
    })
  }, [allMovimientos, filterDate])

  const ingresosDelDia = movimientosDelDia.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + Number(m.monto || 0), 0)
  const egresosDelDia = movimientosDelDia.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + Number(m.monto || 0), 0)
  const saldoDelDia = ingresosDelDia - egresosDelDia

  // Desglose de ingresos por método para el día seleccionado
  const desgloseDia = useMemo(() => {
    let ef = 0, tr = 0, tj = 0, cc = 0
    movimientosDelDia.filter(m => m.tipo === 'ingreso').forEach(m => {
      const met = extractMetodo(m)
      const val = Number(m.monto || 0)
      if (met === 'transferencia') tr += val
      else if (met === 'tarjeta') tj += val
      else if (met === 'cuenta_corriente') cc += val
      else ef += val
    })
    return { ef, tr, tj, cc }
  }, [movimientosDelDia])

  // Movimientos filtrados para la pestaña "Todos los Movimientos"
  const movimientosFiltradosTodos = useMemo(() => {
    return allMovimientos.filter(m => {
      if (filterTipoMov !== 'todos' && m.tipo !== filterTipoMov) return false
      const met = extractMetodo(m)
      if (filterMetodo !== 'todos' && met !== filterMetodo) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchConcepto = (m.concepto || '').toLowerCase().includes(q)
        const matchCliente = (m.cliente_nombre || '').toLowerCase().includes(q)
        const matchMonto = String(m.monto).includes(q)
        if (!matchConcepto && !matchCliente && !matchMonto) return false
      }
      return true
    })
  }, [allMovimientos, filterTipoMov, filterMetodo, searchQuery])

  // Navegación rápida de fechas
  const cambiarFechaRelativa = (offsetDays: number) => {
    const parts = filterDate.split('-').map(Number)
    const d = new Date(parts[0], parts[1] - 1, parts[2] + offsetDays)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    setFilterDate(`${yyyy}-${mm}-${dd}`)
  }

  const verCajaDeFecha = (fecha: string) => {
    setFilterDate(fecha)
    setActiveTab('diaria')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Fechas recientes con actividad para chips de navegación rápida
  const ultimasFechasConActividad = cajasDiarias.slice(0, 5)

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Caja & Arqueo Diario" subtitle="Control y registro de cobros, entradas y salidas de mostrador" />
      <main style={{ padding: '28px', flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Barra superior de pestañas y acción principal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          
          {/* Navegación por Pestañas */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-hover)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
            <button
              className={`btn btn-sm ${activeTab === 'diaria' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('diaria')}
              style={{ fontWeight: 600, gap: 6 }}
            >
              <Calendar size={15} /> Caja por Día
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'todas_cajas' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('todas_cajas')}
              style={{ fontWeight: 600, gap: 6 }}
            >
              <Layers size={15} /> Todas las Cajas ({cajasDiarias.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'todos_movimientos' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('todos_movimientos')}
              style={{ fontWeight: 600, gap: 6 }}
            >
              <ListFilter size={15} /> Todos los Movimientos ({allMovimientos.length})
            </button>
          </div>

          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Nuevo Movimiento
          </button>
        </div>

        {/* ========================================================= */}
        {/* PESTAÑA 1: CAJA POR DÍA                                    */}
        {/* ========================================================= */}
        {activeTab === 'diaria' && (
          <div>
            {/* Controles de selección y navegación de fecha */}
            <div className="card" style={{ marginBottom: 20, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Jornada:</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => cambiarFechaRelativa(-1)} title="Día anterior">
                    <ArrowLeft size={14} /> Anterior
                  </button>
                  <input
                    className="input"
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    style={{ width: 160, padding: '5px 10px', fontSize: 13, fontWeight: 600 }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={() => cambiarFechaRelativa(1)} title="Día siguiente">
                    Siguiente <ArrowRight size={14} />
                  </button>
                  <button
                    className={`btn btn-sm ${filterDate === getTodayStr() ? 'btn-accent' : 'btn-ghost'}`}
                    onClick={() => setFilterDate(getTodayStr())}
                    style={{ fontSize: 12 }}
                  >
                    Hoy
                  </button>
                </div>

                {/* Chips de acceso directo a días recientes con movimientos */}
                {ultimasFechasConActividad.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cajas con actividad:</span>
                    {ultimasFechasConActividad.map(c => {
                      const isCur = c.fecha === filterDate
                      return (
                        <button
                          key={c.fecha}
                          type="button"
                          onClick={() => setFilterDate(c.fecha)}
                          className={`btn btn-sm ${isCur ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 14 }}
                        >
                          {c.fecha.substring(8, 10)}/{c.fecha.substring(5, 7)}: {formatCurrency(c.ingresos)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Aviso inteligente si el día seleccionado no tiene movimientos */}
            {movimientosDelDia.length === 0 && (
              <div style={{
                background: 'rgba(20, 155, 142, 0.08)',
                border: '1px dashed var(--accent)',
                padding: '14px 18px',
                borderRadius: 8,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--accent)' }}>
                    Sin movimientos registrados para el {formatDate(filterDate)}
                  </strong>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Podés registrar un movimiento con el botón superior, saltar al último día con actividad, o consultar todas las cajas anteriores.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ultimasFechasConActividad.length > 0 && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setFilterDate(ultimasFechasConActividad[0].fecha)}
                    >
                      Ir a última caja ({ultimasFechasConActividad[0].fecha})
                    </button>
                  )}
                  <button className="btn btn-sm btn-primary" onClick={() => setActiveTab('todas_cajas')}>
                    Ver Todas las Cajas ➔
                  </button>
                </div>
              </div>
            )}

            {/* Stats Grid del Día */}
            <div className="grid-stats" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="stat-label">Ingresos / Cobros del Día</div>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(ingresosDelDia)}</div>
                  {ingresosDelDia > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                      {desgloseDia.tr > 0 && <span>🏦 Transf: {formatCurrency(desgloseDia.tr)} </span>}
                      {desgloseDia.ef > 0 && <span>💵 Efect: {formatCurrency(desgloseDia.ef)} </span>}
                      {desgloseDia.tj > 0 && <span>💳 Tarj: {formatCurrency(desgloseDia.tj)}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>
                  <TrendingDown size={20} />
                </div>
                <div>
                  <div className="stat-label">Egresos / Salidas del Día</div>
                  <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(egresosDelDia)}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  <Wallet size={20} />
                </div>
                <div>
                  <div className="stat-label">Cierre Neto / Saldo del Día</div>
                  <div className="stat-value" style={{ color: saldoDelDia >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatCurrency(saldoDelDia)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                    {movimientosDelDia.length} {movimientosDelDia.length === 1 ? 'operación' : 'operaciones'}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de Movimientos del Día */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="section-title" style={{ margin: 0 }}>
                  Movimientos de la Jornada: {formatDate(filterDate)} ({movimientosDelDia.length})
                </div>
              </div>

              {movimientosDelDia.length > 0 ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Cliente / Empresa</th>
                        <th>Descripción / Concepto</th>
                        <th>Medio de Pago</th>
                        <th>Facturado</th>
                        <th>Hora</th>
                        <th>Monto</th>
                        <th style={{ width: 100 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosDelDia.map(mov => {
                        const metodo = extractMetodo(mov)
                        return (
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
                            <td>
                              <div>{mov.concepto}</div>
                              {mov.referencia_id && (
                                <span style={{ fontSize: 11, color: 'var(--accent)' }}>
                                  Vinculado a Pedido
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="badge badge-neutral">
                                {metodo === 'tarjeta' ? '💳 Tarjeta' : metodo === 'transferencia' ? '🏦 Transferencia' : metodo === 'cuenta_corriente' ? '📜 Cta. Corriente' : '💵 Efectivo'}
                              </span>
                            </td>
                            <td>
                              {mov.facturado ? (
                                <span className="badge badge-accent" style={{ gap: 4 }}>
                                  <Receipt size={10} /> Sí
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <Wallet size={36} />
                  <p style={{ fontWeight: 600 }}>Sin movimientos registrados en esta fecha</p>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Podés seleccionar otro día en el calendario o registrar una entrada/salida.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 2: TODAS LAS CAJAS (HISTORIAL DIARIO)              */}
        {/* ========================================================= */}
        {activeTab === 'todas_cajas' && (
          <div>
            {/* Métricas históricas acumuladas */}
            <div className="grid-stats" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="stat-label">Total Ingresos Cobrados</div>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalHistoricoIngresos)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Histórico general de caja</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>
                  <TrendingDown size={20} />
                </div>
                <div>
                  <div className="stat-label">Total Egresos Registrados</div>
                  <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totalHistoricoEgresos)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Salidas y pagos por mostrador</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  <Wallet size={20} />
                </div>
                <div>
                  <div className="stat-label">Saldo Acumulado en Caja</div>
                  <div className="stat-value" style={{ color: totalHistoricoSaldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatCurrency(totalHistoricoSaldo)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Balance neto de todas las jornadas</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="stat-label">Jornadas con Caja</div>
                  <div className="stat-value">{cajasDiarias.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Días con actividad comercial</div>
                </div>
              </div>
            </div>

            {/* Tabla con todas las Cajas Diarias */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="section-title" style={{ margin: 0 }}>
                  Historial de Cajas Diarias ({cajasDiarias.length} jornadas registradas)
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Hacé clic en "Ver Detalle" para ver el arqueo de cada día
                </span>
              </div>

              {cajasDiarias.length > 0 ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha de Caja</th>
                        <th>Operaciones</th>
                        <th>Ingresos por Medio de Pago</th>
                        <th>Total Ingresos</th>
                        <th>Total Egresos</th>
                        <th>Cierre Neto / Saldo</th>
                        <th style={{ width: 140, textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cajasDiarias.map(c => {
                        const isTodayDate = c.fecha === getTodayStr()
                        return (
                          <tr key={c.fecha} style={{ background: isTodayDate ? 'rgba(20, 155, 142, 0.04)' : undefined }}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <strong style={{ fontSize: 14 }}>{formatDate(c.fecha)}</strong>
                                {isTodayDate && (
                                  <span className="badge badge-accent" style={{ fontSize: 10 }}>Hoy</span>
                                )}
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.fecha}</span>
                            </td>
                            <td>
                              <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                                {c.cantidadMovimientos} {c.cantidadMovimientos === 1 ? 'movimiento' : 'movimientos'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {c.transferencia > 0 && (
                                  <span className="badge badge-info" style={{ fontSize: 10 }}>
                                    🏦 Transf: {formatCurrency(c.transferencia)}
                                  </span>
                                )}
                                {c.efectivo > 0 && (
                                  <span className="badge badge-success" style={{ fontSize: 10 }}>
                                    💵 Efectivo: {formatCurrency(c.efectivo)}
                                  </span>
                                )}
                                {c.tarjeta > 0 && (
                                  <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                                    💳 Tarj: {formatCurrency(c.tarjeta)}
                                  </span>
                                )}
                                {c.cuenta_corriente > 0 && (
                                  <span className="badge badge-warning" style={{ fontSize: 10 }}>
                                    📜 Cta: {formatCurrency(c.cuenta_corriente)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <strong style={{ fontSize: 14, color: 'var(--success)' }}>
                                +{formatCurrency(c.ingresos)}
                              </strong>
                            </td>
                            <td>
                              <strong style={{ fontSize: 14, color: c.egresos > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                {c.egresos > 0 ? `-${formatCurrency(c.egresos)}` : '$0'}
                              </strong>
                            </td>
                            <td>
                              <strong style={{
                                fontSize: 15,
                                color: c.saldo >= 0 ? 'var(--success)' : 'var(--danger)'
                              }}>
                                {formatCurrency(c.saldo)}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => verCajaDeFecha(c.fecha)}
                                style={{ gap: 4 }}
                              >
                                <ExternalLink size={13} /> Ver Detalle
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <Layers size={36} />
                  <p style={{ fontWeight: 600 }}>No hay cajas registradas aún</p>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Al cobrar pedidos o registrar movimientos se irán archivando automáticamente aquí.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 3: TODOS LOS MOVIMIENTOS HISTÓRICOS                */}
        {/* ========================================================= */}
        {activeTab === 'todos_movimientos' && (
          <div>
            {/* Barra de Filtros y Búsqueda */}
            <div className="card" style={{ marginBottom: 20, padding: 14 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    placeholder="Buscar por cliente, concepto o pedido..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 32 }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ width: 140 }}>
                  <select
                    className="input"
                    value={filterTipoMov}
                    onChange={e => setFilterTipoMov(e.target.value as any)}
                  >
                    <option value="todos">Todos los Tipos</option>
                    <option value="ingreso">🟢 Entradas / Cobros</option>
                    <option value="egreso">🔴 Salidas / Egresos</option>
                  </select>
                </div>

                <div style={{ width: 160 }}>
                  <select
                    className="input"
                    value={filterMetodo}
                    onChange={e => setFilterMetodo(e.target.value as any)}
                  >
                    <option value="todos">Todos los Medios</option>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia</option>
                    <option value="tarjeta">💳 Tarjeta</option>
                    <option value="cuenta_corriente">📜 Cta. Corriente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabla de Todos los Movimientos */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="section-title" style={{ margin: 0 }}>
                  Todos los Movimientos ({movimientosFiltradosTodos.length})
                </div>
              </div>

              {movimientosFiltradosTodos.length > 0 ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Cliente / Empresa</th>
                        <th>Descripción / Concepto</th>
                        <th>Medio de Pago</th>
                        <th>Facturado</th>
                        <th>Monto</th>
                        <th style={{ width: 100 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosFiltradosTodos.map(mov => {
                        const metodo = extractMetodo(mov)
                        return (
                          <tr key={mov.id}>
                            <td style={{ fontSize: 12, fontWeight: 600 }}>
                              <div>{formatDate((mov.fecha || mov.created_at || '').substring(0, 10))}</div>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {formatDateTime(mov.fecha || '')}
                              </span>
                            </td>
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
                            <td>
                              <div>{mov.concepto}</div>
                              {mov.referencia_id && (
                                <span style={{ fontSize: 11, color: 'var(--accent)' }}>
                                  Vinculado a Pedido
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="badge badge-neutral">
                                {metodo === 'tarjeta' ? '💳 Tarjeta' : metodo === 'transferencia' ? '🏦 Transferencia' : metodo === 'cuenta_corriente' ? '📜 Cta. Corriente' : '💵 Efectivo'}
                              </span>
                            </td>
                            <td>
                              {mov.facturado ? (
                                <span className="badge badge-accent" style={{ gap: 4 }}>
                                  <Receipt size={10} /> Sí
                                </span>
                              ) : (
                                <span className="badge badge-neutral" style={{ color: 'var(--text-muted)' }}>
                                  No
                                </span>
                              )}
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={36} />
                  <p style={{ fontWeight: 600 }}>No se encontraron movimientos con los filtros aplicados</p>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Probá limpiar la búsqueda o cambiar de medio de pago.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

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
