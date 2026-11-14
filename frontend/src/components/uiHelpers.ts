import { DataProvenance, FullSystemState, LocalAIStatus, RiskLevel } from '../types';

export function statusMeta(status: RiskLevel | string | undefined): {
  label: string;
  badgeClass: string;
  dotClass: string;
  textClass: string;
} {
  const s = (status || 'NORMAL').toUpperCase();
  if (s === 'CRITICAL') {
    return {
      label: 'Critical',
      badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
      dotClass: 'bg-red-400',
      textClass: 'text-red-400',
    };
  }
  if (s === 'WARNING') {
    return {
      label: 'Warning',
      badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      dotClass: 'bg-amber-400',
      textClass: 'text-amber-300',
    };
  }
  return {
    label: 'Normal',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    dotClass: 'bg-emerald-400',
    textClass: 'text-emerald-300',
  };
}

export function provenanceLabel(raw: DataProvenance | string | undefined): string {
  const r = String(raw || '').toUpperCase();
  if (r.includes('USER')) return 'User-Entered Data';
  if (r.includes('REAL')) return 'Real Research Data';
  if (r.includes('SIMULATED_ENV')) return 'Simulated Data (Environment)';
  return 'Simulated Data';
}

export function formatRecordedTime(iso: string | undefined): string {
  if (!iso) return 'Just now';
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' UTC';
  } catch {
    return iso;
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface AIWarmupResponse {
  ok: boolean;
  model: string | null;
  latency_ms: number;
  message: string;
  status: LocalAIStatus;
}

export async function updateLocalAIConfig(
  payload: { llm_enabled?: boolean; selected_model?: string | null },
  onStateUpdated?: (state: FullSystemState) => void,
): Promise<LocalAIStatus> {
  const status = await apiRequest<LocalAIStatus>('/api/ai/config', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (onStateUpdated) {
    const fresh = await apiRequest<FullSystemState>('/api/state');
    onStateUpdated(fresh);
  }
  return status;
}

export async function warmupLocalAI(
  model?: string | null,
  onStateUpdated?: (state: FullSystemState) => void,
): Promise<AIWarmupResponse> {
  const res = await apiRequest<AIWarmupResponse>('/api/ai/warmup', {
    method: 'POST',
    body: JSON.stringify({ model: model || null }),
  });
  if (onStateUpdated) {
    const fresh = await apiRequest<FullSystemState>('/api/state');
    onStateUpdated(fresh);
  }
  return res;
}

