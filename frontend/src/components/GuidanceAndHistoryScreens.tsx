import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  CheckSquare,
  FileText,
  RefreshCw,
  Send,
  Database,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { FullSystemState, RiskLevel } from '../types';

function badgeStyle(status: RiskLevel | string): string {
  if (status === 'CRITICAL' || status === 'IMMEDIATE') {
    return 'bg-red-950/85 text-red-200 border border-red-500/50';
  }
  if (status === 'WARNING' || status === 'HIGH') {
    return 'bg-amber-950/85 text-amber-200 border border-amber-500/50';
  }
  return 'bg-emerald-950/85 text-emerald-200 border border-emerald-500/50';
}

interface GuidanceScreenProps {
  state: FullSystemState;
  onTriggerEmergency: (hazard: string, symptoms: string[]) => Promise<void>;
}

export const GuidanceScreen: React.FC<GuidanceScreenProps> = ({ state, onTriggerEmergency }) => {
  const { assessment, latest_telemetry: latest } = state;
  const [completedProcedures, setCompletedProcedures] = useState<Record<string, boolean>>({});

  const toggleProc = (code: string) => {
    setCompletedProcedures((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1e2d4a]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f8fafc]">
            Evidence-Based Health Guidance, Countermeasures & Escalation Protocols
          </h1>
          <p className="text-sm text-[#a8b8d0] mt-1 prose-measure">
            Actionable preventive guidance, approved operational procedures, and autonomous Crew Medical Officer (CMO)
            escalation workflows tailored to Sol {latest.mission_day} ({latest.mission_phase.replace(/_/g, ' ')} ·{' '}
            {latest.gravity_g}g).
          </p>
        </div>
        <button
          onClick={() =>
            onTriggerEmergency('Integrated Crew Medical Escalation', [
              ...latest.respiratory_symptoms,
              `Status: ${assessment.overall_status}`,
            ])
          }
          className="px-4 py-2 rounded bg-red-950/90 hover:bg-red-900 text-red-100 border border-red-500/60 font-semibold text-xs flex items-center gap-2 shrink-0"
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          Launch Emergency Escalation Checklist
        </button>
      </div>

      {/* Active Recommendations Ledger */}
      <div className="panel-surface rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
            Active Mission Countermeasure Procedures ({assessment.recommendations.length})
          </h2>
          <span className="text-xs text-[#a8b8d0] tabular-data">
            Completed: {Object.values(completedProcedures).filter(Boolean).length} / {assessment.recommendations.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessment.recommendations.map((rec, i) => {
            const done = !!completedProcedures[rec.procedure_code];
            return (
              <div
                key={i}
                className={`p-4 rounded border transition-colors flex flex-col justify-between gap-3 ${
                  done
                    ? 'bg-emerald-950/25 border-emerald-500/40'
                    : 'bg-[#131d33] border-[#263859]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-[#38bdf8] font-semibold">
                      {rec.procedure_code} · {rec.hazard}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${badgeStyle(rec.priority)}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#f8fafc]">{rec.action}</h3>
                  <p className="text-xs text-[#cbd5e1] leading-relaxed">{rec.rationale}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#263859] text-xs">
                  <span className="text-[#a8b8d0]">Citation: {rec.citation}</span>
                  <button
                    onClick={() => toggleProc(rec.procedure_code)}
                    className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 ${
                      done
                        ? 'bg-[#10b981] text-[#070b14]'
                        : 'bg-[#0d1424] hover:bg-[#1a2947] text-[#f8fafc] border border-[#38bdf8]/40'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {done ? 'Logged Complete' : 'Mark Executed'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Standard Spaceflight Medical Reference Procedures & Escalation Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="panel-surface rounded-lg p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#10b981]">TIER 1: NORMAL OPERATIONS</h3>
            <span className="text-xs font-mono text-[#a8b8d0]">ROUTINE</span>
          </div>
          <p className="text-xs text-[#cbd5e1] leading-relaxed">
            Physiological and environmental measurements remain within personal astronaut baseline and configured habitat
            limits. Continue daily 2-hour ARED/aerobic countermeasure schedule, circadian light routine, and daily passive/active
            dosimetry logging.
          </p>
        </div>

        <div className="panel-surface rounded-lg p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f59e0b]">TIER 2: WARNING ESCALATION</h3>
            <span className="text-xs font-mono text-[#a8b8d0]">STORE & FORWARD</span>
          </div>
          <p className="text-xs text-[#cbd5e1] leading-relaxed">
            Persistent drift from personal baseline (e.g. 3-day sleep &lt; 6.2 hrs, orthostatic HR rise ≥ +12 bpm, daily
            radiation ≥ 1.5 mSv/day, or cabin CO2 ≥ 3.0 mmHg). Execute targeted countermeasure adjustment, repeat measurement
            in 4 hours, and queue a Store-and-Forward telemetry packet for Earth Flight Surgeons.
          </p>
        </div>

        <div className="panel-surface rounded-lg p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#ef4444]">TIER 3: CRITICAL AUTONOMOUS</h3>
            <span className="text-xs font-mono text-[#a8b8d0]">ZERO-LATENCY CMO</span>
          </div>
          <p className="text-xs text-[#cbd5e1] leading-relaxed">
            High-risk instability (SPE storm ≥ 5.0 mSv/day, orthostatic presyncope/syncope, cabin CO2 ≥ 4.5 mmHg, or
            febrile hypoxia). Do NOT wait for Earth round-trip telemetry (up to 44 min). Immediately execute onboard Crew
            Medical Officer (CMO) emergency checklist and shelter/life-support isolation.
          </p>
        </div>
      </div>
    </div>
  );
};

interface HistoryAndReportsScreenProps {
  state: FullSystemState;
  onSyncReports: () => Promise<void>;
  onResetDemo: () => Promise<void>;
}

const DATA_DICTIONARY = [
  {
    indicator: 'Absorbed Radiation Dose',
    unit: 'mGy (milliGray) & mGy/hr',
    source: 'Crew Active Dosimeter / Habitat TEPC (Synthetic)',
    provenance: 'SYNTHETIC_DEMO',
    description: 'Physical ionizing energy deposited per unit mass (1 Gy = 1 J/kg). Explicitly distinguished from biologically weighted Sievert (Sv).',
  },
  {
    indicator: 'Equivalent / Effective Dose',
    unit: 'mSv (milliSievert) & mSv/day',
    source: 'Biodosimetry Quality-Weighted Calculation',
    provenance: 'SYNTHETIC_DEMO',
    description: 'Biologically weighted dose accounting for radiation quality factor (Q) of GCR heavy ions and SPE protons.',
  },
  {
    indicator: 'NASA RDP / ARMAS Context',
    unit: 'μSv/hr / mGy/hr (Reference Methodology)',
    source: 'NASA Radiation Data Portal (ARMAS)',
    provenance: 'REAL_RESEARCH_REF',
    description: 'Earth high-altitude & aircraft radiation dataset used solely for dosimetric schema context; never represented as direct Mars surface data.',
  },
  {
    indicator: 'Heart Rate & Blood Pressure',
    unit: 'bpm & mmHg (Systolic/Diastolic)',
    source: 'Astroskin / Onboard Cuff Telemetry',
    provenance: 'SYNTHETIC_DEMO / USER_ENTERED',
    description: 'Evaluated against personal astronaut baseline (58 bpm, 112/71 mmHg) across 0g, 0.38g, and 1g per CSA CCISS & CARDIOBREATH research.',
  },
  {
    indicator: 'Sleep Duration & Mood/Stress',
    unit: 'Hours/Sol, % Quality, 1–10 Rating',
    source: 'Actigraphy & Crew Self-Assessment Questionnaire',
    provenance: 'SYNTHETIC_DEMO / USER_ENTERED',
    description: 'Monitors circadian alignment and confinement fatigue without automatically diagnosing clinical depression or anxiety.',
  },
  {
    indicator: 'Cabin CO2, O2, Pressure & AQI',
    unit: 'mmHg (and ppm), % O2, kPa, AQI',
    source: 'Habitat ECLSS Atmospheric Sensors',
    provenance: 'SIMULATED_ENV / SYNTHETIC_DEMO',
    description: 'Tracks closed-loop life support air quality and correlates with headaches/mucosal symptoms without auto-diagnosing infections.',
  },
];

export const HistoryAndReportsScreen: React.FC<HistoryAndReportsScreenProps> = ({
  state,
  onSyncReports,
  onResetDemo,
}) => {
  const { telemetry_history: history, store_forward_reports, comm_state } = state;
  const [syncNotice, setSyncNotice] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1e2d4a]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f8fafc]">
            Historical Health Telemetry, Store-and-Forward Reports & Data Dictionary
          </h1>
          <p className="text-sm text-[#a8b8d0] mt-1 prose-measure">
            Complete longitudinal audit log of all astronaut health records, explicit data provenance classifications
            (<code>SYNTHETIC_DEMO</code>, <code>USER_ENTERED</code>, <code>SIMULATED_ENV</code>,{' '}
            <code>REAL_RESEARCH_REF</code>), and pending Earth synchronization packages.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={async () => {
              await onSyncReports();
              setSyncNotice('All queued store-and-forward packets synchronized with Earth.');
              setTimeout(() => setSyncNotice(''), 4000);
            }}
            className="px-3.5 py-2 rounded bg-[#38bdf8] hover:bg-[#0284c7] text-[#070b14] font-semibold text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Pending Reports ({comm_state.pending_reports_count})
          </button>
          <button
            onClick={onResetDemo}
            className="px-3.5 py-2 rounded bg-[#131d33] hover:bg-[#1b2948] text-[#cbd5e1] border border-[#263859] text-xs font-medium"
          >
            Reset 14-Sol Demo Dataset
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="p-3 rounded bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200">
          {syncNotice}
        </div>
      )}

      {/* Historical Telemetry Table */}
      <div className="panel-surface rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#38bdf8]" />
            Longitudinal Astronaut Telemetry Log ({history.length} Sol Records)
          </h2>
          <span className="text-xs text-[#a8b8d0] tabular-data">Local SQLite Storage</span>
        </div>
        <div className="overflow-x-auto border border-[#1e2d4a] rounded max-h-96">
          <table className="w-full text-left border-collapse text-xs tabular-data">
            <thead className="sticky top-0 bg-[#131d33] text-[#a8b8d0] border-b border-[#1e2d4a]">
              <tr>
                <th className="py-2.5 px-3">Sol</th>
                <th className="py-2.5 px-3">Phase (g)</th>
                <th className="py-2.5 px-3">Provenance</th>
                <th className="py-2.5 px-3">Dose (mGy / mSv)</th>
                <th className="py-2.5 px-3">HR / BP</th>
                <th className="py-2.5 px-3">Sleep / Mood / Stress</th>
                <th className="py-2.5 px-3">CO2 / AQI</th>
                <th className="py-2.5 px-3">Operational Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2d4a]">
              {[...history].reverse().map((rec, i) => (
                <tr key={rec.id || i} className="hover:bg-[#111a2e]">
                  <td className="py-2 px-3 font-semibold text-[#f8fafc] whitespace-nowrap">Sol {rec.mission_day}</td>
                  <td className="py-2 px-3 text-[#cbd5e1] whitespace-nowrap">
                    {rec.mission_phase === 'MICROGRAVITY_TRANSIT' ? '0g Transit' : rec.mission_phase === 'MARS_SURFACE' ? '0.38g Mars' : '1.0g Earth'}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#131d33] border border-[#263859] text-[#38bdf8]">
                      {rec.provenance}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[#f1f5f9] whitespace-nowrap">
                    {rec.absorbed_dose_mgy.toFixed(2)} mGy · {rec.equivalent_dose_rate_msv_day.toFixed(2)} mSv/d
                  </td>
                  <td className="py-2 px-3 text-[#f1f5f9] whitespace-nowrap">
                    {rec.heart_rate_bpm.toFixed(0)} bpm · {rec.systolic_bp_mmhg.toFixed(0)}/{rec.diastolic_bp_mmhg.toFixed(0)}
                  </td>
                  <td className="py-2 px-3 text-[#f1f5f9] whitespace-nowrap">
                    {rec.sleep_duration_hrs.toFixed(1)}h · M:{rec.mood_score} · S:{rec.stress_level}
                  </td>
                  <td className="py-2 px-3 text-[#f1f5f9] whitespace-nowrap">
                    {rec.co2_mmhg.toFixed(2)} mmHg · AQI {rec.air_quality_index.toFixed(0)}
                  </td>
                  <td className="py-2 px-3 text-[#a8b8d0] max-w-xs truncate" title={rec.notes}>
                    {rec.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Store-and-Forward Medical Reports History */}
      <div className="panel-surface rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#38bdf8]" />
          Store-and-Forward Medical Reports & Earth Synchronization Ledger
        </h2>
        <div className="overflow-x-auto border border-[#1e2d4a] rounded">
          <table className="w-full text-left border-collapse text-xs tabular-data">
            <thead>
              <tr className="bg-[#131d33] text-[#a8b8d0] border-b border-[#1e2d4a]">
                <th className="py-2.5 px-3">Report UID</th>
                <th className="py-2.5 px-3">Sol</th>
                <th className="py-2.5 px-3">Report Title & Clinical Summary</th>
                <th className="py-2.5 px-3">Provenance</th>
                <th className="py-2.5 px-3">Risk</th>
                <th className="py-2.5 px-3">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2d4a]">
              {store_forward_reports.map((rpt) => (
                <tr key={rpt.report_uid} className="hover:bg-[#111a2e]">
                  <td className="py-2.5 px-3 font-mono text-[#38bdf8] whitespace-nowrap">{rpt.report_uid}</td>
                  <td className="py-2.5 px-3 text-[#f8fafc] whitespace-nowrap">Sol {rpt.mission_day}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-[#f8fafc]">{rpt.title}</div>
                    <div className="text-[#a8b8d0] mt-0.5">{rpt.summary}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#cbd5e1] whitespace-nowrap">{rpt.provenance}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded font-semibold ${badgeStyle(rpt.risk_level)}`}>
                      {rpt.risk_level}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {rpt.transmission_status === 'SYNCHRONIZED_ACK' ? (
                      <span className="text-[#10b981] font-medium">
                        SYNCHRONIZED_ACK ({rpt.synced_at?.slice(11, 16)}Z)
                      </span>
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

      {/* Data Dictionary & Provenance Transparency Table */}
      <div className="panel-surface rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-[#f8fafc]">
          Data Dictionary, Measurement Units & Provenance Transparency
        </h2>
        <div className="overflow-x-auto border border-[#1e2d4a] rounded">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#131d33] text-[#a8b8d0] border-b border-[#1e2d4a]">
                <th className="py-2.5 px-3">Health / Environmental Indicator</th>
                <th className="py-2.5 px-3">Physical Units</th>
                <th className="py-2.5 px-3">Source / Instrument</th>
                <th className="py-2.5 px-3">Provenance Tag</th>
                <th className="py-2.5 px-3">Scientific & Operational Definition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2d4a]">
              {DATA_DICTIONARY.map((dd, idx) => (
                <tr key={idx} className="hover:bg-[#111a2e]">
                  <td className="py-2.5 px-3 font-semibold text-[#f8fafc]">{dd.indicator}</td>
                  <td className="py-2.5 px-3 font-mono text-[#38bdf8] tabular-data">{dd.unit}</td>
                  <td className="py-2.5 px-3 text-[#cbd5e1]">{dd.source}</td>
                  <td className="py-2.5 px-3 font-mono text-[#10b981]">{dd.provenance}</td>
                  <td className="py-2.5 px-3 text-[#a8b8d0] leading-relaxed">{dd.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

