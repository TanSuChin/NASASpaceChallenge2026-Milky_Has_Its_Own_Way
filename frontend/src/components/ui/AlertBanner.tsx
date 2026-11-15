import React from 'react';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { StatusIndicator, resolveStatusSpec } from './StatusIndicator';

export interface AlertBannerProps {
  title: string;
  severity: string;
  description: string;
  whyItMatters?: string;
  timestamp?: string;
  sourceLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

/**
 * Calm operational alert row explaining what occurred, why it matters for mission safety,
 * and the exact next action without intrusive visual flash or accent-stripe clutter.
 */
export const AlertBanner: React.FC<AlertBannerProps> = ({
  title,
  severity,
  description,
  whyItMatters,
  timestamp,
  sourceLabel,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const { tone } = resolveStatusSpec(severity);

  const surfaceClass =
    tone === 'critical'
      ? 'bg-[var(--tc-crit-bg)] border-[var(--tc-crit-border)]'
      : tone === 'warning'
        ? 'bg-[var(--tc-warn-bg)] border-[var(--tc-warn-border)]'
        : tone === 'info'
          ? 'bg-[var(--tc-info-bg)] border-[var(--tc-info-border)]'
          : 'bg-[var(--tc-surface)] border-[var(--tc-border)]';

  return (
    <div className={`rounded-xl border p-5 transition-colors ${surfaceClass}`}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusIndicator status={severity} />
            <h3 className="text-sm font-semibold text-[var(--tc-text)]">{title}</h3>
            {timestamp && (
              <span className="text-xs text-[var(--tc-text-muted)] tabular-data">
                {timestamp}
              </span>
            )}
            {sourceLabel && (
              <span className="text-xs text-[var(--tc-text-muted)]">
                · {sourceLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--tc-text-secondary)] leading-relaxed max-w-[52ch]">
            {description}
          </p>
          {whyItMatters && (
            <p className="text-xs text-[var(--tc-text-muted)] leading-relaxed max-w-[52ch]">
              {whyItMatters}
            </p>
          )}
        </div>

        {(actionLabel || secondaryActionLabel) && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {secondaryActionLabel && onSecondaryAction && (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="tc-btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{secondaryActionLabel}</span>
              </button>
            )}
            {actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="tc-btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
