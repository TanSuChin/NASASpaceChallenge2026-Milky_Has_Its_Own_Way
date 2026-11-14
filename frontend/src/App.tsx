import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  HeartPulse,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { EmergencyProtocolResult, FullSystemState } from './types';
import { apiRequest, provenanceLabel, statusMeta } from './components/uiHelpers';
import { MissionOverviewView } from './components/MissionOverviewView';
import { HealthAssessmentView } from './components/HealthAssessmentView';
import { SpaceflightHazardsView } from './components/SpaceflightHazardsView';
import { AIHealthAssistantView } from './components/AIHealthAssistantView';
import {
  CommunicationStatusView,
  HealthHistoryView,
} from './components/HealthHistoryAndCommViews';

type NavTab =
  | 'overview'
  | 'assessment'
  | 'hazards'
  | 'assistant'
  | 'history'
  | 'comm';

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'overview', label: 'Mission Overview' },
  { id: 'assessment', label: 'Health Assessment' },
  { id: 'hazards', label: 'Spaceflight Hazards' },
  { id: 'assistant', label: 'AI Health Assistant' },
  { id: 'history', label: 'Health History' },
  { id: 'comm', label: 'Communication Status' },
];

export default function App() {
  const [state, setState] = useState<FullSystemState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('heart');
  const [activeHazardId, setActiveHazardId] = useState<string>('radiation');
  const [assistantSeedPrompt, setAssistantSeedPrompt] = useState<string | undefined>(undefined);

  // Emergency Modal State
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyProtocol, setEmergencyProtocol] = useState<EmergencyProtocolResult | null>(null);
  const [emergencyHazard, setEmergencyHazard] = useState<string>('Cardiovascular / Gravity Adaptation');
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const loadState = useCallback(async () => {
    try {
      setError(null);
      const data = await apiRequest<FullSystemState>('/api/state');
      setState(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
            : 'Unable to reach onboard TARSCARE telemetry backend.',
        );
}
  }, []);

useEffect(() => {
  loadState();
}, [loadState]);

const handleResetDemo = async () => {
  await apiRequest('/api/reset', { method: 'POST' });
  await loadState();
};

const triggerEmergencyProtocol = async (hazardName?: string) => {
  setEmergencyOpen(true);
  setEmergencyLoading(true);
  const targetHazard = hazardName || emergencyHazard;
  try {
    const res = await apiRequest<EmergencyProtocolResult>('/api/emergency/escalate', {
      method: 'POST',
      body: JSON.stringify({
        severity: state?.assessment.overall_status === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        trigger_hazard: targetHazard,
        reported_symptoms: state?.latest_telemetry.respiratory_symptoms || [],
      }),
    });
    setEmergencyProtocol(res);
  } finally {
    setEmergencyLoading(false);
  }
};

if (!state) {
  return (
    <div className="min-h-screen bg-[#0B0D1A] text-[#FAF9FA] flex items-center justify-center p-6">
      <div className="mc-card p-8 max-w-md w-full text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-[#A5D8FF]/20 border border-[#A5D8FF]/40 flex items-center justify-center mx-auto">
          <HeartPulse className="w-5 h-5 text-[#A5D8FF]" />
        </div>
        <h1 className="text-xl font-bold">TARSCARE</h1>
        <p className="text-sm text-[#E5E5E4]/80">
          {error
            ? `Connection notice: ${error}`
            : 'Connecting to autonomous onboard health storage...'}
        </p>
        {error && (
          <button type="button" onClick={loadState} className="mc-btn-primary px-6 py-2.5 text-sm">
            Retry Connection
          </button>
        )}
      </div>
    </div>
  );
}

const commMode = state.assessment.comm_mode?.mode || 'DELAYED';
const commLabel = state.assessment.comm_mode?.label || 'Delayed';
const overallMeta = statusMeta(state.assessment.overall_status);

return (
  <div className="min-h-screen bg-[#0B0D1A] text-[#FAF9FA] flex flex-col">
    {/* Main Application Header: Navigation + Astronaut Profile + Mission Day + Comm Status */}
    <header className="bg-[#0B0D1A] border-b border-white/[0.08]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full bg-[#121522] border border-[#A5D8FF]/45 flex items-center justify-center"
              style={{ boxShadow: '0 0 18px rgba(165,216,255,0.22)' }}
            >
              <Sparkles className="w-4 h-4 text-[#A5D8FF]" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-[#FAF9FA]">TARSCARE</div>
              <div className="text-xs text-[#E5E5E4]/75">
                Personal Health Companion in Deep Space
              </div>
            </div>
          </div>

          {/* Astronaut Profile, Mission Day & Communication Status */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3.5 py-1.5 rounded-full bg-[#121522] border border-white/[0.08] text-xs sm:text-sm text-[#FAF9FA] flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#A5D8FF]" />
              <span className="font-medium">{state.astronaut.name}</span>
              <span className="text-[#E5E5E4]/65">·</span>
              <span className="tabular-data text-[#A5D8FF] font-semibold">
                Sol {state.latest_telemetry.mission_day}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('comm')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${commMode === 'CONNECTED'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : commMode === 'OFFLINE'
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
            >
              {commMode === 'OFFLINE' ? (
                <WifiOff className="w-3.5 h-3.5" />
              ) : (
                <Wifi className="w-3.5 h-3.5" />
              )}
              <span>{commLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => triggerEmergencyProtocol()}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${overallMeta.badgeClass}`}
              title="Open Autonomous Emergency Escalation Checklist"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Status: {overallMeta.label}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="p-2 rounded-full bg-[#121522] border border-white/[0.08] text-[#E5E5E4]/80 hover:text-[#FAF9FA] hover:border-[#A5D8FF]/40"
              title="Reset Demo Dataset to Sol 155–184 Baseline"
              aria-label="Reset Demo Dataset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 6 Main Navigation Items */}
        <nav aria-label="Main navigation" className="flex items-center gap-2 overflow-x-auto pb-1">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${active
                  ? 'bg-[#EEF0F6] text-[#040404] font-semibold'
                  : 'bg-[#121522] text-[#E5E5E4] border border-white/[0.06] hover:border-[#A5D8FF]/40 hover:text-[#FAF9FA]'
                  }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>

    {/* Main Content Workspace */}
    <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
      {activeTab === 'overview' && (
        <MissionOverviewView
          state={state}
          selectedRegionId={selectedRegionId}
          onSelectRegion={setSelectedRegionId}
          onStartAssessment={(regionId) => {
            if (regionId) setSelectedRegionId(regionId);
            setActiveTab('assessment');
          }}
          onOpenHazard={(hazardId) => {
            setActiveHazardId(hazardId);
            setActiveTab('hazards');
          }}
          onAskAssistant={(prompt) => {
            setAssistantSeedPrompt(`${prompt} [Sol ${state.latest_telemetry.mission_day}]`);
            setActiveTab('assistant');
          }}
          onOpenEmergency={() => triggerEmergencyProtocol()}
        />
      )}

      {activeTab === 'assessment' && (
        <HealthAssessmentView
          state={state}
          focusedRegionId={selectedRegionId}
          onStateUpdated={setState}
          onOpenEmergency={() => triggerEmergencyProtocol()}
        />
      )}

      {activeTab === 'hazards' && (
        <SpaceflightHazardsView
          state={state}
          activeHazardId={activeHazardId}
          onSelectHazard={setActiveHazardId}
          onStateUpdated={setState}
          onAskAssistant={(prompt) => {
            setAssistantSeedPrompt(prompt);
            setActiveTab('assistant');
          }}
        />
      )}

      {activeTab === 'assistant' && (
        <AIHealthAssistantView
          state={state}
          initialPrompt={assistantSeedPrompt}
          onStateUpdated={setState}
        />
      )}

      {activeTab === 'history' && (
        <HealthHistoryView state={state} onStateUpdated={setState} />
      )}

      {activeTab === 'comm' && (
        <CommunicationStatusView
          state={state}
          onStateUpdated={setState}
          onOpenEmergency={() => triggerEmergencyProtocol()}
        />
      )}
    </main>

    {/* Subtle Footer Attribution & Data Distinction Notice */}
    <footer className="border-t border-white/[0.07] py-4 px-4 sm:px-6 lg:px-8 text-xs text-[#E5E5E4]/65">
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
        <span>
          TARSCARE · Autonomous local RAG &amp; SQLite engine ·{' '}
          {provenanceLabel(state.latest_telemetry.provenance)} active
        </span>
        <span>
          Educational / Space Apps prototype only — does not diagnose conditions, prescribe medications, or replace Flight Surgeon care.
        </span>
      </div>
    </footer>

    {/* Autonomous Emergency Escalation Checklist Modal */}
    {emergencyOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Autonomous Emergency Escalation Checklist"
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div className="mc-card-glow max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#FAF9FA]">
                Autonomous Emergency Escalation Checklist
              </h2>
              <p className="text-xs text-[#E5E5E4]/80 mt-1">
                Executes instantaneously onboard with zero Earth link requirement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEmergencyOpen(false)}
              className="p-2 rounded-full bg-[#0B0D1A] text-[#E5E5E4] hover:text-[#FAF9FA]"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'Radiation SPE Exposure',
              'Cardiovascular / Gravity Adaptation',
              'Habitat CO2 & Respiratory',
              'Acute Fatigue & Isolation',
            ].map((hz) => (
              <button
                key={hz}
                type="button"
                onClick={() => {
                  setEmergencyHazard(hz);
                  triggerEmergencyProtocol(hz);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${emergencyHazard === hz
                  ? 'bg-[#EEF0F6] text-[#040404]'
                  : 'bg-[#0B0D1A] text-[#E5E5E4] border border-white/10'
                  }`}
              >
                {hz}
              </button>
            ))}
          </div>

          {emergencyLoading || !emergencyProtocol ? (
            <div className="rounded-xl bg-[#0B0D1A] p-4 text-sm text-[#E5E5E4]">
              Generating zero-latency onboard triage steps...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#0B0D1A] p-4 space-y-1">
                <div className="text-sm font-semibold text-[#A5D8FF]">
                  {emergencyProtocol.protocol_id} · {emergencyProtocol.protocol_title}
                </div>
                <div className="text-xs text-[#E5E5E4]/80">
                  Link Status: {emergencyProtocol.earth_comm_status} (Round-trip delay{' '}
                  {emergencyProtocol.round_trip_delay_minutes} min)
                </div>
                <div className="text-xs text-[#FAF9FA] pt-1">
                  {emergencyProtocol.vital_signs_summary}
                </div>
              </div>

              <div className="space-y-2">
                {emergencyProtocol.immediate_steps.map((step) => (
                  <div
                    key={step}
                    className="rounded-xl bg-[#0B0D1A] px-4 py-3 text-sm text-[#FAF9FA] border border-white/[0.07]"
                  >
                    {step}
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#E5E5E4]/75">
                Reference: {emergencyProtocol.supporting_citation} · {emergencyProtocol.safety_disclaimer}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setEmergencyOpen(false);
                setActiveTab('comm');
              }}
              className="mc-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-[#A5D8FF]" />
              <span>View Sync Queue</span>
            </button>
            <button
              type="button"
              onClick={() => setEmergencyOpen(false)}
              className="mc-btn-primary px-5 py-2 text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
