import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from './StatePlaceholders';

export interface TrendPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface TrendChartProps {
  title: string;
  unit: string;
  data: TrendPoint[];
  baseline?: number;
  secondaryName?: string;
  primaryName?: string;
  height?: number;
  showRangeSelector?: boolean;
}

/**
 * Calm scientific time-series chart supporting Daily (7d), Weekly (14d), and Monthly (30d) slices,
 * theme-synchronized tooltip colors, and personal baseline reference line.
 */
export const TrendChart: React.FC<TrendChartProps> = ({
  title,
  unit,
  data,
  baseline,
  primaryName = 'Recorded',
  secondaryName,
  height = 190,
  showRangeSelector = true,
}) => {
  const [range, setRange] = useState<7 | 14 | 30>(14);

  const visibleData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(-range);
  }, [data, range]);

  if (visibleData.length === 0) {
    return (
      <EmptyState
        title={`No trend records yet for ${title}`}
        description="Synchronize hardware sensors or log measurements to generate a longitudinal trend."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-medium text-[var(--tc-text-secondary)]">{title}</h4>
          {typeof baseline === 'number' && (
            <p className="text-xs text-[var(--tc-text-muted)] tabular-data">
              Personal baseline: {baseline} {unit}
            </p>
          )}
        </div>
        {showRangeSelector && data.length > 7 && (
          <div className="inline-flex rounded-lg border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] p-0.5">
            {([
              { days: 7 as const, label: '7d' },
              { days: 14 as const, label: '14d' },
              { days: 30 as const, label: '30d' },
            ]).map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setRange(opt.days)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors tabular-data ${
                  range === opt.days
                    ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                    : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="var(--tc-chart-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--tc-chart-axis)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--tc-chart-axis)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tc-chart-tooltip-bg)',
                border: '1px solid var(--tc-chart-tooltip-border)',
                borderRadius: '10px',
                fontSize: '12px',
                color: 'var(--tc-text)',
              }}
            />
            {typeof baseline === 'number' && (
              <ReferenceLine
                y={baseline}
                stroke="var(--tc-text-muted)"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              name={`${primaryName}${unit ? ` (${unit})` : ''}`}
              stroke="var(--tc-accent)"
              strokeWidth={2}
              dot={visibleData.length <= 14 ? { r: 2.5, fill: 'var(--tc-accent)' } : false}
              activeDot={{ r: 4 }}
            />
            {secondaryName && (
              <Line
                type="monotone"
                dataKey="secondaryValue"
                name={secondaryName}
                stroke="var(--tc-warn-solid)"
                strokeWidth={1.75}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
