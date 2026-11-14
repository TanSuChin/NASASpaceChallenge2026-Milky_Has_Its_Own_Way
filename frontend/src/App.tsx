import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  LayoutDashboard,
  UserCheck,
  Radiation,
  ClipboardEdit,
  Sparkles,
  ShieldCheck,
  History,
  ShieldAlert,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Radio,
  Activity,
  Wind,
  X,
} from 'lucide-react';
import {
  FullSystemState,
  RiskLevel,
  EmergencyProtocolResult,
  RAGAnalysisResponse,
} from './types';
import { BodyMapInteractive } from './components/BodyMapInteractive';
import { FiveHazardsScreen } from './components/FiveHazardsScreen';
import { HealthAssessmentForm } from './components/HealthAssessmentForm';
import { AnalysisAndRAGScreen } from './components/AnalysisAndRAGScreen';
import { GuidanceScreen, HistoryAndReportsScreen } from './components/GuidanceAndHistoryScreens';

type ScreenId =
  | 'dashboard'
  | 'bodymap'
  | 'hazards'
  | 'assessment'
  | 'analysis'
  | 'guidance'
  | 'history';

const NAV_ITEMS: { id: ScreenId; label: string; short: string; icon: any }[] = [
  { id: 'dashboard', label: '1. Mission Health Dashboard', short: 'Dashboard', icon: LayoutDashboard },
  { id: 'bodymap', label: '2. Interactive Body Map', short: 'Body Map', icon: UserCheck },
  { id: 'hazards', label: '3. Five Hazard Monitoring', short: '5 Hazards', icon: Radiation },
  { id: 'assessment', label: '4. Health Assessment Input', short: 'Enter Vitals', icon: ClipboardEdit },
  { id: 'analysis', label: '5. AI Analysis & Local RAG', short: 'AI & RAG', icon: Sparkles },
  { id: 'guidance', label: '6. Guidance & Procedures', short: 'Guidance', icon: ShieldCheck },
  { id: 'history', label: '7. History, Sync & Data Dict', short: 'History', icon: History },
];

function statusBadge(status: RiskLevel): string {
  if (status === 'CRITICAL') return 'bg-red-950/90 text-red-200 border border-red-500/60';
  if (status === 'WARNING') return 'bg-amber-950/90 text-amber-200 border border-amber-500/60';
  return 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/60';
}

export default function App() {
  const [state, setState] = useState<FullSystemState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');
  const [activeHazardTab, setActiveHazardTab] = useState<string>('Space Radiation');
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<string>('heart');
  const [emergencyProtocol, setEmergencyProtocol] = useState<EmergencyProtocolResult | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState<string>('');

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Backend fetch failed');
      const data: FullSystemState = await res.json();
      setState(data);
      localStorage.setItem('tarscare_cached_state', JSON.stringify(data));
    } catch {
      const cached = localStorage.getItem('tarscare_cached_state');
      if (cached) {
        setState(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleLoadScenario = async (scenarioId: string) => {
    setScenarioLoading(scenarioId);
    try {
      const res = await fetch(`/api/scenario/${scenarioId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setState(data);
        localStorage.setItem('tarscare_cached_state', JSON.stringify(data));
      }
    } finally {
      setScenarioLoading('');
    }
  };

  const handleSubmitMeasurement = async (payload: any) => {
    const res = await fetch('/api/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data);
      localStorage.setItem('tarscare_cached_state', JSON.stringify(data));
    }
  };

  const handleSubmitPsych = async (payload: any) => {
    const res = await fetch('/api/psych-questionnaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data);
    }
  };

  const handleUpdateComm = async (payload: any) => {
    const res = await fetch('/api/comm/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data);
    }
  };

  const handleQueueReport = async (payload: any) => {
    const res = await fetch('/api/comm/queue-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data);
    }
  };

  const handleSyncReports = async () => {
    const res = await fetch('/api/comm/sync', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setState(data.state);
    }
  };

  const handleTriggerEmergency = async (hazard: string, symptoms: string[]) => {
    if (!state) return;
    const latest = state.latest_telemetry;
    const res = await fetch('/api/emergency/escalate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger_hazard: hazard,
        severity: 'CRITICAL',
        reported_symptoms: symptoms,
        vital_signs_summary: `HR ${latest.heart_rate_bpm} bpm, BP ${latest.systolic_bp_mmhg}/${latest.diastolic_bp_mmhg} mmHg, SpO2 ${latest.spo2_pct}%, Dose ${latest.equivalent_dose_rate_msv_day} mSv/d, CO2 ${latest.co2_mmhg} mmHg`,
        mission_phase: latest.mission_phase,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setEmergencyProtocol(data.protocol);
      setState(data.state);
    }
  };

  const handleQueryRAG = async (question: string, hazardFilter: string): Promise<RAGAnalysisResponse> => {
    const res = await fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        hazard_filter: hazardFilter === 'ALL' ? null : hazardFilter,
        include_astronaut_context: true,
      }),
    });
    return await res.json();
  };

  const handleUpdateLimits = async (payload: any) => {
    const res = await fetch('/api/config/limits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data);
    }
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setState(data);
      setEmergencyProtocol(null);
    }
  };

  if (loading || !state) {
    return (
      <div className="min-h-screen bg-[#070b14] text-[#f8fafc] p-8 space-y-6">
        <div className="h-14 rounded bg-[#0d1424] border border-[#1e2d4a] animate-pulse" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 h-96 rounded bg-[#0d1424] border border-[#1e2d4a] animate-pulse" />
          <div className="col-span-9 h-96 rounded bg-[#0d1424] border border-[#1e2d4a] animate-pulse" />
        </div>
      </div>
    );
  }

  const { astronaut, latest_telemetry: latest, telemetry_history: history, assessment, comm_state } = state;

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-[#f1f5f9]">
      {/* Top Spacecraft Medical Command Header */}
      <header className="bg-[#0b1221] border-b border-[#1e2d4a] px-4 lg:px-6 py-3 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Astronaut Identity */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[#162645] border border-[#38bdf8] flex items-center justify-center text-[#38bdf8] font-bold text-sm">
                TC
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight text-[#f8fafc] flex items-center gap-2">
                  <span>TARSCARE AI</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#131d33] border border-[#263859] text-[#38bdf8]">
                    SOL {latest.mission_day}
                  </span>
                </div>
                <div className="text-xs text-[#a8b8d0]">
                  {astronaut.name} · {latest.mission_phase.replace(/_/g, ' ')} ({latest.gravity_g}g)
                </div>
              </div>
            </div>
          </div>

          {/* Scenario Quick-Loader + Comm Delay + Overall Status + Emergency Trigger */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs tabular-data">
            {/* Demo Scenario Selector */}
            <div className="flex items-center gap-1.5 bg-[#0d1424] border border-[#1e2d4a] rounded px-2.5 py-1">
              <span className="text-[#a8b8d0] hidden xl:inline">Demo Telemetry:</span>
              <button
                onClick={() => handleLoadScenario('NOMINAL_MARS_SOL')}
                disabled={!!scenarioLoading}
                className="px-2 py-0.5 rounded hover:bg-[#162440] text-[#10b981] font-medium transition-colors"
              >
                Nominal
              </button>
              <button
                onClick={() => handleLoadScenario('ENV_CO2_CONFINEMENT_WARNING')}
                disabled={!!scenarioLoading}
                className="px-2 py-0.5 rounded hover:bg-[#162440] text-[#f59e0b] font-medium transition-colors"
              >
                CO2/Sleep Warn
              </button>
              <button
                onClick={() => handleLoadScenario('SPE_SOLAR_STORM_CRITICAL')}
                disabled={!!scenarioLoading}
                className="px-2 py-0.5 rounded hover:bg-[#162440] text-[#ef4444] font-medium transition-colors"
              >
                SPE Radiation Crit
              </button>
              <button
                onClick={() => handleLoadScenario('GRAVITY_ORTHOSTATIC_CRITICAL')}
                disabled={!!scenarioLoading}
                className="px-2 py-0.5 rounded hover:bg-[#162440] text-[#ef4444] font-medium transition-colors"
              >
                0.38g Orthostatic Crit
              </button>
            </div>

            {/* Earth Comm Link Pill */}
            <button
              onClick={() => {
                setActiveHazardTab('Distance from Earth');
                setActiveScreen('hazards');
              }}
              className="px-2.5 py-1.5 rounded bg-[#131d33] hover:bg-[#1a2846] border border-[#263859] flex items-center gap-1.5 text-[#cbd5e1]"
              title="Click to configure Earth communication link & Store-and-Forward queue"
            >
              {comm_state.earth_comm_status === 'CONJUNCTION_BLACKOUT' || comm_state.offline_mode_forced ? (
                <WifiOff className="w-3.5 h-3.5 text-[#f59e0b]" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-[#10b981]" />
              )}
              <span>OWLT: {comm_state.one_way_delay_minutes.toFixed(1)}m</span>
              {comm_state.pending_reports_count > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-200 border border-amber-500/40 font-semibold">
                  {comm_state.pending_reports_count} Queued
                </span>
              )}
            </button>

            {/* Overall Health Status Pill */}
            <div className={`px-3 py-1.5 rounded font-semibold ${statusBadge(assessment.overall_status)}`}>
              STATUS: {assessment.overall_status}
            </div>

            {/* Autonomous Emergency Protocol Trigger */}
            <button
              onClick={() =>
                handleTriggerEmergency(
                  assessment.findings[0]?.hazard || 'Autonomous Multi-Hazard Escalation',
                  assessment.findings.map((f) => f.title)
                )
              }
              className="px-3 py-1.5 rounded bg-red-950 hover:bg-red-900 text-red-100 border border-red-500/70 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>CMO Emergency</span>
            </button>
          </div>
        </div>
      </header>

      {/* Autonomous Emergency Escalation Banner (when active) */}
      {emergencyProtocol && (
        <div className="bg-red-950/95 border-b border-red-500/70 px-4 lg:px-6 py-4">
          <div className="max-w-[1600px] mx-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-300 shrink-0" />
                <h2 className="text-base font-semibold text-white">
                  {emergencyProtocol.protocol_id}: {emergencyProtocol.protocol_title}
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-900 text-red-100 border border-red-400/50">
                  {emergencyProtocol.execution_mode}
                </span>
              </div>
              <button
                onClick={() => setEmergencyProtocol(null)}
                className="px-2.5 py-1 rounded bg-red-900/80 hover:bg-red-800 text-xs text-red-100 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Dismiss Checklist
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 text-xs">
              {emergencyProtocol.immediate_steps.map((step, i) => (
                <div key={i} className="p-2.5 rounded bg-[#1a080c] border border-red-500/40 text-red-100 leading-relaxed">
                  {step}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs text-red-200 pt-1">
              <span>
                Vitals Snapshot: {emergencyProtocol.vital_signs_summary} · Supporting Citation:{' '}
                <strong>{emergencyProtocol.supporting_citation}</strong>
              </span>
              <span>{emergencyProtocol.safety_disclaimer}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: Left 7-Screen Navigation Rail + Central Operational Surface */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 lg:px-6 py-6">
        {/* Left Navigation Rail */}
        <aside className="lg:col-span-3 xl:col-span-2 flex flex-col justify-between gap-6">
          <nav className="space-y-1.5" aria-label="Main Navigation Screens">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-left text-xs font-medium transition-colors border ${
                    isActive
                      ? 'bg-[#162440] text-[#f8fafc] border-[#38bdf8]'
                      : 'bg-[#0d1424] text-[#a8b8d0] border-[#1e2d4a] hover:bg-[#131d33] hover:text-[#f1f5f9]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}`} strokeWidth={1.75} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Compact Astronaut Baseline & Provenance Card */}
          <div className="panel-surface rounded-lg p-4 space-y-3 text-xs tabular-data hidden lg:block">
            <h2 className="text-xs font-semibold text-[#f8fafc] pb-2 border-b border-[#1e2d4a]">
              Crew Baseline Reference
            </h2>
            <div className="space-y-1.5 text-[#cbd5e1]">
              <div className="flex justify-between">
                <span className="text-[#a8b8d0]">Resting HR:</span>
                <span>{astronaut.baseline_hr_bpm} bpm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a8b8d0]">Baseline BP:</span>
                <span>{astronaut.baseline_systolic_mmhg}/{astronaut.baseline_diastolic_mmhg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a8b8d0]">Baseline SpO2:</span>
                <span>{astronaut.baseline_spo2_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a8b8d0]">Baseline Sleep:</span>
                <span>{astronaut.baseline_sleep_hrs} hrs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a8b8d0]">Balance Base:</span>
                <span>{astronaut.baseline_balance_score}/100</span>
              </div>
            </div>
            <div className="pt-2 border-t border-[#1e2d4a] text-[11px] text-[#a8b8d0] leading-snug">
              Active Record Provenance:
              <div className="font-mono text-[#38bdf8] mt-0.5">{latest.provenance}</div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-9 xl:col-span-10 min-w-0">
          {/* =================================================================
              SCREEN 1: MISSION HEALTH DASHBOARD
          ================================================================= */}
          {activeScreen === 'dashboard' && (
            <div className="space-y-6">
              {/* Top Mission Overview Header */}
              <div className="panel-surface rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-semibold tracking-tight text-[#f8fafc]">
                      Mission Health & Autonomous Decision-Support Dashboard
                    </h1>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-[#131d33] border border-[#263859] text-[#38bdf8]">
                      {latest.provenance}
                    </span>
                  </div>
                  <p className="text-xs text-[#cbd5e1] prose-measure leading-relaxed">
                    {latest.notes}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveScreen('assessment')}
                    className="px-3.5 py-2 rounded bg-[#38bdf8] hover:bg-[#0284c7] text-[#070b14] font-semibold text-xs transition-colors"
                  >
                    + Log Vitals / Symptoms
                  </button>
                  <button
                    onClick={() => setActiveScreen('analysis')}
                    className="px-3.5 py-2 rounded bg-[#131d33] hover:bg-[#1c2b4b] text-[#f8fafc] border border-[#263859] font-semibold text-xs transition-colors"
                  >
                    Open RAG Research Analysis →
                  </button>
                </div>
              </div>

              {/* Active Alerts Strip */}
              {assessment.active_alerts.length > 0 && (
                <div className="panel-surface rounded-lg p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                      Active Spaceflight Health & Environmental Alerts ({assessment.active_alerts.length})
                    </h2>
                    <span className="text-xs text-[#a8b8d0]">Click any hazard below to inspect protocol</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {assessment.active_alerts.map((al) => (
                      <div
                        key={al.id}
                        className="p-3 rounded bg-[#131d33] border border-[#263859] flex flex-col justify-between gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#f8fafc]">{al.hazard}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${statusBadge(al.severity)}`}>
                            {al.severity}
                          </span>
                        </div>
                        <p className="text-xs text-[#cbd5e1] leading-relaxed">{al.message}</p>
                        <div className="text-[11px] text-[#38bdf8] font-medium">
                          Action: {al.action_required}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Five Hazard Summaries Matrix */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#f8fafc]">
                    Five NASA Human-Spaceflight Hazards Status Matrix
                  </h2>
                  <span className="text-xs text-[#a8b8d0]">Select a hazard module to open detailed telemetry</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 tabular-data">
                  {[
                    {
                      name: 'Space Radiation',
                      icon: Radiation,
                      primary: `${latest.equivalent_dose_rate_msv_day.toFixed(2)} mSv/d`,
                      secondary: `${latest.absorbed_dose_mgy.toFixed(2)} mGy · Cumul ${latest.cumulative_effective_dose_msv.toFixed(1)} mSv`,
                    },
                    {
                      name: 'Isolation and Confinement',
                      icon: Brain,
                      primary: `Sleep ${latest.sleep_duration_hrs.toFixed(1)} hrs`,
                      secondary: `Mood ${latest.mood_score}/10 · Stress ${latest.stress_level}/10`,
                    },
                    {
                      name: 'Distance from Earth',
                      icon: Radio,
                      primary: `${comm_state.one_way_delay_minutes.toFixed(1)}m OWLT`,
                      secondary: `${comm_state.pending_reports_count} Queued · Offline Ready`,
                    },
                    {
                      name: 'Gravity Fields',
                      icon: Activity,
                      primary: `${latest.heart_rate_bpm.toFixed(0)} bpm (${latest.gravity_g}g)`,
                      secondary: `BP ${latest.systolic_bp_mmhg.toFixed(0)}/${latest.diastolic_bp_mmhg.toFixed(0)} · Bal ${latest.balance_score}/100`,
                    },
                    {
                      name: 'Hostile and Closed Environments',
                      icon: Wind,
                      primary: `CO2 ${latest.co2_mmhg.toFixed(2)} mmHg`,
                      secondary: `O2 ${latest.oxygen_pct.toFixed(1)}% · RH ${latest.humidity_pct.toFixed(0)}% · AQI ${latest.air_quality_index.toFixed(0)}`,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const st: RiskLevel = assessment.hazard_statuses[item.name] || 'NORMAL';
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setActiveHazardTab(item.name);
                          setActiveScreen('hazards');
                        }}
                        className="panel-surface rounded-lg p-4 text-left hover:bg-[#131d33] transition-colors flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-[#f8fafc] flex items-center gap-1.5">
                            <Icon className="w-4 h-4 text-[#38bdf8] shrink-0" strokeWidth={1.75} />
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusBadge(st)}`}>
                            {st}
                          </span>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-[#f8fafc]">{item.primary}</div>
                          <div className="text-xs text-[#a8b8d0] mt-0.5">{item.secondary}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Latest Measurements vs Individual Baseline Ledger + Interactive Body Map Quick View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 panel-surface rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[#f8fafc]">
                      Latest Telemetry vs. Personal Astronaut Baseline
                    </h2>
                    <span className="text-xs text-[#a8b8d0] tabular-data">
                      Sol {latest.mission_day} · {latest.gravity_g}g
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-[#1e2d4a] rounded">
                    <table className="w-full text-left border-collapse text-xs tabular-data">
                      <thead>
                        <tr className="bg-[#131d33] text-[#a8b8d0] border-b border-[#1e2d4a]">
                          <th className="py-2 px-3">Parameter</th>
                          <th className="py-2 px-3">Current</th>
                          <th className="py-2 px-3">Baseline</th>
                          <th className="py-2 px-3">Delta</th>
                          <th className="py-2 px-3">Associated Hazard</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2d4a]">
                        {assessment.baseline_comparisons.map((bc) => (
                          <tr key={bc.key} className="hover:bg-[#111a2e]">
                            <td className="py-2 px-3 font-medium text-[#f8fafc]">{bc.metric}</td>
                            <td className="py-2 px-3 font-semibold text-[#38bdf8]">
                              {bc.current} {bc.unit}
                            </td>
                            <td className="py-2 px-3 text-[#a8b8d0]">
                              {bc.baseline} {bc.unit}
                            </td>
                            <td
                              className={`py-2 px-3 font-semibold ${
                                Math.abs(bc.delta_pct) >= 12 ? 'text-[#f59e0b]' : 'text-[#10b981]'
                              }`}
                            >
                              {bc.delta > 0 ? `+${bc.delta}` : bc.delta} ({bc.delta_pct > 0 ? `+${bc.delta_pct}%` : `${bc.delta_pct}%`})
                            </td>
                            <td className="py-2 px-3 text-[#a8b8d0]">{bc.hazard}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Anatomical Systems & RAG Evidence Snapshot */}
                <div className="lg:col-span-5 panel-surface rounded-lg p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-[#f8fafc]">
                        Anatomical Organ-System Status
                      </h2>
                      <button
                        onClick={() => setActiveScreen('bodymap')}
                        className="text-xs text-[#38bdf8] hover:underline font-medium"
                      >
                        Open Interactive Body Map →
                      </button>
                    </div>
                    <div className="divide-y divide-[#1e2d4a] border border-[#1e2d4a] rounded">
                      {assessment.body_regions.map((reg) => (
                        <button
                          key={reg.region_id}
                          onClick={() => {
                            setSelectedBodyRegion(reg.region_id);
                            setActiveScreen('bodymap');
                          }}
                          className="w-full py-2 px-3 flex items-center justify-between text-xs hover:bg-[#131d33] transition-colors text-left"
                        >
                          <span className="font-medium text-[#f1f5f9]">{reg.label}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded tabular-data ${statusBadge(reg.status)}`}>
                            {reg.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded bg-[#131d33] border border-[#263859] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#f8fafc]">Onboard RAG Evidence Summary</span>
                      <span className="text-[#38bdf8] font-mono text-[11px]">
                        {assessment.rag_analysis.citations.length} NASA/CSA Refs
                      </span>
                    </div>
                    <p className="text-[#cbd5e1] line-clamp-3 leading-relaxed">
                      {assessment.rag_analysis.citations[0]?.excerpt}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dashboard Historical Trend Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="panel-surface rounded-lg p-5">
                  <h2 className="text-base font-semibold text-[#f8fafc] mb-1">
                    14-Sol Cardiovascular & Gravity Adaptation Trend (HR & Systolic BP)
                  </h2>
                  <p className="text-xs text-[#a8b8d0] mb-4">
                    Tracks transition from 0g Microgravity Transit (Sol 171–175) to 0.38g Martian Surface (Sol 176–{latest.mission_day})
                  </p>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                        <XAxis dataKey="mission_day" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `Sol ${v}`} />
                        <YAxis domain={[50, 125]} stroke="#94a3b8" fontSize={11} />
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
                  <h2 className="text-base font-semibold text-[#f8fafc] mb-1">
                    14-Sol Radiation Equivalent Dose (mSv/d), Sleep (hrs) & Cabin CO2 (mmHg)
                  </h2>
                  <p className="text-xs text-[#a8b8d0] mb-4">
                    Multi-hazard correlation timeline highlighting Sol 179 SPE storm and Sol 183–184 CO2/sleep shift
                  </p>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                        <XAxis dataKey="mission_day" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `Sol ${v}`} />
                        <YAxis domain={[0, 9]} stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0d1424', borderColor: '#263859', color: '#f8fafc', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="equivalent_dose_rate_msv_day" name="Eq. Dose (mSv/day)" stroke="#f59e0b" strokeWidth={2} />
                        <Line type="monotone" dataKey="sleep_duration_hrs" name="Sleep (hrs)" stroke="#38bdf8" strokeWidth={2} />
                        <Line type="monotone" dataKey="co2_mmhg" name="Cabin CO2 (mmHg)" stroke="#ef4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              SCREEN 2: INTERACTIVE HUMAN BODY MAP
          ================================================================= */}
          {activeScreen === 'bodymap' && (
            <BodyMapInteractive
              regions={assessment.body_regions}
              selectedRegionId={selectedBodyRegion}
              onSelectRegion={setSelectedBodyRegion}
              missionPhase={latest.mission_phase}
              gravityG={latest.gravity_g}
              onNavigateToHazard={(hz) => {
                setActiveHazardTab(hz);
                setActiveScreen('hazards');
              }}
            />
          )}

          {/* =================================================================
              SCREEN 3: FIVE HAZARD MONITORING
          ================================================================= */}
          {activeScreen === 'hazards' && (
            <FiveHazardsScreen
              state={state}
              activeHazardTab={activeHazardTab}
              onSelectHazardTab={setActiveHazardTab}
              onSubmitPsychQuestionnaire={handleSubmitPsych}
              onUpdateCommStatus={handleUpdateComm}
              onQueueReport={handleQueueReport}
              onSyncReports={handleSyncReports}
              onTriggerEmergency={handleTriggerEmergency}
              onUpdateLimits={handleUpdateLimits}
            />
          )}

          {/* =================================================================
              SCREEN 4: HEALTH ASSESSMENT INPUT
          ================================================================= */}
          {activeScreen === 'assessment' && (
            <HealthAssessmentForm
              latest={latest}
              onSubmitMeasurement={handleSubmitMeasurement}
              onNavigateToAnalysis={() => setActiveScreen('analysis')}
            />
          )}

          {/* =================================================================
              SCREEN 5: AI HEALTH ANALYSIS & LOCAL RAG
          ================================================================= */}
          {activeScreen === 'analysis' && (
            <AnalysisAndRAGScreen
              state={state}
              onQueryRAG={handleQueryRAG}
              onTriggerEmergency={handleTriggerEmergency}
            />
          )}

          {/* =================================================================
              SCREEN 6: HEALTH GUIDANCE AND RECOMMENDATIONS
          ================================================================= */}
          {activeScreen === 'guidance' && (
            <GuidanceScreen
              state={state}
              onTriggerEmergency={handleTriggerEmergency}
            />
          )}

          {/* =================================================================
              SCREEN 7: HEALTH HISTORY, SYNC & DATA DICTIONARY
          ================================================================= */}
          {activeScreen === 'history' && (
            <HistoryAndReportsScreen
              state={state}
              onSyncReports={handleSyncReports}
              onResetDemo={handleResetDemo}
            />
          )}
        </main>
      </div>

      {/* Footer Medical Safety & Data Provenance Disclaimer */}
      <footer className="bg-[#0b1221] border-t border-[#1e2d4a] px-4 lg:px-6 py-3 text-xs text-[#a8b8d0]">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>TARSCARE AI (NASA Space Apps Challenge 2026)</strong> — Autonomous Astronaut Health Monitoring &
            Decision Support Prototype.
          </span>
          <span>
            Research-informed prototype only; not clinically validated. Does not diagnose medical/psychiatric disorders or
            prescribe unverified medications.
          </span>
        </div>
      </footer>
    </div>
  );
}

