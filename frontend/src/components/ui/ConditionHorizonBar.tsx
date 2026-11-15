import React from 'react';
import { resolveStatusSpec } from './StatusIndicator';

interface ConditionHorizonBarProps {
  current: number;
  minExpected: number;
  maxExpected: number;
  domainMin: number;
  domainMax: number;
  baseline?: number;
  unit?: string;
  status?: string;
  labelLeft?: string;
  labelRight?: string;
}

/**
 * NASA Orbital Calm signature micro-visual: shows where the astronaut's current reading
 * sits along an individualized baseline envelope without decorative dials or clutter.
 */
export const ConditionHorizonBar: React.FC<ConditionHorizonBarProps> = ({
  current,
  minExpected,
  maxExpected,
  domainMin,
  domainMax,
  baseline,
  unit = '',
  status = 'NORMAL',
  labelLeft,
  labelRight,
}) => {
  const span = Math.max(0.0001, domainMax - domainMin);
  const clampPct = (v: number) => Math.min(98, Math.max(2, ((v - domainMin) / span) * 100));

  const bandStart = clampPct(minExpected);
  const bandEnd = clampPct(maxExpected);
  const bandWidth = Math.max(6, bandEnd - bandStart);
  const currentPct = clampPct(current);
  const baselinePct = typeof baseline === 'number' ? clampPct(baseline) : null;

  const { tone } = resolveStatusSpec(status);
  const pinColor =
    tone === 'critical'
      ? 'var(--tc-crit-solid)'
      : tone === 'warning'
        ? 'var(--tc-warn-solid)'
        : tone === 'info'
          ? 'var(--tc-info-solid)'
          : 'var(--tc-ok-solid)';

  return (
    <div className="space-y-1.5">
      <div
        className="relative h-1.5 w-full rounded-full overflow-visible"
        style={{ backgroundColor: 'var(--tc-horizon-track)' }}
        role="img"
        aria-label={`Current ${current}${unit ? ` ${unit}` : ''} compared with personal nominal band ${minExpected} to ${maxExpected}${unit ? ` ${unit}` : ''}`}
      >
        <div
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            left: `${bandStart}%`,
            width: `${bandWidth}%`,
            backgroundColor: 'var(--tc-horizon-band)',
          }}
        />
        {baselinePct !== null && (
          <div
            className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-[var(--tc-text-muted)] opacity-75"
            style={{ left: `${baselinePct}%` }}
            title={`Personal baseline: ${baseline}${unit ? ` ${unit}` : ''}`}
          />
        )}
        <div
          className="absolute -top-1 h-3.5 w-1 rounded-full transition-all duration-200"
          style={{
            left: `calc(${currentPct}% - 2px)`,
            backgroundColor: pinColor,
          }}
        />
      </div>
      {(labelLeft || labelRight) && (
        <div className="flex items-center justify-between text-xs text-[var(--tc-text-muted)] tabular-data">
          <span>{labelLeft}</span>
          <span>{labelRight}</span>
        </div>
      )}
    </div>
  );
};
