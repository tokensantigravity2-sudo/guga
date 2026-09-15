'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Pedido, Gasto, Tarea, CajaMovimiento } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/helpers'
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  ShoppingCart, DollarSign, CheckSquare, Plus, Clock, Filter, Wallet, ArrowUpCircle, ArrowDownCircle,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Evento {
  id: string
  titulo: string
  fecha: string // YYYY-MM-DD
  tipo: 'entrega' | 'gasto' | 'caja_ingreso' | 'caja_egreso' | 'tarea'
  subtitulo?: string
  monto?: number
  estado?: string
  completada?: boolean
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cajaMovs, setCajaMovs] = useState<CajaMovimiento[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [filterTipo, setFilterTipo] = useState<'todos' | 'entrega' | 'gasto' | 'caja' | 'tarea'>('todos')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: p }, { data: g }, { data: c }, { data: t }] = await Promise.all([
      supabase.from('pedidos').select('*').not('estado', 'eq', 'cancelado'),
      supabase.from('gastos').select('*'),
      supabase.from('caja_movimientos').select('*').order('created_at', { ascending: false }),
      supabase.from('tareas').select('*'),
    ])

    let allCaja: CajaMovimiento[] = c ? [...c] : []
    const existingRefIds = new Set(allCaja.map(m => m.referencia_id).filter(Boolean))

    if (p) {
      p.forEach(ped => {
        const isCobrado = ped.cobrado === true || (ped.notas || '').includes('[COBRADO:true]')
        if (isCobrado && !existingRefIds.has(ped.id) && ped.estado !== 'cancelado') {
          const fecha = ped.created_at || new Date().toISOString()
          allCaja.push({
            id: `ped-caja-${ped.id}`,
            tipo: 'ingreso',
            monto: Number(ped.total) || 0,
            concepto: `[Pago: ${ped.metodo_pago || 'efectivo'}] Cobro 100% Pedido #${ped.numero} - ${ped.cliente_nombre || 'Consumidor Final'}`,
            referencia_id: ped.id,
            fecha,
            created_at: fecha,
            metodo_pago: ped.metodo_pago || 'efectivo',
            cliente_nombre: ped.cliente_nombre || 'Consumidor Final'
          })
        }
      })
    }

    if (p) setPedidos(p)
    if (g) setGastos(g)
    setCajaMovs(allCaja)
    if (t) setTareas(t)
    setLoading(false)
  }

  // Generate all events
  const eventos: Evento[] = []

  // Add order deliveries
  pedidos.forEach(p => {
    if (p.fecha_entrega) {
      const fechaClean = p.fecha_entrega.split('T')[0]
      eventos.push({
        id: `ped-${p.id}`,
        titulo: `Entrega: Pedido #${p.numero}`,
        fecha: fechaClean,
        tipo: 'entrega',
        subtitulo: p.cliente_nombre || 'Consumidor Final',
        monto: p.total,
        estado: p.estado,
      })
    }
  })

  // Add expenses
  gastos.forEach(g => {
    if (g.fecha) {
      const fechaClean = g.fecha.split('T')[0]
      eventos.push({
        id: `gas-${g.id}`,
        titulo: `Gasto: ${g.concepto}`,
        fecha: fechaClean,
        tipo: 'gasto',
        subtitulo: g.categoria,
        monto: g.monto,
      })
    }
  })

  // Format clean concept for events
  const formatCleanCajaTitulo = (c: CajaMovimiento) => {
    const raw = c.concepto || ''
    const sign = c.tipo === 'ingreso' ? '+' : '-'
    const montoFormatted = formatCurrency(c.monto)

    // Check if it's a known order action
    const senaMatch = raw.match(/Seña Pedido #([^\s-]+)/i)
    if (senaMatch) return `${sign}${montoFormatted} Seña #${senaMatch[1]}`

    const entregaMatch = raw.match(/Entrega Pedido #([^\s-]+)/i)
    if (entregaMatch) return `${sign}${montoFormatted} Entrega #${entregaMatch[1]}`

    const cobroMatch = raw.match(/Cobro (?:100% )?Pedido #([^\s-]+)/i)
    if (cobroMatch) return `${sign}${montoFormatted} Cobro #${cobroMatch[1]}`

    const pedMatch = raw.match(/Pedido #([^\s-]+)/i)
    if (pedMatch) return `${sign}${montoFormatted} Pedido #${pedMatch[1]}`

    const gastoMatch = raw.match(/Gasto:\s*([^\[]+)/i)
    if (gastoMatch) return `${sign}${montoFormatted} ${gastoMatch[1].trim()}`

    // Clean brackets
    const clean = raw.replace(/\[.*?\]/g, '').trim() || 'Movimiento'
    return `${sign}${montoFormatted} ${clean.slice(0, 22)}`
  }

  // Add cash movements
  cajaMovs.forEach(c => {
    const fechaStr = c.fecha || c.created_at
    if (fechaStr) {
      const fechaClean = fechaStr.split('T')[0]
      const cleanTitle = formatCleanCajaTitulo(c)
      eventos.push({
        id: `caj-${c.id}`,
        titulo: cleanTitle,
        fecha: fechaClean,
        tipo: c.tipo === 'ingreso' ? 'caja_ingreso' : 'caja_egreso',
        subtitulo: c.concepto || (c.cliente_nombre ? `Cliente: ${c.cliente_nombre}` : 'Caja Diaria'),
        monto: c.monto,
      })
    }
  })

  // Add tasks due
  tareas.forEach(t => {
    if (t.fecha_vencimiento) {
      const fechaClean = t.fecha_vencimiento.split('T')[0]
      eventos.push({
        id: `tar-${t.id}`,
        titulo: `Tarea: ${t.titulo}`,
        fecha: fechaClean,
        tipo: 'tarea',
        subtitulo: `Prioridad ${t.prioridad || 'normal'}`,
        completada: t.completada,
      })
    }
  })

  // Agregación de caja diaria por fecha (YYYY-MM-DD)
  const cashByDay = useMemo(() => {
    const map: Record<string, { ingresos: number; egresos: number; saldo: number; count: number }> = {}
    cajaMovs.forEach(c => {
      const fechaStr = c.fecha || c.created_at
      if (!fechaStr) return
      const f = fechaStr.split('T')[0]
      if (!map[f]) map[f] = { ingresos: 0, egresos: 0, saldo: 0, count: 0 }
      map[f].count++
      const m = Number(c.monto || 0)
      if (c.tipo === 'ingreso') {
        map[f].ingresos += m
        map[f].saldo += m
      } else {
        map[f].egresos += m
        map[f].saldo -= m
      }
    })
    return map
  }, [cajaMovs])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = lastDayOfMonth.getDate()

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const today = () => setCurrentDate(new Date())

  const isToday = (day: number) => {
    const now = new Date()
    return now.getDate() === day && now.getMonth() === month && now.getFullYear() === year
  }

  const getEventsForDay = (day: number) => {
    const formattedDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return eventos.filter(e => {
      if (e.fecha !== formattedDay) return false
      if (filterTipo === 'todos') return true
      if (filterTipo === 'caja') return e.tipo === 'caja_ingreso' || e.tipo === 'caja_egreso'
      return e.tipo === filterTipo
    })
  }

  const selectedDayEvents = selectedDay ? eventos.filter(e => e.fecha === selectedDay) : []

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Calendario & Agenda" subtitle="Vista mensual de entregas, gastos y movimientos de caja" />
      <main style={{ padding: '28px', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Top Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
            <h2 style={{ fontSize: 18, fontWeight: 700, minWidth: 180, textAlign: 'center' }}>
              {monthNames[month]} {year}
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
            <button className="btn btn-ghost btn-sm" onClick={today}>Hoy</button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${filterTipo === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTipo('todos')}
            >
              Todos
            </button>
            <button
              className={`btn btn-sm ${filterTipo === 'entrega' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTipo('entrega')}
            >
              📦 Entregas
            </button>
            <button
              className={`btn btn-sm ${filterTipo === 'caja' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTipo('caja')}
            >
              💵 Caja
            </button>
            <button
              className={`btn btn-sm ${filterTipo === 'gasto' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTipo('gasto')}
            >
              🔴 Gastos
            </button>
            <button
              className={`btn btn-sm ${filterTipo === 'tarea' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTipo('tarea')}
            >
              ✅ Tareas
            </button>
          </div>
        </div>

        {/* Grid Calendar */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontWeight: 700, fontSize: 12 }}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(115px, auto)', width: '100%' }}>
            {/* Empty days starting */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: 'var(--bg-hover)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', opacity: 0.4, minWidth: 0 }} />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayEvents = getEventsForDay(day)
              const isSelected = selectedDay === dayStr

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(dayStr)}
                  style={{
                    padding: 8,
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? 'var(--accent-muted)' : isToday(day) ? 'rgba(20,155,142,0.06)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    minWidth: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      fontWeight: isToday(day) ? 800 : 600,
                      fontSize: 13,
                      color: isToday(day) ? 'var(--accent)' : 'var(--text-primary)',
                      background: isToday(day) ? 'var(--accent-muted)' : 'transparent',
                      width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="badge badge-accent" style={{ fontSize: 10, padding: '1px 5px' }}>
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Resumen de Caja del Día si hubo movimientos o cobros */}
                  {cashByDay[dayStr] && (cashByDay[dayStr].ingresos > 0 || cashByDay[dayStr].egresos > 0) && (
                    <div
                      title={`Caja: +${formatCurrency(cashByDay[dayStr].ingresos)} / -${formatCurrency(cashByDay[dayStr].egresos)} (${cashByDay[dayStr].count} cobros/movimientos)`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '2px 5px',
                        borderRadius: 4,
                        background: cashByDay[dayStr].saldo >= 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                        border: `1px solid ${cashByDay[dayStr].saldo >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                        color: cashByDay[dayStr].saldo >= 0 ? 'var(--success)' : 'var(--danger)',
                        fontSize: 10,
                        fontWeight: 700,
                        marginBottom: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      <span>💵 {cashByDay[dayStr].saldo >= 0 ? '+' : '-'}{formatCurrency(Math.abs(cashByDay[dayStr].saldo))}</span>
                      <span style={{ fontSize: 9, opacity: 0.85 }}>({cashByDay[dayStr].count})</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 85, overflowY: 'auto', minWidth: 0 }}>
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        title={`${ev.titulo} ${ev.subtitulo ? `(${ev.subtitulo})` : ''}`}
                        style={{
                          fontSize: 11,
                          padding: '2px 5px',
                          borderRadius: 4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0,
                          maxWidth: '100%',
                          background: ev.tipo === 'entrega' ? 'var(--info-muted)' :
                                      ev.tipo === 'caja_ingreso' ? 'var(--success-muted)' :
                                      ev.tipo === 'caja_egreso' || ev.tipo === 'gasto' ? 'var(--danger-muted)' : 'var(--bg-hover)',
                          color: ev.tipo === 'entrega' ? 'var(--info)' :
                                 ev.tipo === 'caja_ingreso' ? 'var(--success)' :
                                 ev.tipo === 'caja_egreso' || ev.tipo === 'gasto' ? 'var(--danger)' : 'var(--text-primary)',
                          fontWeight: 600
                        }}
                      >
                        {ev.titulo}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                        +{dayEvents.length - 3} más...
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Day Drawer / Modal */}
        {selectedDay && (
          <div className="modal-backdrop" onClick={() => setSelectedDay(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700 }}>📅 Eventos del Día ({formatDate(selectedDay)})</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedDayEvents.length} registros en esta fecha</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDay(null)}>✕</button>
              </div>
              <div className="modal-body">
                {/* Resumen de Caja destacada para el día seleccionado */}
                {cashByDay[selectedDay] && (cashByDay[selectedDay].ingresos > 0 || cashByDay[selectedDay].egresos > 0) && (
                  <div style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 14
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Wallet size={15} style={{ color: 'var(--accent)' }} /> Resumen de Caja del Día
                      </strong>
                      <a
                        href={`/caja?fecha=${selectedDay}`}
                        className="btn btn-sm btn-ghost"
                        style={{ fontSize: 11, padding: '2px 6px', gap: 4, color: 'var(--accent)' }}
                      >
                        Ir a Caja <ExternalLink size={11} />
                      </a>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, textAlign: 'center' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '6px 4px', borderRadius: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Ingresos</span>
                        <strong style={{ fontSize: 12, color: 'var(--success)' }}>+{formatCurrency(cashByDay[selectedDay].ingresos)}</strong>
                      </div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '6px 4px', borderRadius: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Egresos</span>
                        <strong style={{ fontSize: 12, color: 'var(--danger)' }}>{cashByDay[selectedDay].egresos > 0 ? `-${formatCurrency(cashByDay[selectedDay].egresos)}` : '$0'}</strong>
                      </div>
                      <div style={{ background: 'rgba(20, 155, 142, 0.08)', padding: '6px 4px', borderRadius: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Cierre Neto</span>
                        <strong style={{ fontSize: 12, color: cashByDay[selectedDay].saldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {formatCurrency(cashByDay[selectedDay].saldo)}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDayEvents.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedDayEvents.map(ev => (
                      <div key={ev.id} style={{
                        padding: 10, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <strong>{ev.titulo}</strong>
                          {ev.subtitulo && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.subtitulo}</div>}
                        </div>
                        {ev.monto !== undefined && (
                          <strong style={{
                            fontSize: 14,
                            color: ev.tipo === 'caja_ingreso' ? 'var(--success)' : ev.tipo === 'entrega' ? 'var(--accent)' : 'var(--danger)'
                          }}>
                            {formatCurrency(ev.monto)}
                          </strong>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <CalendarIcon size={32} />
                    <p>Sin eventos ni entregas registradas para este día</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
