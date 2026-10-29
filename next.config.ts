import type { NextConfig } from "next";

// Secciones del CRM que antes estaban en la raíz y ahora viven en /panel
const SECCIONES_PANEL = 'caja|calendario|catalogo|clientes|empleados|gastos|pedidos|pendientes|proveedores|reportes|stock';

const nextConfig: NextConfig = {
  async rewrites() {
    // La página principal del dominio es la web institucional (public/inicio.html)
    return [{ source: '/', destination: '/inicio.html' }];
  },
  async redirects() {
    return [
      // Links viejos de la tienda
      { source: '/tienda', destination: '/ecommerce', permanent: false },
      { source: '/tienda/:path*', destination: '/ecommerce/:path*', permanent: false },
      { source: '/ecomerce', destination: '/ecommerce', permanent: false },
      { source: '/ecomerce/:path*', destination: '/ecommerce/:path*', permanent: false },
      // Links viejos del CRM
      { source: `/:seccion(${SECCIONES_PANEL})`, destination: '/panel/:seccion', permanent: false },
      { source: `/:seccion(${SECCIONES_PANEL})/:path*`, destination: '/panel/:seccion/:path*', permanent: false },
    ];
  },
};

export default nextConfig;
