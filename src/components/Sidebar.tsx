'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Users,
  UserCheck,
  Package,
  BarChart2,
  Wallet,
  ChevronRight,
  Printer,
  Boxes,
  Calendar as CalendarIcon,
  CheckSquare,
  Store,
  ExternalLink
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navGroups = [
    {
      title: 'Principal',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
        { name: 'Calendario', icon: CalendarIcon, href: '/calendario' },
        { name: 'Caja', icon: Wallet, href: '/caja' },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { name: 'Pedidos CRM', icon: ShoppingCart, href: '/pedidos' },
        { name: 'E-commerce', icon: Store, href: '/ecommerce', highlight: true },
        { name: 'Notas & Tareas', icon: CheckSquare, href: '/pendientes' },
        { name: 'Gastos', icon: DollarSign, href: '/gastos' },
      ],
    },
    {
      title: 'Catálogo',
      items: [
        { name: 'Servicios', icon: Printer, href: '/catalogo' },
        { name: 'Materiales', icon: Boxes, href: '/stock' },
      ],
    },
    {
      title: 'Personas',
      items: [
        { name: 'Empleados', icon: UserCheck, href: '/empleados' },
        { name: 'Clientes', icon: Users, href: '/clientes' },
        { name: 'Proveedores', icon: Package, href: '/proveedores' },
      ],
    },
    {
      title: 'Análisis',
      items: [
        { name: 'Reportes', icon: BarChart2, href: '/reportes' },
      ],
    },
  ];

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '230px',
      height: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Inter", system-ui, sans-serif',
      zIndex: 40
    }}>
      {/* Brand Header directly displaying logo.png without any box background */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img
          src="/logo.png"
          alt="GUGA PRINT"
          style={{
            maxHeight: '48px',
            maxWidth: '100%',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Navigation list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {navGroups.map((group, i) => (
          <div key={i} style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '10.5px',
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.06em',
              fontWeight: 700,
              marginBottom: '6px',
              paddingLeft: '10px'
            }}>
              {group.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {group.items.map((item, j) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link 
                    key={j} 
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: isActive ? '#149b8e' : '#0f172a',
                      backgroundColor: isActive ? 'rgba(20, 155, 142, 0.1)' : 'transparent',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13.5px',
                      transition: 'all 0.15s ease',
                      borderLeft: isActive ? '3px solid #149b8e' : '3px solid transparent',
                    }}
                  >
                    <Icon size={17} style={{ marginRight: '10px', color: isActive ? '#149b8e' : '#475569' }} />
                    <span style={{ flex: 1 }}>{item.name}</span>
                    {isActive && <ChevronRight size={14} style={{ color: '#149b8e' }} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick link to Storefront */}
      <div style={{ padding: '0 12px 12px 12px' }}>
        <a
          href="/tienda"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #e53935 0%, #f97316 100%)',
            color: '#ffffff',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '12.5px',
            fontWeight: '700',
            boxShadow: '0 2px 8px rgba(229, 57, 53, 0.25)',
            transition: 'opacity 0.2s',
          }}
        >
          <Store size={15} />
          <span>Ver Tienda Online</span>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center',
        fontSize: '11px',
        color: '#94a3b8',
        backgroundColor: '#ffffff'
      }}>
        GUGA CRM v1.0
      </div>
    </aside>
  );
}

