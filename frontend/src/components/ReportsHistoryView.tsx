import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Lock,
  RefreshCw,
  Stethoscope,
  Users,
} from 'lucide-react';
import { FullSystemState, SyncResponse, TelemetryRecord } from '../types';
import { DataColumn, DataTable } from './ui/DataTable';
import { StatusIndicator } from './ui/StatusIndicator';
import { apiRequest, formatRecordedTime, provenanceLabel } from './uiHelpers';

interface ReportsHistoryViewProps {
  state: FullSystemState;
  unlockedCrewIds: Record<string, boolean>;
  onUnlockCrew: (crewId: string) => void;
  onStateUpdated: (next: FullSystemState) => void;
}

/**
 * Calm Reports & History center consolidating longitudinal physiological history tables,
 * Flight Surgeon clinical handoff packets (with privacy PIN redaction guarantees),
 * Store-and-Forward synchronization logs, and crew medical matrix overview.
 */
export const ReportsHistoryView: React.FC<ReportsHistoryViewProps> = ({
  state,
  unlockedCrewIds,
  onUnlockCrew,
  onStateUpdated,
}) => {
  const [subTab, setSubTab] = useState<'history' | 'consult' | 'crew'>('history');
  const [daysWindow, setDaysWindow] = useState<7 | 14 | 30>(14);
  const [provFilter, setProvFilter] = useState<'ALL' | 'USER' | 'SIMULATED'>('ALL');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const [cmoNotes, setCmoNotes] = useState('');
  const [consultUrgency, setConsultUrgency] = useState<'ROUTINE' | 'PRIORITY' | 'URGENT'>('ROUTINE');
  const [includeSans, setIncludeSans] = useState(true);
  const [consultMarkdown, setConsultMarkdown] = useState<string | null>(null);

  const [pinCrewId, setPinCrewId] = useState(state.active_crew_id || state.astronaut.astronaut_id);
  const [pinInput, setPinInput] = useState('');

  const filteredRecords = useMemo(() => {
    const sliced = state.telemetry_history.slice(-daysWindow).reverse();
    if (provFilter === 'USER') return sliced.filter((r) => r.provenance === 'USER_ENTERED');
    if (provFilter === 'SIMULATED') return sliced.filter((r) => r.provenance !== 'USER_ENTERED');
    return sliced;
  }, [state.telemetry_history, daysWindow, provFilter]);

  const handleGenerateReport = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await apiRequest('/api/reports/generate', { method: 'POST', body: JSON.stringify({}) });
      const fresh = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(fresh);
      setNotice({
        tone: 'ok',
        text: `Generated store-and-forward report for Sol ${fresh.latest_telemetry.mission_day}.`,
      });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Unable to generate report.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSyncReports = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<SyncResponse>('/api/comm/sync', { method: 'POST' });
      if (res.state) onStateUpdated(res.state);
      setNotice({
        tone: res.sync_result.status === 'BLOCKED_OFFLINE' ? 'err' : 'ok',
        text: res.sync_result.message || `Synced ${res.sync_result.synchronized_count} packet(s).`,
      });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Sync failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadCsv = () => {
    const headers = ['Sol', 'Timestamp', 'HR_bpm', 'SpO2_pct', 'Sleep_hrs', 'Activity_min', 'CO2_mmHg', 'Provenance'];
    const lines = filteredRecords.map((r) =>
      [
        r.mission_day,
        r.timestamp,
        r.heart_rate_bpm,
        r.spo2_pct,
        r.sleep_duration_hrs,
        r.physical_activity_mins,
        r.co2_mmhg,
        r.provenance,
      ].join(','),
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarscare-history-sol-${state.latest_telemetry.mission_day}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateConsultDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{
        report: { report_uid: string; transmission_status: string };
        markdown_preview: string;
        state: FullSystemState;
      }>('/api/consult/flight-surgeon-draft', {
        method: 'POST',
        body: JSON.stringify({
          cmo_notes: cmoNotes,
          urgency: consultUrgency,
          include_sans: includeSans,
        }),
      });
      if (res.state) onStateUpdated(res.state);
      setConsultMarkdown(res.markdown_preview);
      setNotice({
        tone: 'ok',
        text: `Created consult packet ${res.report.report_uid} (${res.report.transmission_status}). Private journals excluded.`,
      });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Unable to create consult packet.' });
    } finally {
      setBusy(false);
    }
  };

  const handleUnlockPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await apiRequest('/api/crew/unlock-reflections', {
        method: 'POST',
        body: JSON.stringify({ crew_id: pinCrewId, pin: pinInput.trim() }),
      });
      onUnlockCrew(pinCrewId);
      setPinInput('');
      setNotice({ tone: 'ok', text: `Unlocked private reflection logs locally for ${pinCrewId}.` });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Invalid Privacy PIN.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustMedKit = async (itemCode: string, delta: number) => {
    setBusy(true);
    try {
      const res = await apiRequest<{ state: FullSystemState }>('/api/medkit/adjust', {
        method: 'POST',
        body: JSON.stringify({ item_code: itemCode, quantity_delta: delta, mark_inspected: true }),
      });
      if (res.state) onStateUpdated(res.state);
    } finally {
      setBusy(false);
    }
  };

  const columns: DataColumn<TelemetryRecord>[] = [
    {
      key: 'sol',
      header: 'Mission Sol',
      sortValue: (r) => r.mission_day,
      render: (r) => <span className="font-medium tabular-data">Sol {r.mission_day}</span>,
    },
    {
      key: 'hr',
      header: 'Heart Rate',
      align: 'right',
      sortValue: (r) => r.heart_rate_bpm,
      render: (r) => `${Math.round(r.heart_rate_bpm)} bpm`,
    },
    {
      key: 'spo2',
      header: 'SpO2',
      align: 'right',
      sortValue: (r) => r.spo2_pct,
      render: (r) => `${r.spo2_pct.toFixed(1)}%`,
    },
    {
      key: 'sleep',
      header: 'Sleep',
      align: 'right',
      sortValue: (r) => r.sleep_duration_hrs,
      render: (r) => `${r.sleep_duration_hrs.toFixed(1)} hrs`,
    },
    {
      key: 'activity',
      header: 'Activity',
      align: 'right',
      sortValue: (r) => r.physical_activity_mins,
      render: (r) => `${Math.round(r.physical_activity_mins)} min`,
    },
    {
      key: 'origin',
      header: 'Origin & Time',
      render: (r) => (
        <span className="text-xs text-[var(--tc-text-muted)]">
          {provenanceLabel(r.provenance)} · {formatRecordedTime(r.timestamp)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-[var(--tc-border)]">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
            Reports &amp; Health History
          </h1>
          <p className="text-sm text-[var(--tc-text-secondary)]">
            Longitudinal vital logs, asynchronous Flight Surgeon packets, and onboard crew operations records.
          </p>
        </div>

        <div
          className="inline-flex rounded-lg border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] p-1 self-start"
          role="tablist"
          aria-label="Reports & History sections"
        >
          {[
            { id: 'history' as const, label: 'Health Log & Sync' },
            { id: 'consult' as const, label: 'Consult Drafts' },
            { id: 'crew' as const, label: 'Crew & Med Kit' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={subTab === t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-1.5 text-xs rounded-md transition-colors ${
                subTab === t.id
                  ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                  : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.tone === 'ok'
              ? 'border-[var(--tc-ok-border)] bg-[var(--tc-ok-bg)] text-[var(--tc-ok-fg)]'
              : 'border-[var(--tc-crit-border)] bg-[var(--tc-crit-bg)] text-[var(--tc-crit-fg)]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {subTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysWindow(d)}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${
                    daysWindow === d
                      ? 'border-[var(--tc-accent)] bg-[var(--tc-accent-soft)] text-[var(--tc-text)] font-medium'
                      : 'border-[var(--tc-border-strong)] text-[var(--tc-text-secondary)]'
                  }`}
                >
                  Last {d} Days
                </button>
              ))}
              <select
                aria-label="Filter telemetry origin"
                value={provFilter}
                onChange={(e) => setProvFilter(e.target.value as any)}
                className="tc-input px-3 py-1.5 text-xs"
              >
                <option value="ALL">All Origins</option>
                <option value="USER">User-Entered Only</option>
                <option value="SIMULATED">Simulated Telemetry</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="tc-btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleGenerateReport}
                className="tc-btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Generate Report Packet</span>
              </button>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filteredRecords}
            rowKey={(r, i) => `${r.mission_day}-${r.timestamp}-${i}`}
            initialSortKey="sol"
          />

          <section className="tc-panel p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--tc-text)]">
                  Store-and-Forward Earth Sync Queue ({state.store_forward_reports.length})
                </h2>
                <p className="text-xs text-[var(--tc-text-muted)]">
                  Reports prepared while delayed/offline wait safely here until transmission opens.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleSyncReports}
                className="tc-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Attempt Earth Sync</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {state.store_forward_reports.slice(0, 6).map((rep) => (
                <div
                  key={rep.report_uid}
                  className="tc-panel-elevated px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--tc-text)]">{rep.title}</div>
                    <div className="text-xs text-[var(--tc-text-muted)] tabular-data">
                      Sol {rep.mission_day} · {formatRecordedTime(rep.created_at)}
                    </div>
                  </div>
                  <StatusIndicator
                    status={rep.transmission_status === 'SYNCED' ? 'CONNECTED' : 'QUEUED'}
                    label={rep.transmission_status}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {subTab === 'consult' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleCreateConsultDraft} className="lg:col-span-5 tc-panel p-6 space-y-4">
            <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
              <span>Flight Surgeon Consult Packet</span>
            </h2>
            <p className="text-xs text-[var(--tc-text-muted)] leading-relaxed">
              Prepares a non-diagnostic physiological summary without prescribing medication or exposing private personal journals.
            </p>
            <div className="space-y-1">
              <label htmlFor="consult-urgency" className="block text-xs text-[var(--tc-text-muted)]">Urgency</label>
              <select
                id="consult-urgency"
                value={consultUrgency}
                onChange={(e) => setConsultUrgency(e.target.value as any)}
                className="tc-input w-full px-3 py-2 text-xs"
              >
                <option value="ROUTINE">Routine</option>
                <option value="PRIORITY">Priority</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="consult-notes" className="block text-xs text-[var(--tc-text-muted)]">Clinical Observations</label>
              <textarea
                id="consult-notes"
                rows={4}
                value={cmoNotes}
                onChange={(e) => setCmoNotes(e.target.value)}
                placeholder="Summarize relevant context or questions for the Flight Surgeon..."
                className="tc-input w-full px-3 py-2 text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--tc-text-secondary)]">
              <input
                type="checkbox"
                checked={includeSans}
                onChange={(e) => setIncludeSans(e.target.checked)}
                className="accent-[var(--tc-accent)]"
              />
              <span>Include latest SANS Amsler visual check record</span>
            </label>
            <button type="submit" disabled={busy} className="tc-btn-primary px-5 py-2 text-xs">
              Generate Consult Draft
            </button>
          </form>

          <div className="lg:col-span-7 tc-panel p-6 space-y-3">
            <h2 className="text-base font-semibold text-[var(--tc-text)]">Prepared Packet Preview</h2>
            {consultMarkdown ? (
              <pre className="tc-panel-elevated p-4 text-xs text-[var(--tc-text-secondary)] whitespace-pre-wrap overflow-x-auto max-h-[380px]">
                {consultMarkdown}
              </pre>
            ) : (
              <p className="text-xs text-[var(--tc-text-muted)] py-6">
                Fill in observations and generate a consult packet to inspect the Markdown summary before transmission.
              </p>
            )}
          </div>
        </div>
      )}

      {subTab === 'crew' && (
        <div className="space-y-8">
          <section className="tc-panel p-6 space-y-4">
            <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
              <span>Multi-Crew Status Summary</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(state.crew_fleet_matrix || []).map((member) => (
                <div key={member.crew_id} className="tc-panel-elevated p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-[var(--tc-text)]">{member.name}</div>
                      <div className="text-xs text-[var(--tc-text-muted)]">{member.role}</div>
                    </div>
                    <StatusIndicator status={member.overall_status} />
                  </div>
                  <div className="text-xs text-[var(--tc-text-secondary)] tabular-data">
                    HR {Math.round(member.heart_rate_bpm)} bpm · SpO2 {member.spo2_pct}% · Sleep {member.sleep_duration_hrs}h
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleUnlockPin} className="lg:col-span-4 tc-panel p-6 space-y-4 self-start">
              <h2 className="text-sm font-semibold text-[var(--tc-text)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
                <span>Private Reflection Unlock</span>
              </h2>
              <div className="space-y-1">
                <label htmlFor="pin-crew" className="block text-xs text-[var(--tc-text-muted)]">Crew Member</label>
                <select
                  id="pin-crew"
                  value={pinCrewId}
                  onChange={(e) => setPinCrewId(e.target.value)}
                  className="tc-input w-full px-3 py-2 text-xs"
                >
                  {(state.crew_fleet_matrix || []).map((c) => (
                    <option key={c.crew_id} value={c.crew_id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="pin-val" className="block text-xs text-[var(--tc-text-muted)]">Privacy PIN</label>
                <input
                  id="pin-val"
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter crew PIN"
                  className="tc-input w-full px-3 py-2 text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--tc-text-muted)]">
                  {unlockedCrewIds[pinCrewId] ? (
                    <span className="inline-flex items-center gap-1 text-[var(--tc-ok-fg)]">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    'Locked locally'
                  )}
                </span>
                <button type="submit" disabled={busy || !pinInput.trim()} className="tc-btn-secondary px-4 py-1.5 text-xs">
                  Unlock
                </button>
              </div>
            </form>

            <div className="lg:col-span-8 tc-panel p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--tc-text)]">
                Onboard Medical Kit Inventory ({state.medical_kit?.length || 0} items)
              </h2>
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
                {(state.medical_kit || []).map((item) => (
                  <div
                    key={item.item_code}
                    className="tc-panel-elevated px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-[var(--tc-text)]">{item.name}</div>
                      <div className="text-xs text-[var(--tc-text-muted)] tabular-data">
                        {item.bay_location} · {item.quantity} {item.unit} (Min {item.min_threshold})
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy || item.quantity <= 0}
                        onClick={() => handleAdjustMedKit(item.item_code, -1)}
                        className="tc-btn-secondary px-2.5 py-1 text-xs"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAdjustMedKit(item.item_code, 1)}
                        className="tc-btn-secondary px-2.5 py-1 text-xs"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
