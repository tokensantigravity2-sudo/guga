'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Pedido, Gasto, Tarea } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/helpers'
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  ShoppingCart, DollarSign, CheckSquare, Plus, Clock, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Evento {
  id: string
  titulo: string
  fecha: string // YYYY-MM-DD
  tipo: 'entrega' | 'gasto' | 'tarea'
  subtitulo?: string
  monto?: number
  estado?: string
  completada?: boolean
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [filterTipo, setFilterTipo] = useState<'todos' | 'entrega' | 'gasto' | 'tarea'>('todos')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: p }, { data: g }, { data: t }] = await Promise.all([
      supabase.from('pedidos').select('*').not('estado', 'eq', 'cancelado'),
      supabase.from('gastos').select('*'),
      supabase.from('tareas').select('*'),
    ])

    if (p) setPedidos(p)
    if (g) setGastos(g)
    if (t) setTareas(t)
    setLoading(false)
  }

  // Generate all events
  const eventos: Evento[] = []

  // Add order deliveries
  pedidos.forEach(p => {
    if (p.fecha_entrega) {
      eventos.push({
        id: `ped-${p.id}`,
        titulo: `Entrega: Pedido #${p.numero}`,
        fecha: p.fecha_entrega,
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
      eventos.push({
        id: `gas-${g.id}`,
        titulo: `Gasto: ${g.concepto}`,
        fecha: g.fecha,
        tipo: 'gasto',
        subtitulo: g.categoria,
        monto: g.monto,
      })
    }
  })

  // Add tasks due
  tareas.forEach(t => {
    if (t.fecha_vencimiento) {
      eventos.push({
        id: `tar-${t.id}`,
        titulo: `Tarea: ${t.titulo}`,
        fecha: t.fecha_vencimiento,
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
  const daysInMonth = lastDayOfMonth.getDate()

  // 0 = Sunday, 1 = Monday ... convert to 0 = Monday
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startingDayOfWeek === -1) startingDayOfWeek = 6

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const getEventosForDay = (dayStr: string) => {
    return eventos.filter(e => {
      if (e.fecha !== dayStr) return false
      if (filterTipo !== 'todos' && e.tipo !== filterTipo) return false
      return true
    })
  }

  const selectedDayEventos = selectedDay ? getEventosForDay(selectedDay) : []

  if (loading) return <div className="spinner" style={{ margin: '50px auto' }} />

  return (
    <>
      <Header title="Calendario Inteligente" subtitle="Planificación de entregas, egresos y tareas de imprenta" />
      <main style={{ padding: '28px', flex: 1 }}>

        {/* Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 800, minWidth: 160, textAlign: 'center' }}>
              {monthNames[month]} {year}
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={nextMonth}>
              <ChevronRight size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </button>
          </div>

          {/* Filter Badges */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`btn btn-sm ${filterTipo === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTipo('todos')}
            >
              Todos ({eventos.length})
            </button>
            <button
              className={`btn btn-sm ${filterTipo === 'entrega' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTipo('entrega')}
            >
              🚚 Entregas
            </button>
            <button
              className={`btn btn-sm ${filterTipo === 'gasto' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTipo('gasto')}
            >
              💸 Gastos
            </button>
            <button
              className={`btn btn-sm ${filterTipo === 'tarea' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTipo('tarea')}
            >
              ☑ Tareas
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Calendar Grid */}
          <div className="card" style={{ padding: 16 }}>
            {/* Days of week header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8, textAlign: 'center' }}>
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                <div key={d} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {/* Empty padding cells for start of month */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} style={{ height: 90, background: 'var(--bg-input)', borderRadius: 8, opacity: 0.4 }} />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dateObj = new Date(year, month, dayNum)
                // format YYYY-MM-DD
                const yyyy = dateObj.getFullYear()
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
                const dd = String(dateObj.getDate()).padStart(2, '0')
                const dayStr = `${yyyy}-${mm}-${dd}`

                const isToday = dayStr === todayStr
                const isSelected = dayStr === selectedDay
                const dayEventos = getEventosForDay(dayStr)

                return (
                  <div
                    key={dayStr}
                    onClick={() => setSelectedDay(dayStr)}
                    style={{
                      height: 90,
                      padding: 6,
                      borderRadius: 8,
                      border: isSelected
                        ? '2px solid var(--accent)'
                        : isToday
                        ? '2px solid var(--info)'
                        : '1px solid var(--border)',
                      background: isSelected
                        ? 'var(--accent-muted)'
                        : isToday
                        ? 'var(--info-muted)'
                        : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      transition: 'all 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: isToday || isSelected ? 800 : 600,
                        color: isToday ? 'var(--info)' : 'var(--text-primary)',
                      }}>
                        {dayNum}
                      </span>
                      {dayEventos.length > 0 && (
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          background: 'var(--accent)', color: 'white',
                          borderRadius: 99, padding: '1px 5px'
                        }}>
                          {dayEventos.length}
                        </span>
                      )}
                    </div>

                    {/* Day Events preview badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
                      {dayEventos.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          style={{
                            fontSize: 10,
                            padding: '2px 4px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 600,
                            background: ev.tipo === 'entrega' ? 'var(--warning-muted)' : ev.tipo === 'gasto' ? 'var(--danger-muted)' : 'var(--success-muted)',
                            color: ev.tipo === 'entrega' ? 'var(--warning)' : ev.tipo === 'gasto' ? 'var(--danger)' : 'var(--success)',
                          }}
                        >
                          {ev.tipo === 'entrega' ? '🚚 ' : ev.tipo === 'gasto' ? '💸 ' : '☑ '}
                          {ev.titulo.replace('Entrega: ', '').replace('Gasto: ', '').replace('Tarea: ', '')}
                        </div>
                      ))}
                      {dayEventos.length > 2 && (
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>
                          +{dayEventos.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected Day Sidebar */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  {selectedDay ? formatDate(selectedDay) : 'Seleccioná un día'}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {selectedDayEventos.length} evento(s) / actividad(es)
                </p>
              </div>
              <CalendarIcon size={20} style={{ color: 'var(--accent)' }} />
            </div>

            {selectedDay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedDayEventos.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <Clock size={24} />
                    <p style={{ fontSize: 12 }}>Sin entregas ni tareas agendadas</p>
                  </div>
                ) : (
                  selectedDayEventos.map(ev => (
                    <div
                      key={ev.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: 'var(--bg-hover)',
                        borderLeft: `4px solid ${
                          ev.tipo === 'entrega' ? 'var(--warning)' : ev.tipo === 'gasto' ? 'var(--danger)' : 'var(--success)'
                        }`,
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{ev.titulo}</span>
                        {ev.monto && <span style={{ color: 'var(--accent)' }}>{formatCurrency(ev.monto)}</span>}
                      </div>
                      {ev.subtitulo && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {ev.subtitulo}
                        </div>
                      )}
                      {ev.estado && (
                        <span className="badge badge-warning" style={{ fontSize: 10, marginTop: 4 }}>
                          {ev.estado.toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                Haz clic en cualquier día del calendario para ver los compromisos
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
