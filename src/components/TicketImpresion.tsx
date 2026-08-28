'use client';

import React from 'react';

export interface TicketData {
  numero: string;
  fecha: Date;
  items: { nombre: string; cantidad: number; precio?: number; precio_unitario?: number; subtotal?: number }[];
  subtotal: number;
  descuento: number;
  descuentoPorcentaje?: number;
  total: number;
  metodoPago: string;
  clienteNombre?: string;
  clienteRut?: string;
  notas?: string;
}

interface TicketImpresionProps {
  ticket: TicketData;
  onClose: () => void;
}

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  cuenta_corriente: 'Cta. Corriente'
};

export default function TicketImpresion({ ticket, onClose }: TicketImpresionProps) {
  const fmt = (n: number) => (n % 1 !== 0 ? n.toFixed(2) : n.toLocaleString('es-UY'))

  const matchAdic = (ticket.notas || '').match(/\[Adicional:\s*(\d+)%\]/)
  const adicPct = (ticket as any).adicionalPorcentaje || (matchAdic ? Number(matchAdic[1]) : 0)
  const montoAdicional = Math.round((ticket.subtotal * adicPct) / 100)

  const neto = Math.max(0, ticket.subtotal - (ticket.descuento || 0) + montoAdicional)
  const hasIva = (ticket.notas || '').includes('[+IVA 22%]') || (ticket as any).incluirIva
  const montoIva = hasIva ? Math.round(neto * 0.22 * 100) / 100 : 0

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <style>
              body {
                font-family: monospace;
                width: 58mm;
                margin: 0;
                padding: 10px;
                font-size: 12px;
                color: #000;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .separator { border-top: 1px dashed #000; margin: 10px 0; }
              .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
              .item-name { margin-bottom: 2px; }
              .total-large { font-size: 16px; font-weight: bold; text-align: right; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="center bold">GUGA IMPRENTA</div>
            <div class="center">Imprenta & Diseño</div>
            <div class="separator"></div>
            <div>Pedido: ${ticket.numero}</div>
            <div>Fecha: ${ticket.fecha.toLocaleString()}</div>
            ${ticket.clienteNombre ? `<div>Cliente: ${ticket.clienteNombre}</div>` : ''}
            ${ticket.clienteRut ? `<div class="bold">RUT: ${ticket.clienteRut}</div>` : ''}
            <div>Pago: ${METODO_LABEL[ticket.metodoPago] || ticket.metodoPago}</div>
            <div class="separator"></div>
            <div class="row bold">
              <span style="flex:2">PRODUCTO</span>
              <span style="flex:1;text-align:center">CANT</span>
              <span style="flex:1;text-align:right">TOTAL</span>
            </div>
            ${ticket.items.map(item => `
              <div class="item-name">${item.nombre}</div>
              <div class="row">
                <span style="flex:2"></span>
                <span style="flex:1;text-align:center">${item.cantidad}</span>
                <span style="flex:1;text-align:right">$${fmt(item.precio || item.precio_unitario || 0)}</span>
              </div>
            `).join('')}
            <div class="separator"></div>
            <div class="row">
              <span>Subtotal:</span>
              <span>$${fmt(ticket.subtotal)}</span>
            </div>
            ${ticket.descuento > 0 ? `
              <div class="row">
                <span>Desc. ${ticket.descuentoPorcentaje ? `(${ticket.descuentoPorcentaje}%)` : ''}:</span>
                <span>-$${fmt(ticket.descuento)}</span>
              </div>
            ` : ''}
            ${montoAdicional > 0 ? `
              <div class="row">
                <span>Adicional (${adicPct}%):</span>
                <span>+$${fmt(montoAdicional)}</span>
              </div>
            ` : ''}
            ${montoIva > 0 ? `
              <div class="row">
                <span>IVA (22%):</span>
                <span>+$${fmt(montoIva)}</span>
              </div>
            ` : ''}
            <div class="total-large">TOTAL: $${fmt(ticket.total)}</div>
            ${ticket.notas ? `
              <div class="separator"></div>
              <div>Notas: ${ticket.notas}</div>
            ` : ''}
            <div class="separator"></div>
            <div class="center">Gracias por su preferencia!</div>
            <div class="center">GUGA Imprenta</div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        fontFamily: '"Inter", sans-serif'
      }}
    >
      <div 
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#111827' }}>🖨️ ¿Imprimir Comprobante?</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>Papel 58mm · Vista previa</p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div 
            style={{
              width: '190px',
              border: '1px solid #e5e7eb',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#111827',
              backgroundColor: '#fff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>GUGA IMPRENTA</div>
            <div style={{ textAlign: 'center' }}>Imprenta & Diseño</div>
            <div style={{ borderTop: '1px dashed #d1d5db', margin: '8px 0' }}></div>
            <div>Pedido: {ticket.numero}</div>
            <div>Fecha: {ticket.fecha.toLocaleDateString()}</div>
            {ticket.clienteNombre && <div>Cliente: {ticket.clienteNombre}</div>}
            {ticket.clienteRut && <div style={{ fontWeight: 'bold' }}>RUT: {ticket.clienteRut}</div>}
            <div>Pago: {METODO_LABEL[ticket.metodoPago] || ticket.metodoPago}</div>
            <div style={{ borderTop: '1px dashed #d1d5db', margin: '8px 0' }}></div>
            <div style={{ display: 'flex', fontWeight: 'bold' }}>
              <span style={{ flex: 2 }}>PRODUCTO</span>
              <span style={{ flex: 1, textAlign: 'center' }}>CANT</span>
              <span style={{ flex: 1, textAlign: 'right' }}>TOTAL</span>
            </div>
            {ticket.items.map((item, idx) => (
              <div key={idx}>
                <div>{item.nombre}</div>
                <div style={{ display: 'flex' }}>
                  <span style={{ flex: 2 }}></span>
                  <span style={{ flex: 1, textAlign: 'center' }}>{item.cantidad}</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>${fmt(item.precio || item.precio_unitario || 0)}</span>
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed #d1d5db', margin: '8px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>${fmt(ticket.subtotal)}</span>
            </div>
            {ticket.descuento > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Desc. {ticket.descuentoPorcentaje ? `(${ticket.descuentoPorcentaje}%)` : ''}:</span>
                <span>-${fmt(ticket.descuento)}</span>
              </div>
            )}
            {montoAdicional > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706', fontWeight: 'bold' }}>
                <span>Adic. ({adicPct}%):</span>
                <span>+${fmt(montoAdicional)}</span>
              </div>
            )}
            {montoIva > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: 'bold' }}>
                <span>IVA (22%):</span>
                <span>+${fmt(montoIva)}</span>
              </div>
            )}
            <div style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'right', marginTop: '8px' }}>
              TOTAL: ${fmt(ticket.total)}
            </div>
            {ticket.notas && (
              <>
                <div style={{ borderTop: '1px dashed #d1d5db', margin: '8px 0' }}></div>
                <div>Notas: {ticket.notas}</div>
              </>
            )}
            <div style={{ borderTop: '1px dashed #d1d5db', margin: '8px 0' }}></div>
            <div style={{ textAlign: 'center' }}>Gracias por su preferencia!</div>
            <div style={{ textAlign: 'center' }}>GUGA Imprenta</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            No, omitir
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#149b8e',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
