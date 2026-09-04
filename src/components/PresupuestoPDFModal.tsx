'use client';

import React, { useState, useEffect } from 'react';
import { Pedido, Cliente } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { Download, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// High resolution fallback product images for graphic/printing categories
const CATEGORY_IMAGES_FALLBACK: Record<string, string> = {
  'tarjetas': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
  'folletos': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
  'volantes': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
  'facturas': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&auto=format&fit=crop&q=80',
  'talonarios': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&auto=format&fit=crop&q=80',
  'recibos': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&auto=format&fit=crop&q=80',
  'stickers': 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=400&auto=format&fit=crop&q=80',
  'etiquetas': 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=400&auto=format&fit=crop&q=80',
  'vinilos': 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=400&auto=format&fit=crop&q=80',
  'imanes': 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80',
  'afiches': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&auto=format&fit=crop&q=80',
  'posters': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&auto=format&fit=crop&q=80',
  'banderas': 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400&auto=format&fit=crop&q=80',
  'banners': 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400&auto=format&fit=crop&q=80',
  'roll up': 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400&auto=format&fit=crop&q=80',
  'block': 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&auto=format&fit=crop&q=80',
  'cuadernos': 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&auto=format&fit=crop&q=80',
  'sobres': 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=400&auto=format&fit=crop&q=80',
  'hojas': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80',
  'llaveros': 'https://images.unsplash.com/photo-1614312134515-585973e44502?w=400&auto=format&fit=crop&q=80',
  'cajas': 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&auto=format&fit=crop&q=80',
  'packaging': 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&auto=format&fit=crop&q=80',
  'remeras': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80',
  'tazas': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
  'carpetas': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80',
  'almanaques': 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&auto=format&fit=crop&q=80',
  'calendarios': 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&auto=format&fit=crop&q=80',
  'bolsas': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80',
  'sellos': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80',
  'default': 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80'
};

interface PresupuestoPDFModalProps {
  pedido: Pedido;
  cliente?: Cliente | null;
  onClose: () => void;
}

export default function PresupuestoPDFModal({ pedido, cliente, onClose }: PresupuestoPDFModalProps) {
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  const [serviciosMap, setServiciosMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('servicios')
          .select('id, nombre, categoria, imagen_url, descripcion, tiempo_estimado')
          .limit(500);

        if (!error && data) {
          const map: Record<string, any> = {};
          data.forEach((srv: any) => {
            map[srv.id] = srv;
            if (srv.nombre) {
              map[srv.nombre.toLowerCase().trim()] = srv;
            }
          });
          setServiciosMap(map);
        }
      } catch (e) {
        console.error('Error cargando servicios para PDF:', e);
      }
    };
    fetchServices();
  }, []);

  // Helper to find matching service in catalog
  const findServiceForItem = (it: any) => {
    const srvId = it.producto_id || it.servicio_id;
    if (srvId && serviciosMap[srvId]) return serviciosMap[srvId];

    const rawName = (it.nombre || '').toLowerCase().trim();
    if (serviciosMap[rawName]) return serviciosMap[rawName];

    if (rawName.length > 3) {
      const allSrvs = Object.values(serviciosMap);
      const match = allSrvs.find((s: any) => {
        if (!s?.nombre) return false;
        const sName = s.nombre.toLowerCase().trim();
        return sName === rawName || sName.startsWith(rawName) || rawName.startsWith(sName);
      });
      if (match) return match;
    }

    return null;
  };

  // Helper to extract clean description, specs, and details
  const getItemDetails = (it: any) => {
    const matchedService = findServiceForItem(it);

    // 1. Limpiar descripción técnica del servicio si existe
    const cleanSrvDesc = (matchedService?.descripcion || '')
      .replace(/\[TERCERIZADO:[^\]]*\]/gi, '')
      .replace(/\[COBRADO:[^\]]*\]/gi, '')
      .replace(/\[STOCK:[^\]]*\]/gi, '')
      .replace(/\[Desc:[^\]]*\]/gi, '')
      .replace(/\[Adicional:[^\]]*\]/gi, '')
      .replace(/\[\+IVA[^\]]*\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    // 2. Limpiar descripción o detalles guardados en el ítem
    const rawItemDesc = (it.descripcion || it.detalles || '')
      .replace(/\[TERCERIZADO:[^\]]*\]/gi, '')
      .replace(/\[COBRADO:[^\]]*\]/gi, '')
      .replace(/\[STOCK:[^\]]*\]/gi, '')
      .replace(/\[Desc:[^\]]*\]/gi, '')
      .replace(/\[Adicional:[^\]]*\]/gi, '')
      .replace(/\[\+IVA[^\]]*\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    // Determinar descripción final
    let descripcionFinal = rawItemDesc;
    if (!descripcionFinal) {
      descripcionFinal = cleanSrvDesc;
    } else if (cleanSrvDesc && cleanSrvDesc !== rawItemDesc && !cleanSrvDesc.includes(rawItemDesc)) {
      descripcionFinal = `${cleanSrvDesc}\n• ${rawItemDesc}`;
    }

    const medida = (it.medida || '').trim();
    const material = (it.material || '').trim();
    const acabado = (it.acabado || '').trim();
    const tiempoEstimado = (matchedService?.tiempo_estimado || '').trim();

    return {
      descripcion: descripcionFinal,
      medida,
      material,
      acabado,
      tiempoEstimado,
      matchedService
    };
  };

  // Helper to dynamically resolve product photo
  const getItemProductImage = (it: any): string => {
    // 1. Direct item imagen_url
    if (it.imagen_url && typeof it.imagen_url === 'string' && it.imagen_url.trim().length > 5) {
      return it.imagen_url.trim();
    }

    // 2. Direct lookup by service
    const srv = findServiceForItem(it);
    if (srv?.imagen_url) {
      return srv.imagen_url;
    }

    // 3. Match keywords against category fallback images
    const normalizedName = (it.nombre || '').toLowerCase().trim();
    for (const [key, url] of Object.entries(CATEGORY_IMAGES_FALLBACK)) {
      if (normalizedName.includes(key)) {
        return url;
      }
    }

    return CATEGORY_IMAGES_FALLBACK['default'];
  };

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
                display: block !important;
                max-width: 100% !important;
              }
              .pdf-page {
                page-break-after: always !important;
                break-after: page !important;
                box-sizing: border-box !important;
                padding: 28px 34px !important;
                background: #ffffff !important;
                margin-bottom: 0 !important;
              }
              .pdf-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .page-separator {
                display: none !important;
              }
            </style>
          </head>
          <body>
            ${printElement.innerHTML}
          </body>
        </html>
      `);
      doc.close();

      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) return;

      const imgs = Array.from(iframeWindow.document.images);
      let isPrinted = false;

      const executePrint = () => {
        if (isPrinted) return;
        isPrinted = true;
        iframeWindow.focus();
        iframeWindow.print();
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 1000);
      };

      if (imgs.length === 0) {
        setTimeout(executePrint, 200);
      } else {
        let loaded = 0;
        const onImgLoad = () => {
          loaded++;
          if (loaded >= imgs.length) {
            setTimeout(executePrint, 150);
          }
        };

        imgs.forEach((img) => {
          if (img.complete) {
            loaded++;
          } else {
            img.onload = onImgLoad;
            img.onerror = onImgLoad;
          }
        });

        if (loaded >= imgs.length) {
          setTimeout(executePrint, 250);
        } else {
          setTimeout(executePrint, 2000);
        }
      }
    }
  };

  // 1. Extraer tags financieros
  const descMatch = (pedido.notas || '').match(/\[Desc:\s*(\d+)%\]/);
  const descPct = pedido.descuento_porcentaje || (descMatch ? Number(descMatch[1]) : 0);

  const adicMatch = (pedido.notas || '').match(/\[Adicional:\s*(\d+)%\]/);
  const adicPct = adicMatch ? Number(adicMatch[1]) : 0;

  const hasIva = (pedido.notas || '').includes('[+IVA 22%]');

  // 2. Extraer datos de contacto guardados en las notas
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
  const [modoAlternativas, setModoAlternativas] = useState(isPresupuesto && items.length > 1);

  // Renderizar una página (hoja) completa
  const renderSheetContent = (sheetItems: any[], optionIndex?: number, totalOptions?: number) => {
    const isSingleOption = optionIndex !== undefined && totalOptions !== undefined && totalOptions > 1;
    const optionLetter = isSingleOption ? String.fromCharCode(65 + optionIndex) : '';

    let sheetSubtotal = 0;
    sheetItems.forEach((it: any) => {
      sheetSubtotal += it.subtotal || ((it.cantidad || 1) * (it.precio_unitario || it.precio || 0));
    });

    const sheetDesc = descPct > 0 ? Math.round((sheetSubtotal * descPct) / 100) : 0;
    const sheetAdic = adicPct > 0 ? Math.round((sheetSubtotal * adicPct) / 100) : 0;
    const sheetNeto = Math.max(0, sheetSubtotal - sheetDesc + sheetAdic);
    const sheetIva = hasIva ? Math.round(sheetNeto * 0.22 * 100) / 100 : 0;
    const sheetTotal = sheetNeto + sheetIva;

    return (
      <div>
        {/* Document Header Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/logo.png"
              alt="GUGA IMPRENTA & GRÁFICA"
              style={{ height: 82, maxWidth: 290, objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

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

          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 6,
              background: isSingleOption ? 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)' : (isPresupuesto ? '#fdf2f8' : '#f0fdf4'),
              color: isSingleOption ? '#be185d' : (isPresupuesto ? '#be185d' : '#15803d'),
              border: isSingleOption ? '1.5px solid #f472b6' : 'none',
              fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', marginBottom: 4,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}>
              {isSingleOption ? `PRESUPUESTO — OPCIÓN ${optionLetter}` : (isPresupuesto ? 'PRESUPUESTO' : 'ORDEN DE TRABAJO')}
            </div>
            {isSingleOption && (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#be185d', marginBottom: 2 }}>
                Alternativa {optionIndex + 1} de {totalOptions} a elección
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
              #{pedido.numero}{isSingleOption ? `-${optionLetter}` : ''}
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              Fecha: <strong>{formatDate(pedido.created_at || new Date())}</strong>
            </div>
          </div>
        </div>

        {/* Client & Metadata Box */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20,
          background: '#f8fafc', padding: '16px 20px', borderRadius: 10,
          border: '1px solid #e2e8f0', marginBottom: 20, fontSize: 12.5
        }}>
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
              <strong style={{ color: '#0f172a' }}>Modalidad:</strong> {isSingleOption ? <strong style={{ color: '#be185d' }}>Opción {optionLetter} ({sheetItems[0]?.cantidad} u.)</strong> : <span style={{ textTransform: 'uppercase' }}>{pedido.estado || 'PRESUPUESTO'}</span>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#000000', color: '#ffffff', textAlign: 'left', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <th style={{ padding: '9px 10px', borderRadius: '6px 0 0 0', width: 56 }}></th>
                <th style={{ padding: '9px 10px', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em' }}>DESCRIPCIÓN Y ESPECIFICACIONES TÉCNICAS</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: 70, fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em' }}>CANT.</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', width: 95, fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em' }}>P. UNIT.</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', borderRadius: '0 6px 0 0', width: 110, fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {sheetItems.map((it: any, index: number) => {
                const isEven = index % 2 === 0;
                const details = getItemDetails(it);
                const productImg = getItemProductImage(it);
                const itemTot = it.subtotal || (it.cantidad * (it.precio_unitario || it.precio || 0));
                const unitPrice = it.cantidad > 0 ? (itemTot / it.cantidad) : (it.precio_unitario || 0);

                const hasBadges = details.medida || details.material || details.acabado || details.tiempoEstimado;

                return (
                  <tr key={index} style={{ background: isEven ? '#ffffff' : '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top', width: 56 }}>
                      <img
                        src={productImg}
                        alt={it.nombre || 'Producto'}
                        crossOrigin="anonymous"
                        style={{
                          width: 48,
                          height: 48,
                          minWidth: 48,
                          minHeight: 48,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          display: 'block'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 10px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14, lineHeight: 1.25, marginBottom: details.descripcion || hasBadges ? 5 : 0 }}>
                        {isSingleOption && <span style={{ color: '#be185d', marginRight: 6 }}>[Opción {optionLetter}]</span>}
                        {it.nombre}
                      </div>

                      {/* Descripción detallada del producto */}
                      {details.descripcion && (
                        <div style={{
                          fontSize: 12,
                          color: '#334155',
                          lineHeight: 1.45,
                          marginBottom: hasBadges ? 7 : 0,
                          whiteSpace: 'pre-line'
                        }}>
                          {details.descripcion}
                        </div>
                      )}

                      {/* Ficha técnica estructurada: Badges de especificaciones */}
                      {hasBadges && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {details.medida && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: '#f1f5f9', border: '1px solid #cbd5e1',
                              padding: '2px 8px', borderRadius: 4,
                              fontSize: 11, fontWeight: 600, color: '#1e293b',
                              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                            }}>
                              <span style={{ color: '#0f766e', fontWeight: 800 }}>📏 Formato:</span> {details.medida}
                            </span>
                          )}
                          {details.material && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: '#f1f5f9', border: '1px solid #cbd5e1',
                              padding: '2px 8px', borderRadius: 4,
                              fontSize: 11, fontWeight: 600, color: '#1e293b',
                              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                            }}>
                              <span style={{ color: '#0f766e', fontWeight: 800 }}>📄 Papel/Material:</span> {details.material}
                            </span>
                          )}
                          {details.acabado && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: '#f1f5f9', border: '1px solid #cbd5e1',
                              padding: '2px 8px', borderRadius: 4,
                              fontSize: 11, fontWeight: 600, color: '#1e293b',
                              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                            }}>
                              <span style={{ color: '#0f766e', fontWeight: 800 }}>✨ Terminación:</span> {details.acabado}
                            </span>
                          )}
                          {details.tiempoEstimado && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: '#f8fafc', border: '1px solid #e2e8f0',
                              padding: '2px 8px', borderRadius: 4,
                              fontSize: 11, fontWeight: 500, color: '#475569',
                              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
                            }}>
                              <span style={{ color: '#64748b', fontWeight: 700 }}>⏱️ Entrega estimada:</span> {details.tiempoEstimado}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', verticalAlign: 'top', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      {it.cantidad}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', verticalAlign: 'top', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      {formatCurrency(unitPrice)}
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'right', verticalAlign: 'top', fontWeight: 800, color: '#0f172a', fontSize: 13.5 }}>
                      {formatCurrency(itemTot)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Notes Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 20 }}>
          <div style={{ background: '#ffffff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>📌</span> Observaciones y Términos:
            </div>
            {isSingleOption && (
              <div style={{ background: 'rgba(190, 24, 93, 0.06)', border: '1px solid rgba(190, 24, 93, 0.25)', padding: '8px 12px', borderRadius: 6, marginBottom: 8, color: '#9d174d', fontSize: 11.5, fontWeight: 700 }}>
                💡 <strong>Opción {optionLetter}:</strong> Cotización correspondiente a <strong>{sheetItems[0]?.cantidad} unidades</strong> ({formatCurrency(sheetItems[0]?.precio_unitario || (sheetItems[0]?.subtotal / sheetItems[0]?.cantidad) || 0)} c/u). Opciones alternativas a elección del cliente.
              </div>
            )}
            <p style={{ color: '#475569', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
              {notasLimpias || 'Los tiempos de entrega rigen a partir de la aprobación final del diseño y pago del seña/total.'}
            </p>
            <div style={{ marginTop: 10, fontSize: 10.5, color: '#94a3b8' }}>
              ✓ Precios sujetos a modificación transcurridos los 15 días de validez.
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#64748b' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>{formatCurrency(sheetSubtotal)}</span>
            </div>

            {sheetDesc > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#dc2626' }}>
                <span>Descuento {descPct ? `(${descPct}%)` : ''}:</span>
                <span>-{formatCurrency(sheetDesc)}</span>
              </div>
            )}

            {sheetAdic > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#d97706', fontWeight: 600 }}>
                <span>Adicional ({adicPct}%):</span>
                <span>+{formatCurrency(sheetAdic)}</span>
              </div>
            )}

            {hasIva && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#0d9488', fontWeight: 700 }}>
                <span>IVA (22%):</span>
                <span>+{formatCurrency(sheetIva)}</span>
              </div>
            )}

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderTop: '2px solid #000000', paddingTop: 8, marginTop: 8,
              fontWeight: 900, fontSize: 16, color: isSingleOption ? '#be185d' : '#0f766e'
            }}>
              <span>{isSingleOption ? `TOTAL OPCIÓN ${optionLetter}:` : 'TOTAL FINAL:'}</span>
              <span>{formatCurrency(sheetTotal)}</span>
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
    );
  };

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
            padding: '14px 20px',
            background: '#ffffff',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              📄 {isPresupuesto ? 'Presupuesto PDF Formal' : 'Comprobante de Pedido PDF'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              #{pedido.numero} • {clienteNombreFinal} {items.length > 1 && `(${items.length} alternativas/ítems)`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Toggle de formato: 2 Páginas separadas vs 1 Página combinada */}
            {items.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '3px 6px', borderRadius: 8 }}>
                <button
                  type="button"
                  className={`btn btn-xs ${modoAlternativas ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setModoAlternativas(true)}
                  style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px' }}
                  title="Generar 1 página independiente para cada alternativa (50 u. en pág 1, 100 u. en pág 2) sin sumar totales"
                >
                  📄 {items.length} Páginas ({items.length} Opciones)
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${!modoAlternativas ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setModoAlternativas(false)}
                  style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px' }}
                  title="Combinar todos los ítems en 1 página sumando el total"
                >
                  📋 1 Pág. (Combinado)
                </button>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handlePrintPDF}
              style={{ gap: 6, fontWeight: 700, padding: '6px 14px' }}
            >
              <Download size={15} /> Descargar / Imprimir PDF
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PDF A4 Document Body */}
        <div style={{ overflowY: 'auto', padding: 24, flex: 1, background: '#f1f5f9' }}>
          <div id="presupuesto-pdf-container">
            {modoAlternativas && items.length > 1 ? (
              // Modo Alternativas: 1 hoja A4 por cada opción (Pág 1: Opción A, Pág 2: Opción B)
              items.map((it: any, idx: number) => (
                <React.Fragment key={idx}>
                  <div
                    className="pdf-page"
                    style={{
                      background: '#ffffff',
                      borderRadius: 12,
                      padding: '36px 40px',
                      color: '#0f172a',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                      margin: '0 auto 24px auto',
                      maxWidth: 780
                    }}
                  >
                    {renderSheetContent([it], idx, items.length)}
                  </div>

                  {idx < items.length - 1 && (
                    <div
                      className="page-separator"
                      style={{
                        maxWidth: 780,
                        margin: '0 auto 24px auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        padding: '6px 0'
                      }}
                    >
                      <div style={{ position: 'absolute', left: 0, right: 0, height: 1, borderTop: '2px dashed #94a3b8' }} />
                      <span style={{
                        position: 'relative',
                        background: '#e2e8f0',
                        color: '#334155',
                        padding: '4px 14px',
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: 700,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                      }}>
                        📄 Salto de Página PDF • Siguiente: Página {idx + 2} (Opción {String.fromCharCode(65 + idx + 1)} - {items[idx + 1]?.cantidad} u.)
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))
            ) : (
              // Modo Estándar: Todos los ítems en una sola hoja
              <div
                className="pdf-page"
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
                {renderSheetContent(items)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
