import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Play,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { FullSystemState, MissionPhase } from '../types';
import { AIAssessmentSummary } from './ui/AIAssessmentSummary';
import { StatusIndicator } from './ui/StatusIndicator';
import { NavSectionId } from './ui/NavigationSidebar';
import { apiRequest, formatRecordedTime, provenanceLabel } from './uiHelpers';

interface AIHealthAssessmentViewProps {
  state: FullSystemState;
  focusedRegionId?: string;
  onStateUpdated: (next: FullSystemState) => void;
  onOpenEmergency: (hazard?: string) => void;
  onNavigate: (tab: NavSectionId) => void;
}

const SYMPTOM_GROUPS = [
  {
    label: 'Cardiopulmonary Urgent',
    items: ['Chest pain / discomfort', 'Palpitations', 'Shortness of breath', 'Faintness / presyncope'],
  },
  {
    label: 'Neurological & Sleep',
    items: ['Headache', 'Concentration / brain fog', 'Insomnia / poor sleep', 'Severe fatigue'],
  },
  {
    label: 'Vision, Balance & Habitat',
    items: ['Visual disturbances', 'Dizziness', 'Mild dry cough', 'Muscle or back discomfort'],
  },
];

/**
 * Calm, streamlined AI Health Assessment workspace led by a single "Run Health Assessment"
 * action that inspects available sensor streams and telemetry before running an explained evaluation.
 */
export const AIHealthAssessmentView: React.FC<AIHealthAssessmentViewProps> = ({
  state,
  focusedRegionId,
  onStateUpdated,
  onOpenEmergency,
  onNavigate,
}) => {
  const { latest_telemetry: latest, assessment } = state;

  const [running, setRunning] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false);
  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState(false);

  const [form, setForm] = useState({
    mission_phase: latest.mission_phase as MissionPhase,
    gravity_g: latest.gravity_g,
    heart_rate_bpm: latest.heart_rate_bpm,
    systolic_bp_mmhg: latest.systolic_bp_mmhg,
    diastolic_bp_mmhg: latest.diastolic_bp_mmhg,
    spo2_pct: latest.spo2_pct,
    respiratory_rate_bpm: latest.respiratory_rate_bpm ?? 16,
    body_temp_c: latest.body_temp_c,
    sleep_duration_hrs: latest.sleep_duration_hrs,
    sleep_quality_pct: latest.sleep_quality_pct,
    mood_score: latest.mood_score,
    stress_level: latest.stress_level,
    fatigue_level: latest.fatigue_level,
    social_interaction_score: latest.social_interaction_score,
    absorbed_dose_mgy: latest.absorbed_dose_mgy,
    equivalent_dose_rate_msv_day: latest.equivalent_dose_rate_msv_day,
    radiation_event_type: latest.radiation_event_type || 'GCR_MARS_SHIELDED',
    co2_mmhg: latest.co2_mmhg,
    cabin_temp_c: latest.cabin_temp_c,
    oxygen_pct: latest.oxygen_pct,
    humidity_pct: latest.humidity_pct,
    air_quality_index: latest.air_quality_index,
    physical_activity_mins: latest.physical_activity_mins,
    exercise_performance_pct: latest.exercise_performance_pct,
    muscle_strength_idx: latest.muscle_strength_idx,
    exercise_adherence_pct: latest.exercise_adherence_pct,
    balance_score: latest.balance_score,
    dizziness_severity: latest.dizziness_severity,
    notes: '',
  });

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(() => {
    const syms: string[] = [];
    if (latest.chest_discomfort) syms.push('Chest pain / discomfort');
    if (latest.palpitations) syms.push('Palpitations');
    if (latest.shortness_of_breath) syms.push('Shortness of breath');
    if (latest.faintness_presyncope) syms.push('Faintness / presyncope');
    (latest.reported_symptoms || []).forEach((s) => {
      if (s && !syms.includes(s)) syms.push(s);
    });
    return syms;
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      mission_phase: latest.mission_phase as MissionPhase,
      gravity_g: latest.gravity_g,
      heart_rate_bpm: latest.heart_rate_bpm,
      systolic_bp_mmhg: latest.systolic_bp_mmhg,
      diastolic_bp_mmhg: latest.diastolic_bp_mmhg,
      spo2_pct: latest.spo2_pct,
      respiratory_rate_bpm: latest.respiratory_rate_bpm ?? 16,
      body_temp_c: latest.body_temp_c,
      sleep_duration_hrs: latest.sleep_duration_hrs,
      sleep_quality_pct: latest.sleep_quality_pct,
      mood_score: latest.mood_score,
      stress_level: latest.stress_level,
      fatigue_level: latest.fatigue_level,
      social_interaction_score: latest.social_interaction_score,
      absorbed_dose_mgy: latest.absorbed_dose_mgy,
      equivalent_dose_rate_msv_day: latest.equivalent_dose_rate_msv_day,
      radiation_event_type: latest.radiation_event_type || 'GCR_MARS_SHIELDED',
      co2_mmhg: latest.co2_mmhg,
      cabin_temp_c: latest.cabin_temp_c,
      oxygen_pct: latest.oxygen_pct,
      humidity_pct: latest.humidity_pct,
      air_quality_index: latest.air_quality_index,
      physical_activity_mins: latest.physical_activity_mins,
      exercise_performance_pct: latest.exercise_performance_pct,
      muscle_strength_idx: latest.muscle_strength_idx,
      exercise_adherence_pct: latest.exercise_adherence_pct,
      balance_score: latest.balance_score,
      dizziness_severity: latest.dizziness_severity,
    }));
  }, [latest.id, latest.mission_day, latest.timestamp]);

  const hardwareReadiness = useMemo(() => {
    const entries = Object.values(state.device_states || {});
    const live = entries.filter((d) => d.connection_status === 'connected');
    const sim = entries.filter((d) => d.connection_status === 'simulation');
    const ageHours = Math.max(
      0,
      Math.round((Date.now() - new Date(latest.timestamp).getTime()) / 3600000),
    );
    const confidence =
      live.length > 0
        ? `High (${live.length} live hardware sensor${live.length > 1 ? 's' : ''})`
        : sim.length > 0 || latest.provenance === 'SYNTHETIC_DEMO'
          ? `Simulated / Synchronized Telemetry (${sim.length} simulated device${sim.length === 1 ? '' : 's'})`
          : ageHours > 24
            ? 'Low (No recent live sensor link — verify readings manually)'
            : 'Moderate (Synchronized crew telemetry)';

    return { liveCount: live.length, simCount: sim.length, confidence, ageHours };
  }, [state.device_states, latest.timestamp, latest.provenance]);

  const runAssessment = async (overridePayload?: typeof form) => {
    setRunning(true);
    setStatusNotice(null);
    try {
      const payload = overridePayload || form;
      await apiRequest('/api/assessment/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          selected_symptoms: selectedSymptoms,
        }),
      });
      const freshState = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(freshState);
      setStatusNotice({
        tone: 'ok',
        text: `Assessment completed using ${hardwareReadiness.liveCount > 0 ? 'live hardware + synchronized telemetry' : 'latest available synchronized telemetry'} at ${formatRecordedTime(freshState.latest_telemetry.timestamp)}.`,
      });
    } catch (err) {
      setStatusNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Failed to run assessment.',
      });
    } finally {
      setRunning(false);
    }
  };

  const loadScenario = async (scenarioId: string) => {
    setRunning(true);
    setStatusNotice(null);
    try {
      const next = await apiRequest<FullSystemState>(`/api/scenario/${scenarioId}`, {
        method: 'POST',
      });
      onStateUpdated(next);
      setStatusNotice({
        tone: 'ok',
        text: `Loaded demonstration mission dataset (${scenarioId}) for Sol ${next.latest_telemetry.mission_day}.`,
      });
    } catch (err) {
      setStatusNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to switch demonstration scenario.',
      });
    } finally {
      setRunning(false);
    }
  };

  const toggleSymptom = (item: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  };

  return (
    <div className="space-y-8">
      {/* Primary Action Hero */}
      <section className="tc-panel p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusIndicator
              status={hardwareReadiness.liveCount > 0 ? 'CONNECTED' : 'SIMULATION'}
              label={
                hardwareReadiness.liveCount > 0
                  ? `${hardwareReadiness.liveCount} Hardware Sensor Connected`
                  : 'Telemetry Sync Ready'
              }
            />
            {focusedRegionId && (
              <span className="text-xs text-[var(--tc-text-muted)]">
                · Focused system: {focusedRegionId.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
            AI Health Assessment
          </h1>
          <p className="text-sm text-[var(--tc-text-secondary)] leading-relaxed">
            Automatically validates available biometric hardware streams and mission telemetry against your personal flight baseline, checks five spaceflight hazard models, and explains findings clearly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
          <button
            type="button"
            disabled={running}
            onClick={() => runAssessment()}
            className="tc-btn-primary px-6 py-3.5 text-sm inline-flex items-center justify-center gap-2.5"
          >
            {running ? (
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{running ? 'Evaluating Telemetry...' : 'Run Health Assessment'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('monitoring')}
            className="text-xs text-[var(--tc-accent)] hover:underline inline-flex items-center gap-1 self-center lg:self-end"
          >
            <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Inspect Hardware Connections</span>
          </button>
        </div>
      </section>

      {statusNotice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            statusNotice.tone === 'ok'
              ? 'border-[var(--tc-ok-border)] bg-[var(--tc-ok-bg)] text-[var(--tc-ok-fg)]'
              : 'border-[var(--tc-crit-border)] bg-[var(--tc-crit-bg)] text-[var(--tc-crit-fg)]'
          }`}
        >
          {statusNotice.text}
        </div>
      )}

      {/* Structured Assessment Summary */}
      <AIAssessmentSummary
        state={state}
        dataConfidenceLabel={hardwareReadiness.confidence}
        lastValidatedAt={latest.timestamp}
        onOpenEmergency={onOpenEmergency}
        onOpenHistory={() => onNavigate('history')}
      />

      {/* Progressive Disclosure: Manual Inputs & Symptom Entry */}
      <section className="tc-panel overflow-hidden">
        <button
          type="button"
          onClick={() => setManualDrawerOpen((p) => !p)}
          aria-expanded={manualDrawerOpen}
          className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[var(--tc-elevated)]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-[var(--tc-text)]">
                Manual Reading Entry &amp; Symptom Reporting
              </div>
              <div className="text-xs text-[var(--tc-text-muted)]">
                Use when a wearable sensor is disconnected or you want to add new subjective symptoms.
              </div>
            </div>
          </div>
          {manualDrawerOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
          )}
        </button>

        {manualDrawerOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAssessment();
            }}
            className="px-6 pb-6 pt-2 border-t border-[var(--tc-border)] space-y-6"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { key: 'heart_rate_bpm', label: 'Heart Rate (bpm)', step: 1 },
                { key: 'spo2_pct', label: 'SpO2 (%)', step: 0.5 },
                { key: 'systolic_bp_mmhg', label: 'Systolic BP (mmHg)', step: 1 },
                { key: 'diastolic_bp_mmhg', label: 'Diastolic BP (mmHg)', step: 1 },
                { key: 'body_temp_c', label: 'Body Temp (°C)', step: 0.1 },
                { key: 'sleep_duration_hrs', label: 'Sleep (hrs)', step: 0.2 },
                { key: 'co2_mmhg', label: 'Cabin CO2 (mmHg)', step: 0.1 },
                { key: 'physical_activity_mins', label: 'Activity (min)', step: 5 },
              ].map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label
                    htmlFor={`assess-${field.key}`}
                    className="block text-xs text-[var(--tc-text-secondary)]"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`assess-${field.key}`}
                    type="number"
                    step={field.step}
                    value={(form as Record<string, any>)[field.key]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [field.key]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="tc-input w-full px-3 py-2 text-sm tabular-data"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="text-xs font-medium text-[var(--tc-text-secondary)]">
                Current Symptoms (Select all applicable)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SYMPTOM_GROUPS.map((grp) => (
                  <div key={grp.label} className="space-y-2">
                    <div className="text-xs text-[var(--tc-text-muted)]">{grp.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {grp.items.map((item) => {
                        const active = selectedSymptoms.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleSymptom(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                              active
                                ? 'border-[var(--tc-accent)] bg-[var(--tc-accent-soft)] text-[var(--tc-text)] font-medium'
                                : 'border-[var(--tc-border-strong)] bg-[var(--tc-bg)] text-[var(--tc-text-secondary)] hover:text-[var(--tc-text)]'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={running}
                className="tc-btn-primary px-5 py-2.5 text-sm"
              >
                {running ? 'Running Assessment...' : 'Submit Readings & Re-Evaluate'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Progressive Disclosure: Demonstration Mission Scenarios */}
      <section className="tc-panel overflow-hidden">
        <button
          type="button"
          onClick={() => setScenarioDrawerOpen((p) => !p)}
          aria-expanded={scenarioDrawerOpen}
          className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[var(--tc-elevated)]/40 transition-colors"
        >
          <div>
            <div className="text-sm font-semibold text-[var(--tc-text)]">
              Simulate Off-Nominal Mission Scenarios
            </div>
            <div className="text-xs text-[var(--tc-text-muted)]">
              Load validated demonstration states to inspect warning and critical clinical workflows.
            </div>
          </div>
          {scenarioDrawerOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
          )}
        </button>

        {scenarioDrawerOpen && (
          <div className="px-6 pb-6 pt-3 border-t border-[var(--tc-border)] flex flex-wrap gap-3">
            {[
              { id: 'NOMINAL_MARS_SOL', label: 'Nominal 0.38g Surface Sol' },
              { id: 'SPE_SOLAR_STORM_CRITICAL', label: 'SPE Solar Radiation Event' },
              { id: 'ENV_CO2_CONFINEMENT_WARNING', label: 'Elevated Cabin CO2 & Sleep Strain' },
              { id: 'GRAVITY_ORTHOSTATIC_CRITICAL', label: 'Critical Orthostatic Episode' },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                disabled={running}
                onClick={() => loadScenario(sc.id)}
                className="tc-btn-secondary px-4 py-2 text-xs"
              >
                {sc.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
