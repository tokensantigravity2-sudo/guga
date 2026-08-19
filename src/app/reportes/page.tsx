'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { Pedido, Gasto, StockItem, Cliente } from '@/lib/types'
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  PieChart as PieChartIcon, Percent, Boxes, Users, Calendar,
  ArrowUpRight, ArrowDownRight, Layers, CreditCard
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'

const COLORS = ['#149b8e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#6366f1', '#14b8a6', '#f97316']

type PeriodoFilter = 'este_mes' | 'mes_anterior' | '3_meses' | '6_meses' | 'este_ano' | 'todo'

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
  const [loading, setLoading] = useState(true)

  // Raw data
  const [pedidosRaw, setPedidosRaw] = useState<Pedido[]>([])
  const [gastosRaw, setGastosRaw] = useState<Gasto[]>([])
  const [stockRaw, setStockRaw] = useState<StockItem[]>([])

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
  })

  const [mesesData, setMesesData] = useState<MesData[]>([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState<CategoriaGastoData[]>([])
  const [topServicios, setTopServicios] = useState<ServicioRankingData[]>([])
  const [topClientes, setTopClientes] = useState<ClienteRankingData[]>([])
  const [metodosPagoData, setMetodosPagoData] = useState<MetodoPagoData[]>([])

  useEffect(() => {
    loadData()
  }, [periodo])

  const loadData = async () => {
    setLoading(true)

    // Calculate start date based on selected filter
    const now = new Date()
    let desde: Date | null = null

    if (periodo === 'este_mes') {
      desde = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (periodo === 'mes_anterior') {
      desde = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    } else if (periodo === '3_meses') {
      desde = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    } else if (periodo === '6_meses') {
      desde = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    } else if (periodo === 'este_ano') {
      desde = new Date(now.getFullYear(), 0, 1)
    } else {
      desde = null // 'todo'
    }

    // End date for 'mes_anterior'
    let hasta: Date | null = null
    if (periodo === 'mes_anterior') {
      hasta = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    }

    // Fetch queries
    let queryPedidos = supabase.from('pedidos').select('*').not('estado', 'eq', 'cancelado').order('created_at', { ascending: true })
    let queryGastos = supabase.from('gastos').select('*').order('fecha', { ascending: true })
    let queryStock = supabase.from('stock').select('*')

    if (desde) {
      const desdeISO = desde.toISOString().split('T')[0]
      queryPedidos = queryPedidos.gte('created_at', desdeISO + 'T00:00:00')
      queryGastos = queryGastos.gte('fecha', desdeISO)
    }

    if (hasta) {
      const hastaISO = hasta.toISOString().split('T')[0]
      queryPedidos = queryPedidos.lte('created_at', hastaISO + 'T23:59:59')
      queryGastos = queryGastos.lte('fecha', hastaISO)
    }

    const [{ data: pds }, { data: gts }, { data: stks }] = await Promise.all([
      queryPedidos,
      queryGastos,
      queryStock,
    ])

    const pedidosList: Pedido[] = pds || []
    const gastosList: Gasto[] = gts || []
    const stockList: StockItem[] = stks || []

    setPedidosRaw(pedidosList)
    setGastosRaw(gastosList)
    setStockRaw(stockList)

    // Calculate totals
    const ingresos = pedidosList.reduce((sum, p) => sum + Number(p.total || 0), 0)
    const descuentos = pedidosList.reduce((sum, p) => sum + Number(p.descuento || 0), 0)
    const totalGastos = gastosList.reduce((sum, g) => sum + Number(g.monto || 0), 0)
    const ganancia = ingresos - totalGastos
    const margen = ingresos > 0 ? (ganancia / ingresos) * 100 : 0
    const pedidosCount = pedidosList.length
    const ticketPromedio = pedidosCount > 0 ? ingresos / pedidosCount : 0
    const inventarioValor = stockList.reduce((sum, s) => sum + (Number(s.cantidad || 0) * Number(s.costo_unitario || 0)), 0)

    setResumen({
      ingresos,
      gastos: totalGastos,
      ganancia,
      margen,
      pedidosCount,
      ticketPromedio,
      descuentos,
      inventarioValor,
    })

    // Grouping by Month for comparison
    const mapMeses = new Map<string, { ingresos: number; gastos: number; count: number }>()

    // Populate months from pedidos
    pedidosList.forEach(p => {
      if (!p.created_at) return
      const d = new Date(p.created_at)
      const key = d.toLocaleDateString('es-UY', { month: 'short', year: '2-digit' })
      const prev = mapMeses.get(key) || { ingresos: 0, gastos: 0, count: 0 }
      mapMeses.set(key, { ...prev, ingresos: prev.ingresos + Number(p.total || 0), count: prev.count + 1 })
    })

    // Populate months from gastos
    gastosList.forEach(g => {
      if (!g.fecha && !g.created_at) return
      const d = new Date(g.fecha || g.created_at!)
      const key = d.toLocaleDateString('es-UY', { month: 'short', year: '2-digit' })
      const prev = mapMeses.get(key) || { ingresos: 0, gastos: 0, count: 0 }
      mapMeses.set(key, { ...prev, gastos: prev.gastos + Number(g.monto || 0) })
    })

    const arrayMeses: MesData[] = Array.from(mapMeses.entries()).map(([mes, data]) => ({
      mes,
      ingresos: data.ingresos,
      gastos: data.gastos,
      ganancia: data.ingresos - data.gastos,
      pedidosCount: data.count,
    }))

    setMesesData(arrayMeses)

    // Gastos por categoría
    const mapGastosCat = new Map<string, number>()
    gastosList.forEach(g => {
      const cat = g.categoria || 'Otros'
      mapGastosCat.set(cat, (mapGastosCat.get(cat) || 0) + Number(g.monto || 0))
    })

    const listGastosCat: CategoriaGastoData[] = Array.from(mapGastosCat.entries())
      .map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: totalGastos > 0 ? (total / totalGastos) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    setGastosPorCategoria(listGastosCat)

    // Top Servicios Vendidos
    const mapServicios = new Map<string, { cantidad: number; total: number }>()
    pedidosList.forEach(p => {
      const items = Array.isArray(p.items) ? p.items : []
      items.forEach((it: any) => {
        const name = it.nombre || 'Servicio General'
        const qty = Number(it.cantidad || 1)
        const sub = Number(it.subtotal || (qty * (it.precio_unitario || it.precio || 0)))
        const prev = mapServicios.get(name) || { cantidad: 0, total: 0 }
        mapServicios.set(name, { cantidad: prev.cantidad + qty, total: prev.total + sub })
      })
    })

    const listServicios: ServicioRankingData[] = Array.from(mapServicios.entries())
      .map(([nombre, data]) => ({
        nombre,
        cantidad: data.cantidad,
        total: data.total,
        porcentaje: ingresos > 0 ? (data.total / ingresos) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    setTopServicios(listServicios)

    // Top Clientes
    const mapClientes = new Map<string, { pedidos: number; total: number }>()
    pedidosList.forEach(p => {
      const name = p.cliente_nombre || 'Consumidor Final'
      const prev = mapClientes.get(name) || { pedidos: 0, total: 0 }
      mapClientes.set(name, { pedidos: prev.pedidos + 1, total: prev.total + Number(p.total || 0) })
    })

    const listClientes: ClienteRankingData[] = Array.from(mapClientes.entries())
      .map(([nombre, data]) => ({ nombre, pedidos: data.pedidos, total: data.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)

    setTopClientes(listClientes)

    // Métodos de pago
    const mapPagos = new Map<string, number>()
    pedidosList.forEach(p => {
      const method = p.metodo_pago ? p.metodo_pago.replace('_', ' ').toUpperCase() : 'EFECTIVO'
      mapPagos.set(method, (mapPagos.get(method) || 0) + Number(p.total || 0))
    })

    const listPagos: MetodoPagoData[] = Array.from(mapPagos.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)

    setMetodosPagoData(listPagos)

    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  return (
    <>
      <Header title="Reportes & Analítica Financiera" subtitle="Control de ingresos, gastos, utilidades y ventas de la imprenta" />
      <main style={{ padding: '28px', flex: 1 }}>

        {/* Header Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>📊 Dashboard Financiero GUGA</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Resumen de operaciones comercial y operacional
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${periodo === 'este_mes' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriodo('este_mes')}
            >
              Este Mes
            </button>
            <button
              className={`btn btn-sm ${periodo === 'mes_anterior' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriodo('mes_anterior')}
            >
              Mes Anterior
            </button>
            <button
              className={`btn btn-sm ${periodo === '3_meses' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriodo('3_meses')}
            >
              Últimos 3 Meses
            </button>
            <button
              className={`btn btn-sm ${periodo === '6_meses' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriodo('6_meses')}
            >
              Últimos 6 Meses
            </button>
            <button
              className={`btn btn-sm ${periodo === 'este_ano' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriodo('este_ano')}
            >
              Este Año
            </button>
            <button
              className={`btn btn-sm ${periodo === 'todo' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriodo('todo')}
            >
              Histórico Todo
            </button>
          </div>
        </div>

        {/* 6 Executive KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard
            icon={<TrendingUp size={20} />}
            iconBg="rgba(22, 163, 74, 0.12)"
            iconColor="#16a34a"
            label="Facturación (Ingresos)"
            value={formatCurrency(resumen.ingresos)}
            sub={`${resumen.pedidosCount} pedido${resumen.pedidosCount !== 1 ? 's' : ''}`}
          />
          <StatCard
            icon={<TrendingDown size={20} />}
            iconBg="rgba(220, 38, 38, 0.12)"
            iconColor="#dc2626"
            label="Gastos / Egresos"
            value={formatCurrency(resumen.gastos)}
            sub={`${gastosRaw.length} gasto${gastosRaw.length !== 1 ? 's' : ''} registrados`}
          />
          <StatCard
            icon={<DollarSign size={20} />}
            iconBg={resumen.ganancia >= 0 ? 'rgba(20, 155, 142, 0.12)' : 'rgba(220, 38, 38, 0.12)'}
            iconColor={resumen.ganancia >= 0 ? '#149b8e' : '#dc2626'}
            label="Ganancia Neta"
            value={formatCurrency(resumen.ganancia)}
            sub={resumen.ganancia >= 0 ? '✓ Saldo positivo' : '⚠ En pérdida'}
          />
          <StatCard
            icon={<Percent size={20} />}
            iconBg="rgba(245, 158, 11, 0.12)"
            iconColor="#f59e0b"
            label="Margen de Ganancia"
            value={`${resumen.margen.toFixed(1)}%`}
            sub="sobre ventas totales"
          />
          <StatCard
            icon={<ShoppingCart size={20} />}
            iconBg="rgba(59, 130, 246, 0.12)"
            iconColor="#3b82f6"
            label="Ticket Promedio"
            value={formatCurrency(resumen.ticketPromedio)}
            sub="promedio por pedido"
          />
          <StatCard
            icon={<Boxes size={20} />}
            iconBg="rgba(139, 92, 246, 0.12)"
            iconColor="#8b5cf6"
            label="Valor Stock Materiales"
            value={formatCurrency(resumen.inventarioValor)}
            sub="inversión en depósito"
          />
        </div>

        {/* Charts Section 1: Monthly Comparison + Expense Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
          
          {/* Chart 1: Bar Chart Ingresos vs Gastos vs Ganancia */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📊 Comparativa: Ingresos vs Gastos por Período</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Evolución mensual de entradas y salidas de la imprenta</p>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: '#149b8e' }}>■ Ingresos</span>
                <span style={{ color: '#ef4444' }}>■ Gastos</span>
                <span style={{ color: '#f59e0b' }}>■ Ganancia</span>
              </div>
            </div>

            {mesesData.length > 0 ? (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mesesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        formatCurrency(Number(value)),
                        name === 'ingresos' ? 'Ingresos' : name === 'gastos' ? 'Gastos' : 'Ganancia Neta'
                      ]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12.5 }}
                    />
                    <Bar dataKey="ingresos" fill="#149b8e" radius={[4, 4, 0, 0]} name="ingresos" />
                    <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} name="gastos" />
                    <Bar dataKey="ganancia" fill="#f59e0b" radius={[4, 4, 0, 0]} name="ganancia" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ height: 280 }}>
                <BarChart3 size={36} />
                <p>Sin datos suficientes en este período para graficar</p>
              </div>
            )}
          </div>

          {/* Chart 2: Gastos por Categoría (Pie Chart) */}
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>💸 Gastos por Categoría</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Distribución de egresos operativos</p>
            </div>

            {gastosPorCategoria.length > 0 ? (
              <div>
                <div style={{ width: '100%', height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gastosPorCategoria}
                        dataKey="total"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {gastosPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val)), 'Gasto']}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 110, overflowY: 'auto', marginTop: 6 }}>
                  {gastosPorCategoria.map((g, i) => (
                    <div key={g.nombre} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{g.nombre}</span>
                      </div>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(g.total)} ({g.porcentaje.toFixed(0)}%)</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ height: 260 }}>
                <PieChartIcon size={36} />
                <p>Sin gastos registrados en el período</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section 2: Top Servicios Vendidos + Métodos de Pago */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          
          {/* Top Servicios Vendidos */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🖨️ Servicios de Imprenta Más Vendidos</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ranking por volumen de facturación</p>
              </div>
              <span className="badge badge-accent">TOP 10</span>
            </div>

            {topServicios.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topServicios.map((srv, idx) => (
                  <div key={srv.nombre} style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {idx + 1}. {srv.nombre} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>({srv.cantidad} u)</span>
                      </span>
                      <strong style={{ color: 'var(--accent)' }}>{formatCurrency(srv.total)}</strong>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: '100%', height: 6, background: 'var(--bg-hover)', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(5, srv.porcentaje))}%`,
                          height: '100%',
                          background: COLORS[idx % COLORS.length],
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}>
                <ShoppingCart size={32} />
                <p>Sin ventas registradas</p>
              </div>
            )}
          </div>

          {/* Top Clientes & Métodos de Pago */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Top Clientes */}
            <div className="card">
              <div className="section-title" style={{ margin: 0, marginBottom: 12 }}>👥 Clientes con Mayor Facturación</div>
              {topClientes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topClientes.map((c, i) => (
                    <div key={c.nombre} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: 13
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6, background: 'var(--accent-muted)',
                          color: 'var(--accent)', fontWeight: 700, fontSize: 11, display: 'flex',
                          alignItems: 'center', justifyContent: 'center'
                        }}>
                          {i + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.pedidos} pedido{c.pedidos !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(c.total)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Sin clientes registrados</div>
              )}
            </div>

            {/* Métodos de pago */}
            <div className="card">
              <div className="section-title" style={{ margin: 0, marginBottom: 12 }}>💳 Distribución por Método de Pago</div>
              {metodosPagoData.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  {metodosPagoData.map(m => (
                    <div key={m.nombre} style={{
                      padding: 10, background: 'var(--bg-hover)', border: '1px solid var(--border)',
                      borderRadius: 8, textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{m.nombre}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>{formatCurrency(m.total)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Sin pagos registrados</div>
              )}
            </div>
          </div>

        </div>

        {/* Detailed Table: Monthly Comparison breakdown */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📋 Tabla Comparativa Mensual Completa</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Detalle mes por mes de rendimiento operativo y márgenes</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mes / Período</th>
                  <th>Cant. Pedidos</th>
                  <th>Facturación (Ingresos)</th>
                  <th>Gastos Totales</th>
                  <th>Ganancia Neta</th>
                  <th>Margen (%)</th>
                </tr>
              </thead>
              <tbody>
                {mesesData.map((m) => {
                  const margenMes = m.ingresos > 0 ? ((m.ganancia) / m.ingresos) * 100 : 0
                  return (
                    <tr key={m.mes}>
                      <td><strong style={{ color: 'var(--accent)' }}>{m.mes}</strong></td>
                      <td>{m.pedidosCount} pedidos</td>
                      <td style={{ fontWeight: 600, color: '#16a34a' }}>{formatCurrency(m.ingresos)}</td>
                      <td style={{ fontWeight: 600, color: '#dc2626' }}>{formatCurrency(m.gastos)}</td>
                      <td style={{ fontWeight: 800, color: m.ganancia >= 0 ? '#16a34a' : '#dc2626' }}>
                        {formatCurrency(m.ganancia)}
                      </td>
                      <td>
                        <span className={`badge ${margenMes >= 20 ? 'badge-success' : margenMes >= 0 ? 'badge-warning' : 'badge-danger'}`}>
                          {margenMes.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {mesesData.length === 0 && (
              <div className="empty-state" style={{ padding: 30 }}>
                <Calendar size={32} />
                <p>Sin datos para el período seleccionado</p>
              </div>
            )}
          </div>
        </div>

      </main>
    </>
  )
}

function StatCard({ icon, iconBg, iconColor, label, value, sub }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  label: string; value: string; sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}
