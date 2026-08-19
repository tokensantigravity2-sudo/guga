'use client'
import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }
    const formatted = date.toLocaleDateString('es-UY', options)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      height: '62px',
      padding: '0 28px',
      background: 'var(--bg-card, #ffffff)',
      borderBottom: '1px solid var(--border, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
          {title}
        </h1>
        {subtitle && (
          <span style={{ fontSize: '13.5px', color: 'var(--text-secondary, #64748b)' }}>
            {subtitle}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary, #64748b)', fontSize: '13.5px' }}>
        <span>{time ? formatDate(time) : ''}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-main, #f8fafc)', padding: '6px 12px', borderRadius: '20px' }}>
          <Clock size={14} />
          <span style={{ fontWeight: 500 }}>{time ? formatTime(time) : ''}</span>
        </div>
      </div>
    </header>
  )
}
