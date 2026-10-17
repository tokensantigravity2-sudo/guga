'use client'

import { useEffect, useState } from 'react'
import { Check, Clock, Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { Servicio, VariableServicio, EscalaPrecio } from '@/lib/types'
import { formatCurrency, cleanProductDescription, getVariantesServicio } from '@/lib/helpers'

export interface ProductoSeleccion {
  variante?: string
  escala?: { cantidad: number; precio: number } // tirada elegida: precio total de cada tirada
  cantidad: number
  subtotal: number
}

interface ProductoModalProps {
  servicio: Servicio
  imagenUrl: string
  onClose: () => void
  onAdd: (seleccion: ProductoSeleccion) => void
}

const ordenarEscalas = (escalas?: EscalaPrecio[]) => [...(escalas || [])].sort((a, b) => a.cantidad - b.cantidad)

function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  const btn = {
    width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155'
  } as const
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button type="button" style={btn} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Restar">
        <Minus size={15} />
      </button>
      <input
        type="number"
        min={min}
        value={value || ''}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          onChange(Number.isNaN(n) ? 0 : Math.max(0, n))
        }}
        style={{
          width: '72px', height: '36px', textAlign: 'center', borderRadius: '10px', border: '1.5px solid #cbd5e1',
          fontSize: '15px', fontWeight: 800, color: '#0f172a', outline: 'none'
        }}
      />
      <button type="button" style={btn} onClick={() => onChange(value + 1)} aria-label="Sumar">
        <Plus size={15} />
      </button>
    </div>
  )
}

export default function ProductoModal({ servicio, imagenUrl, onClose, onAdd }: ProductoModalProps) {
  const variantes = getVariantesServicio(servicio)
  const [variante, setVariante] = useState<VariableServicio | null>(variantes[0] || null)
  const [escala, setEscala] = useState<EscalaPrecio | null>(ordenarEscalas(variantes[0]?.escalas)[0] || null)
  const [tiradas, setTiradas] = useState(1)
  const [unidades, setUnidades] = useState(1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const elegirVariante = (v: VariableServicio) => {
    setVariante(v)
    setEscala(ordenarEscalas(v.escalas)[0] || null)
    setTiradas(1)
  }

  // Con tirada elegida se compran tiradas completas; sin tiradas se cobra por unidad al precio base
  const cantidad = escala ? escala.cantidad * tiradas : unidades
  const subtotal = escala ? escala.precio * tiradas : unidades * Number(servicio.precio_base || 0)
  const descripcion = cleanProductDescription(servicio.descripcion)
  const escalas = ordenarEscalas(variante?.escalas)
  const unidad = servicio.unidad && !['unidad', 'u', 'u.', 'unidades'].includes(servicio.unidad.toLowerCase()) ? ` (${servicio.unidad})` : ''

  const handleAdd = () => {
    if (cantidad <= 0) return
    onAdd({
      variante: variante?.nombre,
      escala: escala ? { cantidad: escala.cantidad, precio: escala.precio } : undefined,
      cantidad,
      subtotal,
    })
  }

  const etiqueta = { fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' } as const

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 110,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '92vh',
          overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', position: 'relative'
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: '12px', right: '12px', width: '34px', height: '34px', borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.92)', border: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#334155', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 1
          }}
        >
          <X size={18} />
        </button>

        <img src={imagenUrl} alt={servicio.nombre} style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }} />

        <div style={{ padding: '20px 22px 22px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#149b8e', textTransform: 'uppercase' }}>{servicio.categoria}</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0 6px', lineHeight: 1.25 }}>{servicio.nombre}</h2>
          {servicio.tiempo_estimado && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#64748b' }}>
              <Clock size={13} />
              <span>Entrega: {servicio.tiempo_estimado}</span>
            </div>
          )}
          {descripcion && (
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '12px 0 0', whiteSpace: 'pre-line' }}>{descripcion}</p>
          )}

          {variantes.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={etiqueta}>Elegí una opción</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {variantes.map((v, idx) => {
                  const activa = variante?.nombre === v.nombre
                  return (
                    <button
                      key={v.id || idx}
                      type="button"
                      onClick={() => elegirVariante(v)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '999px',
                        border: activa ? '2px solid #149b8e' : '1.5px solid #cbd5e1',
                        backgroundColor: activa ? 'rgba(20, 155, 142, 0.1)' : '#ffffff',
                        color: activa ? '#0f766e' : '#334155', fontSize: '13px', fontWeight: activa ? 800 : 600, cursor: 'pointer'
                      }}
                    >
                      {activa && <Check size={14} />}
                      {v.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {escalas.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={etiqueta}>Cantidad</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                {escalas.map((esc, idx) => {
                  const activa = escala?.cantidad === esc.cantidad && escala?.precio === esc.precio
                  const unitario = esc.cantidad > 0 ? Math.round((esc.precio / esc.cantidad) * 100) / 100 : 0
                  return (
                    <button
                      key={esc.id || idx}
                      type="button"
                      onClick={() => { setEscala(esc); setTiradas(1) }}
                      style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                        border: activa ? '2px solid #149b8e' : '1.5px solid #e2e8f0',
                        backgroundColor: activa ? 'rgba(20, 155, 142, 0.08)' : '#ffffff'
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 800, color: activa ? '#0f766e' : '#0f172a' }}>
                        {esc.cantidad.toLocaleString('es-UY')} u
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#149b8e', marginTop: '2px' }}>{formatCurrency(esc.precio)}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{formatCurrency(unitario)} c/u</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={etiqueta}>{escala ? 'Cantidad de tiradas' : `Cantidad${unidad}`}</div>
              {escala ? <Stepper value={tiradas} onChange={setTiradas} /> : <Stepper value={unidades} onChange={setUnidades} />}
            </div>
            {escala && tiradas > 0 && (
              <div style={{ fontSize: '12.5px', color: '#64748b', textAlign: 'right' }}>
                {tiradas} × {escala.cantidad.toLocaleString('es-UY')} u = <strong style={{ color: '#0f172a' }}>{cantidad.toLocaleString('es-UY')} u</strong>
              </div>
            )}
          </div>

          <div style={{
            marginTop: '22px', paddingTop: '16px', borderTop: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>{formatCurrency(subtotal)}</div>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={cantidad <= 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 22px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #149b8e 0%, #0e746b 100%)', color: '#ffffff', fontSize: '14.5px', fontWeight: 800,
                cursor: cantidad <= 0 ? 'not-allowed' : 'pointer', opacity: cantidad <= 0 ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(20, 155, 142, 0.3)'
              }}
            >
              <ShoppingCart size={17} />
              <span>Agregar al carrito</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
