import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { FullSystemState, MissionPhase } from '../types';
import { apiRequest, provenanceLabel, statusMeta } from './uiHelpers';

interface HealthAssessmentViewProps {
  state: FullSystemState;
  focusedRegionId?: string;
  onStateUpdated: (nextState: FullSystemState) => void;
  onOpenEmergency: () => void;
}

const SYMPTOM_CATEGORIES = [
  {
    category: 'Neurological & Mood',
    items: [
      'Headache',
      'Concentration / brain fog',
      'Insomnia / poor sleep',
      'Severe fatigue',
      'Low mood',
      'Anxious / stressed',
      'Feeling isolated',
    ],
  },
  {
    category: 'Eyes, Balance & Gravity',
    items: [
      'Blurred / near vision change',
      'Dizziness / lightheadedness',
      'Faintness / presyncope',
      'Balance loss / disorientation',
    ],
  },
  {
    category: 'Lungs & Closed Habitat',
    items: [
      'Mild dry cough',
      'Throat irritation',
      'Shortness of breath',
      'Nasal congestion',
    ],
  },
  {
    category: 'Muscles, Bones & Systemic',
    items: [
      'Muscle or back discomfort',
      'Feverish / chills',
      'None — feeling well',
    ],
  },
];

export const HealthAssessmentView: React.FC<HealthAssessmentViewProps> = ({
  state,
  focusedRegionId,
  onStateUpdated,
  onOpenEmergency,
}) => {
  const { latest_telemetry: latest, assessment } = state;

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
    mood_score: latest.mood_score,
    stress_level: latest.stress_level,
    fatigue_level: latest.fatigue_level,
    absorbed_dose_mgy: latest.absorbed_dose_mgy,
    equivalent_dose_rate_msv_day: latest.equivalent_dose_rate_msv_day,
    co2_mmhg: latest.co2_mmhg,
    humidity_pct: latest.humidity_pct,
    physical_activity_mins: latest.physical_activity_mins,
    exercise_adherence_pct: latest.exercise_adherence_pct,
    notes: '',
  });

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(
    latest.respiratory_symptoms?.length ? latest.respiratory_symptoms : [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [lastSubmittedSymptoms, setLastSubmittedSymptoms] = useState<string[] | null>(null);

  // Daily Psychological & Sleep Check-in State
  const [psychOpen, setPsychOpen] = useState(false);
  const [psychRatings, setPsychRatings] = useState({
    emotional_condition_rating: 7,
    psychological_stress_rating: 4,
    motivation_rating: 8,
    fatigue_rating: 5,
    sleep_difficulty_rating: 4,
    isolation_feeling_rating: 3,
    concentration_workload_rating: 6,
    journal_reflection: '',
  });
  const [psychSaved, setPsychSaved] = useState(false);

  const toggleSymptom = (sym: string) => {
    if (sym.startsWith('None')) {
      setSelectedSymptoms(['None — feeling well']);
      return;
    }
    setSelectedSymptoms((prev) => {
      const cleaned = prev.filter((s) => !s.startsWith('None'));
      return cleaned.includes(sym) ? cleaned.filter((s) => s !== sym) : [...cleaned, sym];
    });
  };

  const applyPhasePreset = (phase: MissionPhase) => {
    const g = phase === 'MICROGRAVITY_TRANSIT' ? 0.0 : phase === 'EARTH_RETURN' ? 1.0 : 0.38;
    setForm((prev) => ({ ...prev, mission_phase: phase, gravity_g: g }));
  };

  const loadScenario = async (scenarioId: string) => {
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await apiRequest<{ state: FullSystemState }>(`/api/scenario/${scenarioId}`, {
        method: 'POST',
      });
      onStateUpdated(res.state);
      const nl = res.state.latest_telemetry;
      setForm((prev) => ({
        ...prev,
        mission_phase: nl.mission_phase,
        gravity_g: nl.gravity_g,
        heart_rate_bpm: nl.heart_rate_bpm,
        systolic_bp_mmhg: nl.systolic_bp_mmhg,
        diastolic_bp_mmhg: nl.diastolic_bp_mmhg,
        spo2_pct: nl.spo2_pct,
        respiratory_rate_bpm: nl.respiratory_rate_bpm ?? 16,
        body_temp_c: nl.body_temp_c,
        sleep_duration_hrs: nl.sleep_duration_hrs,
        mood_score: nl.mood_score,
        stress_level: nl.stress_level,
        fatigue_level: nl.fatigue_level,
        absorbed_dose_mgy: nl.absorbed_dose_mgy,
        equivalent_dose_rate_msv_day: nl.equivalent_dose_rate_msv_day,
        co2_mmhg: nl.co2_mmhg,
        humidity_pct: nl.humidity_pct,
      }));
      setFeedbackMsg(`Loaded demo profile (${provenanceLabel(nl.provenance)}).`);
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Unable to switch demo profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      await apiRequest('/api/assessment/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          selected_symptoms: selectedSymptoms,
        }),
      });
      const freshState = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(freshState);
      setLastSubmittedSymptoms(selectedSymptoms);
      setFeedbackMsg(
        `Assessment completed for Sol ${freshState.latest_telemetry.mission_day} (${provenanceLabel(freshState.latest_telemetry.provenance)}).`,
      );
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Assessment submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPsychCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/api/psych-questionnaire', {
        method: 'POST',
        body: JSON.stringify({
          mission_day: latest.mission_day,
          ...psychRatings,
        }),
      });
      const freshState = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(freshState);
      setPsychSaved(true);
    } finally {
      setSubmitting(false);
    }
  };

  const overallMeta = statusMeta(assessment.overall_status);
  const exp = assessment.structured_explanation;
  const tiers = assessment.guidance_tiers || {};

  return (
    <div className="space-y-6">
      {/* Header + Quick Demo Scenario Bar */}
      <section className="mc-card p-5 lg:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#FAF9FA]">Autonomous Health Assessment</h1>
          <p className="text-sm text-[#E5E5E4]/80 mt-1">
            Enter manual physiological readings, select any symptoms you notice, and receive explained onboard guidance.
            {focusedRegionId ? ` Focused from body system: ${focusedRegionId.replace(/_/g, ' ')}.` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#E5E5E4]/75 mr-1">Demo Scenarios:</span>
          {[
            { id: 'nominal', label: 'Nominal 0.38g' },
            { id: 'spe_storm', label: 'SPE Solar Event' },
            { id: 'co2_sleep_fatigue', label: 'CO₂ & Sleep Strain' },
            { id: 'critical_orthostatic', label: 'Critical Orthostatic' },
          ].map((sc) => (
            <button
              key={sc.id}
              type="button"
              disabled={submitting}
              onClick={() => loadScenario(sc.id)}
              className="mc-btn-secondary px-3 py-1.5 text-xs"
            >
              {sc.label}
            </button>
          ))}
        </div>
      </section>

      {feedbackMsg && (
        <div className="mc-card px-4 py-3 border border-[#A5D8FF]/35 flex items-center justify-between text-sm text-[#FAF9FA]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A5D8FF]" />
            <span>{feedbackMsg}</span>
          </span>
        </div>
      )}

      {/* Dual-Method Assessment Form: Method 1 (Measurements) + Method 2 (Symptoms) */}
      <form onSubmit={submitAssessment} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Method 1: Manual Measurement Input */}
        <div className="mc-card p-5 lg:p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[#FAF9FA]">Method 1: Manual Measurements</h2>
              <p className="text-xs text-[#E5E5E4]/75 mt-0.5">
                Preserves exact units (BPM, mmHg, %, °C, mGy, mSv/day).
              </p>
            </div>
            <div className="flex gap-1 bg-[#0B0D1A] p-1 rounded-full border border-white/10">
              {([
                { p: 'EARTH_RETURN', label: '1g Earth' },
                { p: 'MICROGRAVITY_TRANSIT', label: '0g Transit' },
                { p: 'MARS_SURFACE', label: '0.38g Mars' },
              ] as const).map((g) => (
                <button
                  key={g.p}
                  type="button"
                  onClick={() => applyPhasePreset(g.p)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${form.mission_phase === g.p
                      ? 'bg-[#EEF0F6] text-[#040404]'
                      : 'text-[#E5E5E4]/80 hover:text-[#FAF9FA]'
                    }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {[
              { key: 'heart_rate_bpm', label: 'Heart Rate (BPM)', step: 'any', min: 35, max: 200 },
              { key: 'systolic_bp_mmhg', label: 'Systolic BP (mmHg)', step: 'any', min: 70, max: 210 },
              { key: 'diastolic_bp_mmhg', label: 'Diastolic BP (mmHg)', step: 'any', min: 45, max: 130 },
              { key: 'spo2_pct', label: 'SpO₂ (%)', step: 'any', min: 75, max: 100 },
              { key: 'respiratory_rate_bpm', label: 'Resp. Rate (/min)', step: 'any', min: 8, max: 40 },
              { key: 'body_temp_c', label: 'Body Temp (°C)', step: 'any', min: 34.5, max: 41.5 },
              { key: 'sleep_duration_hrs', label: 'Sleep (hrs)', step: 'any', min: 1, max: 12 },
              { key: 'mood_score', label: 'Mood (/10)', step: 'any', min: 1, max: 10 },
              { key: 'stress_level', label: 'Stress (/10)', step: 'any', min: 1, max: 10 },
              { key: 'absorbed_dose_mgy', label: 'Absorbed Dose (mGy)', step: 'any', min: 0, max: 250 },
              { key: 'equivalent_dose_rate_msv_day', label: 'Equiv. Rate (mSv/d)', step: 'any', min: 0, max: 100 },
              { key: 'co2_mmhg', label: 'Cabin CO₂ (mmHg)', step: 'any', min: 0.5, max: 12 },
            ].map((fld) => (
              <label key={fld.key} className="block">
                <span className="text-xs text-[#E5E5E4]/85 block mb-1">{fld.label}</span>
                <input
                  type="number"
                  step={fld.step}
                  min={fld.min}
                  max={fld.max}
                  value={(form as Record<string, any>)[fld.key]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [fld.key]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-xl bg-[#0B0D1A] border border-white/10 px-3 py-2 text-sm text-[#FAF9FA] tabular-data focus:border-[#A5D8FF] focus:outline-none"
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="text-xs text-[#E5E5E4]/85 block mb-1">Optional Crew Observation Notes</span>
            <input
              type="text"
              placeholder="e.g., After surface EVA, noticed dry throat inside airlock..."
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-xl bg-[#0B0D1A] border border-white/10 px-3.5 py-2.5 text-sm text-[#FAF9FA] placeholder:text-[#E5E5E4]/45 focus:border-[#A5D8FF] focus:outline-none"
            />
          </label>
        </div>

        {/* Method 2: Categorized Symptom Selector + Submit */}
        <div className="mc-card p-5 lg:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#FAF9FA]">Method 2: Selectable Symptoms</h2>
              <p className="text-xs text-[#E5E5E4]/75 mt-0.5">
                Organised by body system — choose any symptoms you are experiencing now.
              </p>
            </div>

            <div className="space-y-3.5">
              {SYMPTOM_CATEGORIES.map((grp) => (
                <div key={grp.category} className="rounded-xl bg-[#0B0D1A] p-3.5">
                  <div className="text-xs font-semibold text-[#A5D8FF] mb-2">{grp.category}</div>
                  <div className="flex flex-wrap gap-2">
                    {grp.items.map((item) => {
                      const active = selectedSymptoms.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleSymptom(item)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active
                              ? 'bg-[#A5D8FF]/20 text-[#FAF9FA] border border-[#A5D8FF]'
                              : 'bg-[#121522] text-[#E5E5E4]/85 border border-white/10 hover:text-[#FAF9FA]'
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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setPsychOpen((v) => !v)}
              className="mc-btn-secondary px-4 py-2.5 text-xs"
            >
              {psychOpen ? 'Hide Behavioral Check-In' : 'Open Behavioral & Sleep Check-In'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="mc-btn-primary px-6 py-3 text-sm inline-flex items-center gap-2"
            >
              <Stethoscope className="w-4 h-4" />
              <span>{submitting ? 'Evaluating...' : 'Evaluate Health & Update Guidance'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Optional Behavioral & Sleep Self-Assessment Drawer (No Psychiatric Diagnosis) */}
      {psychOpen && (
        <form onSubmit={submitPsychCheckin} className="mc-card p-5 lg:p-6 space-y-4 border border-[#A5D8FF]/25">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[#FAF9FA]">Behavioral, Stress &amp; Sleep Check-In</h2>
              <p className="text-xs text-[#E5E5E4]/75">
                Private reflection &amp; trend tracking — never performs psychiatric diagnosis.
              </p>
            </div>
            {psychSaved && (
              <span className="text-xs font-medium text-[#A5D8FF]">Check-in saved locally</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: 'emotional_condition_rating', label: 'Emotional Condition (1-10)' },
              { key: 'psychological_stress_rating', label: 'Stress Level (1-10)' },
              { key: 'motivation_rating', label: 'Motivation (1-10)' },
              { key: 'fatigue_rating', label: 'Fatigue Level (1-10)' },
              { key: 'sleep_difficulty_rating', label: 'Sleep Difficulty (1-10)' },
              { key: 'isolation_feeling_rating', label: 'Feeling Isolated (1-10)' },
              { key: 'concentration_workload_rating', label: 'Workload Strain (1-10)' },
            ].map((item) => (
              <label key={item.key} className="rounded-xl bg-[#0B0D1A] p-3 block">
                <div className="flex justify-between text-xs text-[#E5E5E4] mb-1.5">
                  <span>{item.label}</span>
                  <strong className="text-[#A5D8FF] tabular-data">
                    {(psychRatings as Record<string, any>)[item.key]}/10
                  </strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={(psychRatings as Record<string, any>)[item.key]}
                  onChange={(e) =>
                    setPsychRatings((prev) => ({
                      ...prev,
                      [item.key]: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-[#A5D8FF]"
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Private journal reflection (e.g., sleep schedule, crew morale, light routine)..."
              value={psychRatings.journal_reflection}
              onChange={(e) =>
                setPsychRatings((prev) => ({ ...prev, journal_reflection: e.target.value }))
              }
              className="flex-1 min-w-[260px] rounded-xl bg-[#0B0D1A] border border-white/10 px-3.5 py-2.5 text-sm text-[#FAF9FA]"
            />
            <button type="submit" disabled={submitting} className="mc-btn-primary px-5 py-2.5 text-sm">
              Save Check-In
            </button>
          </div>
        </form>
      )}

      {/* Immediate Assessment Summary & 5-Point Explanation */}
      <section className="mc-card p-5 lg:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-[#A5D8FF]" />
            <div>
              <h2 className="text-xl font-semibold text-[#FAF9FA]">
                Assessment Result &amp; Explanation
              </h2>
              <p className="text-xs text-[#E5E5E4]/75">
                Sol {latest.mission_day} · Source: {provenanceLabel(latest.provenance)}
                {lastSubmittedSymptoms && lastSubmittedSymptoms.length > 0
                  ? ` · Reported Symptoms: ${lastSubmittedSymptoms.join(', ')}`
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`px-3.5 py-1 rounded-full text-sm font-semibold ${overallMeta.badgeClass}`}>
              {overallMeta.label}
            </span>
            {assessment.overall_status !== 'NORMAL' && (
              <button
                type="button"
                onClick={onOpenEmergency}
                className="mc-btn-secondary px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                <span>Escalation Checklist</span>
              </button>
            )}
          </div>
        </div>

        {exp && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="rounded-xl bg-[#0B0D1A] p-4 space-y-1.5">
              <div className="text-xs font-semibold text-[#A5D8FF]">What was detected</div>
              <ul className="text-xs text-[#FAF9FA] space-y-1 leading-relaxed">
                {exp.what_was_detected.map((item, idx) => (
                  <li key={`${idx}-${item}`}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-[#0B0D1A] p-4 space-y-1.5">
              <div className="text-xs font-semibold text-[#A5D8FF]">Contributing measurements</div>
              <ul className="text-xs text-[#E5E5E4] space-y-1 leading-relaxed tabular-data">
                {exp.contributing_measurements.map((item, idx) => (
                  <li key={`${idx}-${item}`}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-[#0B0D1A] p-4 space-y-1.5">
              <div className="text-xs font-semibold text-[#A5D8FF]">Associated spaceflight factors</div>
              <ul className="text-xs text-[#E5E5E4] space-y-1 leading-relaxed">
                {exp.associated_factors.map((item, idx) => (
                  <li key={`${idx}-${item}`}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-[#0B0D1A] p-4 space-y-1.5">
              <div className="text-xs font-semibold text-[#A5D8FF]">Relevant hazard</div>
              <ul className="text-xs text-[#E5E5E4] space-y-1 leading-relaxed">
                {exp.relevant_hazard.map((item, idx) => (
                  <li key={`${idx}-${item}`}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-[#0B0D1A] p-4 space-y-1.5">
              <div className="text-xs font-semibold text-[#A5D8FF]">Recommended next steps</div>
              <ul className="text-xs text-[#E5E5E4] space-y-1 leading-relaxed">
                {exp.next_steps.map((item, idx) => (
                  <li key={`${idx}-${item}`}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {assessment.rule_disclaimer && (
          <div className="rounded-xl bg-[#0B0D1A] border border-[#A5D8FF]/15 px-4 py-3 text-xs text-[#E5E5E4]/80 leading-relaxed">
            <span className="font-semibold text-[#A5D8FF]">Spaceflight Baseline Note: </span>
            {assessment.rule_disclaimer}
          </div>
        )}
      </section>

      {/* Four-Tier Evidence-Based Health Guidance */}
      <section className="mc-card p-5 lg:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#A5D8FF]" />
            <h2 className="text-xl font-semibold text-[#FAF9FA]">Structured Health Guidance</h2>
          </div>
          <span className="text-xs text-[#E5E5E4]/70">
            Prototype decision support — does not replace Flight Surgeon or CMO procedures
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['Immediate action', 'Preventive action', 'Further assessment', 'Medical escalation'].map(
            (tierName) => {
              const items = tiers[tierName] || [];
              return (
                <div key={tierName} className="rounded-xl bg-[#0B0D1A] p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-[#A5D8FF]">{tierName}</h3>
                  {items.map((it, i) => (
                    <div key={i} className="space-y-1 border-t border-white/[0.06] pt-2.5 first:border-0 first:pt-0">
                      <div className="text-sm font-medium text-[#FAF9FA] leading-snug">{it.action}</div>
                      <p className="text-xs text-[#E5E5E4]/80 leading-relaxed">{it.rationale}</p>
                      <div className="text-xs text-[#A5D8FF]/85">Source: {it.source}</div>
                    </div>
                  ))}
                </div>
              );
            },
          )}
        </div>
      </section>
    </div>
  );
};