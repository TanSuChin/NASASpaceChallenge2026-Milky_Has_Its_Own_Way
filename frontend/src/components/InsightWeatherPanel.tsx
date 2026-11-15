import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Compass,
  Globe,
  KeyRound,
  RefreshCw,
  Thermometer,
  WifiOff,
  Wind,
} from 'lucide-react';
import { FullSystemState, InsightStateSummary, InsightWeatherSol, InsightWindBin } from '../types';
import { apiRequest, formatRecordedTime } from './uiHelpers';

interface InsightWeatherPanelProps {
  state: FullSystemState;
  onStateUpdated: (next: FullSystemState) => void;
  compact?: boolean;
  onOpenEnvironment?: () => void;
}

function deriveCommMode(state: FullSystemState): 'CONNECTED' | 'DELAYED' | 'OFFLINE' {
  const fromAssessment = state.assessment?.comm_mode?.mode;
  if (fromAssessment === 'CONNECTED' || fromAssessment === 'DELAYED' || fromAssessment === 'OFFLINE') {
    return fromAssessment;
  }
  const raw = String(state.comm_state?.earth_comm_status || '').toUpperCase();
  if (state.comm_state?.offline_mode_forced || raw.includes('BLACKOUT') || raw.includes('OFFLINE')) {
    return 'OFFLINE';
  }
  if (raw.includes('DIRECT') || raw.includes('CONNECTED') || (state.comm_state?.one_way_delay_minutes ?? 14.2) <= 0.1) {
    return 'CONNECTED';
  }
  return 'DELAYED';
}

function syncBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'SYNCED') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  if (s === 'EMPTY_GAP' || s === 'BLOCKED_OFFLINE' || s === 'RATE_LIMITED') {
    return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  }
  if (s === 'ERROR') return 'bg-red-500/15 text-red-300 border border-red-500/30';
  return 'bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)]';
}

const CARDINAL_LABELS = [
  { label: 'N', x: 110, y: 16 },
  { label: 'E', x: 204, y: 114 },
  { label: 'S', x: 110, y: 212 },
  { label: 'W', x: 16, y: 114 },
];

const WindRoseSvg: React.FC<{ sol: InsightWeatherSol | undefined }> = ({ sol }) => {
  const bins: InsightWindBin[] = sol?.wd?.bins || [];
  const maxCt = useMemo(() => Math.max(1, ...bins.map((b) => b.ct || 0)), [bins]);

  if (!sol || bins.length === 0) {
    return (
      <div className="h-[220px] rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] flex flex-col items-center justify-center text-center p-4 space-y-1">
        <Compass className="w-6 h-6 text-[var(--tc-text-secondary)]" />
        <div className="text-xs font-medium text-[var(--tc-text)]">Wind Direction Data Unavailable</div>
        <p className="text-[11px] text-[var(--tc-text-secondary)] max-w-[230px]">
          No directional WD distribution bins were downlinked for this Sol (InSight sensor/power gap).
        </p>
      </div>
    );
  }

  const cx = 110;
  const cy = 110;
  const maxR = 76;
  const minR = 14;
  const halfStepRad = (11.25 * Math.PI) / 180;

  return (
    <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-3 flex flex-col items-center">
      <svg
        viewBox="0 0 220 220"
        className="w-full max-w-[220px] h-[200px]"
        role="img"
        aria-label={`InSight Sol ${sol.sol_id} Martian wind direction rose`}
      >
        {[0.33, 0.66, 1].map((ring) => (
          <circle
            key={ring}
            cx={cx}
            cy={cy}
            r={minR + (maxR - minR) * ring}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray={ring < 1 ? '3 3' : undefined}
          />
        ))}
        <line x1={cx} y1={24} x2={cx} y2={196} stroke="rgba(255,255,255,0.08)" />
        <line x1={24} y1={cy} x2={196} y2={cy} stroke="rgba(255,255,255,0.08)" />

        {bins.map((bin) => {
          const frac = Math.sqrt(Math.max(0, bin.ct) / maxCt);
          const outerR = minR + (maxR - minR) * frac;
          // Compass degrees: 0° North (up), 90° East (right) -> SVG screen angle = deg - 90°
          const centerRad = ((bin.compass_degrees - 90) * Math.PI) / 180;
          const a1 = centerRad - halfStepRad * 0.85;
          const a2 = centerRad + halfStepRad * 0.85;
          const x1 = cx + outerR * Math.cos(a1);
          const y1 = cy + outerR * Math.sin(a1);
          const x2 = cx + outerR * Math.cos(a2);
          const y2 = cy + outerR * Math.sin(a2);
          const ix1 = cx + minR * Math.cos(a1);
          const iy1 = cy + minR * Math.sin(a1);
          const ix2 = cx + minR * Math.cos(a2);
          const iy2 = cy + minR * Math.sin(a2);
          const d = `M ${ix1.toFixed(1)} ${iy1.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${outerR.toFixed(1)} ${outerR.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ix2.toFixed(1)} ${iy2.toFixed(1)} Z`;
          const isDom = sol.wd?.most_common?.compass_point === bin.compass_point;
          return (
            <path
              key={bin.sector}
              d={d}
              fill={isDom ? 'rgba(165, 216, 255, 0.88)' : 'rgba(165, 216, 255, 0.36)'}
              stroke="#0B0D1A"
              strokeWidth="1"
            >
              <title>{`${bin.compass_point} (${bin.compass_degrees}°): ${bin.ct.toLocaleString()} samples`}</title>
            </path>
          );
        })}

        {CARDINAL_LABELS.map((c) => (
          <text
            key={c.label}
            x={c.x}
            y={c.y}
            textAnchor="middle"
            fill="#E5E5E4"
            fontSize="10"
            fontWeight="600"
          >
            {c.label}
          </text>
        ))}
        <circle cx={cx} cy={cy} r={minR} fill="#121522" stroke="rgba(165,216,255,0.35)" />
        <text x={cx} y={cy + 3} textAnchor="middle" fill="#FAF9FA" fontSize="9" fontWeight="600">
          {sol.wd?.most_common?.compass_point || 'WD'}
        </text>
      </svg>
      <div className="text-[11px] text-[var(--tc-text-secondary)] mt-1 text-center">
        Dominant direction:{' '}
        <strong className="text-[var(--tc-accent)]">
          {sol.wd?.most_common?.compass_point
            ? `${sol.wd.most_common.compass_point} (${sol.wd.most_common.compass_degrees}°)`
            : 'N/A'}
        </strong>
      </div>
    </div>
  );
};

export const InsightWeatherPanel: React.FC<InsightWeatherPanelProps> = ({
  state,
  onStateUpdated,
  compact = false,
  onOpenEnvironment,
}) => {
  const insight: InsightStateSummary | undefined = state.insight_state;
  const commMode = deriveCommMode(state);
  const isOffline = commMode === 'OFFLINE';

  const sols = insight?.sols || [];
  const syncMeta = insight?.sync_meta;
  const summary = insight?.summary;

  const [selectedSolId, setSelectedSolId] = useState<string>(sols[0]?.sol_id || '');
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (sols.length > 0 && !sols.some((s) => s.sol_id === selectedSolId)) {
      setSelectedSolId(sols[0].sol_id);
    }
  }, [selectedSolId, sols]);

  const activeSol = useMemo(
    () => sols.find((s) => s.sol_id === selectedSolId) || sols[0],
    [selectedSolId, sols],
  );

  const chartData = useMemo(() => {
    return [...sols]
      .sort((a, b) => Number(a.sol_id) - Number(b.sol_id))
      .map((s) => ({
        sol: `Sol ${s.sol_id}`,
        atAvg: s.at?.av ?? null,
        atMin: s.at?.mn ?? null,
        atMax: s.at?.mx ?? null,
        pressurePa: s.pre?.av ?? null,
      }));
  }, [sols]);

  const runSync = async () => {
    setSyncing(true);
    setNotice(null);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{
        sync_result: { status: string; message: string; fetched_count: number };
        state: FullSystemState;
      }>('/api/insight/sync', {
        method: 'POST',
        body: JSON.stringify({ feedtype: 'json', version: '1.0' }),
      });
      onStateUpdated(res.state);
      const sr = res.sync_result;
      if (sr.status === 'BLOCKED_OFFLINE' || sr.status === 'ERROR' || sr.status === 'RATE_LIMITED') {
        setErrorMsg(sr.message);
      } else {
        setNotice(sr.message);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sync NASA InSight Mars Weather feed.');
    } finally {
      setSyncing(false);
    }
  };

  if (compact) {
    return (
      <section className="mc-card p-5 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Wind className="w-5 h-5 text-[var(--tc-accent)]" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--tc-text)]">
                NASA InSight Surface Weather (Elysium Planitia)
              </h2>
              <p className="text-xs text-[var(--tc-text-secondary)]">
                Archival Mars surface pressure, wind rose &amp; diurnal temperature cached offline in SQLite
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--tc-bg)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)]">
              {insight?.config?.key_status || 'Key Pending'}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${syncBadgeClass(
                syncMeta?.last_sync_status || 'NEVER_SYNCED',
              )}`}
            >
              {syncMeta?.last_sync_status || 'NEVER_SYNCED'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-[var(--tc-bg)] p-3">
            <div className="text-[var(--tc-text-secondary)]">Cached Sols</div>
            <div className="text-lg font-bold text-[var(--tc-text)] tabular-data mt-0.5">
              {summary?.sol_count ?? 0}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--tc-bg)] p-3">
            <div className="text-[var(--tc-text-secondary)]">Surface Pressure</div>
            <div className="text-lg font-bold text-[var(--tc-text)] tabular-data mt-0.5">
              {summary?.latest_pressure_pa !== null && summary?.latest_pressure_pa !== undefined
                ? `${summary.latest_pressure_pa.toFixed(0)} Pa`
                : 'N/A'}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--tc-bg)] p-3">
            <div className="text-[var(--tc-text-secondary)]">Mean Surface Temp</div>
            <div className="text-lg font-bold text-[var(--tc-text)] tabular-data mt-0.5">
              {summary?.latest_temp_av_c !== null && summary?.latest_temp_av_c !== undefined
                ? `${summary.latest_temp_av_c.toFixed(1)} °C`
                : 'N/A'}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--tc-bg)] p-3">
            <div className="text-[var(--tc-text-secondary)]">Wind Vector</div>
            <div className="text-sm font-semibold text-[var(--tc-accent)] mt-1">
              {summary?.latest_wind_av_ms !== null && summary?.latest_wind_av_ms !== undefined
                ? `${summary.latest_wind_av_ms.toFixed(1)} m/s ${summary.latest_wind_compass || ''}`
                : 'Paused / Gap'}
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--tc-text-secondary)] leading-relaxed">
          {syncMeta?.last_sync_message || 'Ready to synchronize NASA InSight archival telemetry.'}
        </p>

        {errorMsg && (
          <div className="rounded-xl bg-amber-500/15 px-3.5 py-2.5 text-xs text-amber-100 border border-amber-400/40">
            {errorMsg}
          </div>
        )}
        {notice && (
          <div className="rounded-xl bg-[var(--tc-bg)] px-3.5 py-2.5 text-xs text-[var(--tc-accent)] border border-[var(--tc-border-strong)]">
            {notice}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={syncing || isOffline}
            onClick={runSync}
            className="mc-btn-primary px-4 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>
              {isOffline
                ? 'InSight Sync Paused While Offline'
                : syncing
                  ? 'Syncing InSight...'
                  : 'Sync NASA InSight Weather'}
            </span>
          </button>
          {onOpenEnvironment && (
            <button
              type="button"
              onClick={onOpenEnvironment}
              className="mc-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--tc-accent)]" />
              <span>Open Hostile Environments &amp; InSight Console</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className="mc-card p-5 lg:p-6 space-y-5"
      aria-label="NASA InSight Mars Surface Weather Reference"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-[var(--tc-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--tc-text)]">
              NASA InSight: Elysium Planitia Surface Weather Benchmark
            </h2>
          </div>
          <p className="text-xs text-[var(--tc-text-secondary)] leading-relaxed max-w-3xl">
            Per-Sol ambient Martian meteorology (AT temperature, PRE barometric pressure, HWS horizontal wind speed,
            and 16-point WD wind rose) cached locally in SQLite from NASA JPL &amp; Cornell InSight telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs bg-[var(--tc-bg)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)] inline-flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[var(--tc-accent)]" />
            <span>{insight?.config?.key_status || 'Key Pending'}</span>
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${syncBadgeClass(
              syncMeta?.last_sync_status || 'NEVER_SYNCED',
            )}`}
          >
            {syncMeta?.last_sync_status || 'NEVER_SYNCED'}
          </span>
          <button
            type="button"
            disabled={syncing || isOffline}
            onClick={runSync}
            className="mc-btn-primary px-4 py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing InSight...' : 'Sync NASA InSight'}</span>
          </button>
        </div>
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-3 text-xs text-amber-100 flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            <strong>OFFLINE Blackout Active:</strong> External NASA InSight API polling is disabled while Earth link is severed.
            Displaying {sols.length} cached local SQLite Sol summaries autonomously.
          </span>
        </div>
      )}

      {/* Alerts */}
      {errorMsg && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-3 text-xs text-amber-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border-strong)] px-4 py-3 text-xs text-[var(--tc-accent)]">
          {notice}
        </div>
      )}

      {/* Archival Gap & Exterior vs Habitat Distinction Notice */}
      <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] px-4 py-3 text-xs text-[var(--tc-text-secondary)] leading-relaxed space-y-1">
        <div>
          <strong className="text-[var(--tc-text)]">NASA JPL Power &amp; Data-Gap Advisory: </strong>
          {summary?.data_archive_notice ||
            'InSight surface telemetry reflects archived operational Sols with expected power-management & sensor gaps.'}
        </div>
        <div>
          <strong className="text-[var(--tc-accent)]">Habitat Isolation Boundary: </strong>
          Ambient Martian exterior conditions (~0.75 kPa / -62 °C) benchmark outside EVA thermal &amp; pressure suit deltas and{' '}
          <strong>never modify pressurized habitat ECLSS thresholds</strong> ({state.latest_telemetry.cabin_pressure_kpa} kPa cabin pressure,{' '}
          {state.latest_telemetry.cabin_temp_c} °C interior).
        </div>
      </div>

      {sols.length === 0 ? (
        <div className="rounded-2xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-6 text-center space-y-2">
          <div className="text-sm font-medium text-[var(--tc-text)]">No cached NASA InSight Sols stored locally</div>
          <p className="text-xs text-[var(--tc-text-secondary)] max-w-xl mx-auto">
            Click &ldquo;Sync NASA InSight&rdquo; while Earth link is Connected or Delayed to pull Elysium Planitia per-Sol weather summaries into local SQLite storage.
          </p>
        </div>
      ) : (
        <>
          {/* Sol Selector Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {sols.map((sol) => {
                const selected = activeSol?.sol_id === sol.sol_id;
                const hasGap = sol.missing_sensors.length > 0;
                return (
                  <button
                    key={sol.sol_id}
                    type="button"
                    onClick={() => setSelectedSolId(sol.sol_id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-[var(--tc-btn-bg)] text-[#0B0D1A] border-[#EEF0F6]'
                        : 'bg-[var(--tc-bg)] text-[var(--tc-text-secondary)] border-[var(--tc-border)] hover:border-[var(--tc-border-strong)]'
                    }`}
                  >
                    <span>Sol {sol.sol_id}</span>
                    {hasGap && (
                      <span className={`ml-1 text-[10px] ${selected ? 'text-[#0B0D1A]/70' : 'text-amber-300'}`}>
                        (Gap)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {syncMeta?.last_sync_at && (
              <span className="text-[11px] text-[var(--tc-text-secondary)]">
                Last Sync: {formatRecordedTime(syncMeta.last_sync_at)}
              </span>
            )}
          </div>

          {/* 4-Card Exterior vs Interior KPIs for Selected Sol */}
          {activeSol && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-1">
                <div className="text-xs text-[var(--tc-text-secondary)] flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-[var(--tc-accent)]" />
                  <span>Exterior Temp (AT · Sol {activeSol.sol_id})</span>
                </div>
                {activeSol.at?.av !== undefined ? (
                  <>
                    <div className="text-xl font-bold text-[var(--tc-text)] tabular-data">
                      {activeSol.at.av.toFixed(1)} °C
                    </div>
                    <div className="text-[11px] text-[var(--tc-text-secondary)] tabular-data">
                      Min {activeSol.at.mn?.toFixed(1) ?? '—'}° · Max {activeSol.at.mx?.toFixed(1) ?? '—'}° · Cabin{' '}
                      {state.latest_telemetry.cabin_temp_c.toFixed(1)} °C
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-amber-300 pt-1">Sensor omitted in downlink (power/sensor gap)</div>
                )}
              </div>

              <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-1">
                <div className="text-xs text-[var(--tc-text-secondary)]">Exterior Pressure (PRE)</div>
                {activeSol.pre?.av !== undefined ? (
                  <>
                    <div className="text-xl font-bold text-[var(--tc-text)] tabular-data">
                      {activeSol.pre.av.toFixed(1)} Pa
                    </div>
                    <div className="text-[11px] text-[var(--tc-text-secondary)] tabular-data">
                      {(activeSol.pre.av / 1000).toFixed(3)} kPa vs Cabin {state.latest_telemetry.cabin_pressure_kpa} kPa
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-amber-300 pt-1">Pressure sensor gap on Sol {activeSol.sol_id}</div>
                )}
              </div>

              <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-1">
                <div className="text-xs text-[var(--tc-text-secondary)]">Horizontal Wind (HWS)</div>
                {activeSol.hws?.av !== undefined ? (
                  <>
                    <div className="text-xl font-bold text-[var(--tc-text)] tabular-data">
                      {activeSol.hws.av.toFixed(2)} m/s
                    </div>
                    <div className="text-[11px] text-[var(--tc-text-secondary)] tabular-data">
                      Min {activeSol.hws.mn?.toFixed(1) ?? '—'} · Max {activeSol.hws.mx?.toFixed(1) ?? '—'} m/s
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-amber-300 pt-1">Wind speed sensor omitted (Sol {activeSol.sol_id})</div>
                )}
              </div>

              <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-1">
                <div className="text-xs text-[var(--tc-text-secondary)]">Season &amp; Recording Window</div>
                <div className="text-base font-bold text-[var(--tc-accent)] capitalize">
                  {activeSol.season || 'Unspecified'} (M{activeSol.month_ordinal ?? '—'})
                </div>
                <div className="text-[11px] text-[var(--tc-text-secondary)] truncate" title={`${activeSol.first_utc} -> ${activeSol.last_utc}`}>
                  N: {activeSol.northern_season || '—'} · {activeSol.first_utc ? activeSol.first_utc.slice(0, 10) : '—'}
                </div>
              </div>
            </div>
          )}

          {/* Chart + Wind Rose */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 rounded-2xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--tc-accent)]">
                  Diurnal Martian Temperature Envelope Across Cached Sols (°C)
                </span>
                <span className="text-[11px] text-[var(--tc-text-secondary)]">Elysium Planitia</span>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="insightAtFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A5D8FF" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#A5D8FF" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="sol" stroke="#E5E5E4" fontSize={11} />
                    <YAxis stroke="#A5D8FF" fontSize={11} width={40} unit="°" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121522',
                        border: '1px solid rgba(165,216,255,0.35)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#FAF9FA',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#E5E5E4' }} />
                    <Area
                      type="monotone"
                      dataKey="atMax"
                      name="Max (°C)"
                      stroke="#FBBF24"
                      strokeWidth={1.6}
                      fillOpacity={0}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="atAvg"
                      name="Mean (°C)"
                      stroke="#A5D8FF"
                      strokeWidth={2.2}
                      fill="url(#insightAtFill)"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="atMin"
                      name="Min (°C)"
                      stroke="#93C5FD"
                      strokeWidth={1.4}
                      strokeDasharray="4 3"
                      fillOpacity={0}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-2">
              <div className="text-xs font-semibold text-[var(--tc-accent)]">
                Wind Rose Distribution (WD · Sol {activeSol?.sol_id || '—'})
              </div>
              <WindRoseSvg sol={activeSol} />
            </div>
          </div>

          {/* Per-Sol Validity Checks Row */}
          {activeSol && (
            <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--tc-text-secondary)]">
              <span>
                <strong className="text-[var(--tc-text)]">Sol {activeSol.sol_id} Sensor Validity:</strong>{' '}
                {activeSol.missing_sensors.length > 0
                  ? `Missing sensors flagged: ${activeSol.missing_sensors.join(', ')}`
                  : 'All 4 meteorology sensors (AT, HWS, PRE, WD) reported'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(['AT', 'HWS', 'PRE', 'WD'] as const).map((sensor) => {
                  const v = activeSol.validity?.[sensor];
                  const present = !activeSol.missing_sensors.includes(sensor);
                  return (
                    <span
                      key={sensor}
                      className={`px-2 py-0.5 rounded-full border ${
                        !present
                          ? 'bg-red-500/15 text-red-300 border-red-500/30'
                          : v
                            ? v.valid
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-[var(--tc-surface)] text-[var(--tc-text-secondary)] border-[var(--tc-border)]'
                      }`}
                    >
                      {sensor}: {!present ? 'Gap' : v ? `${v.valid ? 'Valid' : 'Partial'} (${v.hours_count}h)` : 'Reported'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
