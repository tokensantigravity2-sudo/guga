'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { Pedido, Gasto, StockItem, Cliente, CajaMovimiento } from '@/lib/types'
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  PieChart as PieChartIcon, Percent, Boxes, Users, Calendar,
  ArrowUpRight, ArrowDownRight, Layers, CreditCard, Filter, Wallet
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#149b8e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#6366f1', '#14b8a6', '#f97316']

type PeriodoFilter = 'este_mes' | 'mes_anterior' | '3_meses' | '6_meses' | 'este_ano' | 'personalizado' | 'todo'

interface MesData {
  mes: string
  ingresos: number
  gastos: number
  ganancia: number
  pedidosCount: number
}

interface CategoriaGastoData {
  nombre: string
  total: number
  porcentaje: number
}

interface ServicioRankingData {
  nombre: string
  cantidad: number
  total: number
  porcentaje: number
}

interface ClienteRankingData {
  nombre: string
  pedidos: number
  total: number
}

interface MetodoPagoData {
  nombre: string
  total: number
}

interface PedidoCobradoDetalle {
  id: string
  numero: string
  cliente_nombre: string
  fecha: string
  totalPedido: number
  montoCobrado: number
  saldoPendiente: number
  is100Cobrado: boolean
  estadoPedido: string
  metodoPago: string
  items?: any[]
}

const extractMetodoPago = (mov: CajaMovimiento): string => {
  if (mov.metodo_pago && mov.metodo_pago !== 'efectivo') {
    return mov.metodo_pago.replace('_', ' ').toUpperCase()
  }
  const concepto = mov.concepto || ''
  const match = concepto.match(/Pago:\s*([a-zA-Z_]+)/i)
  if (match && match[1]) {
    return match[1].replace('_', ' ').toUpperCase()
  }
  return (mov.metodo_pago || 'EFECTIVO').replace('_', ' ').toUpperCase()
}

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<PeriodoFilter>('este_mes')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)

  // Raw data
  const [pedidosRaw, setPedidosRaw] = useState<Pedido[]>([])
  const [gastosRaw, setGastosRaw] = useState<Gasto[]>([])
  const [stockRaw, setStockRaw] = useState<StockItem[]>([])
  const [cajaRaw, setCajaRaw] = useState<CajaMovimiento[]>([])

  // Aggregated states
  const [resumen, setResumen] = useState({
    ingresos: 0,
    ingresosPedidos: 0,
    ingresosSenas: 0,
    ingresosPagosCompletos: 0,
    cajaIngresosDirectos: 0,
    gastos: 0,
    ganancia: 0,
    margen: 0,
    pedidosCount: 0,
    pedidos100Count: 0,
    pedidosSenaCount: 0,
    ticketPromedio: 0,
    descuentos: 0,
    inventarioValor: 0,
    cajaSaldo: 0,
  })

  const [pedidosCobradosDetalle, setPedidosCobradosDetalle] = useState<PedidoCobradoDetalle[]>([])
  const [cajaDirectaList, setCajaDirectaList] = useState<CajaMovimiento[]>([])
  const [filtroTipoCobro, setFiltroTipoCobro] = useState<'todos' | '100' | 'senas'>('todos')

  const [mesesData, setMesesData] = useState<MesData[]>([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState<CategoriaGastoData[]>([])
  const [topServicios, setTopServicios] = useState<ServicioRankingData[]>([])
  const [topClientes, setTopClientes] = useState<ClienteRankingData[]>([])
  const [metodosPagoData, setMetodosPagoData] = useState<MetodoPagoData[]>([])

  useEffect(() => {
    loadRawData()
  }, [])

  useEffect(() => {
    if (!loading) {
      procesarReportes()
    }
  }, [periodo, customFrom, customTo, pedidosRaw, gastosRaw, stockRaw, cajaRaw])

  const loadRawData = async () => {
    const [{ data: p, error: pErr }, { data: g, error: gErr }, { data: s }, { data: c }] = await Promise.all([
      supabase.from('pedidos').select('*').not('estado', 'eq', 'cancelado'),
      supabase.from('gastos').select('*'),
      supabase.from('stock').select('*'),
      supabase.from('caja_movimientos').select('*'),
    ])

    if (pErr) toast.error('Error al cargar pedidos: ' + pErr.message)
    if (gErr) toast.error('Error al cargar gastos: ' + gErr.message)

    if (p) setPedidosRaw(p)
    if (g) setGastosRaw(g)
    if (s) setStockRaw(s)
    if (c) setCajaRaw(c)
    setLoading(false)
  }

  const procesarReportes = () => {
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    if (periodo === 'este_mes') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (periodo === 'mes_anterior') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    } else if (periodo === '3_meses') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    } else if (periodo === '6_meses') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    } else if (periodo === 'este_ano') {
      startDate = new Date(now.getFullYear(), 0, 1)
    } else if (periodo === 'personalizado') {
      if (customFrom) startDate = new Date(`${customFrom}T00:00:00`)
      if (customTo) endDate = new Date(`${customTo}T23:59:59`)
    }

    // Filter caja movimientos by date
    const cajaFiltrada = cajaRaw.filter(c => {
      const fechaStr = c.fecha || c.created_at
      if (!fechaStr) return false
      const d = new Date(fechaStr)
      if (startDate && d < startDate) return false
      if (endDate && d > endDate) return false
      return true
    })

    // Filter gastos by date
    const gastosFiltrados = gastosRaw.filter(g => {
      const fechaStr = g.fecha || g.created_at
      if (!fechaStr) return false
      const d = new Date(fechaStr)
      if (startDate && d < startDate) return false
      if (endDate && d > endDate) return false
      return true
    })

    // 1. Identificar pedidos con cobro real (100% cobrados o con señas recibidas)
    const pedidosCobradosList: PedidoCobradoDetalle[] = []

    pedidosRaw.forEach(p => {
      if (p.estado === 'cancelado') return

      // Movimientos de ingreso en caja registrados en el período actual
      const movsEnPeriodo = cajaFiltrada.filter(c => c.referencia_id === p.id && c.tipo === 'ingreso')
      const montoCajaPeriodo = movsEnPeriodo.reduce((sum, c) => sum + Number(c.monto), 0)

      // Total histórico de movimientos en caja para este pedido
      const allMovsPedido = cajaRaw.filter(c => c.referencia_id === p.id && c.tipo === 'ingreso')
      const totalHistoricoCaja = allMovsPedido.reduce((sum, c) => sum + Number(c.monto), 0)

      const isCobradoFlag = p.cobrado === true || (p.notas || '').includes('[COBRADO:true]')
      const totalP = Number(p.total) || 0

      // Si fue marcado como cobrado pero no tiene movimientos explícitos en caja
      let montoCobradoPeriodo = montoCajaPeriodo
      let pedidoFecha = p.created_at || ''
      if (movsEnPeriodo.length > 0) {
        pedidoFecha = movsEnPeriodo[0].fecha || movsEnPeriodo[0].created_at || p.created_at || ''
      }

      if (montoCobradoPeriodo === 0 && isCobradoFlag) {
        if (p.created_at) {
          const d = new Date(p.created_at)
          if ((!startDate || d >= startDate) && (!endDate || d <= endDate)) {
            montoCobradoPeriodo = totalP
          }
        }
      }

      // Solo entra al reporte si efectivamente ingresó dinero (seña o total) o está marcado como cobrado en el período
      if (montoCobradoPeriodo > 0) {
        const is100 = isCobradoFlag || (totalHistoricoCaja >= totalP && totalP > 0)
        const saldoPendiente = Math.max(0, totalP - Math.max(totalHistoricoCaja, montoCobradoPeriodo))

        pedidosCobradosList.push({
          id: p.id,
          numero: p.numero,
          cliente_nombre: p.cliente_nombre || 'Consumidor Final',
          fecha: pedidoFecha,
          totalPedido: totalP,
          montoCobrado: montoCobradoPeriodo,
          saldoPendiente,
          is100Cobrado: is100,
          estadoPedido: p.estado || 'aprobado',
          metodoPago: p.metodo_pago || (movsEnPeriodo[0] ? extractMetodoPago(movsEnPeriodo[0]) : 'efectivo'),
          items: p.items || []
        })
      }
    })

    // Ordenar pedidos cobrados por fecha más reciente
    pedidosCobradosList.sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
    setPedidosCobradosDetalle(pedidosCobradosList)

    // Movimientos directos de caja (mostrador que no están asociados a un pedido)
    const directosCaja = cajaFiltrada.filter(c => c.tipo === 'ingreso' && !c.referencia_id)
    setCajaDirectaList(directosCaja)
    const cajaIngresosDirectos = directosCaja.reduce((sum, c) => sum + Number(c.monto), 0)

    // Señas y cobros totales desglosados
    const totalSenas = pedidosCobradosList
      .filter(p => !p.is100Cobrado)
      .reduce((sum, p) => sum + p.montoCobrado, 0)

    const totalPagosCompletos = pedidosCobradosList
      .filter(p => p.is100Cobrado)
      .reduce((sum, p) => sum + p.montoCobrado, 0)

    const ingresosPedidos = totalSenas + totalPagosCompletos
    const ingresosTotal = ingresosPedidos + cajaIngresosDirectos

    const gastos = gastosFiltrados.reduce((sum, g) => sum + Number(g.monto), 0)
    const ganancia = ingresosTotal - gastos
    const margen = ingresosTotal > 0 ? Math.round((ganancia / ingresosTotal) * 100) : 0
    const pedidosCount = pedidosCobradosList.length
    const pedidos100Count = pedidosCobradosList.filter(p => p.is100Cobrado).length
    const pedidosSenaCount = pedidosCobradosList.filter(p => !p.is100Cobrado).length
    const ticketPromedio = pedidosCount > 0 ? Math.round(ingresosPedidos / pedidosCount) : 0
    const inventarioValor = stockRaw.reduce((sum, s) => sum + (Number(s.cantidad) * Number(s.costo_unitario || 0)), 0)
    const cajaSaldoTotal = cajaFiltrada.reduce((sum, c) => sum + (c.tipo === 'ingreso' ? Number(c.monto) : -Number(c.monto)), 0)

    setResumen({
      ingresos: ingresosTotal,
      ingresosPedidos,
      ingresosSenas: totalSenas,
      ingresosPagosCompletos: totalPagosCompletos,
      cajaIngresosDirectos,
      gastos,
      ganancia,
      margen,
      pedidosCount,
      pedidos100Count,
      pedidosSenaCount,
      ticketPromedio,
      descuentos: 0,
      inventarioValor,
      cajaSaldo: cajaSaldoTotal,
    })

    // 2. Gráfico por Meses (Evolución de Ingresos Cobrados vs Egresos)
    const mesesMap = new Map<string, { ingresos: number; gastos: number; count: number }>()

    pedidosCobradosList.forEach(p => {
      if (!p.fecha) return
      const date = new Date(p.fecha)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const prev = mesesMap.get(key) || { ingresos: 0, gastos: 0, count: 0 }
      mesesMap.set(key, { ...prev, ingresos: prev.ingresos + p.montoCobrado, count: prev.count + 1 })
    })

    directosCaja.forEach(c => {
      const fechaStr = c.fecha || c.created_at
      if (!fechaStr) return
      const date = new Date(fechaStr)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const prev = mesesMap.get(key) || { ingresos: 0, gastos: 0, count: 0 }
      mesesMap.set(key, { ...prev, ingresos: prev.ingresos + Number(c.monto) })
    })

    gastosFiltrados.forEach(g => {
      const fechaStr = g.fecha || g.created_at
      if (!fechaStr) return
      const date = new Date(fechaStr)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const prev = mesesMap.get(key) || { ingresos: 0, gastos: 0, count: 0 }
      mesesMap.set(key, { ...prev, gastos: prev.gastos + Number(g.monto) })
    })

    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const mesesList: MesData[] = Array.from(mesesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => {
        const [year, month] = key.split('-')
        const nombreMes = `${mesesNombres[parseInt(month, 10) - 1]} ${year.slice(2)}`
        return {
          mes: nombreMes,
          ingresos: val.ingresos,
          gastos: val.gastos,
          ganancia: val.ingresos - val.gastos,
          pedidosCount: val.count,
        }
      })

    setMesesData(mesesList)

    // 3. Gastos por Categoría
    const catMap = new Map<string, number>()
    gastosFiltrados.forEach(g => {
      catMap.set(g.categoria, (catMap.get(g.categoria) || 0) + Number(g.monto))
    })

    const catList: CategoriaGastoData[] = Array.from(catMap.entries())
      .map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: gastos > 0 ? Math.round((total / gastos) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)

    setGastosPorCategoria(catList)

    // 4. Ranking de Servicios más Vendidos (Solo de pedidos que generaron ingresos)
    const srvMap = new Map<string, { cantidad: number; total: number }>()

    pedidosCobradosList.forEach(p => {
      if (Array.isArray(p.items)) {
        p.items.forEach(item => {
          const key = item.nombre
          const cant = Number(item.cantidad) || 1
          const tot = Number(item.subtotal) || (cant * (Number(item.precio_unitario) || 0))
          const prev = srvMap.get(key) || { cantidad: 0, total: 0 }
          srvMap.set(key, { cantidad: prev.cantidad + cant, total: prev.total + tot })
        })
      }
    })

    const srvList: ServicioRankingData[] = Array.from(srvMap.entries())
      .map(([nombre, val]) => ({
        nombre,
        cantidad: val.cantidad,
        total: val.total,
        porcentaje: ingresosPedidos > 0 ? Math.round((val.total / ingresosPedidos) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    setTopServicios(srvList)

    // 5. Ranking de Clientes (Solo clientes con pagos reales en el período)
    const cliMap = new Map<string, { pedidos: number; total: number }>()
    pedidosCobradosList.forEach(p => {
      const key = p.cliente_nombre || 'Consumidor Final'
      const prev = cliMap.get(key) || { pedidos: 0, total: 0 }
      cliMap.set(key, { pedidos: prev.pedidos + 1, total: prev.total + p.montoCobrado })
    })

    const cliList: ClienteRankingData[] = Array.from(cliMap.entries())
      .map(([nombre, val]) => ({ nombre, pedidos: val.pedidos, total: val.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    setTopClientes(cliList)

    // 6. Distribución por Método de Pago (Basado en el dinero real cobrado en caja)
    const pagoMap = new Map<string, number>()
    cajaFiltrada.filter(c => c.tipo === 'ingreso').forEach(c => {
      const key = extractMetodoPago(c)
      pagoMap.set(key, (pagoMap.get(key) || 0) + Number(c.monto))
    })

    const pagoList: MetodoPagoData[] = Array.from(pagoMap.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)

    setMetodosPagoData(pagoList)
  }

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Reportes & Análisis Financiero" subtitle="Estadísticas de facturación, caja diaria, egresos y servicios más vendidos" />
      <main style={{ padding: '28px', flex: 1 }}>

        {/* Filtros de Período y Fecha Personalizable */}
        <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} style={{ color: 'var(--accent)' }} />
              <strong style={{ fontSize: 14 }}>Período de Análisis:</strong>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className={`btn btn-sm ${periodo === 'este_mes' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriodo('este_mes')}
              >
                Este Mes
              </button>
              <button
                className={`btn btn-sm ${periodo === 'mes_anterior' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriodo('mes_anterior')}
              >
                Mes Anterior
              </button>
              <button
                className={`btn btn-sm ${periodo === '3_meses' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriodo('3_meses')}
              >
                Últimos 3 Meses
              </button>
              <button
                className={`btn btn-sm ${periodo === '6_meses' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriodo('6_meses')}
              >
                Últimos 6 Meses
              </button>
              <button
                className={`btn btn-sm ${periodo === 'este_ano' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriodo('este_ano')}
              >
                Este Año
              </button>
              <button
                className={`btn btn-sm ${periodo === 'personalizado' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriodo('personalizado')}
              >
                📅 Rango Personalizado
              </button>
              <button
                className={`btn btn-sm ${periodo === 'todo' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriodo('todo')}
              >
                Histórico Completo
              </button>
            </div>
          </div>

          {/* Rango de Fecha Personalizado Inputs */}
          {periodo === 'personalizado' && (
            <div style={{
              display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, paddingTop: 12,
              borderTop: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ margin: 0, fontSize: 13 }}>Desde:</label>
                <input
                  className="input"
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  style={{ width: 160 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ margin: 0, fontSize: 13 }}>Hasta:</label>
                <input
                  className="input"
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  style={{ width: 160 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* KPIs Grid */}
        <div className="grid-stats" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="stat-label">Ingresos Reales Cobrados</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(resumen.ingresos)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {formatCurrency(resumen.ingresosPagosCompletos)} en cobros 100% · {formatCurrency(resumen.ingresosSenas)} en señas · {formatCurrency(resumen.cajaIngresosDirectos)} mostrador
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>
              <TrendingDown size={22} />
            </div>
            <div>
              <div className="stat-label">Egresos / Gastos</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(resumen.gastos)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Insumos, personal y salidas operativas
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{
              background: resumen.ganancia >= 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
              color: resumen.ganancia >= 0 ? 'var(--success)' : 'var(--danger)'
            }}>
              <DollarSign size={22} />
            </div>
            <div>
              <div className="stat-label">Ganancia Real</div>
              <div className="stat-value" style={{ color: resumen.ganancia >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(resumen.ganancia)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Cobrado menos egresos ({resumen.margen}% margen)
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(20, 155, 142, 0.12)', color: 'var(--accent)' }}>
              <ShoppingCart size={22} />
            </div>
            <div>
              <div className="stat-label">Pedidos Cobrados / con Seña</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>
                {resumen.pedidosCount} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>pedidos</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {resumen.pedidos100Count} cobrados 100% · {resumen.pedidosSenaCount} con seña
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Boxes size={22} />
            </div>
            <div>
              <div className="stat-label">Valor del Stock</div>
              <div className="stat-value" style={{ color: '#f59e0b' }}>{formatCurrency(resumen.inventarioValor)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Capital en depósito/insumos
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Main Bar Chart: Ingresos vs Gastos vs Ganancia */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>📊 Evolución Financiera Mensual</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Comparativa de Facturación + Caja vs Egresos</p>
              </div>
            </div>

            <div style={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mesesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={val => `$${val}`} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                    contentStyle={{ background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}
                  />
                  <Legend />
                  <Bar dataKey="ingresos" name="Ingresos Totales ($)" fill="#149b8e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos ($)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ganancia" name="Ganancia Neta ($)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart: Gastos por Categoría */}
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>🍩 Distribución de Gastos</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Desglose por rubros y proveedores</p>
            </div>

            <div style={{ height: 230, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    dataKey="total"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 110, overflowY: 'auto' }}>
              {gastosPorCategoria.map((cat, idx) => (
                <div key={cat.nombre} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[idx % COLORS.length] }} />
                    <span>{cat.nombre}</span>
                  </div>
                  <strong>{formatCurrency(cat.total)} ({cat.porcentaje}%)</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Table por Meses */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">📋 Resumen Tabular por Meses</div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mes / Período</th>
                  <th>Pedidos Cobrados</th>
                  <th>Dinero Cobrado + Mostrador</th>
                  <th>Gastos / Egresos</th>
                  <th>Ganancia Neta</th>
                  <th>Margen %</th>
                </tr>
              </thead>
              <tbody>
                {mesesData.map(m => {
                  const mMargen = m.ingresos > 0 ? Math.round((m.ganancia / m.ingresos) * 100) : 0
                  return (
                    <tr key={m.mes}>
                      <td><strong>{m.mes}</strong></td>
                      <td><span className="badge badge-neutral">{m.pedidosCount} pedidos</span></td>
                      <td><strong style={{ color: 'var(--success)' }}>{formatCurrency(m.ingresos)}</strong></td>
                      <td><strong style={{ color: 'var(--danger)' }}>{formatCurrency(m.gastos)}</strong></td>
                      <td><strong style={{ color: m.ganancia >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(m.ganancia)}</strong></td>
                      <td>
                        <span className={`badge ${mMargen >= 30 ? 'badge-success' : mMargen > 0 ? 'badge-warning' : 'badge-danger'}`}>
                          {mMargen}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA PRINCIPAL: Pedidos Cobrados & Señas Recibidas */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <div className="section-title" style={{ margin: 0 }}>💰 Pedidos Cobrados & Señas Recibidas ({pedidosCobradosDetalle.length})</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Solo se muestran los pedidos donde ingresó dinero efectivo (cobro 100% o seña). Presupuestos sin cobrar están excluidos de las estadísticas.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${filtroTipoCobro === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroTipoCobro('todos')}
              >
                Todos ({pedidosCobradosDetalle.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroTipoCobro === '100' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroTipoCobro('100')}
              >
                ✓ 100% Cobrados ({resumen.pedidos100Count})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filtroTipoCobro === 'senas' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroTipoCobro('senas')}
              >
                ⏳ Señas ({resumen.pedidosSenaCount})
              </button>
            </div>
          </div>

          {pedidosCobradosDetalle.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
              No se registraron cobros ni señas en el período seleccionado.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total Pedido</th>
                    <th>Cobrado en Período</th>
                    <th>Saldo Pendiente</th>
                    <th>Estado de Pago</th>
                    <th>Estado Pedido</th>
                    <th>Método de Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosCobradosDetalle
                    .filter(p => {
                      if (filtroTipoCobro === '100') return p.is100Cobrado
                      if (filtroTipoCobro === 'senas') return !p.is100Cobrado
                      return true
                    })
                    .map(p => (
                      <tr key={p.id}>
                        <td><strong>#{p.numero}</strong></td>
                        <td><strong>{p.cliente_nombre}</strong></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.fecha ? formatDate(p.fecha) : '-'}</td>
                        <td><strong>{formatCurrency(p.totalPedido)}</strong></td>
                        <td><strong style={{ color: 'var(--success)' }}>{formatCurrency(p.montoCobrado)}</strong></td>
                        <td>
                          {p.saldoPendiente > 0 ? (
                            <span style={{ color: '#d97706', fontWeight: 700 }}>{formatCurrency(p.saldoPendiente)}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>$0 (Saldado)</span>
                          )}
                        </td>
                        <td>
                          {p.is100Cobrado ? (
                            <span className="badge badge-success">✓ 100% Cobrado</span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#b45309', border: '1px solid #f59e0b' }}>
                              ⏳ Seña Recibida
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-neutral">{p.estadoPedido.replace('_', ' ')}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {p.metodoPago.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ingresos directos en caja (Mostrador) */}
        {cajaDirectaList.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title">🏪 Ingresos Directos de Caja / Mostrador ({cajaDirectaList.length})</div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
              Movimientos de dinero que entraron a caja directamente (mostrador, fotocopias, servicios menores sin pedido formal).
            </p>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Método de Pago</th>
                    <th>Monto Ingresado</th>
                  </tr>
                </thead>
                <tbody>
                  {cajaDirectaList.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.fecha || c.created_at ? formatDate(c.fecha || c.created_at || '') : '-'}</td>
                      <td><strong>{c.concepto}</strong></td>
                      <td><span style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>{extractMetodoPago(c)}</span></td>
                      <td><strong style={{ color: 'var(--success)' }}>{formatCurrency(Number(c.monto))}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rankings: Top Servicios y Top Clientes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Top Servicios */}
          <div className="card">
            <div className="section-title">🏆 Servicios Más Vendidos (Cobrados)</div>
            {topServicios.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay datos en el período.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topServicios.map((srv, idx) => (
                  <div key={srv.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', minWidth: 20 }}>#{idx + 1}</span>
                      <span>{srv.nombre} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({srv.cantidad} unid.)</span></span>
                    </div>
                    <strong>{formatCurrency(srv.total)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Clientes */}
          <div className="card">
            <div className="section-title">👥 Clientes con Mayor Aporte</div>
            {topClientes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay datos en el período.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topClientes.map((cli, idx) => (
                  <div key={cli.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', minWidth: 20 }}>#{idx + 1}</span>
                      <span>{cli.nombre} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({cli.pedidos} pedidos)</span></span>
                    </div>
                    <strong style={{ color: 'var(--success)' }}>{formatCurrency(cli.total)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
