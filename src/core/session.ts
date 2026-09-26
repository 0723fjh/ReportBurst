import type { PlanRequest, PlanSummary, WorkbookSummary } from './types'

const worker = new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' })
let nextId = 1
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; onProgress?: (stage: string) => void }>()

worker.onmessage = (event: MessageEvent<{ id: number; ok?: boolean; result?: unknown; error?: string; progress?: string }>) => {
  const response = event.data
  const request = pending.get(response.id)
  if (!request) return
  if (response.progress) { request.onProgress?.(response.progress); return }
  pending.delete(response.id)
  if (response.ok) request.resolve(response.result)
  else request.reject(new Error(response.error ?? 'The request could not be completed.'))
}

worker.onerror = () => {
  for (const request of pending.values()) request.reject(new Error('Spreadsheet processing stopped unexpectedly.'))
  pending.clear()
}

function send<T>(message: object, onProgress?: (stage: string) => void): Promise<T> {
  const id = nextId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject, onProgress })
    worker.postMessage({ ...message, id })
  })
}

export function parseInWorker(file: File): Promise<WorkbookSummary> {
  return send({ type: 'parse', file })
}

export function planInWorker(config: PlanRequest): Promise<PlanSummary> {
  return send({ type: 'plan', config })
}

export function exportInWorker(revision: number, onProgress: (stage: string) => void): Promise<Blob> {
  return send({ type: 'export', revision }, onProgress)
}
