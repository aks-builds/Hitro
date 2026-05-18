import React from 'react'
import { useAppStore } from '../store/appStore'
import { PROTOCOL_META, METHOD_STYLES, RestConfig } from '@shared/types'

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, newTab } = useAppStore()

  return (
    <div data-testid="tab-bar" className="flex items-center h-9 overflow-x-auto select-none bg-pk-panel"
      style={{ scrollbarWidth: 'none' }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId
        const meta = PROTOCOL_META[tab.request.protocol]
        const method = tab.request.protocol === 'rest'
          ? (tab.request.config as RestConfig).method : null
        const ms = method ? METHOD_STYLES[method] : null

        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 h-full min-w-0 max-w-44 cursor-pointer border-r border-pk-border flex-shrink-0 group/tab transition-all
              ${isActive ? 'bg-pk-surface shadow-sm' : 'bg-transparent hover:bg-pk-hover'}`}
            style={{ borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent' }}
          >
            {ms ? (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap"
                style={{ color: ms.color, background: ms.bg }}>{method}</span>
            ) : (
              <span className="w-2 h-2 rounded-full flex-shrink-0 opacity-80" style={{ background: meta.color }} />
            )}

            <span className={`truncate text-xs transition-colors ${isActive ? 'text-pk-text' : 'text-pk-muted group-hover/tab:text-pk-text'}`}>
              {tab.request.name}
            </span>

            {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-pk-accent flex-shrink-0" />}

            <button
              onClick={e => { e.stopPropagation(); closeTab(tab.id) }}
              className={`ml-auto text-pk-faint hover:text-red-400 flex-shrink-0 text-xs leading-none w-4 h-4 flex items-center justify-center rounded hover:bg-pk-border transition-all ${isActive ? 'opacity-60' : 'opacity-0 group-hover/tab:opacity-60'}`}
            >×</button>
          </div>
        )
      })}
      <button
        onClick={() => newTab()}
        className="w-9 h-full flex items-center justify-center flex-shrink-0 text-pk-muted hover:text-pk-text hover:bg-pk-hover transition-colors border-r border-pk-border/60 text-base"
        title="New tab (⌘N)"
      >+</button>
    </div>
  )
}
