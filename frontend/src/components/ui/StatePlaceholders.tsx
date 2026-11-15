import React from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';

interface StatePlaceholderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Clean loading placeholder respecting operational calmness without jittery skeletons. */
export const LoadingState: React.FC<StatePlaceholderProps> = ({ title, description }) => (
  <div className="tc-panel p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
    <Loader2 className="w-6 h-6 text-[var(--tc-accent)] animate-spin" aria-hidden="true" />
    <div className="space-y-1">
      <p className="text-sm font-medium text-[var(--tc-text)]">{title}</p>
      {description && <p className="text-xs text-[var(--tc-text-muted)] max-w-md">{description}</p>}
    </div>
  </div>
);

/** Honest empty state indicating missing or unsynchronized data without inventing placeholder numbers. */
export const EmptyState: React.FC<StatePlaceholderProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="tc-panel p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[180px]">
    <Inbox className="w-6 h-6 text-[var(--tc-text-muted)]" aria-hidden="true" />
    <div className="space-y-1">
      <p className="text-sm font-medium text-[var(--tc-text)]">{title}</p>
      {description && <p className="text-xs text-[var(--tc-text-muted)] max-w-md">{description}</p>}
    </div>
    {actionLabel && onAction && (
      <button type="button" onClick={onAction} className="tc-btn-secondary px-4 py-2 text-xs mt-1">
        {actionLabel}
      </button>
    )}
  </div>
);

/** Recoverable error banner providing plain-language feedback and retry action. */
export const ErrorState: React.FC<StatePlaceholderProps> = ({
  title,
  description,
  actionLabel = 'Retry',
  onAction,
}) => (
  <div className="rounded-xl border border-[var(--tc-crit-border)] bg-[var(--tc-crit-bg)] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-[var(--tc-crit-solid)] shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--tc-text)]">{title}</p>
        {description && <p className="text-xs text-[var(--tc-text-secondary)]">{description}</p>}
      </div>
    </div>
    {onAction && (
      <button
        type="button"
        onClick={onAction}
        className="tc-btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1.5 shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{actionLabel}</span>
      </button>
    )}
  </div>
);
