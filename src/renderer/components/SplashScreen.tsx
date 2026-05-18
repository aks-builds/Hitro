import React, { useEffect, useRef, useState } from 'react'

const PROTOCOLS = [
  { label: 'REST',      color: '#6366F1' },
  { label: 'gRPC',      color: '#7C3AED' },
  { label: 'GraphQL',   color: '#DB2777' },
  { label: 'WebSocket', color: '#059669' },
  { label: 'Kafka',     color: '#B45309' },
  { label: 'SQS',       color: '#EA580C' },
  { label: 'MQTT',      color: '#0891B2' },
  { label: 'SSE',       color: '#16A34A' },
  { label: 'Socket.IO', color: '#C026D3' },
]

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [logoVisible,  setLogoVisible]  = useState(false)
  const [nameVisible,  setNameVisible]  = useState(false)
  const [badgeCount,   setBadgeCount]   = useState(0)
  const [progress,     setProgress]     = useState(0)
  const [exiting,      setExiting]      = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const t0 = setTimeout(() => setLogoVisible(true),  120)
    const t1 = setTimeout(() => setNameVisible(true),  600)

    let count = 0
    const badgeStart = setTimeout(() => {
      const iv = setInterval(() => {
        count++
        setBadgeCount(count)
        if (count >= PROTOCOLS.length) clearInterval(iv)
      }, 75)
      return () => clearInterval(iv)
    }, 950)

    let prog = 0
    const progIv = setInterval(() => {
      prog += 1.8
      setProgress(Math.min(Math.round(prog), 100))
      if (prog >= 100) clearInterval(progIv)
    }, 28)

    const t2 = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDoneRef.current(), 480)
    }, 2350)

    return () => {
      clearTimeout(t0); clearTimeout(t1)
      clearTimeout(badgeStart); clearTimeout(t2)
      clearInterval(progIv)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0A0C12 0%, #10101E 50%, #0A0C12 100%)',
      opacity: exiting ? 0 : 1,
      transition: 'opacity 0.48s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: exiting ? 'none' : 'all',
      userSelect: 'none',
    }}>

      {/* Ambient glow behind logo */}
      <div style={{
        position: 'absolute',
        width: 320, height: 320,
        background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
        transition: 'opacity 0.6s',
        opacity: logoVisible ? 1 : 0,
      }} />

      {/* Logo */}
      <div style={{
        width: 80, height: 80, borderRadius: 22, position: 'relative', zIndex: 1,
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #38BDF8 100%)',
        boxShadow: '0 16px 56px rgba(99,102,241,0.55), 0 0 0 1px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.45s ease, transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
        opacity: logoVisible ? 1 : 0,
        transform: logoVisible ? 'scale(1)' : 'scale(0.5)',
      }}>
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.95"/>
          <circle cx="6"  cy="10" r="3.5" fill="white" fillOpacity="0.7"/>
          <circle cx="26" cy="10" r="3.5" fill="white" fillOpacity="0.7"/>
          <circle cx="6"  cy="22" r="3.5" fill="white" fillOpacity="0.7"/>
          <circle cx="26" cy="22" r="3.5" fill="white" fillOpacity="0.7"/>
          <line x1="16" y1="16" x2="6"  y2="10" stroke="white" strokeOpacity="0.45" strokeWidth="1.5"/>
          <line x1="16" y1="16" x2="26" y2="10" stroke="white" strokeOpacity="0.45" strokeWidth="1.5"/>
          <line x1="16" y1="16" x2="6"  y2="22" stroke="white" strokeOpacity="0.45" strokeWidth="1.5"/>
          <line x1="16" y1="16" x2="26" y2="22" stroke="white" strokeOpacity="0.45" strokeWidth="1.5"/>
        </svg>
      </div>

      {/* Name + tagline */}
      <div style={{
        marginTop: 28, textAlign: 'center', zIndex: 1,
        transition: 'opacity 0.4s ease, transform 0.45s ease',
        opacity: nameVisible ? 1 : 0,
        transform: nameVisible ? 'translateY(0)' : 'translateY(10px)',
      }}>
        <h1 style={{
          fontSize: 42, fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1,
          background: 'linear-gradient(135deg, #E0E7FF 0%, #C4B5FD 40%, #93C5FD 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Hitro
        </h1>
        <p style={{
          marginTop: 8, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#4A5568', fontWeight: 500,
        }}>
          Multi-Protocol API Client
        </p>
      </div>

      {/* Protocol badges */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 36,
        justifyContent: 'center', maxWidth: 400, padding: '0 32px', zIndex: 1,
      }}>
        {PROTOCOLS.map((p, i) => (
          <span key={p.label} style={{
            padding: '4px 13px', borderRadius: 20,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
            color: p.color,
            background: p.color + '1A',
            border: `1px solid ${p.color}35`,
            transition: `opacity 0.22s ease ${i * 0.015}s, transform 0.3s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.015}s`,
            opacity:   badgeCount > i ? 1 : 0,
            transform: badgeCount > i ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.92)',
          }}>
            {p.label}
          </span>
        ))}
      </div>

      {/* Loading bar */}
      <div style={{
        position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
        width: 200, zIndex: 1,
        opacity: nameVisible ? 1 : 0,
        transition: 'opacity 0.4s',
      }}>
        <div style={{
          width: '100%', height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, #38BDF8 100%)',
            width: `${progress}%`,
            transition: 'width 0.06s linear',
            boxShadow: '0 0 8px rgba(99,102,241,0.6)',
          }} />
        </div>
        <p style={{
          textAlign: 'center', marginTop: 10, fontSize: 10, letterSpacing: '0.12em',
          color: '#2D3748', fontWeight: 500,
        }}>
          INITIALIZING…
        </p>
      </div>
    </div>
  )
}
