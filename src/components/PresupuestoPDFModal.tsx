'use client';

import React from 'react';
import { Pedido, Cliente } from '@/lib/types';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/helpers';
import { Printer, Download, X, FileText, CheckCircle2 } from 'lucide-react';

interface PresupuestoPDFModalProps {
  pedido: Pedido;
  cliente?: Cliente | null;
  onClose: () => void;
}

export default function PresupuestoPDFModal({ pedido, cliente, onClose }: PresupuestoPDFModalProps) {
  const items = Array.isArray(pedido.items) ? pedido.items : [];

  const handlePrintPDF = () => {
    window.print();
  };

  // Extract tags from notas if present
  const descMatch = (pedido.notas || '').match(/\[Desc:\s*(\d+)%\]/);
  const descPct = pedido.descuento_porcentaje || (descMatch ? Number(descMatch[1]) : 0);

  const adicMatch = (pedido.notas || '').match(/\[Adicional:\s*(\d+)%\]/);
  const adicPct = adicMatch ? Number(adicMatch[1]) : 0;
  const montoAdicional = Math.round((pedido.subtotal * adicPct) / 100);

  const hasIva = (pedido.notas || '').includes('[+IVA 22%]');
  const subtotalNeto = Math.max(0, pedido.subtotal - (pedido.descuento || 0) + montoAdicional);
  const montoIva = hasIva ? Math.round(subtotalNeto * 0.22 * 100) / 100 : 0;

  // Clean notas from technical tags
  const notasLimpias = (pedido.notas || '')
    .replace(/\[Desc:.*?\]/g, '')
    .replace(/\[Adicional:.*?\]/g, '')
    .replace(/\[\+IVA.*?\]/g, '')
    .trim();

  const isPresupuesto = pedido.estado === 'presupuesto' || !pedido.estado;

  return (
    <>
      {/* Printable styles injected directly for A4 PDF download */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #presupuesto-pdf-container, #presupuesto-pdf-container * {
            visibility: visible !important;
          }
          #presupuesto-pdf-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>

      <div
        className="modal-backdrop no-print"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20,
          overflowY: 'auto'
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-main)',
            borderRadius: 16,
            maxWidth: 850,
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header Controls (Hidden during print) */}
          <div
            className="no-print"
            style={{
              padding: '16px 24px',
              background: '#ffffff',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                📄 {isPresupuesto ? 'Presupuesto PDF Formal' : 'Comprobante de Pedido PDF'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Generado para {pedido.cliente_nombre || 'Consumidor Final'} • #{pedido.numero}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={handlePrintPDF}
                style={{ gap: 6, fontWeight: 700 }}
              >
                <Download size={16} /> Descargar / Imprimir PDF
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* PDF A4 Document Body */}
          <div style={{ overflowY: 'auto', padding: 24, flex: 1, background: '#f1f5f9' }}>
            <div
              id="presupuesto-pdf-container"
              style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: '36px 40px',
                color: '#0f172a',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                margin: '0 auto',
                maxWidth: 780
              }}
            >
              {/* Document Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: 20, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 14,
                    background: 'linear-gradient(135deg, #e6007e 0%, #0891b2 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', fontSize: 28, fontWeight: 800, flexShrink: 0
                  }}>
                    🖨️
                  </div>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: '#0f172a' }}>
                      GUGA IMPRENTA
                    </h1>
                    <div style={{ fontSize: 13, color: '#e6007e', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                      Imprenta & Diseño Gráfico
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Montevideo, Uruguay • Tel: 099 123 456 • guga@imprenta.com
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: 8,
                    background: isPresupuesto ? '#fdf2f8' : '#f0fdf4',
                    color: isPresupuesto ? '#be185d' : '#15803d',
                    fontWeight: 800, fontSize: 14, textTransform: 'uppercase', marginBottom: 6
                  }}>
                    {isPresupuesto ? 'PRESUPUESTO' : 'COMPROBANTE'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    #{pedido.numero}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Fecha: <strong>{formatDate(pedido.created_at || new Date())}</strong>
                  </div>
                  {pedido.fecha_entrega && (
                    <div style={{ fontSize: 12, color: '#0891b2', fontWeight: 600, marginTop: 2 }}>
                      Entrega Est.: {formatDate(pedido.fecha_entrega)}
                    </div>
                  )}
                </div>
              </div>

              {/* Client & Metadata Box */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
                background: '#f8fafc', padding: '16px 20px', borderRadius: 10,
                border: '1px solid #e2e8f0', marginBottom: 24, fontSize: 13
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                    DATOS DEL CLIENTE
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    {pedido.cliente_nombre || cliente?.nombre || 'Consumidor Final'}
                  </div>
                  {cliente?.rut && (
                    <div style={{ color: '#475569', marginTop: 2 }}>
                      <strong>RUT:</strong> {cliente.rut}
                    </div>
                  )}
                  {cliente?.telefono && (
                    <div style={{ color: '#475569', marginTop: 2 }}>
                      <strong>Teléfono:</strong> {cliente.telefono}
                    </div>
                  )}
                  {cliente?.email && (
                    <div style={{ color: '#475569', marginTop: 2 }}>
                      <strong>Email:</strong> {cliente.email}
                    </div>
                  )}
                  {cliente?.direccion && (
                    <div style={{ color: '#475569', marginTop: 2 }}>
                      <strong>Dirección:</strong> {cliente.direccion}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                    DETALLES DE LA PROPUESTA
                  </div>
                  <div style={{ color: '#475569' }}>
                    <strong>Forma de Pago:</strong> <span style={{ textTransform: 'capitalize' }}>{pedido.metodo_pago?.replace('_', ' ') || 'Efectivo'}</span>
                  </div>
                  <div style={{ color: '#475569', marginTop: 2 }}>
                    <strong>Validez de la oferta:</strong> 15 días corridos
                  </div>
                  <div style={{ color: '#475569', marginTop: 2 }}>
                    <strong>Estado:</strong> {pedido.estado?.toUpperCase() || 'PRESUPUESTO'}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: 24 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', borderRadius: '8px 0 0 0', width: 60 }}></th>
                      <th style={{ padding: '10px 12px' }}>DESCRIPCIÓN Y ESPECIFICACIONES</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', width: 70 }}>CANT.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', width: 100 }}>P. UNIT.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 8px 0 0', width: 110 }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it: any, index: number) => {
                      const specs = [it.medida, it.material, it.acabado].filter(Boolean).join(' • ');
                      const isEven = index % 2 === 0;
                      return (
                        <tr key={index} style={{ background: isEven ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            {it.imagen_url ? (
                              <img
                                src={it.imagen_url}
                                alt={it.nombre}
                                style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }}
                              />
                            ) : (
                              <div style={{
                                width: 44, height: 44, borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 18
                              }}>
                                🖼️
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{it.nombre}</div>
                            {specs && (
                              <div style={{ fontSize: 12, color: '#475569', marginTop: 2, fontWeight: 500 }}>
                                {specs}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'top', fontWeight: 600 }}>
                            {it.cantidad}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top', color: '#475569' }}>
                            {formatCurrency(it.precio_unitario || it.precio || 0)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top', fontWeight: 700, color: '#0f172a' }}>
                            {formatCurrency(it.subtotal || (it.cantidad * (it.precio_unitario || it.precio || 0)))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals & Notes Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 24 }}>
                {/* Notes & Terms */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>📌 Observaciones y Términos:</div>
                  <p style={{ color: '#475569', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {notasLimpias || 'Los tiempos de entrega rigen a partir de la aprobación final del diseño y pago del seña/total.'}
                  </p>
                  <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
                    ✔ Precios sujetos a modificación transcurridos los 15 días de validez.
                  </div>
                </div>

                {/* Totals Breakdown Box */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#475569' }}>
                    <span>Subtotal:</span>
                    <span>{formatCurrency(pedido.subtotal)}</span>
                  </div>

                  {(pedido.descuento || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#dc2626' }}>
                      <span>Descuento {descPct ? `(${descPct}%)` : ''}:</span>
                      <span>-{formatCurrency(pedido.descuento || 0)}</span>
                    </div>
                  )}

                  {montoAdicional > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#d97706', fontWeight: 600 }}>
                      <span>Adicional ({adicPct}%):</span>
                      <span>+{formatCurrency(montoAdicional)}</span>
                    </div>
                  )}

                  {hasIva && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#0891b2', fontWeight: 600 }}>
                      <span>IVA (22%):</span>
                      <span>+{formatCurrency(montoIva)}</span>
                    </div>
                  )}

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderTop: '2px solid #0f172a', paddingTop: 10, marginTop: 10,
                    fontWeight: 800, fontSize: 17, color: '#e6007e'
                  }}>
                    <span>TOTAL:</span>
                    <span>{formatCurrency(pedido.total)}</span>
                  </div>
                </div>
              </div>

              {/* Document Footer Branding */}
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 16, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>¡Gracias por confiar en GUGA IMPRENTA!</p>
                <p style={{ margin: '2px 0 0', fontSize: 11 }}>Calidad y rapidez garantizada en cada impresión.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
