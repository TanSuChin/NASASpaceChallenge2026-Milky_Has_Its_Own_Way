import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  FileText,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { FullSystemState } from '../types';
import { apiRequest, formatRecordedTime, provenanceLabel, statusMeta } from './uiHelpers';

interface HistoryProps {
  state: FullSystemState;
  onStateUpdated: (next: FullSystemState) => void;
}

export const HealthHistoryView: React.FC<HistoryProps> = ({ state, onStateUpdated }) => {
  const [daysWindow, setDaysWindow] = useState<7 | 14 | 30>(30);
  const [provFilter, setProvFilter] = useState<'ALL' | 'SIMULATED' | 'USER'>('ALL');
  const [creatingReport, setCreatingReport] = useState(false);

  const filteredRecords = useMemo(() => {
    const sliced = state.telemetry_history.slice(-daysWindow).reverse();
    if (provFilter === 'USER') {
      return sliced.filter((r) => r.provenance === 'USER_ENTERED');
    }
    if (provFilter === 'SIMULATED') {
      return sliced.filter((r) => r.provenance !== 'USER_ENTERED');
    }
    return sliced;
  }, [state.telemetry_history, daysWindow, provFilter]);

  const historicalAlerts = useMemo(() => {
    return filteredRecords
      .filter(
        (r) =>
          r.equivalent_dose_rate_msv_day >= 1.5 ||
          r.sleep_duration_hrs <= 6.2 ||
          r.co2_mmhg >= 3.0 ||
          r.dizziness_severity >= 1 ||
          r.respiratory_symptoms.length > 0,
      )
      .map((r) => ({
        sol: r.mission_day,
        timestamp: r.timestamp,
        provenance: provenanceLabel(r.provenance),
        notes: r.notes,
        badges: [
          r.equivalent_dose_rate_msv_day >= 1.5 ? `Radiation ${r.equivalent_dose_rate_msv_day} mSv/d` : null,
          r.sleep_duration_hrs <= 6.2 ? `Low Sleep ${r.sleep_duration_hrs}h` : null,
          r.co2_mmhg >= 3.0 ? `CO₂ ${r.co2_mmhg} mmHg` : null,
          r.dizziness_severity >= 1 ? `Dizziness Gr.${r.dizziness_severity}` : null,
        ].filter(Boolean) as string[],
      }));
  }, [filteredRecords]);

  const generateReport = async () => {
    setCreatingReport(true);
    try {
      await apiRequest('/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const fresh = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(fresh);
    } finally {
      setCreatingReport(false);
    }
  };

  const downloadSummaryMarkdown = () => {
    const latest = state.latest_telemetry;
    const lines = [
      `# MarsCare AI Local Health Summary — Sol ${latest.mission_day}`,
      `Astronaut: ${state.astronaut.name} (${state.astronaut.role})`,
      `Overall Status: ${state.assessment.overall_status}`,
      `Communication Mode: ${state.assessment.comm_mode?.label || 'Delayed'} (${state.comm_state.one_way_delay_minutes} min one-way)`,
      ``,
      `## Latest Measurements (${provenanceLabel(latest.provenance)})`,
      `- Heart Rate: ${latest.heart_rate_bpm} BPM (Baseline ${state.astronaut.baseline_hr_bpm} BPM)`,
      `- Blood Pressure: ${latest.systolic_bp_mmhg}/${latest.diastolic_bp_mmhg} mmHg`,
      `- Oxygen Saturation: ${latest.spo2_pct}% | Respiratory Rate: ${latest.respiratory_rate_bpm ?? 16}/min`,
      `- Sleep Duration: ${latest.sleep_duration_hrs} hrs | Mood: ${latest.mood_score}/10 | Stress: ${latest.stress_level}/10`,
      `- Absorbed Dose: ${latest.absorbed_dose_mgy} mGy | Equivalent Rate: ${latest.equivalent_dose_rate_msv_day} mSv/day | Cumulative: ${latest.cumulative_effective_dose_msv} mSv`,
      `- Cabin CO2: ${latest.co2_mmhg} mmHg | Humidity: ${latest.humidity_pct}%`,
      ``,
      `## How Am I Doing?`,
      `${state.assessment.glance_summary?.how_am_i_doing || ''}`,
      ``,
      `Generated autonomously offline by MarsCare AI (TARSCARE backend). Not a clinical diagnosis.`,
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marscare-sol-${latest.mission_day}-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls & Local Report Export Header */}
      <section className="mc-card p-5 lg:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#FAF9FA]">Health History &amp; Mission Logs</h1>
          <p className="text-sm text-[#E5E5E4]/80 mt-1">
            Review longitudinal radiation, sleep, exercise, vital measurements, and generate offline reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-[#0B0D1A] p-1 rounded-full border border-white/10">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDaysWindow(d)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  daysWindow === d ? 'bg-[#EEF0F6] text-[#040404]' : 'text-[#E5E5E4]'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <div className="flex bg-[#0B0D1A] p-1 rounded-full border border-white/10">
            {([
              { id: 'ALL', label: 'All Data' },
              { id: 'SIMULATED', label: 'Simulated' },
              { id: 'USER', label: 'User-Entered' },
            ] as const).map((pf) => (
              <button
                key={pf.id}
                type="button"
                onClick={() => setProvFilter(pf.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  provFilter === pf.id ? 'bg-[#A5D8FF]/20 text-[#FAF9FA]' : 'text-[#E5E5E4]/80'
                }`}
              >
                {pf.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={creatingReport}
            onClick={generateReport}
            className="mc-btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{creatingReport ? 'Generating...' : 'Generate Sync Report'}</span>
          </button>

          <button
            type="button"
            onClick={downloadSummaryMarkdown}
            className="mc-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#A5D8FF]" />
            <span>Export Markdown</span>
          </button>
        </div>
      </section>

      {/* Store-and-Forward Reports & Historical Alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="mc-card p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#FAF9FA]">Earth Sync &amp; Generated Reports</h2>
            <span className="text-xs text-[#E5E5E4]/75">
              {state.store_forward_reports.length} records stored locally
            </span>
          </div>
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {state.store_forward_reports.map((rpt) => {
              const rMeta = statusMeta(rpt.risk_level);
              const isSynced = rpt.transmission_status === 'SYNCHRONIZED_ACK';
              return (
                <div key={rpt.report_uid} className="rounded-xl bg-[#0B0D1A] p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#FAF9FA]">{rpt.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rMeta.badgeClass}`}>
                      {rMeta.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#E5E5E4]/85">{rpt.summary}</p>
                  <div className="flex items-center justify-between text-xs pt-1 text-[#A5D8FF]/90">
                    <span>{isSynced ? 'Synced with Earth' : 'Queued locally (Store-and-Forward)'}</span>
                    <span className="text-[#E5E5E4]/60">{provenanceLabel(rpt.provenance)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mc-card p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#FAF9FA]">Historical Alerts ({daysWindow}d Window)</h2>
            <span className="text-xs text-[#E5E5E4]/75">{historicalAlerts.length} flagged Sols</span>
          </div>
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {historicalAlerts.map((al, i) => (
              <div key={`${al.sol}-${i}`} className="rounded-xl bg-[#0B0D1A] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <strong className="text-[#FAF9FA]">Sol {al.sol}</strong>
                  <span className="text-[#E5E5E4]/65">{al.provenance}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {al.badges.map((b) => (
                    <span key={b} className="px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-300">
                      {b}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-[#E5E5E4]/80">{al.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Longitudinal Radiation, Sleep, Exercise & Vitals Log Table */}
      <section className="mc-card p-5 lg:p-6 space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#FAF9FA]">
            Physiological &amp; Hazard Log ({filteredRecords.length} entries)
          </h2>
          <span className="text-xs text-[#E5E5E4]/70">Sorted newest first</span>
        </div>

        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[780px]">
          <thead>
            <tr className="border-b border-white/10 text-[#E5E5E4]/75">
              <th className="py-2.5 pr-3">Sol</th>
              <th className="py-2.5 pr-3">Source</th>
              <th className="py-2.5 pr-3">HR / BP</th>
              <th className="py-2.5 pr-3">SpO₂</th>
              <th className="py-2.5 pr-3">Sleep</th>
              <th className="py-2.5 pr-3">Exercise</th>
              <th className="py-2.5 pr-3">Absorbed / Equiv Rad.</th>
              <th className="py-2.5">Cabin CO₂</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] tabular-data">
            {filteredRecords.map((r, idx) => (
              <tr key={`${r.mission_day}-${idx}`} className="hover:bg-white/[0.02]">
                <td className="py-2.5 pr-3 font-semibold text-[#FAF9FA]">Sol {r.mission_day}</td>
                <td className="py-2.5 pr-3 text-[#A5D8FF] text-xs">{provenanceLabel(r.provenance)}</td>
                <td className="py-2.5 pr-3 text-[#FAF9FA]">
                  {Math.round(r.heart_rate_bpm)} BPM · {Math.round(r.systolic_bp_mmhg)}/{Math.round(r.diastolic_bp_mmhg)}
                </td>
                <td className="py-2.5 pr-3 text-[#FAF9FA]">{r.spo2_pct.toFixed(1)}%</td>
                <td className="py-2.5 pr-3 text-[#E5E5E4]">{r.sleep_duration_hrs.toFixed(1)} hrs</td>
                <td className="py-2.5 pr-3 text-[#E5E5E4]">{Math.round(r.exercise_adherence_pct)}% ARED</td>
                <td className="py-2.5 pr-3 text-[#E5E5E4]">
                  {r.absorbed_dose_mgy.toFixed(2)} mGy / {r.equivalent_dose_rate_msv_day.toFixed(2)} mSv/d
                </td>
                <td className="py-2.5 text-[#E5E5E4]">{r.co2_mmhg.toFixed(1)} mmHg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

interface CommProps {
  state: FullSystemState;
  onStateUpdated: (next: FullSystemState) => void;
  onOpenEmergency: () => void;
}

export const CommunicationStatusView: React.FC<CommProps> = ({
  state,
  onStateUpdated,
  onOpenEmergency,
}) => {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const currentMode = state.assessment.comm_mode?.mode || 'DELAYED';
  const pendingCount = state.comm_state.pending_reports_count ??
    state.store_forward_reports.filter((r) => r.transmission_status !== 'SYNCHRONIZED_ACK').length;

  const setCommMode = async (mode: 'CONNECTED' | 'DELAYED' | 'OFFLINE') => {
    setBusy(true);
    setNotice(null);
    try {
      await apiRequest('/api/comm/mode', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      const fresh = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(fresh);
      setNotice(`Communication simulation switched to ${mode}. All health features remain active onboard.`);
    } finally {
      setBusy(false);
    }
  };

  const syncQueue = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ synchronized_count: number }>('/api/comm/sync', {
        method: 'POST',
      });
      const fresh = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(fresh);
      setNotice(`Synchronized ${res.synchronized_count} queued store-and-forward report(s) cleanly.`);
    } finally {
      setBusy(false);
    }
  };

  const aiStatus = state.local_ai_status;

  return (
    <div className="space-y-6">
      <section className="mc-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#FAF9FA]">Earth Communication &amp; Offline Readiness</h1>
            <p className="text-sm text-[#E5E5E4]/80 mt-1">
              Test Connected, Delayed, and Offline deep-space states without losing autonomous health support.
            </p>
          </div>
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 ${
              currentMode === 'CONNECTED'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : currentMode === 'OFFLINE'
                ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}
          >
            {currentMode === 'OFFLINE' ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            <span>{state.assessment.comm_mode?.label || currentMode}</span>
          </span>
        </div>

        {/* 3-State Mode Simulation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            {
              id: 'CONNECTED',
              title: 'Connected',
              desc: 'Simulated low-latency direct link (0 min delay). Reports acknowledge upon submission.',
            },
            {
              id: 'DELAYED',
              title: 'Delayed (Mars Nominal)',
              desc: `Simulated deep-space delay (${state.comm_state.one_way_delay_minutes} min one-way). Assessments execute autonomously onboard.`,
            },
            {
              id: 'OFFLINE',
              title: 'Offline (Blackout)',
              desc: 'Zero Earth link (solar conjunction). All RAG answers, body checks, and reports queue locally.',
            },
          ] as const).map((opt) => {
            const active = currentMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={busy}
                onClick={() => setCommMode(opt.id)}
                className={`rounded-2xl p-4 text-left transition-colors border ${
                  active
                    ? 'bg-[#A5D8FF]/15 border-[#A5D8FF]'
                    : 'bg-[#0B0D1A] border-white/[0.08] hover:border-[#A5D8FF]/45'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <strong className="text-base text-[#FAF9FA]">{opt.title}</strong>
                  {active && <CheckCircle2 className="w-4 h-4 text-[#A5D8FF]" />}
                </div>
                <p className="text-xs text-[#E5E5E4]/80 leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        {notice && (
          <div className="rounded-xl bg-[#0B0D1A] px-4 py-3 text-sm text-[#A5D8FF] border border-[#A5D8FF]/30">
            {notice}
          </div>
        )}
      </section>

      {/* Queue Sync + Local AI Engine Readiness */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="mc-card p-5 lg:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#FAF9FA]">Store-and-Forward Telemetry Queue</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[#0B0D1A] p-3.5">
              <div className="text-xs text-[#E5E5E4]/70">Distance from Earth</div>
              <div className="text-xl font-bold text-[#FAF9FA] tabular-data mt-1">
                {state.comm_state.distance_million_km} M km
              </div>
            </div>
            <div className="rounded-xl bg-[#0B0D1A] p-3.5">
              <div className="text-xs text-[#E5E5E4]/70">Queued Packets</div>
              <div className="text-xl font-bold text-[#FAF9FA] tabular-data mt-1">{pendingCount}</div>
            </div>
          </div>
          <p className="text-xs text-[#E5E5E4]/75">
            Last Earth sync: {formatRecordedTime(state.comm_state.last_sync_timestamp)}.{' '}
            {state.comm_state.dsn_note}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || currentMode === 'OFFLINE'}
              onClick={syncQueue}
              className="mc-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>
                {currentMode === 'OFFLINE' ? 'Sync Paused While Offline' : 'Synchronize Queued Packets'}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenEmergency}
              className="mc-btn-secondary px-5 py-2.5 text-sm inline-flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <span>Run Offline Emergency Protocol</span>
            </button>
          </div>
        </div>

        <div className="mc-card p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#A5D8FF]" />
            <h2 className="text-lg font-semibold text-[#FAF9FA]">Local Autonomous Intelligence Stack</h2>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-[#0B0D1A] px-4 py-3">
              <span className="text-[#E5E5E4]">Local SQLite Telemetry Storage</span>
              <span className="text-xs font-semibold text-emerald-300">Ready Offline</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#0B0D1A] px-4 py-3">
              <span className="text-[#E5E5E4]">Deterministic + Semantic Offline RAG</span>
              <span className="text-xs font-semibold text-[#A5D8FF]">
                {aiStatus?.sentence_transformers_cached ? 'Cached Embeddings + TF-IDF' : 'TF-IDF Active'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#0B0D1A] px-4 py-3">
              <span className="text-[#E5E5E4]">Local Ollama Detection (127.0.0.1:11434)</span>
              <span className="text-xs font-semibold text-[#E5E5E4]">
                {aiStatus?.ollama_available ? `Active (${aiStatus.ollama_model})` : 'Not Running (Fallback Active)'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

