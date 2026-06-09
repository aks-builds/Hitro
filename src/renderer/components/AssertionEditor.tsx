import React from 'react'
import { useAppStore, Tab } from '../store/appStore'
import { Assertion, PikoResponse } from '@shared/types'

const OPERATORS = [
  'eq', 'ne', 'contains', 'matches', 'exists', 'not_exists',
  'gt', 'gte', 'lt', 'lte',
  'startsWith', 'endsWith', 'type', 'length', 'isEmpty', 'isNull',
] as const

const MAX_SMART_ASSERTIONS = 16
const MAX_BODY_DEPTH = 2

function collectBodyPaths(obj: any, prefix = '', depth = 0): Array<{ path: string; value: any }> {
  if (depth > MAX_BODY_DEPTH || obj == null || typeof obj !== 'object') return []
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : `body.${k}`
    const nested = typeof v === 'object' && v !== null && !Array.isArray(v)
      ? collectBodyPaths(v, path, depth + 1)
      : []
    return [{ path, value: v }, ...nested]
  })
}

function smartAssertions(response: PikoResponse): Assertion[] {
  const assertions: Assertion[] = []
  const make = (field: string, operator: Assertion['operator'], expected: string): Assertion => ({
    id: crypto.randomUUID(), field, operator, expected, enabled: true,
  })

  if (response.status != null) {
    assertions.push(make('status', 'eq', String(response.status)))
  }
  if (response.duration != null) {
    const threshold = Math.ceil((response.duration + 500) / 100) * 100
    assertions.push(make('duration', 'lt', String(threshold)))
  }
  const ct = response.headers?.['content-type'] ?? ''
  if (ct.includes('json'))  assertions.push(make('header.content-type', 'contains', 'application/json'))
  else if (ct.includes('xml'))  assertions.push(make('header.content-type', 'contains', 'xml'))
  else if (ct && assertions.length < MAX_SMART_ASSERTIONS) assertions.push(make('header.content-type', 'exists', ''))

  if (response.body != null && typeof response.body === 'object') {
    const paths = collectBodyPaths(response.body)
    for (const { path, value } of paths) {
      if (assertions.length >= MAX_SMART_ASSERTIONS) break
      if (Array.isArray(value)) {
        assertions.push(make(path, 'length', String(value.length)))
      } else if (value === null) {
        assertions.push(make(path, 'isNull', ''))
      } else if (typeof value === 'boolean') {
        assertions.push(make(path, 'eq', String(value)))
      } else if (typeof value === 'number') {
        assertions.push(make(path, 'eq', String(value)))
      } else if (typeof value === 'string' && value.length <= 80) {
        assertions.push(make(path, 'eq', value))
      } else {
        assertions.push(make(path, 'exists', ''))
      }
    }
  }

  return assertions
}

function makeAssertion(): Assertion {
  return { id: crypto.randomUUID(), field: 'status', operator: 'eq', expected: '200', enabled: true }
}

export default function AssertionEditor({ tab }: { tab: Tab }) {
  const { updateRequest } = useAppStore()
  const assertions = tab.request.assertions
  const response = tab.response

  const update = (items: Assertion[]) => updateRequest(tab.id, { assertions: items })
  const add = () => update([...assertions, makeAssertion()])
  const remove = (id: string) => update(assertions.filter(a => a.id !== id))
  const patch = (id: string, changes: Partial<Assertion>) =>
    update(assertions.map(a => a.id === id ? { ...a, ...changes } : a))

  const handleSmartFill = () => {
    if (!response || response.error) return
    const generated = smartAssertions(response)
    // Merge: skip fields already asserted
    const existingFields = new Set(assertions.map(a => `${a.field}:${a.operator}`))
    const newOnes = generated.filter(a => !existingFields.has(`${a.field}:${a.operator}`))
    update([...assertions, ...newOnes])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-semibold" style={{ color: 'var(--pk-text)' }}>Response Assertions</span>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--pk-muted)' }}>Assert on status · duration · body fields · headers</p>
        </div>
        <div className="flex items-center gap-2">
          {response && !response.error && (
            <button
              onClick={handleSmartFill}
              title="Analyze response and auto-generate assertions"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)',
                color: 'var(--pk-accent)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="currentColor">
                <path d="M7 1l1.2 3.6H12L9.2 6.8l1.2 3.6L7 8.2l-3.4 2.2 1.2-3.6L2 4.6h3.8z"/>
              </svg>
              Smart Fill
            </button>
          )}
          <button
            data-testid="add-assertion"
            onClick={add}
            className="btn-primary py-1.5 px-3 text-xs"
          >
            + Add
          </button>
        </div>
      </div>

      {assertions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl gap-2" style={{ borderColor: 'var(--pk-border)', color: 'var(--pk-muted)' }}>
          <span className="text-2xl opacity-40">✓</span>
          <span className="text-xs">No assertions yet — click + Add to create one</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {assertions.map(a => (
          <div key={a.id}
            data-testid="assertion-row"
            className="flex items-center gap-2 p-3 rounded-xl transition-colors"
            style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
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
              placeholder="status · duration · body.id · header.content-type"
              className="flex-1 px-2 py-1.5 rounded-lg text-xs min-w-0 font-mono"
            />
            <select
              data-testid="assertion-operator"
              value={a.operator}
              onChange={e => patch(a.id, { operator: e.target.value as Assertion['operator'] })}
              className="px-2 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--pk-surface)', border: '1px solid var(--pk-border)', color: 'var(--pk-accent)' }}
            >
              {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            {!['exists', 'not_exists', 'isEmpty', 'isNull'].includes(a.operator) && (
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
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-900/20 transition-colors text-sm"
              style={{ color: 'var(--pk-faint)' }}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
