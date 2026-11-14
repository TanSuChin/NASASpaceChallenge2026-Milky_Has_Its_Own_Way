import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Clock,
  HeartPulse,
  Moon,
  Radio,
  ShieldAlert,
  Thermometer,
  Wind,
} from 'lucide-react';
import { FullSystemState } from '../types';
import { InteractiveHumanBody } from './InteractiveHumanBody';
import { formatRecordedTime, provenanceLabel, statusMeta } from './uiHelpers';

interface MissionOverviewViewProps {
  state: FullSystemState;
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  onStartAssessment: (regionId?: string) => void;
  onOpenHazard: (hazardId: string) => void;
  onAskAssistant: (prompt: string) => void;
  onOpenEmergency: () => void;
}

type TrendTab = 'vitals' | 'sleep_mood' | 'radiation' | 'environment';

export const MissionOverviewView: React.FC<MissionOverviewViewProps> = ({
  state,
  selectedRegionId,
  onSelectRegion,
  onStartAssessment,
  onOpenHazard,
  onAskAssistant,
  onOpenEmergency,
}) => {
  const [trendDays, setTrendDays] = useState<7 | 14 | 30>(14);
  const [trendTab, setTrendTab] = useState<TrendTab>('sleep_mood');

  const { latest_telemetry: latest, astronaut, assessment, telemetry_history } = state;
  const glance = assessment.glance_summary;
  const overallMeta = statusMeta(assessment.overall_status);
  const recordedTime = formatRecordedTime(latest.timestamp);

  const slicedHistory = useMemo(
    () => telemetry_history.slice(-trendDays),
    [telemetry_history, trendDays],
  );

  const bodyRegions = assessment.marscare_body_regions || [];

  const vitalCards = useMemo(() => {
    const hrDelta = Math.round(latest.heart_rate_bpm - astronaut.baseline_hr_bpm);
    const sleepDelta = (latest.sleep_duration_hrs - astronaut.baseline_sleep_hrs).toFixed(1);
    const tempDelta = (latest.body_temp_c - astronaut.baseline_temp_c).toFixed(1);
    const moodAvg = ((latest.mood_score + (10 - latest.stress_level)) / 2).toFixed(1);
    return [
      {
        title: 'Heart Rate',
        value: `${Math.round(latest.heart_rate_bpm)}`,
        unit: 'BPM',
        baseline: `Baseline ${Math.round(astronaut.baseline_hr_bpm)} BPM (${hrDelta >= 0 ? '+' : ''}${hrDelta})`,
        time: recordedTime,
        regionId: 'heart',
        icon: HeartPulse,
        flag: Math.abs(hrDelta) >= 12 ? 'WARNING' : 'NORMAL',
      },
      {
        title: 'Blood Pressure',
        value: `${Math.round(latest.systolic_bp_mmhg)}/${Math.round(latest.diastolic_bp_mmhg)}`,
        unit: 'mmHg',
        baseline: `Baseline ${astronaut.baseline_systolic_mmhg}/${astronaut.baseline_diastolic_mmhg}`,
        time: recordedTime,
        regionId: 'heart',
        icon: Activity,
        flag: latest.systolic_bp_mmhg < 95 ? 'WARNING' : 'NORMAL',
      },
      {
        title: 'Oxygen Saturation',
        value: `${latest.spo2_pct.toFixed(1)}`,
        unit: '%',
        baseline: `Baseline ${astronaut.baseline_spo2_pct}%`,
        time: recordedTime,
        regionId: 'lungs',
        icon: Wind,
        flag: latest.spo2_pct < 95 ? 'WARNING' : 'NORMAL',
      },
      {
        title: 'Body Temperature',
        value: `${latest.body_temp_c.toFixed(1)}`,
        unit: '°C',
        baseline: `Baseline ${astronaut.baseline_temp_c}°C (${Number(tempDelta) >= 0 ? '+' : ''}${tempDelta})`,
        time: recordedTime,
        regionId: 'whole_body',
        icon: Thermometer,
        flag: latest.body_temp_c >= 37.8 ? 'WARNING' : 'NORMAL',
      },
      {
        title: 'Sleep Duration',
        value: `${latest.sleep_duration_hrs.toFixed(1)}`,
        unit: 'hrs',
        baseline: `Baseline ${astronaut.baseline_sleep_hrs}h (${Number(sleepDelta) >= 0 ? '+' : ''}${sleepDelta}h)`,
        time: recordedTime,
        regionId: 'head_and_brain',
        icon: Moon,
        flag: latest.sleep_duration_hrs <= 6.2 ? 'WARNING' : 'NORMAL',
      },
      {
        title: 'Stress & Mood',
        value: moodAvg,
        unit: '/10',
        baseline: `Mood ${latest.mood_score.toFixed(1)} · Stress ${latest.stress_level.toFixed(1)}`,
        time: recordedTime,
        regionId: 'head_and_brain',
        icon: Activity,
        flag: latest.stress_level >= 6.0 || latest.mood_score <= 5.5 ? 'WARNING' : 'NORMAL',
      },
    ];
  }, [latest, astronaut, recordedTime]);

  const hazardSummaryCards = useMemo(() => {
    const hs = assessment.hazard_statuses || {};
    const mods = assessment.hazard_modules_4step || [];
    const statusFor = (id: string, fullKey: string) =>
      mods.find((m) => m.id === id)?.status || hs[fullKey] || 'NORMAL';
    return [
      {
        id: 'radiation',
        name: 'Space Radiation',
        status: statusFor('radiation', 'Space Radiation'),
        metric: `${latest.equivalent_dose_rate_msv_day.toFixed(2)} mSv/day`,
        sub: `${latest.absorbed_dose_mgy.toFixed(2)} mGy absorbed`,
      },
      {
        id: 'isolation',
        name: 'Isolation & Confinement',
        status: statusFor('isolation', 'Isolation and Confinement'),
        metric: `${latest.sleep_duration_hrs.toFixed(1)} hrs sleep`,
        sub: `Mood ${latest.mood_score.toFixed(1)} · Fatigue ${latest.fatigue_level.toFixed(1)}`,
      },
      {
        id: 'distance',
        name: 'Distance from Earth',
        status: statusFor('distance', 'Distance from Earth'),
        metric: assessment.comm_mode?.label || 'Delayed',
        sub: `${state.comm_state.one_way_delay_minutes} min one-way`,
      },
      {
        id: 'gravity',
        name: 'Gravity Fields',
        status: statusFor('gravity', 'Gravity Fields'),
        metric: `${latest.gravity_g} g field`,
        sub: `Strength ${latest.muscle_strength_idx.toFixed(0)}% · Bal ${latest.balance_score.toFixed(0)}%`,
      },
      {
        id: 'environment',
        name: 'Hostile Environments',
        status: statusFor('environment', 'Hostile and Closed Environments'),
        metric: `${latest.co2_mmhg.toFixed(1)} mmHg CO₂`,
        sub: `O₂ ${latest.oxygen_pct.toFixed(1)}% · RH ${latest.humidity_pct.toFixed(0)}%`,
      },
    ];
  }, [assessment, latest, state.comm_state.one_way_delay_minutes]);

  return (
    <div className="space-y-4">
      {/* 1. Crew Wayfinding Triage Band: Immediate 3-Question Health Glance */}
      <section
        aria-label="Crew Health Triage Overview"
        className="mc-card p-3.5 lg:p-4 border border-[#A5D8FF]/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[180px_1fr_1fr_1fr_210px] gap-4 items-center">
          {/* Sol & Context Anchor */}
          <div className="flex md:flex-col justify-between items-baseline md:items-start gap-2 pr-2">
            <div>
              <div className="text-sm text-[#E5E5E4]/80">Mission Sol</div>
              <div className="text-4xl lg:text-5xl font-bold text-[#FAF9FA] tabular-data tracking-tight">
                {latest.mission_day}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="px-2.5 py-1 rounded-full text-xs bg-[#0B0D1A] text-[#A5D8FF] border border-[#A5D8FF]/30">
                {latest.gravity_g}g Field
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-[#0B0D1A] text-[#E5E5E4] border border-white/10">
                {provenanceLabel(latest.provenance)}
              </span>
            </div>
          </div>

          {/* Question 1: How am I doing? */}
          <div className="rounded-xl bg-[#0B0D1A] p-3.5 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h2 className="text-sm font-semibold text-[#A5D8FF]">How am I doing?</h2>
              <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${overallMeta.badgeClass}`}>
                {overallMeta.label}
              </span>
            </div>
            <p className="text-sm text-[#FAF9FA] leading-snug">
              {glance?.how_am_i_doing || 'Evaluation complete against your personal mission baseline.'}
            </p>
          </div>

          {/* Question 2: What has changed? */}
          <div className="rounded-xl bg-[#0B0D1A] p-3.5 h-full flex flex-col justify-between">
            <h2 className="text-sm font-semibold text-[#A5D8FF] mb-1.5">What has changed?</h2>
            <p className="text-sm text-[#E5E5E4] leading-snug">
              {glance?.what_has_changed || 'Monitoring 30-Sol physiological shifts.'}
            </p>
          </div>

          {/* Question 3: Should I take any action? */}
          <div className="rounded-xl bg-[#0B0D1A] p-3.5 h-full flex flex-col justify-between">
            <h2 className="text-sm font-semibold text-[#A5D8FF] mb-1.5">Should I take any action?</h2>
            <p className="text-sm text-[#E5E5E4] leading-snug">
              {glance?.should_i_take_action || 'Continue daily countermeasures and log check-ins.'}
            </p>
          </div>

          {/* Action CTA Column */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => onStartAssessment(selectedRegionId)}
              className="mc-btn-primary w-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2"
            >
              <span>Start Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {assessment.overall_status !== 'NORMAL' && (
              <button
                type="button"
                onClick={onOpenEmergency}
                className="mc-btn-secondary w-full px-4 py-2 text-xs inline-flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                <span>Onboard Protocol</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Centerpiece Feature: Interactive Human Body */}
      <InteractiveHumanBody
        regions={bodyRegions}
        selectedRegionId={selectedRegionId}
        onSelectRegion={onSelectRegion}
        onStartAssessment={(id) => onStartAssessment(id)}
        onAskAssistant={onAskAssistant}
      />

      {/* 3. Latest Vital Signs vs Personal Baseline */}
      <section aria-label="Latest Vital Signs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
          <div>
            <h2 className="text-xl font-semibold text-[#FAF9FA]">Vital Signs vs. Personal Baseline</h2>
            <p className="text-sm text-[#E5E5E4]/75">
              Tap any card to focus its body system above. Units and last recorded timestamps preserved.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#E5E5E4]/75">
            <Clock className="w-3.5 h-3.5 text-[#A5D8FF]" />
            <span>Updated {recordedTime}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {vitalCards.map((vc) => {
            const Icon = vc.icon;
            const flagMeta = statusMeta(vc.flag);
            return (
              <button
                key={vc.title}
                type="button"
                onClick={() => onSelectRegion(vc.regionId)}
                className="mc-card p-4 text-left hover:border-[#A5D8FF]/45 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[#E5E5E4] flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-[#A5D8FF]" />
                    <span>{vc.title}</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${flagMeta.dotClass}`} title={flagMeta.label} />
                </div>
                <div className="tabular-data">
                  <span className="text-2xl font-bold text-[#FAF9FA]">{vc.value}</span>
                  <span className="text-xs text-[#E5E5E4]/75 ml-1">{vc.unit}</span>
                </div>
                <div className="text-xs text-[#A5D8FF]/90 leading-snug">{vc.baseline}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Five Spaceflight Hazard Overview Cards */}
      <section aria-label="Five Spaceflight Hazards Overview">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div>
            <h2 className="text-xl font-semibold text-[#FAF9FA]">Five Spaceflight Hazards</h2>
            <p className="text-sm text-[#E5E5E4]/75">
              Open any hazard module to inspect monitoring data, spaceflight effects, and guided actions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {hazardSummaryCards.map((hc) => {
            const meta = statusMeta(hc.status);
            return (
              <button
                key={hc.id}
                type="button"
                onClick={() => onOpenHazard(hc.id)}
                className="mc-card p-4 text-left hover:border-[#A5D8FF]/45 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-[#FAF9FA] leading-snug">{hc.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                </div>
                <div>
                  <div className="text-base font-bold text-[#FAF9FA] tabular-data">{hc.metric}</div>
                  <div className="text-xs text-[#E5E5E4]/75 mt-0.5">{hc.sub}</div>
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-[#A5D8FF] pt-1 border-t border-white/[0.06]">
                  <span>Open module</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Interactive Health Trends (7, 14, or 30 Mission Days) + Important Alerts */}
      <section className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-5">
        {/* Left: Interactive 7 / 14 / 30 Sol Trends Chart */}
        <div className="mc-card p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-semibold text-[#FAF9FA]">Mission Health Trends</h2>
              <p className="text-sm text-[#E5E5E4]/75">
                Interactive timeline across the last {trendDays} mission days (Simulated + User Entries)
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#0B0D1A] p-1 rounded-full border border-white/[0.08]">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setTrendDays(days)}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-colors ${trendDays === days
                      ? 'bg-[#EEF0F6] text-[#040404]'
                      : 'text-[#E5E5E4] hover:text-[#FAF9FA]'
                    }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Metric Series Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: 'sleep_mood', label: 'Sleep & Mood' },
              { id: 'vitals', label: 'Heart Rate & SpO₂' },
              { id: 'radiation', label: 'Radiation (mSv vs mGy)' },
              { id: 'environment', label: 'Cabin CO₂ & Humidity' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrendTab(t.id as TrendTab)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${trendTab === t.id
                    ? 'bg-[#A5D8FF]/20 text-[#FAF9FA] border border-[#A5D8FF]'
                    : 'bg-[#0B0D1A] text-[#E5E5E4]/80 border border-white/[0.07] hover:text-[#FAF9FA]'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={slicedHistory} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="mission_day"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(d) => `Sol ${d}`}
                />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121522',
                    border: '1px solid rgba(165,216,255,0.35)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#FAF9FA',
                  }}
                  labelFormatter={(d) => `Mission Sol ${d}`}
                />
                {trendTab === 'sleep_mood' && (
                  <>
                    <ReferenceLine
                      y={astronaut.baseline_sleep_hrs}
                      stroke="rgba(165,216,255,0.45)"
                      strokeDasharray="4 4"
                    />
                    <Line type="monotone" dataKey="sleep_duration_hrs" name="Sleep (hrs)" stroke="#A5D8FF" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="mood_score" name="Mood (/10)" stroke="#E5E5E4" strokeWidth={2} dot={false} />
                  </>
                )}
                {trendTab === 'vitals' && (
                  <>
                    <ReferenceLine
                      y={astronaut.baseline_hr_bpm}
                      stroke="rgba(165,216,255,0.45)"
                      strokeDasharray="4 4"
                    />
                    <Line type="monotone" dataKey="heart_rate_bpm" name="Heart Rate (BPM)" stroke="#A5D8FF" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="spo2_pct" name="SpO₂ (%)" stroke="#E5E5E4" strokeWidth={2} dot={false} />
                  </>
                )}
                {trendTab === 'radiation' && (
                  <>
                    <Line type="monotone" dataKey="equivalent_dose_rate_msv_day" name="Equivalent Rate (mSv/day)" stroke="#A5D8FF" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="absorbed_dose_mgy" name="Absorbed Dose (mGy/day)" stroke="#E5E5E4" strokeWidth={2} dot={false} />
                  </>
                )}
                {trendTab === 'environment' && (
                  <>
                    <Line type="monotone" dataKey="co2_mmhg" name="Cabin CO₂ (mmHg)" stroke="#A5D8FF" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="humidity_pct" name="Relative Humidity (%)" stroke="#E5E5E4" strokeWidth={2} dot={false} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Important Alerts & Suggested Next Actions */}
        <div className="mc-card p-5 lg:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-[#FAF9FA]">Important Alerts &amp; Actions</h2>
              <span className="text-xs text-[#E5E5E4]/75">
                {assessment.active_alerts.length} active
              </span>
            </div>

            {assessment.active_alerts.length === 0 ? (
              <div className="rounded-xl bg-[#0B0D1A] p-4 text-sm text-[#E5E5E4]">
                No threshold warnings active. All monitored systems are operating calmly within personal mission baselines.
              </div>
            ) : (
              <div className="space-y-2.5">
                {assessment.active_alerts.slice(0, 4).map((al) => {
                  const meta = statusMeta(al.severity);
                  return (
                    <div key={al.id} className="rounded-xl bg-[#0B0D1A] p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#FAF9FA] flex items-center gap-1.5">
                          <AlertTriangle className={`w-4 h-4 ${meta.textClass}`} />
                          <span>{al.hazard}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#E5E5E4] leading-relaxed">{al.message}</p>
                      <p className="text-xs text-[#A5D8FF] leading-relaxed">
                        Next step: {al.action_required}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#E5E5E4]/75">
              <Radio className="w-3.5 h-3.5 text-[#A5D8FF]" />
              <span>Offline-ready autonomous logic</span>
            </span>
            <button
              type="button"
              onClick={onOpenEmergency}
              className="mc-btn-secondary px-4 py-2 text-xs"
            >
              Emergency Escalation Checklist
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};