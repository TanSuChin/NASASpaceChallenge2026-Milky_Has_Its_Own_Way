import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ConditionHorizonBar } from './ConditionHorizonBar';
import { StatusIndicator } from './StatusIndicator';
import { TrendChart, TrendPoint } from './TrendChart';

export interface HealthMetricCardProps {
  id?: string;
  label: string;
  value: number | string | null;
  unit?: string;
  status: string;
  baselineLabel?: string;
  baselineNumeric?: number;
  expectedRange?: [number, number];
  domainRange?: [number, number];
  timestamp?: string;
  dataSource?: string;
  dataQuality?: string;
  note?: string;
  trendData?: TrendPoint[];
  variant?: 'flat' | 'panel';
  defaultExpanded?: boolean;
  onActionLabel?: string;
  onAction?: () => void;
}

/**
 * Primary metric summary component with optional progressive-disclosure trend drawer.
 * Shows clear numeric value, unit, status badge+icon, Condition & Drift Horizon baseline bar,
 * and last-updated timestamp without overwhelming the initial viewport.
 */
export const HealthMetricCard: React.FC<HealthMetricCardProps> = ({
  id,
  label,
  value,
  unit = '',
  status,
  baselineLabel,
  baselineNumeric,
  expectedRange,
  domainRange,
  timestamp,
  dataSource,
  dataQuality,
  note,
  trendData,
  variant = 'panel',
  defaultExpanded = false,
  onActionLabel,
  onAction,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const numericValue = typeof value === 'number' ? value : Number(value);
  const canPlotHorizon =
    typeof numericValue === 'number' &&
    !Number.isNaN(numericValue) &&
    expectedRange &&
    domainRange;

  const hasDetail = Boolean(
    (trendData && trendData.length > 0) || note || dataSource || dataQuality || onAction,
  );

  const containerClass =
    variant === 'flat'
      ? 'pt-5 pb-2 border-t border-[var(--tc-border)] flex flex-col justify-between gap-3.5'
      : 'tc-panel p-5 flex flex-col justify-between gap-3.5';

  return (
    <div id={id} className={containerClass}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-[var(--tc-text-secondary)]">{label}</span>
          <StatusIndicator status={status} />
        </div>

        <div className="flex items-baseline gap-1.5">
          {value !== null && value !== undefined && value !== '' ? (
            <>
              <span className="tabular-data text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
                {value}
              </span>
              {unit && <span className="text-sm text-[var(--tc-text-muted)]">{unit}</span>}
            </>
          ) : (
            <span className="text-sm text-[var(--tc-text-muted)]">Not reported</span>
          )}
        </div>

        {canPlotHorizon && expectedRange && domainRange && (
          <ConditionHorizonBar
            current={numericValue}
            minExpected={expectedRange[0]}
            maxExpected={expectedRange[1]}
            domainMin={domainRange[0]}
            domainMax={domainRange[1]}
            baseline={baselineNumeric}
            unit={unit}
            status={status}
            labelLeft={baselineLabel}
            labelRight={timestamp}
          />
        )}

        {!canPlotHorizon && (baselineLabel || timestamp) && (
          <div className="flex items-center justify-between text-xs text-[var(--tc-text-muted)] tabular-data pt-1">
            <span>{baselineLabel || ''}</span>
            <span>{timestamp || ''}</span>
          </div>
        )}
      </div>

      {hasDetail && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="text-xs font-medium text-[var(--tc-accent)] hover:underline inline-flex items-center gap-1"
          >
            <span>{expanded ? 'Hide details' : 'View trend & source'}</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-[var(--tc-border)] space-y-4">
              {note && (
                <p className="text-xs text-[var(--tc-text-secondary)] leading-relaxed">{note}</p>
              )}

              {(dataSource || dataQuality || timestamp) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--tc-text-muted)]">
                  {dataSource && <span>Source: {dataSource}</span>}
                  {dataQuality && <span>Quality: {dataQuality}</span>}
                  {timestamp && <span className="tabular-data">Recorded: {timestamp}</span>}
                </div>
              )}

              {trendData && trendData.length > 0 && (
                <TrendChart
                  title={`${label} Trajectory`}
                  unit={unit}
                  data={trendData}
                  baseline={baselineNumeric}
                  height={165}
                />
              )}

              {onAction && onActionLabel && (
                <div>
                  <button
                    type="button"
                    onClick={onAction}
                    className="tc-btn-secondary px-3 py-1.5 text-xs"
                  >
                    {onActionLabel}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
