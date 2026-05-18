import React from 'react'
import { useAppStore, Tab } from '../store/appStore'
import { Assertion } from '@shared/types'

const OPERATORS = ['eq', 'ne', 'contains', 'matches', 'exists', 'not_exists', 'gt', 'lt'] as const

function makeAssertion(): Assertion {
  return { id: crypto.randomUUID(), field: 'status', operator: 'eq', expected: '200', enabled: true }
}

export default function AssertionEditor({ tab }: { tab: Tab }) {
  const { updateRequest } = useAppStore()
  const assertions = tab.request.assertions

  const update = (items: Assertion[]) => updateRequest(tab.id, { assertions: items })
  const add = () => update([...assertions, makeAssertion()])
  const remove = (id: string) => update(assertions.filter(a => a.id !== id))
  const patch = (id: string, changes: Partial<Assertion>) =>
    update(assertions.map(a => a.id === id ? { ...a, ...changes } : a))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-semibold text-pk-text">Response Assertions</span>
          <p className="text-pk-muted text-[11px] mt-0.5">Assert on status, JSONPath fields, or headers</p>
        </div>
        <button
          data-testid="add-assertion"
          onClick={add}
          className="btn-primary py-1.5 px-3 text-xs"
        >
          + Add
        </button>
      </div>

      {assertions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-pk-border rounded-xl text-pk-muted gap-2">
          <span className="text-2xl opacity-40">✓</span>
          <span className="text-xs">No assertions yet — click + Add to create one</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {assertions.map(a => (
          <div key={a.id}
            className="flex items-center gap-2 p-3 bg-pk-panel rounded-xl border border-pk-border hover:border-pk-accent/30 transition-colors">
            <input
              type="checkbox"
              checked={a.enabled}
              onChange={e => patch(a.id, { enabled: e.target.checked })}
              className="flex-shrink-0 accent-pk-accent"
            />
            <input
              data-testid="assertion-field"
              value={a.field}
              onChange={e => patch(a.id, { field: e.target.value })}
              placeholder="status / $.body.id / header.content-type"
              className="flex-1 px-2 py-1.5 rounded-lg text-xs min-w-0 font-mono"
            />
            <select
              data-testid="assertion-operator"
              value={a.operator}
              onChange={e => patch(a.id, { operator: e.target.value as Assertion['operator'] })}
              className="px-2 py-1.5 rounded-lg text-xs bg-pk-surface border border-pk-border text-pk-accent font-medium"
            >
              {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            {!['exists', 'not_exists'].includes(a.operator) && (
              <input
                data-testid="assertion-expected"
                value={a.expected}
                onChange={e => patch(a.id, { expected: e.target.value })}
                placeholder="expected value"
                className="w-32 px-2 py-1.5 rounded-lg text-xs"
              />
            )}
            <button
              onClick={() => remove(a.id)}
              className="text-pk-faint hover:text-red-400 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-900/20 transition-colors text-sm"
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
