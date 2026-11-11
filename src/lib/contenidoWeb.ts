// Contenido de la web de inicio (gugaprint.uy/). Todo se edita desde Panel → Página web
// y se guarda en la tabla `configuracion` (clave "web"). Estos son los valores por defecto.

export const ICONOS_SERVICIO: Record<string, string> = {
  tarjeta: 'Tarjeta',
  folleto: 'Folleto',
  talonario: 'Talonario',
  etiqueta: 'Etiqueta',
  imagen: 'Imagen / banner',
  caja: 'Caja / packaging',
  sobre: 'Sobre',
  paleta: 'Paleta / diseño',
}

const foto = (id: string, ancho = 600) => `https://images.unsplash.com/photo-${id}?w=${ancho}&auto=format&fit=crop&q=80`

export const CONTENIDO_WEB = {
  general: {
    tituloPagina: 'GUGA Print · Imprenta & Soluciones Gráficas en Maldonado',
    descripcion: 'Imprenta y soluciones gráficas en Maldonado: tarjetas, folletos, talonarios, stickers, banners, packaging y diseño. Pedí online o escribinos por WhatsApp.',
    logo: '/logo-guga.png',
  },
  contacto: {
    whatsapp: '59899724454',
    whatsappVisible: '099 724 454',
    mensaje: 'Hola GUGA, quiero hacer una consulta',
    direccion: 'Chiossi y Luxemburgo',
    ciudad: 'Maldonado',
    busquedaMapa: 'Chiossi y Luxemburgo, Maldonado, Uruguay',
  },
  menu: {
    nosotros: 'Nosotros',
    servicios: 'Servicios',
    comoPedir: 'Cómo pedir',
    ubicacion: 'Ubicación',
    tienda: 'Ir a la tienda',
  },
  portada: {
    titulo1: 'Tu imprenta',
    titulo2: 'de confianza,',
    titulo3: 'de la idea al impreso',
    bajada: 'Fabricamos tarjetas, folletos, talonarios, stickers, banners y etiquetas con la mayor calidad gráfica. Elegí tu producto en la tienda online o escribinos y te asesoramos.',
    botonTienda: 'Ir a la tienda',
    botonWhatsapp: 'Escribinos por WhatsApp',
    chip1Titulo: 'Pedidos por WhatsApp',
    chip1Texto: 'Te asesoramos al instante',
    chip2Titulo: 'Retiro o envío',
    chip2Texto: 'En Maldonado',
  },
  cinta: ['Tarjetas', 'Folletos', 'Talonarios', 'Stickers', 'Banners', 'Packaging', 'Papelería', 'Diseño'],
  nosotros: {
    antetitulo: 'Quiénes somos',
    titulo: 'Una imprenta cerca tuyo, en Maldonado',
    parrafo1: 'En GUGA Print somos una imprenta y estudio de soluciones gráficas. Acompañamos a emprendedores, comercios y empresas para que su marca se vea bien en cada impreso: desde una tarjeta personal hasta un banner o el packaging de sus productos.',
    parrafo2: 'Te asesoramos en papel, formato y terminaciones, y nos ocupamos de que el trabajo llegue a tiempo.',
    foto: foto('1563986768609-322da13575f3', 1000),
    datos: [
      { titulo: 'Impresión digital y offset', texto: 'Tiradas chicas y grandes' },
      { titulo: 'Terminaciones', texto: 'Laminado mate, brillo y troquelado' },
      { titulo: 'Diseño', texto: 'Te ayudamos a preparar tu archivo' },
      { titulo: 'Retiro o envío', texto: 'Como te quede más cómodo' },
    ],
  },
  servicios: {
    antetitulo: 'Qué ofrecemos',
    titulo: 'Todo lo que tu negocio necesita imprimir',
    texto: 'Elegí el producto, la terminación y la cantidad en nuestra tienda online.',
    items: [
      { titulo: 'Tarjetas personales', texto: 'Simple o doble faz, con laminado y distintos papeles.', foto: foto('1589829545856-d10d557cf95f'), icono: 'tarjeta' },
      { titulo: 'Folletos y volantes', texto: 'Para promociones, menús y lanzamientos.', foto: foto('1544716278-ca5e3f4abd8c'), icono: 'folleto' },
      { titulo: 'Talonarios y facturas', texto: 'Recibos, órdenes y formularios a medida.', foto: foto('1450133064473-71024230f91b'), icono: 'talonario' },
      { titulo: 'Stickers y etiquetas', texto: 'Para tus productos, envíos y packaging.', foto: foto('1572375992501-4b0892d50c69'), icono: 'etiqueta' },
      { titulo: 'Banners y afiches', texto: 'Gran formato, banderas y cartelería.', foto: foto('1526778548025-fa2f459cd5c1'), icono: 'imagen' },
      { titulo: 'Packaging', texto: 'Cajas y envoltorios con tu marca.', foto: foto('1530587191325-3db32d826c18'), icono: 'caja' },
      { titulo: 'Papelería corporativa', texto: 'Hojas membretadas, sobres y carpetas.', foto: foto('1596526131083-e8c633c948d2'), icono: 'sobre' },
      { titulo: 'Diseño gráfico', texto: 'Armamos o ajustamos tu diseño para imprimir.', foto: foto('1561070791-2526d30994b5'), icono: 'paleta' },
    ],
  },
  pasos: {
    antetitulo: 'Cómo pedir',
    titulo: 'En tres pasos tenés tu trabajo listo',
    items: [
      { titulo: 'Elegí tu producto', texto: 'Entrá a la tienda, elegí la opción y la cantidad que necesitás.' },
      { titulo: 'Confirmá tu pedido', texto: 'Te contactamos por WhatsApp para coordinar el diseño y el pago.' },
      { titulo: 'Retiralo o recibilo', texto: 'Pasá por el taller en Maldonado o te lo enviamos.' },
    ],
  },
  ubicacion: {
    antetitulo: 'Ubicación',
    titulo: 'Visitanos en Maldonado',
    texto: 'Maldonado, Uruguay. Coordiná el retiro de tu pedido por WhatsApp.',
    botonMapa: 'Cómo llegar',
    botonWhatsapp: 'Coordinar retiro',
    mensajeWhatsapp: 'Hola GUGA, quiero coordinar un retiro',
  },
  llamado: {
    titulo: '¿Listo para tu próximo impreso?',
    texto: 'Mirá los productos y precios en la tienda, o consultanos lo que necesites.',
    botonTienda: 'Ir a la tienda',
    botonWhatsapp: 'WhatsApp',
  },
  pie: {
    enlaceTienda: 'Tienda online',
  },
}

export type ContenidoWeb = typeof CONTENIDO_WEB

// Completa lo guardado con los valores por defecto (por si faltan campos nuevos)
export const combinarContenidoWeb = (guardado: unknown): ContenidoWeb => {
  const g = (guardado && typeof guardado === 'object' ? guardado : {}) as Record<string, any>
  const resultado: Record<string, any> = {}
  for (const [clave, defecto] of Object.entries(CONTENIDO_WEB)) {
    const valor = g[clave]
    if (Array.isArray(defecto)) resultado[clave] = Array.isArray(valor) ? valor : defecto
    else resultado[clave] = { ...defecto, ...(valor && typeof valor === 'object' ? valor : {}) }
  }
  return resultado as ContenidoWeb
}
