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
    gastos: 0,
    ganancia: 0,
    margen: 0,
    pedidosCount: 0,
    ticketPromedio: 0,
    descuentos: 0,
    inventarioValor: 0,
    cajaSaldo: 0,
  })

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

    // Filter pedidos by date
    const pedidosFiltrados = pedidosRaw.filter(p => {
      if (!p.created_at) return false
      const d = new Date(p.created_at)
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

    // Filter caja movimientos by date
    const cajaFiltrada = cajaRaw.filter(c => {
      const fechaStr = c.fecha || c.created_at
      if (!fechaStr) return false
      const d = new Date(fechaStr)
      if (startDate && d < startDate) return false
      if (endDate && d > endDate) return false
      return true
    })

    // Movimientos directos de caja (entradas que no vienen de un pedido con referencia)
    const cajaIngresosDirectos = cajaFiltrada
      .filter(c => c.tipo === 'ingreso' && !c.referencia_id)
      .reduce((sum, c) => sum + Number(c.monto), 0)

    const cajaSaldoTotal = cajaFiltrada.reduce((sum, c) => sum + (c.tipo === 'ingreso' ? Number(c.monto) : -Number(c.monto)), 0)

    // 1. Resumen Ejecutivo
    const ingresosPedidos = pedidosFiltrados.reduce((sum, p) => sum + Number(p.total), 0)
    const ingresosTotal = ingresosPedidos + cajaIngresosDirectos
    const gastos = gastosFiltrados.reduce((sum, g) => sum + Number(g.monto), 0)
    const ganancia = ingresosTotal - gastos
    const margen = ingresosTotal > 0 ? Math.round((ganancia / ingresosTotal) * 100) : 0
    const pedidosCount = pedidosFiltrados.length
    const ticketPromedio = pedidosCount > 0 ? Math.round(ingresosPedidos / pedidosCount) : 0
    const descuentos = pedidosFiltrados.reduce((sum, p) => sum + Number(p.descuento || 0), 0)
    const inventarioValor = stockRaw.reduce((sum, s) => sum + (Number(s.cantidad) * Number(s.costo_unitario || 0)), 0)

    setResumen({
      ingresos: ingresosTotal,
      gastos,
      ganancia,
      margen,
      pedidosCount,
      ticketPromedio,
      descuentos,
      inventarioValor,
      cajaSaldo: cajaSaldoTotal,
    })

    // 2. Gráfico por Meses (Comparativo Ingresos vs Gastos)
    const mesesMap = new Map<string, { ingresos: number; gastos: number; count: number }>()

    pedidosFiltrados.forEach(p => {
      if (!p.created_at) return
      const date = new Date(p.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const prev = mesesMap.get(key) || { ingresos: 0, gastos: 0, count: 0 }
      mesesMap.set(key, { ...prev, ingresos: prev.ingresos + Number(p.total), count: prev.count + 1 })
    })

    cajaFiltrada.filter(c => c.tipo === 'ingreso' && !c.referencia_id).forEach(c => {
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

    // 4. Ranking de Servicios más Vendidos
    const srvMap = new Map<string, { cantidad: number; total: number }>()

    pedidosFiltrados.forEach(p => {
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

    // 5. Ranking de Clientes
    const cliMap = new Map<string, { pedidos: number; total: number }>()
    pedidosFiltrados.forEach(p => {
      const key = p.cliente_nombre || 'Consumidor Final'
      const prev = cliMap.get(key) || { pedidos: 0, total: 0 }
      cliMap.set(key, { pedidos: prev.pedidos + 1, total: prev.total + Number(p.total) })
    })

    const cliList: ClienteRankingData[] = Array.from(cliMap.entries())
      .map(([nombre, val]) => ({ nombre, pedidos: val.pedidos, total: val.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    setTopClientes(cliList)

    // 6. Distribución por Método de Pago
    const pagoMap = new Map<string, number>()
    pedidosFiltrados.forEach(p => {
      const key = p.metodo_pago ? p.metodo_pago.replace('_', ' ').toUpperCase() : 'EFECTIVO'
      pagoMap.set(key, (pagoMap.get(key) || 0) + Number(p.total))
    })

    cajaFiltrada.filter(c => c.tipo === 'ingreso' && !c.referencia_id).forEach(c => {
      const key = c.metodo_pago ? c.metodo_pago.replace('_', ' ').toUpperCase() : 'EFECTIVO'
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
              <div className="stat-label">Facturación / Ingresos Totales</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(resumen.ingresos)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Pedidos + Movimientos de Caja
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
                Insumos, personal y salidas
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
              <div className="stat-label">Ganancia Neta</div>
              <div className="stat-value" style={{ color: resumen.ganancia >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(resumen.ganancia)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Resultado operativo libre
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              <Wallet size={22} />
            </div>
            <div>
              <div className="stat-label">Saldo Neto de Caja</div>
              <div className="stat-value" style={{ color: resumen.cajaSaldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(resumen.cajaSaldo)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Flujo neto en caja diaria
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--info-muted)', color: 'var(--info)' }}>
              <ShoppingCart size={22} />
            </div>
            <div>
              <div className="stat-label">Ticket Promedio</div>
              <div className="stat-value">{formatCurrency(resumen.ticketPromedio)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Promedio por pedido
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

        {/* Detailed Table */}
        <div className="card">
          <div className="section-title">📋 Resumen Tabular por Meses</div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mes / Período</th>
                  <th>Pedidos Cobrados</th>
                  <th>Facturación + Caja</th>
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
      </main>
    </>
  )
}
