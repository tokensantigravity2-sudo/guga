'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Pedido, Gasto, Tarea, CajaMovimiento } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/helpers'
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  ShoppingCart, DollarSign, CheckSquare, Plus, Clock, Filter, Wallet, ArrowUpCircle, ArrowDownCircle
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
      supabase.from('caja_movimientos').select('*'),
      supabase.from('tareas').select('*'),
    ])

    if (p) setPedidos(p)
    if (g) setGastos(g)
    if (c) setCajaMovs(c)
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
