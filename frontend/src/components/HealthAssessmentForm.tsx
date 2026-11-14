import React, { useState } from 'react';
import {
  ClipboardCheck,
  Activity,
  Radiation,
  Brain,
  Wind,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { TelemetryRecord, MissionPhase } from '../types';

interface HealthAssessmentFormProps {
  latest: TelemetryRecord;
  onSubmitMeasurement: (payload: any) => Promise<void>;
  onNavigateToAnalysis: () => void;
}

const RESPIRATORY_SYMPTOM_OPTIONS = [
  'Dry cough',
  'Mucosal irritation',
  'Headache (CO2 correlated)',
  'Shortness of breath on exertion',
  'Nasal congestion (fluid shift)',
];

const GENERAL_SYMPTOM_OPTIONS = [
  'Low-grade temperature elevation',
  'Chills or malaise',
  'Sore throat',
  'Nausea / prodromal discomfort',
];

export const HealthAssessmentForm: React.FC<HealthAssessmentFormProps> = ({
  latest,
  onSubmitMeasurement,
  onNavigateToAnalysis,
}) => {
  const [missionDay, setMissionDay] = useState(latest.mission_day + 1);
  const [missionPhase, setMissionPhase] = useState<MissionPhase>(latest.mission_phase);
  const [gravityG, setGravityG] = useState(latest.gravity_g);

  // Radiation
  const [absorbedDose, setAbsorbedDose] = useState(latest.absorbed_dose_mgy);
  const [equivalentDose, setEquivalentDose] = useState(latest.equivalent_dose_rate_msv_day);
  const [radEventType, setRadEventType] = useState(latest.radiation_event_type);

  // Isolation & Sleep
  const [moodScore, setMoodScore] = useState(latest.mood_score);
  const [stressLevel, setStressLevel] = useState(latest.stress_level);
  const [fatigueLevel, setFatigueLevel] = useState(latest.fatigue_level);
  const [workloadScore, setWorkloadScore] = useState(latest.workload_score);
  const [sleepHrs, setSleepHrs] = useState(latest.sleep_duration_hrs);
  const [sleepQuality, setSleepQuality] = useState(latest.sleep_quality_pct);
  const [sleepIrreg, setSleepIrreg] = useState(latest.sleep_irregularities);
  const [feelingIsolated, setFeelingIsolated] = useState(latest.feeling_isolated);
  const [concentrationDiff, setConcentrationDiff] = useState(latest.concentration_difficulty);

  // Gravity & Physiology
  const [heartRate, setHeartRate] = useState(latest.heart_rate_bpm);
  const [systolicBp, setSystolicBp] = useState(latest.systolic_bp_mmhg);
  const [diastolicBp, setDiastolicBp] = useState(latest.diastolic_bp_mmhg);
  const [spo2, setSpo2] = useState(latest.spo2_pct);
  const [bodyTemp, setBodyTemp] = useState(latest.body_temp_c);
  const [dizziness, setDizziness] = useState(latest.dizziness_severity);
  const [presyncope, setPresyncope] = useState(latest.faintness_presyncope);
  const [activityMins, setActivityMins] = useState(latest.physical_activity_mins);
  const [muscleStrength, setMuscleStrength] = useState(latest.muscle_strength_idx);
  const [exerciseAdherence, setExerciseAdherence] = useState(latest.exercise_adherence_pct);
  const [balanceScore, setBalanceScore] = useState(latest.balance_score);
  const [sansVisual, setSansVisual] = useState(latest.visual_disturbance_sans);
  const [spatialDisorient, setSpatialDisorient] = useState(latest.spatial_disorientation);

  // Environment & Symptoms
  const [cabinTemp, setCabinTemp] = useState(latest.cabin_temp_c);
  const [cabinPressure, setCabinPressure] = useState(latest.cabin_pressure_kpa);
  const [oxygenPct, setOxygenPct] = useState(latest.oxygen_pct);
  const [co2Mmhg, setCo2Mmhg] = useState(latest.co2_mmhg);
  const [humidityPct, setHumidityPct] = useState(latest.humidity_pct);
  const [aqi, setAqi] = useState(latest.air_quality_index);
  const [respSymptoms, setRespSymptoms] = useState<string[]>(latest.respiratory_symptoms || []);
  const [infSymptoms, setInfSymptoms] = useState<string[]>(latest.infection_symptoms || []);
  const [notes, setNotes] = useState('Astronaut self-entered Sol check-in telemetry.');

  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handlePhaseChange = (phase: MissionPhase) => {
    setMissionPhase(phase);
    if (phase === 'MICROGRAVITY_TRANSIT') setGravityG(0.0);
    else if (phase === 'MARS_SURFACE') setGravityG(0.38);
    else setGravityG(1.0);
  };

  const toggleSymptom = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const cumEffective = Number((latest.cumulative_effective_dose_msv + equivalentDose).toFixed(2));
    await onSubmitMeasurement({
      mission_day: missionDay,
      mission_phase: missionPhase,
      gravity_g: gravityG,
      provenance: 'USER_ENTERED',
      absorbed_dose_mgy: absorbedDose,
      absorbed_dose_rate_mgy_hr: Number((absorbedDose / 24).toFixed(4)),
      equivalent_dose_msv: equivalentDose,
      equivalent_dose_rate_msv_day: equivalentDose,
      cumulative_effective_dose_msv: cumEffective,
      radiation_source: 'USER_ENTERED_ACTIVE_DOSIMETER',
      radiation_event_type: radEventType,
      mood_score: moodScore,
      stress_level: stressLevel,
      emotional_wellbeing: Number(((moodScore + (10 - stressLevel)) / 2).toFixed(1)),
      fatigue_level: fatigueLevel,
      workload_score: workloadScore,
      social_interaction_score: 7.5,
      sleep_duration_hrs: sleepHrs,
      sleep_quality_pct: sleepQuality,
      sleep_schedule_window: '22:30 - 05:30 UTC-MARS',
      sleep_irregularities: sleepIrreg,
      feeling_isolated: feelingIsolated,
      concentration_difficulty: concentrationDiff,
      motivation_level: 7.8,
      heart_rate_bpm: heartRate,
      systolic_bp_mmhg: systolicBp,
      diastolic_bp_mmhg: diastolicBp,
      spo2_pct: spo2,
      body_temp_c: bodyTemp,
      dizziness_severity: dizziness,
      faintness_presyncope: presyncope,
      physical_activity_mins: activityMins,
      exercise_performance_pct: 90,
      muscle_strength_idx: muscleStrength,
      exercise_adherence_pct: exerciseAdherence,
      musculoskeletal_discomfort: dizziness > 0 ? 1 : 0,
      balance_score: balanceScore,
      coordination_score: Math.min(100, balanceScore + 3),
      spatial_disorientation: spatialDisorient,
      visual_disturbance_sans: sansVisual,
      cabin_temp_c: cabinTemp,
      cabin_pressure_kpa: cabinPressure,
      oxygen_pct: oxygenPct,
      co2_mmhg: co2Mmhg,
      co2_ppm: Math.round(co2Mmhg * 1315),
      humidity_pct: humidityPct,
      air_quality_index: aqi,
      env_warning_event: co2Mmhg >= 3.0 ? 'ELEVATED_CO2_USER_LOGGED' : 'NONE',
      respiratory_symptoms: respSymptoms,
      infection_symptoms: infSymptoms,
      hygiene_adherence_pct: 96,
      notes,
    });
    setSubmitting(false);
    setSubmittedSuccess(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1e2d4a]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f8fafc]">
            Astronaut Health & Environmental Telemetry Entry
          </h1>
          <p className="text-sm text-[#a8b8d0] mt-1 prose-measure">
            Enter current physiological vitals, dosimetry, sleep/behavioural ratings, gravity phase, and habitat ECLSS
            parameters. Every submission is tagged <code className="text-[#38bdf8]">USER_ENTERED</code>, stored in local
            SQLite, and evaluated against your personal baseline.
          </p>
        </div>

        {/* Quick Fill Presets for Rapid Testing */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              handlePhaseChange('MARS_SURFACE');
              setAbsorbedDose(0.30);
              setEquivalentDose(0.75);
              setHeartRate(60);
              setSystolicBp(112);
              setDiastolicBp(71);
              setSleepHrs(7.6);
              setStressLevel(2.5);
              setMoodScore(8.3);
              setCo2Mmhg(2.2);
              setDizziness(0);
              setPresyncope(false);
              setRespSymptoms([]);
              setNotes('User Preset: Nominal Martian surface check-in within personal baseline.');
            }}
            className="px-3 py-1.5 rounded text-xs font-medium bg-[#131d33] hover:bg-[#1b2948] border border-[#263859] text-[#10b981]"
          >
            Fill Nominal Vitals
          </button>
          <button
            type="button"
            onClick={() => {
              handlePhaseChange('MARS_SURFACE');
              setAbsorbedDose(1.25);
              setEquivalentDose(3.10);
              setHeartRate(78);
              setSystolicBp(99);
              setDiastolicBp(64);
              setSleepHrs(5.4);
              setStressLevel(6.4);
              setMoodScore(5.8);
              setCo2Mmhg(3.6);
              setDizziness(2);
              setPresyncope(false);
              setRespSymptoms(['Headache (CO2 correlated)', 'Dry cough']);
              setNotes('User Preset: Multi-hazard Warning (Elevated SPE + 5.4h Sleep + CO2 3.6 mmHg + Orthostatic drift).');
            }}
            className="px-3 py-1.5 rounded text-xs font-medium bg-[#131d33] hover:bg-[#1b2948] border border-[#263859] text-[#f59e0b]"
          >
            Fill Warning Values
          </button>
          <button
            type="button"
            onClick={() => {
              handlePhaseChange('MARS_SURFACE');
              setAbsorbedDose(2.90);
              setEquivalentDose(6.80);
              setHeartRate(98);
              setSystolicBp(85);
              setDiastolicBp(55);
              setSleepHrs(4.2);
              setStressLevel(8.7);
              setMoodScore(3.5);
              setCo2Mmhg(4.8);
              setDizziness(3);
              setPresyncope(true);
              setRespSymptoms(['Headache (CO2 correlated)', 'Shortness of breath on exertion']);
              setNotes('User Preset: Critical Emergency (Acute SPE 6.8 mSv/day + Orthostatic Presyncope + CO2 4.8 mmHg).');
            }}
            className="px-3 py-1.5 rounded text-xs font-medium bg-[#131d33] hover:bg-[#1b2948] border border-[#263859] text-[#ef4444]"
          >
            Fill Critical Values
          </button>
        </div>
      </div>

      {submittedSuccess && (
        <div className="p-4 rounded bg-emerald-950/80 border border-emerald-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm text-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0" />
            <span>
              <strong>Measurement Saved Locally (Sol {missionDay}):</strong> Integrated 5-Hazard Assessment Engine and
              local RAG evidence retrieval have been updated.
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToAnalysis}
            className="px-4 py-1.5 rounded bg-[#10b981] hover:bg-emerald-400 text-[#070b14] font-semibold text-xs shrink-0"
          >
            Inspect AI Health Analysis →
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section A: Mission Phase & Gravity Environment */}
        <div className="panel-surface rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#38bdf8]" />
            Mission Day & Gravitational Environment Context
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs tabular-data">
            <label className="block">
              <span className="text-[#cbd5e1]">Mission Day (Sol)</span>
              <input
                type="number"
                value={missionDay}
                onChange={(e) => setMissionDay(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
              />
            </label>
            <label className="block">
              <span className="text-[#cbd5e1]">Mission Phase & Gravity Regime</span>
              <select
                value={missionPhase}
                onChange={(e) => handlePhaseChange(e.target.value as MissionPhase)}
                className="mt-1 w-full px-3 py-2 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
              >
                <option value="MICROGRAVITY_TRANSIT">Interplanetary Transit — Microgravity (0.0g)</option>
                <option value="MARS_SURFACE">Martian Surface Operations (~0.38g)</option>
                <option value="EARTH_RETURN">Earth Return Re-adaptation (1.0g)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[#cbd5e1]">Effective Gravity Vector (g)</span>
              <input
                type="number"
                step="0.01"
                value={gravityG}
                onChange={(e) => setGravityG(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full px-3 py-2 rounded bg-[#070b14] border border-[#263859] text-[#38bdf8] font-semibold"
              />
            </label>
          </div>
        </div>

        {/* 2x2 Grid for the Hazard Telemetry Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cardiovascular, Musculoskeletal & Sensorimotor (Module 4) */}
          <div className="panel-surface rounded-lg p-5 space-y-4">
            <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#38bdf8]" />
              Cardiovascular, Musculoskeletal & Sensorimotor Vitals
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs tabular-data">
              <label className="block">
                <span className="text-[#cbd5e1]">Heart Rate (bpm)</span>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Systolic BP (mmHg)</span>
                <input
                  type="number"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Diastolic BP (mmHg)</span>
                <input
                  type="number"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">SpO2 (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={spo2}
                  onChange={(e) => setSpo2(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Body Temp (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={bodyTemp}
                  onChange={(e) => setBodyTemp(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Dizziness (0–3)</span>
                <select
                  value={dizziness}
                  onChange={(e) => setDizziness(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                >
                  <option value={0}>0 — None</option>
                  <option value={1}>1 — Mild on standing</option>
                  <option value={2}>2 — Moderate</option>
                  <option value={3}>3 — Severe</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Muscle Strength Idx</span>
                <input
                  type="number"
                  step="0.5"
                  value={muscleStrength}
                  onChange={(e) => setMuscleStrength(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Balance Score (/100)</span>
                <input
                  type="number"
                  value={balanceScore}
                  onChange={(e) => setBalanceScore(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Exercise Adherence (%)</span>
                <input
                  type="number"
                  value={exerciseAdherence}
                  onChange={(e) => setExerciseAdherence(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4 pt-2 text-xs text-[#cbd5e1]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={presyncope}
                  onChange={(e) => setPresyncope(e.target.checked)}
                  className="accent-[#ef4444]"
                />
                Faintness / Presyncope
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sansVisual}
                  onChange={(e) => setSansVisual(e.target.checked)}
                  className="accent-[#38bdf8]"
                />
                Visual Disturbance (SANS)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spatialDisorient}
                  onChange={(e) => setSpatialDisorient(e.target.checked)}
                  className="accent-[#38bdf8]"
                />
                Spatial Disorientation
              </label>
            </div>
          </div>

          {/* Radiation & Sleep/Psychological (Modules 1 & 2) */}
          <div className="panel-surface rounded-lg p-5 space-y-4">
            <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
              <Radiation className="w-4 h-4 text-[#38bdf8]" />
              Radiation Dosimetry (Gy vs. Sv) & Sleep / Behavioural Telemetry
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs tabular-data">
              <label className="block">
                <span className="text-[#cbd5e1]">Absorbed Dose (mGy)</span>
                <input
                  type="number"
                  step="0.05"
                  value={absorbedDose}
                  onChange={(e) => setAbsorbedDose(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Equivalent Rate (mSv/d)</span>
                <input
                  type="number"
                  step="0.05"
                  value={equivalentDose}
                  onChange={(e) => setEquivalentDose(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Radiation Event</span>
                <select
                  value={radEventType}
                  onChange={(e) => setRadEventType(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                >
                  <option value="GCR_BACKGROUND">GCR Background</option>
                  <option value="GCR_MARS_SHIELDED">GCR Mars Shielded</option>
                  <option value="SOLAR_PROTON_ENHANCEMENT">Solar Proton Enhancement</option>
                  <option value="SPE_MAJOR_CME_PROTON_STORM">Acute SPE Storm</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Sleep Duration (hrs)</span>
                <input
                  type="number"
                  step="0.1"
                  value={sleepHrs}
                  onChange={(e) => setSleepHrs(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Sleep Quality (%)</span>
                <input
                  type="number"
                  value={sleepQuality}
                  onChange={(e) => setSleepQuality(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Sleep Awakenings</span>
                <input
                  type="number"
                  value={sleepIrreg}
                  onChange={(e) => setSleepIrreg(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Mood Score (1–10)</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={moodScore}
                  onChange={(e) => setMoodScore(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Stress Level (1–10)</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block">
                <span className="text-[#cbd5e1]">Fatigue Level (1–10)</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={fatigueLevel}
                  onChange={(e) => setFatigueLevel(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4 pt-2 text-xs text-[#cbd5e1]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={feelingIsolated}
                  onChange={(e) => setFeelingIsolated(e.target.checked)}
                  className="accent-[#38bdf8]"
                />
                Subjective Isolation / Confinement Strain
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={concentrationDiff}
                  onChange={(e) => setConcentrationDiff(e.target.checked)}
                  className="accent-[#38bdf8]"
                />
                Concentration / Vigilance Difficulty
              </label>
            </div>
          </div>
        </div>

        {/* Hostile & Closed Environments + Symptom Checklists (Module 5) */}
        <div className="panel-surface rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
            <Wind className="w-4 h-4 text-[#38bdf8]" />
            Spacecraft / Habitat ECLSS Environment & Symptom Checklists
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs tabular-data">
            <label className="block">
              <span className="text-[#cbd5e1]">Cabin CO2 (mmHg)</span>
              <input
                type="number"
                step="0.1"
                value={co2Mmhg}
                onChange={(e) => setCo2Mmhg(Number(e.target.value))}
                className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
              />
            </label>
            <label className="block">
              <span className="text-[#cbd5e1]">Cabin O2 (%)</span>
              <input
                type="number"
                step="0.1"
                value={oxygenPct}
                onChange={(e) => setOxygenPct(Number(e.target.value))}
                className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
              />
            </label>
            <label className="block">
              <span className="text-[#cbd5e1]">Cabin Pressure (kPa)</span>
              <input
                type="number"
                step="0.1"
                value={cabinPressure}
                onChange={(e) => setCabinPressure(Number(e.target.value))}
                className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
              />
            </label>
            <label className="block">
              <span className="text-[#cbd5e1]">Cabin Temp (°C)</span>
              <input
                type="number"
                step="0.1"
                value={cabinTemp}
                onChange={(e) => setCabinTemp(Number(e.target.value))}
                className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
              />
            </label>
            <label className="block">
              <span className="text-[#cbd5e1]">Humidity (%)</span>
              <input
                type="number"
                value={humidityPct}
                onChange={(e) => setHumidityPct(Number(e.target.value))}
                className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
              />
            </label>
            <label className="block">
              <span className="text-[#cbd5e1]">Particulate AQI</span>
              <input
                type="number"
                value={aqi}
                onChange={(e) => setAqi(Number(e.target.value))}
                className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
            <div className="p-3.5 rounded bg-[#131d33] border border-[#263859] space-y-2">
              <div className="font-semibold text-[#f8fafc]">Respiratory & Airway Symptom Checklist</div>
              <div className="flex flex-wrap gap-3">
                {RESPIRATORY_SYMPTOM_OPTIONS.map((sym) => (
                  <label key={sym} className="flex items-center gap-1.5 text-[#cbd5e1] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={respSymptoms.includes(sym)}
                      onChange={() => toggleSymptom(respSymptoms, setRespSymptoms, sym)}
                      className="accent-[#38bdf8]"
                    />
                    {sym}
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded bg-[#131d33] border border-[#263859] space-y-2">
              <div className="font-semibold text-[#f8fafc]">General / Febrile / Prodromal Symptom Checklist</div>
              <div className="flex flex-wrap gap-3">
                {GENERAL_SYMPTOM_OPTIONS.map((sym) => (
                  <label key={sym} className="flex items-center gap-1.5 text-[#cbd5e1] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={infSymptoms.includes(sym)}
                      onChange={() => toggleSymptom(infSymptoms, setInfSymptoms, sym)}
                      className="accent-[#38bdf8]"
                    />
                    {sym}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <label className="block text-xs">
            <span className="text-[#cbd5e1]">Clinical & Operational Observation Notes</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded bg-[#38bdf8] hover:bg-[#0284c7] text-[#070b14] font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {submitting ? 'Running Integrated 5-Hazard Assessment...' : 'Submit Health Telemetry & Run AI Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};

