import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  MessageSquare,
  Radiation,
  Radio,
  Settings2,
  Users,
  Wind,
} from 'lucide-react';
import { FullSystemState } from '../types';
import { apiRequest, statusMeta } from './uiHelpers';

interface SpaceflightHazardsViewProps {
  state: FullSystemState;
  activeHazardId: string;
  onSelectHazard: (id: string) => void;
  onStateUpdated: (next: FullSystemState) => void;
  onAskAssistant: (prompt: string) => void;
}

const HAZARD_META = [
  { id: 'radiation', label: 'Space Radiation', icon: Radiation },
  { id: 'isolation', label: 'Isolation & Confinement', icon: Users },
  { id: 'distance', label: 'Distance from Earth', icon: Radio },
  { id: 'gravity', label: 'Gravity Fields', icon: Activity },
  { id: 'environment', label: 'Hostile Environments', icon: Wind },
];

const GRAVITY_GUIDE: Record<string, { label: string; context: string; focus: string }> = {
  '1g': {
    label: '1g Earth Baseline',
    context: 'Full hydrostatic blood pressure gradient and skeletal weight-bearing load.',
    focus: 'Used as your personal reference for orthostatic heart rate, blood pressure, and posture.',
  },
  '0g': {
    label: '0g Microgravity Transit',
    context: 'Eliminates weight-bearing bone loading (CSA TBone) and shifts body fluid headward (CSA Vascular & SANS).',
    focus: 'Prioritize daily ARED resistive sets, aerobic cycle intervals, and vision/neuro-ocular screening.',
  },
  '0.38g': {
    label: '0.38g Mars Surface',
    context: 'Partial gravity reintroduces vertical loading on a cardiovascular system adapted to 0g.',
    focus: 'Monitor standing heart rate spikes, pre-hydrate with isotonic fluid, and maintain bone-loading cadence.',
  },
};

export const SpaceflightHazardsView: React.FC<SpaceflightHazardsViewProps> = ({
  state,
  activeHazardId,
  onSelectHazard,
  onStateUpdated,
  onAskAssistant,
}) => {
  const modules = state.assessment.hazard_modules_4step || [];
  const activeMod = modules.find((m) => m.id === activeHazardId) || modules[0];

  const [gravityExplorer, setGravityExplorer] = useState<'1g' | '0g' | '0.38g'>(
    state.latest_telemetry.gravity_g === 0
      ? '0g'
      : state.latest_telemetry.gravity_g >= 0.9
        ? '1g'
        : '0.38g',
  );
  const [warnLimit, setWarnLimit] = useState(state.radiation_limits.daily_equivalent_warn_msv);
  const [co2Limit, setCo2Limit] = useState(state.environmental_limits.co2_warn_mmhg);
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  const chartData = useMemo(() => {
    const slice = state.telemetry_history.slice(-14);
    return slice.map((r) => {
      if (activeHazardId === 'radiation') {
        return { sol: r.mission_day, primary: r.equivalent_dose_rate_msv_day, secondary: r.absorbed_dose_mgy };
      }
      if (activeHazardId === 'isolation') {
        return { sol: r.mission_day, primary: r.sleep_duration_hrs, secondary: r.mood_score };
      }
      if (activeHazardId === 'gravity') {
        return { sol: r.mission_day, primary: r.heart_rate_bpm, secondary: r.muscle_strength_idx };
      }
      if (activeHazardId === 'environment') {
        return { sol: r.mission_day, primary: r.co2_mmhg, secondary: r.humidity_pct };
      }
      return {
        sol: r.mission_day,
        primary: state.comm_state.one_way_delay_minutes,
        secondary: r.sleep_quality_pct,
      };
    });
  }, [state.telemetry_history, activeHazardId, state.comm_state.one_way_delay_minutes]);

  const saveConfiguredLimits = async () => {
    setSavingLimits(true);
    setLimitNotice(null);
    try {
      await apiRequest('/api/config/limits', {
        method: 'POST',
        body: JSON.stringify({
          radiation_limits: {
            ...state.radiation_limits,
            daily_equivalent_warn_msv: warnLimit,
          },
          environmental_limits: {
            ...state.environmental_limits,
            co2_warn_mmhg: co2Limit,
          },
        }),
      });
      const fresh = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(fresh);
      setLimitNotice('Mission-configured alert thresholds updated (user-configured, not NASA-approved limits).');
    } catch (err) {
      setLimitNotice(err instanceof Error ? err.message : 'Unable to save configured limits.');
    } finally {
      setSavingLimits(false);
    }
  };

  if (!activeMod) return null;
  const meta = statusMeta(activeMod.status);
  const { latest_telemetry: latest } = state;

  return (
    <div className="space-y-6">
      {/* Hazard Selection Pills */}
      <section className="mc-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {HAZARD_META.map((hm) => {
            const Icon = hm.icon;
            const isSel = hm.id === activeMod.id;
            const modMatch = modules.find((m) => m.id === hm.id);
            const hStatus = statusMeta(modMatch?.status || 'NORMAL');
            return (
              <button
                key={hm.id}
                type="button"
                onClick={() => onSelectHazard(hm.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-colors ${isSel
                  ? 'bg-[#EEF0F6] text-[#040404]'
                  : 'bg-[#0B0D1A] text-[#E5E5E4] border border-white/10 hover:text-[#FAF9FA]'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{hm.label}</span>
                <span className={`w-2 h-2 rounded-full ${hStatus.dotClass}`} />
              </button>
            );
          })}
        </div>
        <span className="text-xs text-[#E5E5E4]/75">{activeMod.provenance}</span>
      </section>

      {/* Main Hazard Header */}
      <section className="mc-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#FAF9FA]">{activeMod.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${meta.badgeClass}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-sm text-[#E5E5E4]/80 mt-1">
            Structured autonomous brief tailored for Mission Sol {latest.mission_day} ({latest.gravity_g}g).
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onAskAssistant(`Summarize current risks and guidance for ${activeMod.title} on Sol ${latest.mission_day}.`)
          }
          className="mc-btn-secondary px-4 py-2.5 text-sm inline-flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4 text-[#A5D8FF]" />
          <span>Ask AI Health Assistant</span>
        </button>
      </section>

      {/* The 4 Consistent Sections Required by Design Brief */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 1: What are we monitoring? */}
        <div className="mc-card p-5 lg:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#A5D8FF]">1. What are we monitoring?</h2>
          <p className="text-sm text-[#FAF9FA] leading-relaxed">{activeMod.what_are_we_monitoring}</p>

          {activeMod.id === 'radiation' && (
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-xl bg-[#0B0D1A] p-3">
                <div className="text-xs text-[#E5E5E4]/75">Absorbed Dose</div>
                <div className="text-lg font-bold text-[#FAF9FA] tabular-data mt-0.5">
                  {latest.absorbed_dose_mgy.toFixed(2)} mGy
                </div>
                <div className="text-xs text-[#E5E5E4]/60">Physical energy</div>
              </div>
              <div className="rounded-xl bg-[#0B0D1A] p-3">
                <div className="text-xs text-[#E5E5E4]/75">Equivalent Rate</div>
                <div className="text-lg font-bold text-[#FAF9FA] tabular-data mt-0.5">
                  {latest.equivalent_dose_rate_msv_day.toFixed(2)} mSv/d
                </div>
                <div className="text-xs text-[#E5E5E4]/60">Bio-weighted</div>
              </div>
              <div className="rounded-xl bg-[#0B0D1A] p-3">
                <div className="text-xs text-[#E5E5E4]/75">Cumulative</div>
                <div className="text-lg font-bold text-[#FAF9FA] tabular-data mt-0.5">
                  {latest.cumulative_effective_dose_msv.toFixed(1)} mSv
                </div>
                <div className="text-xs text-[#E5E5E4]/60">Mission total</div>
              </div>
            </div>
          )}

          {activeMod.id === 'gravity' && (
            <div className="rounded-xl bg-[#0B0D1A] p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#A5D8FF]">Gravity Environment Explorer</span>
                <div className="flex gap-1">
                  {(['1g', '0g', '0.38g'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGravityExplorer(g)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${gravityExplorer === g
                        ? 'bg-[#EEF0F6] text-[#040404]'
                        : 'bg-[#121522] text-[#E5E5E4]/80'
                        }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-sm font-medium text-[#FAF9FA]">{GRAVITY_GUIDE[gravityExplorer].label}</div>
              <p className="text-xs text-[#E5E5E4]/85 leading-relaxed">
                {GRAVITY_GUIDE[gravityExplorer].context} {GRAVITY_GUIDE[gravityExplorer].focus}
              </p>
            </div>
          )}
        </div>

        {/* Section 2: What has changed? */}
        <div className="mc-card p-5 lg:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#A5D8FF]">2. What has changed?</h2>
            <span className="text-xs text-[#E5E5E4]/75">
              {activeMod.id === 'radiation'
                ? '14-Sol Equiv. Dose Rate (mSv/day)'
                : activeMod.id === 'isolation'
                  ? '14-Sol Sleep Duration (hrs)'
                  : activeMod.id === 'gravity'
                    ? '14-Sol Resting Heart Rate (BPM)'
                    : activeMod.id === 'environment'
                      ? '14-Sol Cabin CO₂ (mmHg)'
                      : '14-Sol One-Way Signal Delay (min)'}
            </span>
          </div>
          <p className="text-sm text-[#FAF9FA] leading-relaxed">{activeMod.what_has_changed}</p>
          <div className="h-[170px] w-full rounded-xl bg-[#0B0D1A] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="hazArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A5D8FF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#A5D8FF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="sol" stroke="#94a3b8" fontSize={11} tickFormatter={(s) => `S${s}`} />
                <YAxis stroke="#94a3b8" fontSize={11} width={36} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121522',
                    border: '1px solid rgba(165,216,255,0.35)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#FAF9FA',
                  }}
                  labelFormatter={(s) => `Sol ${s}`}
                />
                <Area type="monotone" dataKey="primary" stroke="#A5D8FF" strokeWidth={2} fill="url(#hazArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section 3: Why does it matter in space? */}
        <div className="mc-card p-5 lg:p-6 space-y-3">
          <h2 className="text-lg font-semibold text-[#A5D8FF]">3. Why does it matter in space?</h2>
          <p className="text-sm text-[#FAF9FA] leading-relaxed">{activeMod.why_it_matters_in_space}</p>
          <div className="rounded-xl bg-[#0B0D1A] p-3.5 text-xs text-[#E5E5E4]/80 leading-relaxed">
            {activeMod.id === 'radiation'
              ? 'Distinction notice: Absorbed dose (Gy) is distinct from equivalent/effective dose (Sv). The NASA Radiation Data Portal (ARMAS) represents Earth atmosphere flights, not Mars surface exposure.'
              : activeMod.id === 'isolation'
                  ? 'Clinical safeguard: TARSCARE tracks mood, stress, and sleep recovery trends without diagnosing depression, anxiety, or psychiatric conditions.'
                  : activeMod.id === 'environment'
                    ? 'Clinical safeguard: Correlates respiratory dryness or headaches with cabin CO₂/humidity and NASA OSDR/EDA guidance without auto-diagnosing infection.'
                    : 'Scientific alignment: Grounded in NASA Human Research Program (HRP) and Canadian Space Agency (CSA) studies (CCISS, CARDIOBREATH, C-STARS, TBone, Vascular).'}
          </div>
        </div>

        {/* Section 4: What should I do next? */}
        <div className="mc-card p-5 lg:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#A5D8FF]">4. What should I do next?</h2>
          <p className="text-sm text-[#FAF9FA] leading-relaxed">{activeMod.what_should_i_do_next}</p>

          {(activeMod.id === 'radiation' || activeMod.id === 'environment') && (
            <div className="rounded-xl bg-[#0B0D1A] p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E5E5E4]">
                <Settings2 className="w-4 h-4 text-[#A5D8FF]" />
                <span>Mission-Configured Demo Alert Threshold (Non-NASA Reference)</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {activeMod.id === 'radiation' ? (
                  <label className="flex items-center gap-2 text-xs text-[#E5E5E4]">
                    <span>Daily Equiv. Warn (mSv/day):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={warnLimit}
                      onChange={(e) => setWarnLimit(parseFloat(e.target.value) || 1.2)}
                      className="w-24 rounded-lg bg-[#121522] border border-white/15 px-2.5 py-1.5 text-sm text-[#FAF9FA] tabular-data"
                    />
                  </label>
                ) : (
                  <label className="flex items-center gap-2 text-xs text-[#E5E5E4]">
                    <span>Cabin CO₂ Warn (mmHg):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={co2Limit}
                      onChange={(e) => setCo2Limit(parseFloat(e.target.value) || 3.0)}
                      className="w-24 rounded-lg bg-[#121522] border border-white/15 px-2.5 py-1.5 text-sm text-[#FAF9FA] tabular-data"
                    />
                  </label>
                )}
                <button
                  type="button"
                  disabled={savingLimits}
                  onClick={saveConfiguredLimits}
                  className="mc-btn-secondary px-3.5 py-1.5 text-xs"
                >
                  {savingLimits ? 'Updating...' : 'Apply Config Limit'}
                </button>
              </div>
              {limitNotice && <p className="text-xs text-[#A5D8FF]">{limitNotice}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};