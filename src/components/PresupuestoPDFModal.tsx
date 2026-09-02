'use client';

import React from 'react';
import { Pedido, Cliente } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { Download, X } from 'lucide-react';

interface PresupuestoPDFModalProps {
  pedido: Pedido;
  cliente?: Cliente | null;
  onClose: () => void;
}

export default function PresupuestoPDFModal({ pedido, cliente, onClose }: PresupuestoPDFModalProps) {
  const items = Array.isArray(pedido.items) ? pedido.items : [];

  const handlePrintPDF = () => {
    const printElement = document.getElementById('presupuesto-pdf-container');
    if (!printElement) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <base href="${typeof window !== 'undefined' ? window.location.origin : ''}/">
            <title>Presupuesto GUGA - ${pedido.numero}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>
              @page {
                size: A4 portrait;
                margin: 6mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                margin: 0;
                padding: 0;
                color: #0f172a;
                background: #ffffff;
                -webkit-font-smoothing: antialiased;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              img {
                display: block;
              }
            </style>
          </head>
          <body>
            ${printElement.innerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 800);
      }, 350);
    }
  };

  // 1. Extraer tags financieros
  const descMatch = (pedido.notas || '').match(/\[Desc:\s*(\d+)%\]/);
  const descPct = pedido.descuento_porcentaje || (descMatch ? Number(descMatch[1]) : 0);

  const adicMatch = (pedido.notas || '').match(/\[Adicional:\s*(\d+)%\]/);
  const adicPct = adicMatch ? Number(adicMatch[1]) : 0;
  const montoAdicional = Math.round((pedido.subtotal * adicPct) / 100);

  const hasIva = (pedido.notas || '').includes('[+IVA 22%]');
  const subtotalNeto = Math.max(0, pedido.subtotal - (pedido.descuento || 0) + montoAdicional);
  const montoIva = hasIva ? Math.round(subtotalNeto * 0.22 * 100) / 100 : 0;

  // 2. Extraer datos de contacto guardados en las notas (pedidos ecommerce o mostrador)
  const telFromNotas = (pedido.notas || '').match(/Tel:\s*([^|]+)/)?.[1]?.trim() || '';
  const dirFromNotas = (pedido.notas || '').match(/Dir(?:ección)?:\s*([^|]+)/)?.[1]?.trim() || '';
  const emailFromNotas = (pedido.notas || '').match(/Email:\s*([^|]+)/)?.[1]?.trim() || '';
  const rutFromNotas = (pedido.notas || '').match(/RUT:\s*([^|]+)/)?.[1]?.trim() || '';
  const metodoPagoFromNotas = (pedido.notas || '').match(/Pago:\s*([^|]+)/)?.[1]?.trim() || '';

  const clienteNombreFinal = pedido.cliente_nombre || cliente?.nombre || 'Consumidor Final';
  const clienteRutFinal = cliente?.rut || rutFromNotas;
  const clienteTelFinal = cliente?.telefono || telFromNotas;
  const clienteEmailFinal = cliente?.email || emailFromNotas;
  const clienteDirFinal = cliente?.direccion || dirFromNotas;
  const formaPagoFinal = metodoPagoFromNotas || pedido.metodo_pago?.replace('_', ' ') || 'Transferencia';

  // 3. Limpiar las notas de etiquetas técnicas para las observaciones
  let notasLimpias = (pedido.notas || '')
    .replace(/\[TIENDA ONLINE\]/gi, '')
    .replace(/\[COBRADO:true\]/gi, '')
    .replace(/\[Desc:.*?\]/gi, '')
    .replace(/\[Adicional:.*?\]/gi, '')
    .replace(/\[\+IVA.*?\]/gi, '')
    .replace(/Tel:\s*[^|]+/gi, '')
    .replace(/Dir(?:ección)?:\s*[^|]+/gi, '')
    .replace(/Email:\s*[^|]+/gi, '')
    .replace(/RUT:\s*[^|]+/gi, '')
    .replace(/Entrega:\s*[^|]+/gi, '')
    .replace(/Pago:\s*[^|]+/gi, '')
    .replace(/Envío:\s*[^|]+/gi, '')
    .replace(/\|/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const isPresupuesto = pedido.estado === 'presupuesto' || !pedido.estado || pedido.numero?.startsWith('P-');

  return (
    <div
      className="modal-backdrop"
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
        {/* Modal Header Controls */}
        <div
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
            {/* Document Header Logo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
              {/* Logo & Slogan */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img
                  src="/logo-guga.png"
                  alt="GUGA IMPRENTA & GRÁFICA"
                  style={{ height: 54, maxWidth: 210, objectFit: 'contain' }}
                  onError={(e) => {
                    // Fallback visual if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Central Contact Info with teal icons */}
              <div style={{ fontSize: 11, color: '#475569', display: 'flex', flexDirection: 'column', gap: 2.5, fontWeight: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#0f766e', fontSize: 11.5 }}>📞</span>
                  <span>+598 99 724 454</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#0f766e', fontSize: 11.5 }}>📷</span>
                  <span>gugaprint.uy</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#0f766e', fontSize: 11.5 }}>✉️</span>
                  <span>contacto@gugaprint.uy</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#0f766e', fontSize: 11.5 }}>🌐</span>
                  <span>www.gugaprint.uy</span>
                </div>
              </div>

              {/* Document Type & Number */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 6,
                  background: isPresupuesto ? '#fdf2f8' : '#f0fdf4',
                  color: isPresupuesto ? '#be185d' : '#15803d',
                  fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', marginBottom: 4,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>
                  {isPresupuesto ? 'PRESUPUESTO' : 'ORDEN DE TRABAJO'}
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  #{pedido.numero}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Fecha: <strong>{formatDate(pedido.created_at || new Date())}</strong>
                </div>
              </div>
            </div>

            {/* Client & Metadata Box (Two Columns) */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20,
              background: '#f8fafc', padding: '16px 20px', borderRadius: 10,
              border: '1px solid #e2e8f0', marginBottom: 20, fontSize: 12.5
            }}>
              {/* Left Column: Client Data */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 5, letterSpacing: '0.04em' }}>
                  DATOS DEL CLIENTE
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
                  {clienteNombreFinal}
                </div>
                {clienteRutFinal && (
                  <div style={{ color: '#475569', marginTop: 2 }}>
                    <strong style={{ color: '#0f172a' }}>RUT:</strong> {clienteRutFinal}
                  </div>
                )}
                {clienteTelFinal && (
                  <div style={{ color: '#475569', marginTop: 2 }}>
                    <strong style={{ color: '#0f172a' }}>Teléfono:</strong> {clienteTelFinal}
                  </div>
                )}
                {clienteEmailFinal && (
                  <div style={{ color: '#475569', marginTop: 2 }}>
                    <strong style={{ color: '#0f172a' }}>Email:</strong> {clienteEmailFinal}
                  </div>
                )}
                {clienteDirFinal && (
                  <div style={{ color: '#475569', marginTop: 2 }}>
                    <strong style={{ color: '#0f172a' }}>Dirección:</strong> {clienteDirFinal}
                  </div>
                )}
              </div>

              {/* Right Column: Proposal Details */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 5, letterSpacing: '0.04em' }}>
                  DETALLES DE LA PROPUESTA
                </div>
                <div style={{ color: '#475569', marginTop: 3 }}>
                  <strong style={{ color: '#0f172a' }}>Forma de Pago:</strong> <span style={{ textTransform: 'capitalize' }}>{formaPagoFinal}</span>
                </div>
                <div style={{ color: '#475569', marginTop: 3 }}>
                  <strong style={{ color: '#0f172a' }}>Validez de la oferta:</strong> 15 días corridos
                </div>
                <div style={{ color: '#475569', marginTop: 3 }}>
                  <strong style={{ color: '#0f172a' }}>Estado:</strong> <span style={{ textTransform: 'uppercase' }}>{pedido.estado || 'PRESUPUESTO'}</span>
                </div>
              </div>
            </div>

            {/* Items Table - Clean Black Header */}
            <div style={{ marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#000000', color: '#ffffff', textAlign: 'left', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <th style={{ padding: '8px 10px', borderRadius: '6px 0 0 0', width: 44 }}></th>
                    <th style={{ padding: '8px 10px', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em' }}>DESCRIPCIÓN Y ESPECIFICACIONES</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 70, fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em' }}>CANT.</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', borderRadius: '0 6px 0 0', width: 110, fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any, index: number) => {
                    const isEven = index % 2 === 0;
                    const specsList = [
                      it.medida ? `${it.medida}` : null,
                      it.material ? `${it.material}` : null,
                      it.acabado ? `${it.acabado}` : null,
                      it.descripcion ? it.descripcion.replace(/\[TERCERIZADO:[^\]]*\]/gi, '').replace(/\[.*?\]/g, '').trim() : null
                    ].filter(Boolean);

                    return (
                      <tr key={index} style={{ background: isEven ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                          {it.imagen_url ? (
                            <img
                              src={it.imagen_url}
                              alt={it.nombre}
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                            />
                          ) : (
                            <div style={{
                              width: 38, height: 38, borderRadius: 6, background: '#f1f5f9', border: '1px solid #e2e8f0',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 15
                            }}>
                              🖼️
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13.5 }}>{it.nombre}</div>
                          {specsList.length > 0 && (
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                              {specsList.join(' • ')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                          {it.cantidad}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 800, color: '#0f172a', fontSize: 13.5 }}>
                          {formatCurrency(it.subtotal || (it.cantidad * (it.precio_unitario || it.precio || 0)))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals & Notes Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Notes & Terms */}
              <div style={{ background: '#ffffff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>📌</span> Observaciones y Términos:
                </div>
                <p style={{ color: '#475569', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                  {notasLimpias || 'Los tiempos de entrega rigen a partir de la aprobación final del diseño y pago del seña/total.'}
                </p>
                <div style={{ marginTop: 10, fontSize: 10.5, color: '#94a3b8' }}>
                  ✓ Precios sujetos a modificación transcurridos los 15 días de validez.
                </div>
              </div>

              {/* Totals Breakdown Box */}
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#64748b' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{formatCurrency(pedido.subtotal)}</span>
                </div>

                {(pedido.descuento || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#dc2626' }}>
                    <span>Descuento {descPct ? `(${descPct}%)` : ''}:</span>
                    <span>-{formatCurrency(pedido.descuento || 0)}</span>
                  </div>
                )}

                {montoAdicional > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#d97706', fontWeight: 600 }}>
                    <span>Adicional ({adicPct}%):</span>
                    <span>+{formatCurrency(montoAdicional)}</span>
                  </div>
                )}

                {hasIva && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#0d9488', fontWeight: 700 }}>
                    <span>IVA (22%):</span>
                    <span>+{formatCurrency(montoIva)}</span>
                  </div>
                )}

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: '2px solid #000000', paddingTop: 8, marginTop: 8,
                  fontWeight: 900, fontSize: 16, color: '#be185d'
                }}>
                  <span>TOTAL:</span>
                  <span>{formatCurrency(pedido.total)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Multi-Color Gradient Bar */}
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'linear-gradient(90deg, #dc2626 0%, #ea580c 25%, #eab308 50%, #14b8a6 75%, #0f766e 100%)',
                width: '100%',
                marginTop: 10,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
