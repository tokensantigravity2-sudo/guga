import type { Pedido, VariableServicio } from './types';

export const LOGO_URL = '/logo-guga.png';

export const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$ 0';
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(amount);
};

export const formatDate = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const formatDateTime = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const formatTime = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('es-UY', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const getTodayStr = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateNumeroPedido = (): string => {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
  return `P-${datePart}-${randomPart}`;
};

// Índice del "]" que cierra el "[" de `start`. Cuenta corchetes anidados e ignora los que
// están dentro de strings JSON: [VARIANTES:...] guarda un JSON con sus propios "]".
const findClosingBracket = (text: string, start: number, jsonStrings = true): number => {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"' && jsonStrings) inString = true;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) return i;
  }
  // Una comilla suelta (ej: 10") no es un string JSON: reintentar contando solo corchetes
  return jsonStrings ? findClosingBracket(text, start, false) : -1;
};

const startsWithTag = (text: string, at: number, tag: string): boolean =>
  text.slice(at, at + tag.length + 2).toUpperCase() === `[${tag}:`;

// Quita etiquetas [TAG:...] completas. Sin `tags` quita todo lo que esté entre corchetes.
const stripBracketTags = (text: string, tags?: string[]): string => {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '[' && (!tags || tags.some(t => startsWithTag(text, i, t)))) {
      const end = findClosingBracket(text, i);
      if (end !== -1) {
        i = end + 1;
        continue;
      }
    }
    out += text[i++];
  }
  return out;
};

// Restos de [VARIANTES:...] que quedaron guardados como texto cuando la etiqueta se cortaba
// en el primer "]" (ej: `},{"id":"...","nombre":"...","escalas":[]}]]`)
const VARIANTES_RESIDUE = /\}(?:\s*,\s*\{(?:[^{}]|\{[^{}]*\})*\})*\s*\]\]/g;

const tidyDescription = (text: string): string =>
  text.replace(VARIANTES_RESIDUE, '').replace(/[ \t]{2,}/g, ' ').trim();

// Descripción para mostrar: sin ninguna etiqueta interna
export const cleanProductDescription = (desc?: string): string => {
  if (!desc) return '';
  return tidyDescription(stripBracketTags(desc));
};

// Descripción editable del servicio: solo quita las etiquetas que escribe el catálogo
export const stripServicioTags = (desc?: string): string => {
  if (!desc) return '';
  return tidyDescription(stripBracketTags(desc, ['VARIANTES', 'TERCERIZADO']));
};

export const parseVariantesTag = (desc?: string): VariableServicio[] => {
  const text = desc || '';
  const start = text.toUpperCase().indexOf('[VARIANTES:');
  if (start === -1) return [];
  const end = findClosingBracket(text, start);
  if (end === -1) return [];
  try {
    const parsed = JSON.parse(text.slice(start + '[VARIANTES:'.length, end));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error parsing variantes JSON', err);
    return [];
  }
};

// La tienda guarda teléfono, entrega y email también dentro de `notas`, porque la tabla pedidos
// puede no tener esas columnas. Completa desde ahí los campos que no vengan de la base.
export const completarPedidoTienda = <T extends Partial<Pedido>>(p: T): T => {
  const notas = p.notas || '';
  if (!notas.includes('[TIENDA ONLINE]')) return p;

  const tel = notas.match(/Tel:\s*([^|]+)/);
  const entrega = notas.match(/Entrega:\s*(\w+)\s*\((.*?)\)\s*(?:\||$)/);
  const email = notas.match(/Email:\s*([^|\s]+)/);
  const esEnvio = entrega?.[1].toUpperCase() === 'ENVIO';

  return {
    ...p,
    origen: p.origen || 'ecommerce',
    cliente_telefono: p.cliente_telefono || tel?.[1].trim(),
    cliente_email: p.cliente_email || email?.[1],
    cliente_direccion: p.cliente_direccion || (entrega ? (esEnvio ? entrega[2].trim() : 'Retiro en Taller') : undefined),
    metodo_entrega: p.metodo_entrega || (entrega ? (esEnvio ? 'envio' : 'retiro') : undefined),
  };
};

export const formatProductUnit = (
  srvOrNombre?: { nombre?: string; unidad?: string } | string,
  maybeUnidad?: string
): string => {
  let nombre = '';
  let unidad = '';

  if (typeof srvOrNombre === 'string') {
    nombre = srvOrNombre || '';
    unidad = maybeUnidad || '';
  } else if (srvOrNombre && typeof srvOrNombre === 'object') {
    nombre = srvOrNombre.nombre || '';
    unidad = srvOrNombre.unidad || maybeUnidad || '';
  }

  // If unit is explicitly configured and not generic, use it
  if (unidad && !['unidad', 'u', 'u.', 'unidades', ''].includes(unidad.toLowerCase().trim())) {
    return unidad;
  }

  // Detect pack/quantity from name like "- 500", "- 300", "- 100", "x 1000", "500u"
  const match = nombre.match(/[-–xX]\s*(\d+)\s*(?:u|unidades|unid)?$/i) ||
                nombre.match(/\b(\d+)\s*(?:u|unidades|unid)\b/i);

  if (match) {
    const qty = Number(match[1]);
    if (qty > 1) {
      return `${qty} u.`;
    }
  }

  return unidad || 'unidad';
};

export const getInitials = (name: string): string => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const timeAgo = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Ahora';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
};

export const CATEGORIAS_GASTO = [
  'Materiales',
  'Mantenimiento Máquinas',
  'Servicios',
  'Alquiler',
  'Marketing',
  'Personal',
  'Impuestos',
  'Otro'
];

export const CATEGORIAS_SERVICIO = [
  'Folletos',
  'Volantes',
  'Tarjetas',
  'Stickers',
  'Banners',
  'Afiches',
  'Papelería',
  'Formularios',
  'Especiales',
  'Packaging'
];

export const ESTADOS_PEDIDO = [
  { value: 'presupuesto', label: 'Presupuesto' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'en_produccion', label: 'En Producción' },
  { value: 'terminado', label: 'Terminado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' }
];

export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta_debito', label: 'Tarjeta de Débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de Crédito' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'otro', label: 'Otro' }
];

export const LINEAS_IMPRENTA = [
  'Impresión Offset',
  'Impresión Digital',
  'Laminado Mate',
  'Laminado Brillante',
  'Troquelados',
  'Gran Formato',
  'Línea Corporativa',
  'Ecológico Kraft',
  'Merchandising',
  'Alta Gama / Premium'
];

export const CATEGORIAS_TIENDA = [
  'Todas',
  'Tarjetas',
  'Folletos',
  'Facturas',
  'Stickers',
  'Imanes',
  'Afiches',
  'Banderas',
  'Block de Notas',
  'Documentos para Impresora',
  'Sobres',
  'Hojas Membretadas',
  'Llaveros',
  'Packaging'
];

export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  'Todas': '✨',
  'Tarjetas': '📇',
  'Folletos': '📄',
  'Facturas': '🧾',
  'Stickers': '🏷️',
  'Imanes': '🧲',
  'Afiches': '🖼️',
  'Banderas': '🚩',
  'Block de Notas': '📝',
  'Documentos para Impresora': '📑',
  'Sobres': '✉️',
  'Hojas Membretadas': '📜',
  'Llaveros': '🔑',
  'Packaging': '📦',
  'Grifas Etiquetas': '🏷️',
  'Almanaques': '📅',
  'Carpetas': '📁',
  'default': '🖨️'
};

export const generateNumeroEcommerce = (): string => {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
  return `ECO-${datePart}-${randomPart}`;
};

export const formatWhatsAppMessage = (
  pedidoNumero: string,
  clienteNombre: string,
  clienteTelefono: string,
  items: Array<{ nombre: string; cantidad: number; precio_unitario: number; subtotal: number }>,
  total: number,
  metodoEntrega: string,
  direccion?: string,
  metodoPago?: string,
  notas?: string
): string => {
  let msg = `🛍️ *NUEVO PEDIDO TIENDA ONLINE*\n`;
  msg += `*Pedido:* ${pedidoNumero}\n`;
  msg += `*Cliente:* ${clienteNombre}\n`;
  msg += `*Teléfono:* ${clienteTelefono}\n`;
  if (metodoEntrega === 'envio' && direccion) {
    msg += `*Entrega:* Envío a domicilio (${direccion})\n`;
  } else {
    msg += `*Entrega:* Retiro en local\n`;
  }
  if (metodoPago) {
    msg += `*Pago:* ${metodoPago}\n`;
  }
  msg += `\n📦 *DETALLE DE PRODUCTOS:*\n`;
  items.forEach((it, idx) => {
    msg += `${idx + 1}. ${it.nombre} x ${it.cantidad} = $ ${it.subtotal.toLocaleString('es-UY')}\n`;
  });
  msg += `\n💰 *TOTAL A PAGAR: $ ${total.toLocaleString('es-UY')}*\n`;
  if (notas) {
    msg += `\n📝 *Notas del cliente:* ${notas}\n`;
  }
  msg += `\n_¡Gracias por comprar en GUGA Imprenta & Gráfica!_`;
  return encodeURIComponent(msg);
};

