import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Wifi,
  WifiOff,
} from 'lucide-react';

export type SemanticTone = 'normal' | 'warning' | 'critical' | 'info' | 'neutral';

export interface StatusDisplaySpec {
  tone: SemanticTone;
  label: string;
}

const STATUS_LOOKUP: Record<string, StatusDisplaySpec> = {
  NORMAL: { tone: 'normal', label: 'Normal' },
  STABLE: { tone: 'normal', label: 'Stable' },
  AVAILABLE: { tone: 'normal', label: 'Available' },
  GO: { tone: 'normal', label: 'Normal' },
  CONNECTED: { tone: 'normal', label: 'Connected' },
  DIRECT: { tone: 'normal', label: 'Connected' },
  VALID: { tone: 'normal', label: 'Verified' },
  SENT: { tone: 'normal', label: 'Sent' },

  WARNING: { tone: 'warning', label: 'Monitor' },
  ATTENTION: { tone: 'warning', label: 'Attention' },
  CAUTION: { tone: 'warning', label: 'Monitor' },
  RUNNING_LOW: { tone: 'warning', label: 'Running Low' },
  EXPIRING_SOON: { tone: 'warning', label: 'Expiring Soon' },
  DELAYED: { tone: 'warning', label: 'Delayed' },
  INTERMITTENT: { tone: 'warning', label: 'Intermittent' },
  STALE: { tone: 'warning', label: 'Stale' },
  QUEUED: { tone: 'warning', label: 'Queued' },

  CRITICAL: { tone: 'critical', label: 'Critical' },
  HOLD: { tone: 'critical', label: 'Exercise Hold' },
  EXPIRED: { tone: 'critical', label: 'Expired' },
  OFFLINE: { tone: 'critical', label: 'Offline' },
  BLACKOUT: { tone: 'critical', label: 'Blackout' },
  ERROR: { tone: 'critical', label: 'Unavailable' },
  FAILED: { tone: 'critical', label: 'Failed' },

  INFO: { tone: 'info', label: 'Informational' },
  SIMULATION: { tone: 'info', label: 'Simulated' },
  DISCONNECTED: { tone: 'neutral', label: 'Disconnected' },
  UNAVAILABLE: { tone: 'neutral', label: 'Unavailable' },
};

const TONE_STYLES: Record<
  SemanticTone,
  { container: string; dot: string }
> = {
  normal: {
    container: 'bg-[var(--tc-ok-bg)] text-[var(--tc-ok-fg)] border border-[var(--tc-ok-border)]',
    dot: 'text-[var(--tc-ok-solid)]',
  },
  warning: {
    container: 'bg-[var(--tc-warn-bg)] text-[var(--tc-warn-fg)] border border-[var(--tc-warn-border)]',
    dot: 'text-[var(--tc-warn-solid)]',
  },
  critical: {
    container: 'bg-[var(--tc-crit-bg)] text-[var(--tc-crit-fg)] border border-[var(--tc-crit-border)]',
    dot: 'text-[var(--tc-crit-solid)]',
  },
  info: {
    container: 'bg-[var(--tc-info-bg)] text-[var(--tc-info-fg)] border border-[var(--tc-info-border)]',
    dot: 'text-[var(--tc-info-solid)]',
  },
  neutral: {
    container: 'bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)] border border-[var(--tc-border-strong)]',
    dot: 'text-[var(--tc-text-muted)]',
  },
};

export function resolveStatusSpec(status?: string | null, overrideLabel?: string): StatusDisplaySpec {
  const key = String(status || 'NORMAL').toUpperCase();
  const matched = STATUS_LOOKUP[key] || { tone: 'neutral', label: key.replace(/_/g, ' ') };
  return {
    tone: matched.tone,
    label: overrideLabel || matched.label,
  };
}

interface StatusIndicatorProps {
  status?: string | null;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'pill' | 'inline';
  className?: string;
}

/**
 * Accessible status indicator combining semantic color, icon, and plain-text label
 * so critical or warning states never depend on color alone.
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'sm',
  variant = 'pill',
  className = '',
}) => {
  const spec = resolveStatusSpec(status, label);
  const styles = TONE_STYLES[spec.tone];
  const upper = String(status || '').toUpperCase();

  const Icon =
    upper === 'DELAYED' || upper === 'QUEUED' || upper === 'EXPIRING_SOON'
      ? Clock
      : upper === 'OFFLINE' || upper === 'BLACKOUT' || upper === 'DISCONNECTED'
        ? WifiOff
        : upper === 'CONNECTED' || upper === 'DIRECT'
          ? Wifi
          : spec.tone === 'critical'
            ? AlertOctagon
            : spec.tone === 'warning'
              ? AlertTriangle
              : spec.tone === 'info'
                ? Info
                : CheckCircle2;

  const sizeClass =
    size === 'md' ? 'px-3 py-1 text-xs gap-1.5' : 'px-2.5 py-0.5 text-xs gap-1.5';

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${styles.dot} ${className}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="text-[var(--tc-text)]">{spec.label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClass} ${styles.container} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{spec.label}</span>
    </span>
  );
};
