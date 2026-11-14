import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  Radiation,
  Brain,
  Radio,
  Activity,
  Wind,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Sliders,
  WifiOff,
  Wifi,
  Clock,
  Info,
} from 'lucide-react';
import { FullSystemState, RiskLevel, MissionPhase } from '../types';

interface FiveHazardsScreenProps {
  state: FullSystemState;
  activeHazardTab: string;
  onSelectHazardTab: (tab: string) => void;
  onSubmitPsychQuestionnaire: (payload: any) => Promise<void>;
  onUpdateCommStatus: (payload: any) => Promise<void>;
  onQueueReport: (payload: any) => Promise<void>;
  onSyncReports: () => Promise<void>;
  onTriggerEmergency: (hazard: string, symptoms: string[]) => Promise<void>;
  onUpdateLimits: (payload: any) => Promise<void>;
}

const HAZARD_TABS = [
  { id: 'Space Radiation', label: '1. Space Radiation', icon: Radiation },
  { id: 'Isolation and Confinement', label: '2. Isolation & Confinement', icon: Brain },
  { id: 'Distance from Earth', label: '3. Distance from Earth', icon: Radio },
  { id: 'Gravity Fields', label: '4. Gravity Fields', icon: Activity },
  { id: 'Hostile and Closed Environments', label: '5. Hostile Environments', icon: Wind },
];

function badgeStyle(status: RiskLevel): string {
  if (status === 'CRITICAL') return 'bg-red-950/85 text-red-200 border border-red-500/50';
  if (status === 'WARNING') return 'bg-amber-950/85 text-amber-200 border border-amber-500/50';
  return 'bg-emerald-950/85 text-emerald-200 border border-emerald-500/50';
}

export const FiveHazardsScreen: React.FC<FiveHazardsScreenProps> = ({
  state,
  activeHazardTab,
  onSelectHazardTab,
  onSubmitPsychQuestionnaire,
  onUpdateCommStatus,
  onQueueReport,
  onSyncReports,
  onTriggerEmergency,
  onUpdateLimits,
}) => {
  const {
    astronaut,
    latest_telemetry: latest,
    telemetry_history: history,
    assessment,
    radiation_limits,
    environmental_limits,
    comm_state,
    store_forward_reports,
    psych_questionnaires,
  } = state;

  // Module 1 configurable threshold state
  const [radWarn, setRadWarn] = useState(radiation_limits.daily_equivalent_warn_msv);
  const [radCrit, setRadCrit] = useState(radiation_limits.daily_equivalent_crit_msv);
  const [radCumWarn, setRadCumWarn] = useState(radiation_limits.cumulative_mission_warn_msv);

  // Module 2 self-assessment questionnaire state
  const [qMood, setQMood] = useState(7);
  const [qStress, setQStress] = useState(5);
  const [qMotivation, setQMotivation] = useState(8);
  const [qFatigue, setQFatigue] = useState(5);
  const [qSleepDiff, setQSleepDiff] = useState(4);
  const [qIsolation, setQIsolation] = useState(3);
  const [qWorkload, setQWorkload] = useState(7);
  const [qJournal, setQJournal] = useState('');
  const [qSavedMsg, setQSavedMsg] = useState('');

  // Module 3 manual store-and-forward report state
  const [rptTitle, setRptTitle] = useState(`Sol ${latest.mission_day} Autonomous Crew Health Telemetry Summary`);
  const [rptNotes, setRptNotes] = useState(
    `Routine store-and-forward telemetry packet. HR ${latest.heart_rate_bpm} bpm, Dose Rate ${latest.equivalent_dose_rate_msv_day} mSv/day, CO2 ${latest.co2_mmhg} mmHg.`
  );
  const [syncMessage, setSyncMessage] = useState('');

  // Module 5 configurable threshold state
  const [co2Warn, setCo2Warn] = useState(environmental_limits.co2_warn_mmhg);
  const [co2Crit, setCo2Crit] = useState(environmental_limits.co2_crit_mmhg);
  const [aqiWarn, setAqiWarn] = useState(environmental_limits.aqi_warn);

  const currentHazardStatus: RiskLevel =
    assessment.hazard_statuses[activeHazardTab] || 'NORMAL';

  const hazardFindings = assessment.findings.filter((f) => f.hazard === activeHazardTab);
  const hazardRecs = assessment.recommendations.filter((r) => r.hazard === activeHazardTab);

  const handlePsychSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitPsychQuestionnaire({
      mission_day: latest.mission_day,
      emotional_condition_rating: qMood,
      psychological_stress_rating: qStress,
      motivation_rating: qMotivation,
      fatigue_rating: qFatigue,
      sleep_difficulty_rating: qSleepDiff,
      isolation_feeling_rating: qIsolation,
      concentration_workload_rating: qWorkload,
      journal_reflection: qJournal || 'Crew self-assessment logged via Module 2.',
      provenance: 'USER_ENTERED',
    });
    setQSavedMsg('Self-assessment saved locally & integrated into baseline engine.');
    setTimeout(() => setQSavedMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1e2d4a]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f8fafc]">
            NASA Five Human-Spaceflight Hazards Monitoring
          </h1>
          <p className="text-sm text-[#a8b8d0] mt-1 prose-measure">
            Dedicated telemetry, baseline comparison, configurable mission thresholds, and research-backed
            countermeasures across all five NASA Human Research Program (HRP) hazard domains.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#a8b8d0]">Selected Hazard Status:</span>
          <span className={`px-3 py-1 rounded text-xs font-semibold tabular-data ${badgeStyle(currentHazardStatus)}`}>
            {currentHazardStatus}
          </span>
        </div>
      </div>

      {/* Five Hazard Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5" role="tablist">
        {HAZARD_TABS.map((tab) => {
          const Icon = tab.icon;
          const st: RiskLevel = assessment.hazard_statuses[tab.id] || 'NORMAL';
          const isSelected = activeHazardTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectHazardTab(tab.id)}
              className={`p-3.5 rounded text-left transition-colors border flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'bg-[#162440] border-[#38bdf8] text-[#f8fafc]'
                  : 'bg-[#0d1424] border-[#1e2d4a] text-[#a8b8d0] hover:bg-[#131d33] hover:text-[#f1f5f9]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}`} strokeWidth={1.75} />
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-data ${badgeStyle(st)}`}>
                  {st}
                </span>
              </div>
              <span className="text-xs font-semibold leading-snug text-[#f1f5f9]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          MODULE 1: SPACE RADIATION MONITORING
      ===================================================================== */}
      {activeHazardTab === 'Space Radiation' && (
        <div className="space-y-6">
          {/* Scientific Provenance & Unit Distinction Notice */}
          <div className="p-4 rounded bg-[#131d33] border border-[#263859] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#38bdf8]" />
                Dosimetry Unit Integrity (Gy vs. Sv) & NASA RDP (ARMAS) Provenance Notice
              </h2>
              <p className="text-xs text-[#cbd5e1] prose-measure leading-relaxed">
                <strong>Absorbed Dose (mGy)</strong> measures physical ionizing energy deposited per unit mass (1 Gy = 1 J/kg).{' '}
                <strong>Equivalent / Effective Dose (mSv)</strong> weights absorbed dose by radiation quality factors (Q) for
                Galactic Cosmic Ray (GCR) heavy ions and Solar Particle Event (SPE) protons. Note: The{' '}
                <a
                  href="https://data.nas.nasa.gov/helio/portals/rdp/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#38bdf8] underline"
                >
                  NASA Radiation Data Portal (ARMAS)
                </a>{' '}
                records Earth high-altitude/aircraft radiation and is <em>never</em> represented here as direct Martian surface
                telemetry; Mars dosimetry below is explicitly tagged <code className="text-[#38bdf8]">{latest.provenance}</code>.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono bg-[#0d1424] border border-[#1e2d4a] text-[#38bdf8] shrink-0">
              SOURCE: {latest.radiation_source}
            </span>
          </div>

          {/* Radiation Metric Readouts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-data">
            <div className="panel-surface rounded p-4">
              <div className="text-xs text-[#a8b8d0]">Absorbed Physical Dose (Sol {latest.mission_day})</div>
              <div className="text-2xl font-semibold text-[#f8fafc] mt-1">
                {latest.absorbed_dose_mgy.toFixed(2)} <span className="text-sm font-normal text-[#a8b8d0]">mGy</span>
              </div>
              <div className="text-xs text-[#38bdf8] mt-1">
                Rate: {latest.absorbed_dose_rate_mgy_hr.toFixed(4)} mGy/hr
              </div>
            </div>

            <div className="panel-surface rounded p-4">
              <div className="text-xs text-[#a8b8d0]">Equivalent Biological Dose Rate</div>
              <div className="text-2xl font-semibold text-[#f8fafc] mt-1">
                {latest.equivalent_dose_rate_msv_day.toFixed(2)}{' '}
                <span className="text-sm font-normal text-[#a8b8d0]">mSv/day</span>
              </div>
              <div className="text-xs text-[#a8b8d0] mt-1">
                Warn Limit: {radiation_limits.daily_equivalent_warn_msv} mSv/d · Crit: {radiation_limits.daily_equivalent_crit_msv} mSv/d
              </div>
            </div>

            <div className="panel-surface rounded p-4">
              <div className="text-xs text-[#a8b8d0]">Cumulative Mission Effective Dose</div>
              <div className="text-2xl font-semibold text-[#f8fafc] mt-1">
                {latest.cumulative_effective_dose_msv.toFixed(1)}{' '}
                <span className="text-sm font-normal text-[#a8b8d0]">mSv</span>
              </div>
              <div className="text-xs text-[#a8b8d0] mt-1">
                Mission Ceiling Ref: {radiation_limits.cumulative_mission_limit_msv} mSv ({((latest.cumulative_effective_dose_msv / radiation_limits.cumulative_mission_limit_msv) * 100).toFixed(1)}%)
              </div>
            </div>

            <div className="panel-surface rounded p-4">
              <div className="text-xs text-[#a8b8d0]">Active Radiation Event Classification</div>
              <div className="text-base font-semibold text-[#38bdf8] mt-1.5 break-words">
                {latest.radiation_event_type.replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-[#a8b8d0] mt-1">
                Timestamp: {latest.timestamp.slice(0, 16).replace('T', ' ')} UTC
              </div>
            </div>
          </div>

          {/* Charts: Daily Absorbed (mGy) vs Equivalent (mSv) & Cumulative Dose */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel-surface rounded-lg p-5">
              <h3 className="text-base font-semibold text-[#f8fafc] mb-1">
                Daily Absorbed Dose (mGy) vs. Biologically Weighted Equivalent Dose (mSv/day)
              </h3>
              <p className="text-xs text-[#a8b8d0] mb-4">
                14-Sol dosimetry timeline showing Sol 179 SPE spike and current Sol {latest.mission_day} flux
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                    <XAxis dataKey="mission_day" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `Sol ${v}`} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1424', borderColor: '#263859', color: '#f8fafc', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine
                      y={radiation_limits.daily_equivalent_warn_msv}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{ value: 'Warn (mSv)', fill: '#f59e0b', fontSize: 10 }}
                    />
                    <Bar dataKey="absorbed_dose_mgy" name="Absorbed Dose (mGy)" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="equivalent_dose_rate_msv_day" name="Equivalent Dose (mSv/day)" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel-surface rounded-lg p-5">
              <h3 className="text-base font-semibold text-[#f8fafc] mb-1">
                Cumulative Mission Effective Dose Trajectory (mSv)
              </h3>
              <p className="text-xs text-[#a8b8d0] mb-4">
                Tracked against mission-configured prototype warning threshold ({radiation_limits.cumulative_mission_warn_msv} mSv)
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                    <XAxis dataKey="mission_day" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `Sol ${v}`} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 5', 'dataMax + 10']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1424', borderColor: '#263859', color: '#f8fafc', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative_effective_dose_msv"
                      name="Cumulative Effective Dose (mSv)"
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* GCR vs SPE Educational Reference + Configurable Limits */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 panel-surface rounded-lg p-5 space-y-3">
              <h3 className="text-base font-semibold text-[#f8fafc]">
                Space Radiation Risk Architecture: GCR vs. SPE & ALARA Shielding Procedures
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#cbd5e1]">
                <div className="p-3.5 rounded bg-[#131d33] border border-[#263859] space-y-1.5">
                  <div className="font-semibold text-[#f8fafc]">Galactic Cosmic Rays (GCR)</div>
                  <p className="leading-relaxed">
                    Continuous isotropic background of high-energy protons and high-Z energetic (HZE) nuclei originating
                    outside the solar system. Difficult to shield completely; drives chronic cumulative career risks (carcinogenesis,
                    CNS cognitive/motor decrements, cataracts, and cardiovascular tissue remodeling).
                  </p>
                </div>
                <div className="p-3.5 rounded bg-[#131d33] border border-[#263859] space-y-1.5">
                  <div className="font-semibold text-[#f8fafc]">Solar Particle Events (SPE)</div>
                  <p className="leading-relaxed">
                    Intermittent, high-flux bursts of energetic protons ejected during solar flares and coronal mass ejections
                    (CMEs). Can deliver acute doses in hours, risking prodromal radiation sickness (nausea, fatigue, hematologic
                    suppression). Mitigated effectively by immediate relocation to high-mass polyethylene/water storm shelters.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 panel-surface rounded-lg p-5 space-y-3">
              <h3 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#38bdf8]" />
                Configurable Mission Prototype Radiation Thresholds
              </h3>
              <p className="text-xs text-[#a8b8d0]">
                Adjust mission-configured warning/critical limits (explicitly tagged as prototype rules):
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs tabular-data">
                <label className="block">
                  <span className="text-[#cbd5e1]">Daily Warn (mSv)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={radWarn}
                    onChange={(e) => setRadWarn(parseFloat(e.target.value) || 1.5)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                  />
                </label>
                <label className="block">
                  <span className="text-[#cbd5e1]">Daily Crit (mSv)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={radCrit}
                    onChange={(e) => setRadCrit(parseFloat(e.target.value) || 5.0)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                  />
                </label>
                <label className="block">
                  <span className="text-[#cbd5e1]">Cumul Warn (mSv)</span>
                  <input
                    type="number"
                    step="10"
                    value={radCumWarn}
                    onChange={(e) => setRadCumWarn(parseFloat(e.target.value) || 350)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                  />
                </label>
              </div>
              <button
                onClick={() =>
                  onUpdateLimits({
                    radiation_limits: {
                      ...radiation_limits,
                      daily_equivalent_warn_msv: radWarn,
                      daily_equivalent_crit_msv: radCrit,
                      cumulative_mission_warn_msv: radCumWarn,
                    },
                  })
                }
                className="w-full py-2 px-3 rounded bg-[#38bdf8] hover:bg-[#0284c7] text-[#070b14] font-semibold text-xs transition-colors"
              >
                Apply Mission Radiation Thresholds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 2: ISOLATION AND CONFINEMENT MONITORING
      ===================================================================== */}
      {activeHazardTab === 'Isolation and Confinement' && (
        <div className="space-y-6">
          <div className="p-4 rounded bg-[#131d33] border border-[#263859] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#cbd5e1] prose-measure">
              <strong className="text-[#f8fafc]">Behavioural & Circadian Safety Boundary:</strong> Tracks sleep duration,
              sleep quality, circadian schedule drift, workload, stress, and crew cohesion relative to personal baseline (
              {astronaut.baseline_sleep_hrs} hrs sleep; mood {astronaut.baseline_mood_score}/10).{' '}
              <strong>Does not automatically diagnose clinical depression, anxiety, or psychiatric disorders.</strong>
            </div>
            <span className="px-2.5 py-1 rounded text-xs bg-[#0d1424] border border-[#1e2d4a] text-[#38bdf8] shrink-0 tabular-data">
              Schedule: {latest.sleep_schedule_window}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-data">
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Sleep Duration</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.sleep_duration_hrs.toFixed(1)} hrs</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Baseline: {astronaut.baseline_sleep_hrs} hrs</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Sleep Quality</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.sleep_quality_pct.toFixed(0)}%</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Awakenings: {latest.sleep_irregularities}</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Mood Score</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.mood_score.toFixed(1)} / 10</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Baseline: {astronaut.baseline_mood_score}/10</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Stress Level</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.stress_level.toFixed(1)} / 10</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Baseline: {astronaut.baseline_stress_score}/10</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Fatigue / Workload</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">
                {latest.fatigue_level.toFixed(1)} · {latest.workload_score.toFixed(1)}
              </div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Scale 1–10</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Crew Cohesion</div>
              <div className="text-xl font-semibold text-[#38bdf8] mt-1">
                {latest.social_interaction_score.toFixed(1)} / 10
              </div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Motivation: {latest.motivation_level}/10</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sleep & Psychological Trend Chart */}
            <div className="lg:col-span-7 panel-surface rounded-lg p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#f8fafc]">
                  14-Sol Sleep Duration, Mood, Stress & Fatigue Trajectory
                </h3>
                <p className="text-xs text-[#a8b8d0]">
                  Identifies persistent sleep truncation (&lt;6.2 hrs) and inverse stress/mood divergence
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                    <XAxis dataKey="mission_day" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `Sol ${v}`} />
                    <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1424', borderColor: '#263859', color: '#f8fafc', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="sleep_duration_hrs" name="Sleep (hrs)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2.5 }} />
                    <Line type="monotone" dataKey="mood_score" name="Mood (/10)" stroke="#10b981" strokeWidth={2} dot={{ r: 2.5 }} />
                    <Line type="monotone" dataKey="stress_level" name="Stress (/10)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2.5 }} />
                    <Line type="monotone" dataKey="fatigue_level" name="Fatigue (/10)" stroke="#ef4444" strokeWidth={1.8} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Psych Questionnaire Log */}
              <div className="pt-3 border-t border-[#1e2d4a]">
                <h4 className="text-xs font-semibold text-[#cbd5e1] mb-2">
                  Latest Logged Crew Reflective Journal Entries ({psych_questionnaires.length})
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {psych_questionnaires.slice(0, 3).map((pq, i) => (
                    <div key={i} className="p-2.5 rounded bg-[#131d33] border border-[#263859] text-xs">
                      <div className="flex justify-between text-[#a8b8d0] tabular-data mb-1">
                        <span>Sol {pq.mission_day} · Mood {pq.emotional_condition_rating}/10 · Stress {pq.psychological_stress_rating}/10</span>
                        <span>{pq.provenance}</span>
                      </div>
                      <p className="text-[#f1f5f9]">{pq.journal_reflection}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Self-Assessment Questionnaire (Requirement 4C) */}
            <form onSubmit={handlePsychSubmit} className="lg:col-span-5 panel-surface rounded-lg p-5 space-y-3.5">
              <div>
                <h3 className="text-base font-semibold text-[#f8fafc]">
                  Astronaut Behavioural & Sleep Self-Assessment Questionnaire
                </h3>
                <p className="text-xs text-[#a8b8d0]">
                  Record subjective wellbeing (1 = Low/Minimal, 10 = High). Stored locally as <code>USER_ENTERED</code>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs tabular-data">
                <label className="block">
                  <span className="text-[#cbd5e1]">Emotional Wellbeing: {qMood}/10</span>
                  <input type="range" min="1" max="10" value={qMood} onChange={(e) => setQMood(Number(e.target.value))} className="w-full mt-1 accent-[#38bdf8]" />
                </label>
                <label className="block">
                  <span className="text-[#cbd5e1]">Psychological Stress: {qStress}/10</span>
                  <input type="range" min="1" max="10" value={qStress} onChange={(e) => setQStress(Number(e.target.value))} className="w-full mt-1 accent-[#f59e0b]" />
                </label>
                <label className="block">
                  <span className="text-[#cbd5e1]">Mission Motivation: {qMotivation}/10</span>
                  <input type="range" min="1" max="10" value={qMotivation} onChange={(e) => setQMotivation(Number(e.target.value))} className="w-full mt-1 accent-[#38bdf8]" />
                </label>
                <label className="block">
                  <span className="text-[#cbd5e1]">Subjective Fatigue: {qFatigue}/10</span>
                  <input type="range" min="1" max="10" value={qFatigue} onChange={(e) => setQFatigue(Number(e.target.value))} className="w-full mt-1 accent-[#f59e0b]" />
                </label>
                <label className="block">
                  <span className="text-[#cbd5e1]">Sleep Difficulty: {qSleepDiff}/10</span>
                  <input type="range" min="1" max="10" value={qSleepDiff} onChange={(e) => setQSleepDiff(Number(e.target.value))} className="w-full mt-1 accent-[#38bdf8]" />
                </label>
                <label className="block">
                  <span className="text-[#cbd5e1]">Feeling Isolated: {qIsolation}/10</span>
                  <input type="range" min="1" max="10" value={qIsolation} onChange={(e) => setQIsolation(Number(e.target.value))} className="w-full mt-1 accent-[#f59e0b]" />
                </label>
                <label className="block col-span-2">
                  <span className="text-[#cbd5e1]">Concentration & Cognitive Workload Demand: {qWorkload}/10</span>
                  <input type="range" min="1" max="10" value={qWorkload} onChange={(e) => setQWorkload(Number(e.target.value))} className="w-full mt-1 accent-[#38bdf8]" />
                </label>
              </div>

              <label className="block text-xs">
                <span className="text-[#cbd5e1]">Private Crew Reflective Journal Note</span>
                <textarea
                  rows={2}
                  value={qJournal}
                  onChange={(e) => setQJournal(e.target.value)}
                  placeholder="Log sleep quality, circadian light therapy adherence, or crew workload notes..."
                  className="mt-1 w-full p-2.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc] text-xs"
                />
              </label>

              <button
                type="submit"
                className="w-full py-2 px-4 rounded bg-[#38bdf8] hover:bg-[#0284c7] text-[#070b14] font-semibold text-xs transition-colors"
              >
                Save Behavioural Self-Assessment Locally
              </button>
              {qSavedMsg && <p className="text-xs text-[#10b981] font-medium">{qSavedMsg}</p>}
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 3: DISTANCE FROM EARTH & AUTONOMOUS MEDICAL SUPPORT
      ===================================================================== */}
      {activeHazardTab === 'Distance from Earth' && (
        <div className="space-y-6">
          <div className="p-4 rounded bg-[#131d33] border border-[#263859] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
                {comm_state.earth_comm_status === 'CONJUNCTION_BLACKOUT' || comm_state.offline_mode_forced ? (
                  <WifiOff className="w-4 h-4 text-[#f59e0b]" />
                ) : (
                  <Wifi className="w-4 h-4 text-[#10b981]" />
                )}
                Autonomous Deep-Space Medical Operations & Store-and-Forward Telemetry
              </h2>
              <p className="text-xs text-[#cbd5e1] prose-measure">
                {comm_state.dsn_note} All health assessments, baseline comparisons, RAG medical lookups, and emergency
                protocols execute 100% locally on the spacecraft without waiting for Earth round-trip telemetry.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() =>
                  onUpdateCommStatus({
                    earth_comm_status: 'NOMINAL_DELAYED',
                    one_way_delay_minutes: 14.2,
                    offline_mode_forced: false,
                  })
                }
                className={`px-3 py-1.5 rounded text-xs font-medium border ${
                  comm_state.earth_comm_status === 'NOMINAL_DELAYED' && !comm_state.offline_mode_forced
                    ? 'bg-[#162440] border-[#38bdf8] text-[#f8fafc]'
                    : 'bg-[#0d1424] border-[#1e2d4a] text-[#a8b8d0]'
                }`}
              >
                14.2m Mars Link
              </button>
              <button
                onClick={() =>
                  onUpdateCommStatus({
                    earth_comm_status: 'HIGH_LATENCY_DEGRADED',
                    one_way_delay_minutes: 21.8,
                    offline_mode_forced: false,
                  })
                }
                className={`px-3 py-1.5 rounded text-xs font-medium border ${
                  comm_state.earth_comm_status === 'HIGH_LATENCY_DEGRADED'
                    ? 'bg-[#162440] border-[#f59e0b] text-[#f8fafc]'
                    : 'bg-[#0d1424] border-[#1e2d4a] text-[#a8b8d0]'
                }`}
              >
                21.8m Max Delay
              </button>
              <button
                onClick={() =>
                  onUpdateCommStatus({
                    earth_comm_status: 'CONJUNCTION_BLACKOUT',
                    one_way_delay_minutes: 22.0,
                    offline_mode_forced: true,
                  })
                }
                className={`px-3 py-1.5 rounded text-xs font-medium border ${
                  comm_state.earth_comm_status === 'CONJUNCTION_BLACKOUT' || comm_state.offline_mode_forced
                    ? 'bg-amber-950/90 border-[#f59e0b] text-amber-200'
                    : 'bg-[#0d1424] border-[#1e2d4a] text-[#a8b8d0]'
                }`}
              >
                Solar Conjunction Blackout (Offline)
              </button>
            </div>
          </div>

          {/* Comm KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-data">
            <div className="panel-surface rounded p-4">
              <div className="text-xs text-[#a8b8d0]">Earth Telemetry Link State</div>
              <div className="text-lg font-semibold text-[#f8fafc] mt-1">
                {comm_state.earth_comm_status.replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-[#38bdf8] mt-1">
                Distance: ~{comm_state.distance_million_km}M km
              </div>
            </div>
            <div className="panel-surface rounded p-4">
              <div className="text-xs text-[#a8b8d0]">One-Way / Round-Trip Light Delay</div>
              <div className="text-2xl font-semibold text-[#f8fafc] mt-1">
                {comm_state.one_way_delay_minutes.toFixed(1)}m{' '}
                <span className="text-sm font-normal text-[#a8b8d0]">
                  / {(comm_state.one_way_delay_minutes * 2).toFixed(1)}m RTT
                </span>
              </div>
              <div className="text-xs text-[#a8b8d0] mt-1">Real-time telemedicine impossible</div>
            </div>
            <div className="panel-surface rounded p-4">
              <div className="text-xs text-[#a8b8d0]">Pending Store-and-Forward Packets</div>
              <div className="text-2xl font-semibold text-[#f59e0b] mt-1">
                {comm_state.pending_reports_count} <span className="text-sm font-normal text-[#a8b8d0]">queued locally</span>
              </div>
              <div className="text-xs text-[#a8b8d0] mt-1">
                Last Sync: {comm_state.last_sync_timestamp.slice(0, 16).replace('T', ' ')}Z
              </div>
            </div>
            <div className="panel-surface rounded p-4">
              <div className="text-xs text-[#a8b8d0]">Onboard Medical Autonomy Engine</div>
              <div className="text-lg font-semibold text-[#10b981] mt-1">100% LOCAL ACTIVE</div>
              <div className="text-xs text-[#a8b8d0] mt-1">SQLite + Local Vector RAG + CMO Rules</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Store-and-Forward Queue Generator & Sync */}
            <div className="lg:col-span-5 panel-surface rounded-lg p-5 space-y-4">
              <h3 className="text-base font-semibold text-[#f8fafc]">
                Generate & Queue Store-and-Forward Health Report
              </h3>
              <p className="text-xs text-[#a8b8d0]">
                Packages current vitals, baseline deltas, and hazard status into the onboard SQLite buffer for delayed
                transmission to Earth Flight Surgeons.
              </p>
              <label className="block text-xs">
                <span className="text-[#cbd5e1]">Report Packet Title</span>
                <input
                  type="text"
                  value={rptTitle}
                  onChange={(e) => setRptTitle(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <label className="block text-xs">
                <span className="text-[#cbd5e1]">Clinical Telemetry Summary</span>
                <textarea
                  rows={3}
                  value={rptNotes}
                  onChange={(e) => setRptNotes(e.target.value)}
                  className="mt-1 w-full p-2.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                />
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={async () => {
                    await onQueueReport({
                      title: rptTitle,
                      summary: rptNotes,
                      risk_level: assessment.overall_status,
                      hazard_triggers: Object.entries(assessment.hazard_statuses)
                        .filter(([_, st]) => st !== 'NORMAL')
                        .map(([k]) => k),
                      payload_snapshot: {
                        mission_day: latest.mission_day,
                        hr: latest.heart_rate_bpm,
                        bp: `${latest.systolic_bp_mmhg}/${latest.diastolic_bp_mmhg}`,
                        dose_msv: latest.equivalent_dose_rate_msv_day,
                      },
                      provenance: 'USER_ENTERED',
                    });
                    setSyncMessage('Health report saved to local SQLite store-and-forward queue.');
                    setTimeout(() => setSyncMessage(''), 4000);
                  }}
                  className="flex-1 py-2 px-3 rounded bg-[#38bdf8] hover:bg-[#0284c7] text-[#070b14] font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Save & Queue Packet Locally
                </button>
                <button
                  onClick={async () => {
                    await onSyncReports();
                    setSyncMessage('Simulated DSN uplink complete: all queued packets marked SYNCHRONIZED_ACK.');
                    setTimeout(() => setSyncMessage(''), 4000);
                  }}
                  className="flex-1 py-2 px-3 rounded bg-[#131d33] hover:bg-[#1c2b4b] text-[#f8fafc] border border-[#38bdf8]/50 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#38bdf8]" /> Simulate Earth Link Sync
                </button>
              </div>
              {syncMessage && <p className="text-xs text-[#10b981] font-medium">{syncMessage}</p>}

              <div className="pt-4 border-t border-[#1e2d4a] space-y-2">
                <h4 className="text-xs font-semibold text-[#f8fafc]">
                  Zero-Latency Local Emergency Escalation (No Earth Wait)
                </h4>
                <p className="text-xs text-[#a8b8d0]">
                  Immediately launches the autonomous onboard Crew Medical Officer (CMO) emergency checklist:
                </p>
                <button
                  onClick={() =>
                    onTriggerEmergency('Space Radiation / Multi-Hazard', [
                      'Acute threshold exceedance',
                      'Autonomous deep-space escalation test',
                    ])
                  }
                  className="w-full py-2 px-3 rounded bg-red-950/90 hover:bg-red-900 text-red-100 border border-red-500/60 font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400" /> Execute Local Emergency Protocol Now
                </button>
              </div>
            </div>

            {/* Right: Store-and-Forward Queue Table */}
            <div className="lg:col-span-7 panel-surface rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#f8fafc]">
                  Store-and-Forward Telemetry Queue ({store_forward_reports.length} Packets)
                </h3>
                <span className="text-xs text-[#a8b8d0] tabular-data">SQLite Local Buffer</span>
              </div>
              <div className="overflow-x-auto border border-[#1e2d4a] rounded">
                <table className="w-full text-left border-collapse text-xs tabular-data">
                  <thead>
                    <tr className="bg-[#131d33] text-[#a8b8d0] border-b border-[#1e2d4a]">
                      <th className="py-2.5 px-3">Packet UID</th>
                      <th className="py-2.5 px-3">Sol</th>
                      <th className="py-2.5 px-3">Title & Summary</th>
                      <th className="py-2.5 px-3">Risk</th>
                      <th className="py-2.5 px-3">Transmission State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2d4a]">
                    {store_forward_reports.map((rpt) => (
                      <tr key={rpt.report_uid} className="hover:bg-[#111a2e]">
                        <td className="py-2.5 px-3 font-mono text-[#38bdf8] whitespace-nowrap">{rpt.report_uid}</td>
                        <td className="py-2.5 px-3 text-[#f1f5f9]">Sol {rpt.mission_day}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#f8fafc]">{rpt.title}</div>
                          <div className="text-[#a8b8d0] line-clamp-2 mt-0.5">{rpt.summary}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-semibold ${badgeStyle(rpt.risk_level)}`}>
                            {rpt.risk_level}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {rpt.transmission_status === 'SYNCHRONIZED_ACK' ? (
                            <span className="text-[#10b981] font-medium">SYNCHRONIZED_ACK</span>
                          ) : (
                            <span className="text-[#f59e0b] font-semibold">QUEUED_LOCAL_BUFFER</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 4: GRAVITY FIELDS & PHYSIOLOGICAL ADAPTATION
      ===================================================================== */}
      {activeHazardTab === 'Gravity Fields' && (
        <div className="space-y-6">
          <div className="p-4 rounded bg-[#131d33] border border-[#263859] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-[#cbd5e1] prose-measure">
              <strong className="text-[#f8fafc]">Three-Regime Gravitational Adaptation (0g · 0.38g · 1.0g):</strong>{' '}
              Evaluates cardiovascular baroreflex sensitivity (CSA CCISS & CARDIOBREATH), orthostatic intolerance upon
              standing in Martian partial gravity, antigravity muscle & bone unloading, and neurovestibular / SANS ocular
              shifts relative to personal baseline.
            </div>
            <span className="px-3 py-1.5 rounded text-xs font-semibold bg-[#0d1424] border border-[#38bdf8]/50 text-[#38bdf8] tabular-data shrink-0">
              Active Phase: {latest.mission_phase.replace(/_/g, ' ')} ({latest.gravity_g}g)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-data">
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Heart Rate</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.heart_rate_bpm.toFixed(0)} bpm</div>
              <div className="text-xs text-[#38bdf8] mt-0.5">Baseline: {astronaut.baseline_hr_bpm} bpm</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Blood Pressure</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">
                {latest.systolic_bp_mmhg.toFixed(0)}/{latest.diastolic_bp_mmhg.toFixed(0)}
              </div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">
                Base: {astronaut.baseline_systolic_mmhg}/{astronaut.baseline_diastolic_mmhg} mmHg
              </div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Orthostatic Dizziness</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">Level {latest.dizziness_severity}/3</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">
                Presyncope: {latest.faintness_presyncope ? 'YES' : 'None'}
              </div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Muscle Strength Idx</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.muscle_strength_idx.toFixed(1)}</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Adherence: {latest.exercise_adherence_pct.toFixed(0)}%</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Sensorimotor Balance</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.balance_score.toFixed(0)} / 100</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Base: {astronaut.baseline_balance_score}/100</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">SANS Ocular Status</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">
                {latest.visual_disturbance_sans ? 'Flagged' : 'Nominal'}
              </div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Coord: {latest.coordination_score.toFixed(0)}/100</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel-surface rounded-lg p-5">
              <h3 className="text-base font-semibold text-[#f8fafc] mb-1">
                Cardiovascular Adaptation: Heart Rate & Systolic BP Across 0g → 0.38g Transition
              </h3>
              <p className="text-xs text-[#a8b8d0] mb-4">
                Demonstrates post-landing Sol 176 orthostatic HR surge (+16 bpm) and systolic pressure dip in 0.38g
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                    <XAxis dataKey="mission_day" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `Sol ${v}`} />
                    <YAxis domain={[50, 130]} stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1424', borderColor: '#263859', color: '#f8fafc', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine y={astronaut.baseline_hr_bpm} stroke="#38bdf8" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="heart_rate_bpm" name="Heart Rate (bpm)" stroke="#38bdf8" strokeWidth={2} />
                    <Line type="monotone" dataKey="systolic_bp_mmhg" name="Systolic BP (mmHg)" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel-surface rounded-lg p-5">
              <h3 className="text-base font-semibold text-[#f8fafc] mb-1">
                Musculoskeletal Strength, Countermeasure Adherence & Neurovestibular Balance
              </h3>
              <p className="text-xs text-[#a8b8d0] mb-4">
                Tracks ARED resistance retention and otolith-proprioceptive balance recovery on Mars
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                    <XAxis dataKey="mission_day" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `Sol ${v}`} />
                    <YAxis domain={[60, 105]} stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1424', borderColor: '#263859', color: '#f8fafc', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="muscle_strength_idx" name="Muscle Strength Index" stroke="#38bdf8" strokeWidth={2} />
                    <Line type="monotone" dataKey="balance_score" name="Balance Score (/100)" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="exercise_adherence_pct" name="Exercise Adherence (%)" stroke="#10b981" strokeWidth={1.8} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 5: HOSTILE AND CLOSED ENVIRONMENT MONITORING
      ===================================================================== */}
      {activeHazardTab === 'Hostile and Closed Environments' && (
        <div className="space-y-6">
          <div className="p-4 rounded bg-[#131d33] border border-[#263859] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-[#cbd5e1] prose-measure">
              <strong className="text-[#f8fafc]">ECLSS Closed-Habitat Correlation & Non-Diagnostic Rule:</strong>{' '}
              Monitors spacecraft/habitat CO2 partial pressure, O2%, pressure, temperature, humidity, and air quality
              alongside crew body temperature and respiratory symptoms.{' '}
              <strong>
                Environmental telemetry is never used to automatically diagnose an infectious disease; thresholds are
                configurable mission-specific prototype rules.
              </strong>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono bg-[#0d1424] border border-[#1e2d4a] text-[#f59e0b] shrink-0">
              EVENT: {latest.env_warning_event}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 tabular-data">
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Cabin CO2</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.co2_mmhg.toFixed(2)} mmHg</div>
              <div className="text-xs text-[#38bdf8] mt-0.5">{latest.co2_ppm.toFixed(0)} ppm</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Cabin O2</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.oxygen_pct.toFixed(1)}%</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Range: 19.5–23.1%</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Cabin Pressure</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.cabin_pressure_kpa.toFixed(1)} kPa</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Nominal ~70.3 kPa</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Cabin Temp / RH</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">
                {latest.cabin_temp_c.toFixed(1)}°C · {latest.humidity_pct.toFixed(0)}%
              </div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Target 30–70% RH</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Particulate AQI</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.air_quality_index.toFixed(0)}</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">Warn: {environmental_limits.aqi_warn}</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Crew Body Temp</div>
              <div className="text-xl font-semibold text-[#f8fafc] mt-1">{latest.body_temp_c.toFixed(1)}°C</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">SpO2: {latest.spo2_pct.toFixed(1)}%</div>
            </div>
            <div className="panel-surface rounded p-3.5">
              <div className="text-xs text-[#a8b8d0]">Hygiene Adherence</div>
              <div className="text-xl font-semibold text-[#10b981] mt-1">{latest.hygiene_adherence_pct.toFixed(0)}%</div>
              <div className="text-xs text-[#a8b8d0] mt-0.5">HEPA + Surface</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 panel-surface rounded-lg p-5">
              <h3 className="text-base font-semibold text-[#f8fafc] mb-1">
                Habitat CO2 Partial Pressure (mmHg) & Particulate Air Quality Index (AQI)
              </h3>
              <p className="text-xs text-[#a8b8d0] mb-4">
                Tracks CDRA CO2 scrubber saturation and airlock dust ingress against crew headaches & airway irritation
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                    <XAxis dataKey="mission_day" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `Sol ${v}`} />
                    <YAxis yAxisId="left" domain={[1.5, 5.0]} stroke="#38bdf8" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#f59e0b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1424', borderColor: '#263859', color: '#f8fafc', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine yAxisId="left" y={environmental_limits.co2_warn_mmhg} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Line yAxisId="left" type="monotone" dataKey="co2_mmhg" name="Cabin CO2 (mmHg)" stroke="#38bdf8" strokeWidth={2.2} />
                    <Line yAxisId="right" type="monotone" dataKey="air_quality_index" name="Particulate AQI" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 panel-surface rounded-lg p-5 space-y-4">
              <h3 className="text-base font-semibold text-[#f8fafc]">
                Crew Symptom & Environmental Correlation Ledger
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded bg-[#131d33] border border-[#263859]">
                  <span className="text-[#a8b8d0]">Reported Respiratory Symptoms:</span>
                  <div className="font-semibold text-[#f8fafc] mt-1">
                    {latest.respiratory_symptoms.length > 0 ? latest.respiratory_symptoms.join(', ') : 'None reported'}
                  </div>
                </div>
                <div className="p-3 rounded bg-[#131d33] border border-[#263859]">
                  <span className="text-[#a8b8d0]">Reported General / Febrile Symptoms:</span>
                  <div className="font-semibold text-[#f8fafc] mt-1">
                    {latest.infection_symptoms.length > 0 ? latest.infection_symptoms.join(', ') : 'Afebrile / None reported'}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1e2d4a] space-y-3">
                <h4 className="text-xs font-semibold text-[#f8fafc] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#38bdf8]" /> Configurable Mission ECLSS Limits
                </h4>
                <div className="grid grid-cols-3 gap-2.5 text-xs tabular-data">
                  <label className="block">
                    <span className="text-[#cbd5e1]">CO2 Warn (mmHg)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={co2Warn}
                      onChange={(e) => setCo2Warn(parseFloat(e.target.value) || 3.0)}
                      className="mt-1 w-full px-2 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[#cbd5e1]">CO2 Crit (mmHg)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={co2Crit}
                      onChange={(e) => setCo2Crit(parseFloat(e.target.value) || 4.5)}
                      className="mt-1 w-full px-2 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[#cbd5e1]">AQI Warn</span>
                    <input
                      type="number"
                      step="5"
                      value={aqiWarn}
                      onChange={(e) => setAqiWarn(parseFloat(e.target.value) || 50)}
                      className="mt-1 w-full px-2 py-1.5 rounded bg-[#070b14] border border-[#263859] text-[#f8fafc]"
                    />
                  </label>
                </div>
                <button
                  onClick={() =>
                    onUpdateLimits({
                      environmental_limits: {
                        ...environmental_limits,
                        co2_warn_mmhg: co2Warn,
                        co2_crit_mmhg: co2Crit,
                        aqi_warn: aqiWarn,
                      },
                    })
                  }
                  className="w-full py-2 px-3 rounded bg-[#38bdf8] hover:bg-[#0284c7] text-[#070b14] font-semibold text-xs transition-colors"
                >
                  Apply Mission ECLSS Thresholds
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Hazard Findings & Recommended Actions Footer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="panel-surface rounded-lg p-5 space-y-3">
          <h3 className="text-base font-semibold text-[#f8fafc]">
            Assessment Findings for {activeHazardTab}
          </h3>
          {hazardFindings.length === 0 ? (
            <div className="p-4 rounded bg-[#131d33] border border-[#263859] text-xs text-[#10b981] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              All telemetry parameters for {activeHazardTab} are within personal baseline and configured mission limits.
            </div>
          ) : (
            <div className="space-y-2.5">
              {hazardFindings.map((fd, idx) => (
                <div key={idx} className="p-3.5 rounded bg-[#131d33] border border-[#263859] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#f8fafc]">{fd.title}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${badgeStyle(fd.severity)}`}>
                      {fd.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[#cbd5e1] leading-relaxed">{fd.detail}</p>
                  <div className="text-[11px] text-[#38bdf8] tabular-data">
                    Rule: {fd.rule_type} · Reference: {fd.ref_doc}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-surface rounded-lg p-5 space-y-3">
          <h3 className="text-base font-semibold text-[#f8fafc]">
            Approved Countermeasures & Recommended Actions ({activeHazardTab})
          </h3>
          <div className="space-y-2.5">
            {hazardRecs.map((rec, idx) => (
              <div key={idx} className="p-3.5 rounded bg-[#131d33] border border-[#263859] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[#38bdf8]">{rec.procedure_code}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#0d1424] border border-[#263859] text-[#cbd5e1]">
                    PRIORITY: {rec.priority}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#f8fafc]">{rec.action}</div>
                <p className="text-xs text-[#a8b8d0] leading-relaxed">{rec.rationale}</p>
                <div className="text-[11px] text-[#38bdf8]">Citation: {rec.citation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

