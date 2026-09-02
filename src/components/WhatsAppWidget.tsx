'use client'

import { useState, useEffect, useRef } from 'react'
import WhatsAppIcon from '@/components/WhatsAppIcon'

interface WhatsAppWidgetProps {
  phone?: string
  defaultMessage?: string
}

export default function WhatsAppWidget({
  phone = '59899123456',
  defaultMessage = '¡Hola GUGA Imprenta! 👋 Necesito ayuda con un pedido / presupuesto.'
}: WhatsAppWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVibrating, setIsVibrating] = useState(false)
  const isHoveredRef = useRef(false)

  // Auto-expand every 10 seconds with vibration and auto-close after 4.5s
  useEffect(() => {
    // Initial cycle after 2 seconds
    const initialTimer = setTimeout(() => {
      triggerCycle()
    }, 2000)

    // Periodic 10-second interval cycle
    const interval = setInterval(() => {
      triggerCycle()
    }, 10000)

    function triggerCycle() {
      // 1. Vibrate logo
      setIsVibrating(true)
      setTimeout(() => setIsVibrating(false), 900)

      // 2. Expand button
      setIsExpanded(true)

      // 3. Auto-close after 4.5s if not hovered
      setTimeout(() => {
        if (!isHoveredRef.current) {
          setIsExpanded(false)
        }
      }, 4500)
    }

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(defaultMessage)}`

  return (
    <>
      {/* CSS Animation Keyframes for Vibration and Pulse */}
      <style jsx global>{`
        @keyframes wppVibrate {
          0% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(-14deg) scale(1.15); }
          30% { transform: rotate(14deg) scale(1.15); }
          45% { transform: rotate(-10deg) scale(1.1); }
          60% { transform: rotate(10deg) scale(1.1); }
          75% { transform: rotate(-5deg) scale(1.05); }
          90% { transform: rotate(5deg) scale(1.05); }
          100% { transform: rotate(0deg) scale(1); }
        }

        @keyframes wppPulseRing {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>

      <div
        onMouseEnter={() => {
          isHoveredRef.current = true
          setIsExpanded(true)
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false
        }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-inter), system-ui, sans-serif'
        }}
      >
        {/* Pulsing ring when vibrating */}
        {isVibrating && (
          <div style={{
            position: 'absolute',
            inset: '-5px',
            borderRadius: '999px',
            border: '3px solid #25d366',
            animation: 'wppPulseRing 0.9s cubic-bezier(0.24, 0, 0.38, 1) infinite',
            pointerEvents: 'none'
          }} />
        )}

        {/* Direct WhatsApp Link Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            height: '56px',
            backgroundColor: '#25d366',
            borderRadius: '999px',
            boxShadow: '0 4px 20px rgba(37, 211, 102, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            textDecoration: 'none',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            width: isExpanded ? 'auto' : '56px',
            minWidth: '56px',
            padding: isExpanded ? '0 20px 0 16px' : '0',
            userSelect: 'none',
            cursor: 'pointer'
          }}
          title="Abrir chat en WhatsApp"
        >
          {/* Official WhatsApp Logo Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            flexShrink: 0,
            animation: isVibrating ? 'wppVibrate 0.85s ease-in-out' : 'none'
          }}>
            <WhatsAppIcon size={28} color="#ffffff" />
          </div>

          {/* Text when expanded */}
          {isExpanded && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              lineHeight: 1.2,
              marginLeft: '10px',
              whiteSpace: 'nowrap',
              color: '#ffffff',
              animation: 'fadeIn 0.25s ease'
            }}>
              <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
                ¿Necesitas ayuda?
              </span>
              <span style={{ fontSize: '11px', opacity: 0.92, fontWeight: 600 }}>
                Chatea con nosotros 👋
              </span>
            </div>
          )}
        </a>
      </div>
    </>
  )
}
