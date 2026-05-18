import React, { Component, ReactNode, ErrorInfo } from 'react'

interface Props { children: ReactNode; label?: string }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label, error.message, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    const { error } = this.state
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 select-none animate-fade-in"
        style={{ background: 'var(--pk-bg)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.25)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L21.5 19H2.5L12 3z" fill="rgba(248,81,73,0.15)" stroke="#F85149" strokeWidth="1.5"/>
            <line x1="12" y1="9" x2="12" y2="14" stroke="#F85149" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="12" cy="17" r="0.9" fill="#F85149"/>
          </svg>
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--pk-text)' }}>
          {this.props.label ?? 'Panel'} crashed
        </p>
        <p className="text-[11px] mb-4 text-center max-w-xs leading-relaxed" style={{ color: 'var(--pk-muted)' }}>
          {error.message}
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="btn-primary text-xs px-4 py-1.5"
        >
          Reload panel
        </button>
      </div>
    )
  }
}
