'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { formatCurrency, getTodayStr, formatDate } from '@/lib/helpers'
import { Pedido, StockItem, Tarea } from '@/lib/types'
import {
  ShoppingCart, TrendingUp, TrendingDown, Wallet,
  AlertTriangle, ArrowRight, Clock, Printer, Calendar as CalendarIcon, CheckSquare, Truck
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [ventas, setVentas] = useState<Pedido[]>([])
  const [gastos, setGastos] = useState<{ monto: number }[]>([])
  const [stockBajo, setStockBajo] = useState<StockItem[]>([])
  const [pedidosActivos, setPedidosActivos] = useState(0)
  const [proximasEntregas, setProximasEntregas] = useState<Pedido[]>([])
  const [tareasPendientes, setTareasPendientes] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Instant Cache Hydration: Render in <10ms
    try {
      const cachedVentas = sessionStorage.getItem('guga_cache_dashboard_ventas')
      const cachedGastos = sessionStorage.getItem('guga_cache_dashboard_gastos')
      const cachedActivos = sessionStorage.getItem('guga_cache_dashboard_activos')
      const cachedEntregas = sessionStorage.getItem('guga_cache_dashboard_entregas')
      const cachedTareas = sessionStorage.getItem('guga_cache_dashboard_tareas')
      const cachedStock = sessionStorage.getItem('guga_cache_dashboard_stock')

      if (cachedVentas) setVentas(JSON.parse(cachedVentas))
      if (cachedGastos) setGastos(JSON.parse(cachedGastos))
      if (cachedActivos) setPedidosActivos(Number(cachedActivos))
      if (cachedEntregas) setProximasEntregas(JSON.parse(cachedEntregas))
      if (cachedTareas) setTareasPendientes(JSON.parse(cachedTareas))
      if (cachedStock) setStockBajo(JSON.parse(cachedStock))

      if (cachedVentas || cachedGastos) {
        setLoading(false)
      }
    } catch (e) {
      console.error('Cache hydration error', e)
    }

    // 2. Fetch fresh data in the background
    const fetchData = async () => {
      const today = getTodayStr()
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      try {
        const [ventasRes, gastosRes, stockRes, activosRes, entregasRes, tareasRes] = await Promise.all([
          supabase.from('pedidos').select('*').gte('created_at', today + 'T00:00:00').not('estado', 'eq', 'cancelado').order('created_at', { ascending: false }),
          supabase.from('gastos').select('monto').gte('fecha', startOfMonth),
          supabase.from('stock').select('*').eq('activo', true),
          supabase.from('pedidos').select('id', { count: 'exact', head: true }).in('estado', ['presupuesto', 'aprobado', 'en_produccion']),
          supabase.from('pedidos').select('*').not('fecha_entrega', 'is', null).not('estado', 'in', '("entregado","cancelado")').order('fecha_entrega', { ascending: true }).limit(5),
          supabase.from('tareas').select('*').eq('completada', false).order('created_at', { ascending: false }).limit(4),
        ])

        const newVentas = ventasRes.data || []
        const newGastos = gastosRes.data || []
        const newActivos = activosRes.count || 0
        const newEntregas = entregasRes.data || []
        const newTareas = tareasRes.data || []
        const allStock = stockRes.data || []
        const newStockBajo = allStock.filter((s: StockItem) => Number(s.cantidad) <= Number(s.minimo))

        setVentas(newVentas)
        setGastos(newGastos)
        setPedidosActivos(newActivos)
        setProximasEntregas(newEntregas)
        setTareasPendientes(newTareas)
        setStockBajo(newStockBajo)

        try {
          sessionStorage.setItem('guga_cache_dashboard_ventas', JSON.stringify(newVentas))
          sessionStorage.setItem('guga_cache_dashboard_gastos', JSON.stringify(newGastos))
          sessionStorage.setItem('guga_cache_dashboard_activos', String(newActivos))
          sessionStorage.setItem('guga_cache_dashboard_entregas', JSON.stringify(newEntregas))
          sessionStorage.setItem('guga_cache_dashboard_tareas', JSON.stringify(newTareas))
          sessionStorage.setItem('guga_cache_dashboard_stock', JSON.stringify(newStockBajo))
        } catch {}
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0)
  const totalGastosMes = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const ganancia = totalVentas - totalGastosMes

  // Pedidos recientes (todos los del día)
  const pedidosRecientes = ventas.slice(0, 8)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  const getEstadoBadge = (estado?: string) => {
    switch (estado) {
      case 'presupuesto': return 'badge-neutral'
      case 'aprobado': return 'badge-info'
      case 'en_produccion': return 'badge-warning'
      case 'terminado': return 'badge-success'
      case 'entregado': return 'badge-success'
      case 'cancelado': return 'badge-danger'
      default: return 'badge-neutral'
    }
  }

  const getEstadoLabel = (estado?: string) => {
    switch (estado) {
      case 'presupuesto': return 'Presupuesto'
      case 'aprobado': return 'Aprobado'
      case 'en_produccion': return 'En Producción'
      case 'terminado': return 'Terminado'
      case 'entregado': return 'Entregado'
      case 'cancelado': return 'Cancelado'
      default: return estado || 'Desconocido'
    }
  }

  return (
    <>
      <Header title="Dashboard" subtitle="Resumen del día en tiempo real" />
      <main style={{ padding: '28px', flex: 1, maxWidth: '1440px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Top Actions & Quick Access Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Panel de Control
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>
              Métricas clave, producción y accesos directos
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link
              href="/pedidos?tab=historial"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13.5,
                background: 'linear-gradient(135deg, #0f766e 0%, #149b8e 100%)',
                color: '#ffffff',
                boxShadow: '0 3px 10px rgba(15, 118, 110, 0.25)',
                textDecoration: 'none',
                transition: 'transform 0.15s, opacity 0.15s'
              }}
            >
              <Truck size={17} />
              <span>Historial y Seguimiento de Pedidos</span>
            </Link>

            <Link
              href="/pedidos?tab=nuevo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13.5,
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
                textDecoration: 'none'
              }}
            >
              <ShoppingCart size={16} />
              <span>+ Nuevo Pedido</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-stats" style={{ marginBottom: 28 }}>
          <StatCard
            icon={<ShoppingCart size={20} />}
            iconBg="var(--accent-muted)"
            iconColor="var(--accent)"
            label="Pedidos Hoy"
            value={String(ventas.length)}
            sub={`${formatCurrency(totalVentas)} facturado`}
          />
          <StatCard
            icon={<Printer size={20} />}
            iconBg="var(--warning-muted)"
            iconColor="var(--warning)"
            label="En Producción"
            value={String(pedidosActivos)}
            sub="pedidos activos"
          />
          <StatCard
            icon={<TrendingDown size={20} />}
            iconBg="var(--danger-muted)"
            iconColor="var(--danger)"
            label="Gastos del Mes"
            value={formatCurrency(totalGastosMes)}
            sub={`${gastos.length} gasto${gastos.length !== 1 ? 's' : ''}`}
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            iconBg={ganancia >= 0 ? 'var(--success-muted)' : 'var(--danger-muted)'}
            iconColor={ganancia >= 0 ? 'var(--success)' : 'var(--danger)'}
            label="Ganancia Neta"
            value={formatCurrency(ganancia)}
            sub="ingresos – gastos"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Main content column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Próximas Entregas Compromisos */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarIcon size={18} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🚚 Próximas Fechas de Entrega</h3>
                </div>
                <Link href="/calendario" style={{ fontSize: 12.5, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}>
                  Ver Calendario →
                </Link>
              </div>

              {proximasEntregas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {proximasEntregas.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 10,
                      border: '1px solid var(--border)', fontSize: 13
                    }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          Pedido #{p.numero} — {p.cliente_nombre || 'Consumidor Final'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Total: {formatCurrency(p.total)} • Pago: {p.metodo_pago || 'efectivo'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${
                          p.fecha_entrega === getTodayStr() ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {p.fecha_entrega === getTodayStr() ? '¡ENTREGA HOY!' : `Entrega: ${formatDate(p.fecha_entrega!)}`}
                        </span>
                        <div style={{ marginTop: 2 }}>
                          <span className={`badge ${getEstadoBadge(p.estado)}`} style={{ fontSize: 10 }}>
                            {getEstadoLabel(p.estado)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  Sin entregas programadas pendientes
                </div>
              )}
            </div>

            {/* Últimos Pedidos */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="section-title" style={{ margin: 0 }}>Últimos Pedidos</div>
                <Link href="/pedidos" style={{ fontSize: 12.5, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 500 }}>
                  Ver todos <ArrowRight size={12} />
                </Link>
              </div>
              <div className="table-wrapper">
                {pedidosRecientes.length === 0 ? (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <ShoppingCart size={32} />
                    <p>Sin pedidos hoy todavía</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th>Pago</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosRecientes.map((p) => (
                        <tr key={p.id}>
                          <td><strong style={{ color: 'var(--accent)' }}>{p.numero}</strong></td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {p.cliente_nombre || 'Consumidor Final'}
                          </td>
                          <td>
                            <span className={`badge ${getEstadoBadge(p.estado)}`}>
                              {getEstadoLabel(p.estado)}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-neutral">
                              {p.metodo_pago || 'efectivo'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar derecho */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tareas Pendientes Rápido */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14 }}>
                  <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
                  Pendientes & Ideas
                </div>
                <Link href="/pendientes" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Ver todo →</Link>
              </div>

              {tareasPendientes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tareasPendientes.map(t => (
                    <div key={t.id} style={{
                      padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 8,
                      border: '1px solid var(--border)', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: 600 }}>{t.titulo}</span>
                      <span className={`badge ${t.prioridad === 'alta' ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: 9 }}>
                        {t.prioridad || 'media'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--success)', textAlign: 'center', padding: '10px 0' }}>
                  ✓ Sin tareas pendientes
                </div>
              )}
            </div>

            {/* Stock Bajo */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="section-title" style={{ margin: 0 }}>⚠ Materiales Bajo Stock</div>
                <Link href="/stock" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Ver stock →</Link>
              </div>
              {stockBajo.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--success)', textAlign: 'center', padding: '16px 0' }}>
                  ✓ Todo el stock está OK
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stockBajo.slice(0, 6).map((s) => (
                    <div key={s.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'var(--danger-muted)',
                      borderRadius: 7,
                    }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{s.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                        {s.cantidad} {s.unidad}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acceso Rápido */}
            <div className="card">
              <div className="section-title">Acceso Rápido</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/pedidos" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                  <ShoppingCart size={15} /> Nuevo Pedido
                </Link>
                <Link href="/calendario" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                  <CalendarIcon size={15} /> Ver Calendario
                </Link>
                <Link href="/pendientes" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                  <CheckSquare size={15} /> Ver Pendientes & Notes
                </Link>
                <Link href="/caja" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                  <Wallet size={15} /> Ver Caja
                </Link>
              </div>
            </div>
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
