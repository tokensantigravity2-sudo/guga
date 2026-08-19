'use client'
import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = sessionStorage.getItem('guga_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === '1234') {
      sessionStorage.setItem('guga_auth', 'true')
      setIsAuthenticated(true)
      toast.success('Sesión iniciada correctamente')
    } else {
      toast.error('Contraseña incorrecta')
      setPassword('')
    }
  }

  if (loading) return null
  if (isAuthenticated) return <>{children}</>

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f8fafc',
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        padding: '40px 36px',
        borderRadius: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* GUGA PRINT LOGO */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="GUGA PRINT"
            style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>

        <p style={{ margin: '0 0 28px 0', color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
          Ingresá la contraseña del sistema para continuar
        </p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: '48px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                color: '#94a3b8',
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #149b8e 0%, #f59e0b 50%, #f97316 100%)',
              color: 'white',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(20, 155, 142, 0.2)',
              transition: 'opacity 0.2s',
            }}
          >
            Ingresar al Panel
          </button>
        </form>
      </div>

      <p style={{ marginTop: '24px', color: '#94a3b8', fontSize: '12px' }}>
        GUGA Imprenta & Diseño · Panel de Control
      </p>
    </div>
  )
}
