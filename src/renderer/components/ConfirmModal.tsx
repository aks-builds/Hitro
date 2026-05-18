import React, { useEffect } from 'react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[200] animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="w-[400px] rounded-2xl flex flex-col shadow-modal animate-scale-in"
        style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          {danger && (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(248,81,73,0.12)', border: '1px solid rgba(248,81,73,0.25)' }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 3L18 17H2L10 3z" fill="rgba(248,81,73,0.15)" stroke="#F85149" strokeWidth="1.3"/>
                <line x1="10" y1="8" x2="10" y2="12.5" stroke="#F85149" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="15" r="0.8" fill="#F85149"/>
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--pk-text)' }}>{title}</h3>
            <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'var(--pk-muted)' }}>{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex justify-end gap-2 px-6 py-4"
          style={{ borderTop: '1px solid var(--pk-border)' }}
        >
          <button onClick={onCancel} className="btn-ghost text-xs px-4 py-1.5">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger text-xs px-4 py-1.5' : 'btn-primary text-xs px-4 py-1.5'}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
