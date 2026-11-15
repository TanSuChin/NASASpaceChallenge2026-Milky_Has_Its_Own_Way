import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Globe,
  Radiation,
  Radio,
  RefreshCw,
  Send,
  Thermometer,
  Trash2,
  WifiOff,
  Wind,
} from 'lucide-react';
import { FullSystemState, SyncResponse } from '../types';
import { DonkiSpaceWeatherPanel } from './DonkiSpaceWeatherPanel';
import { InsightWeatherPanel } from './InsightWeatherPanel';
import { AlertBanner } from './ui/AlertBanner';
import { HealthMetricCard } from './ui/HealthMetricCard';
import { StatusIndicator } from './ui/StatusIndicator';
import { TrendChart } from './ui/TrendChart';
import { apiRequest, formatRecordedTime } from './uiHelpers';

interface MissionEnvironmentViewProps {
  state: FullSystemState;
  onStateUpdated: (next: FullSystemState) => void;
}

/**
 * Calm Mission Environment & Deep-Space Communication view combining Distance from Earth,
 * communication latency simulation, spacecraft atmosphere, radiation distinction (mGy vs mSv),
 * queued Earth transmission control, and opt-in external space weather feeds.
 */
export const MissionEnvironmentView: React.FC<MissionEnvironmentViewProps> = ({
  state,
  onStateUpdated,
}) => {
  const {
    latest_telemetry: latest,
    telemetry_history: history,
    comm_state,
    comm_centre_state: commCentre,
    environmental_limits: envLim,
    radiation_limits: radLim,
  } = state;

  const [tab, setTab] = useState<'habitat' | 'comms' | 'space_weather'>('habitat');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const [delayMins, setDelayMins] = useState<number>(
    commCentre?.one_way_delay_minutes ?? comm_state.one_way_delay_minutes ?? 14.2,
  );
  const [distMkm, setDistMkm] = useState<number>(
    commCentre?.distance_million_km ?? comm_state.distance_million_km ?? 225,
  );
  const [msgForm, setMsgForm] = useState({
    recipient: 'Flight Surgeon / Earth Medical Console',
    message_type: 'MEDICAL_CONSULT',
    priority: 'NORMAL' as 'NORMAL' | 'IMPORTANT' | 'URGENT',
    subject: '',
    body: '',
  });

  const radTrend = useMemo(
    () =>
      history.map((r) => ({
        label: `Sol ${r.mission_day}`,
        value: r.equivalent_dose_rate_msv_day,
        secondaryValue: r.absorbed_dose_mgy,
      })),
    [history],
  );
  const co2Trend = useMemo(
    () => history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.co2_mmhg })),
    [history],
  );
  const tempTrend = useMemo(
    () => history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.cabin_temp_c })),
    [history],
  );

  const co2Status =
    latest.co2_mmhg >= envLim.co2_crit_mmhg
      ? 'CRITICAL'
      : latest.co2_mmhg >= envLim.co2_warn_mmhg
        ? 'WARNING'
        : 'NORMAL';
  const radStatus =
    latest.equivalent_dose_rate_msv_day >= radLim.daily_equivalent_crit_msv
      ? 'CRITICAL'
      : latest.equivalent_dose_rate_msv_day >= radLim.daily_equivalent_warn_msv
        ? 'WARNING'
        : 'NORMAL';
  const o2Status =
    latest.oxygen_pct < envLim.o2_min_pct || latest.oxygen_pct > envLim.o2_max_pct
      ? 'WARNING'
      : 'NORMAL';
  const tempStatus =
    latest.cabin_temp_c > envLim.cabin_temp_max_c || latest.cabin_temp_c < envLim.cabin_temp_min_c
      ? 'WARNING'
      : 'NORMAL';

  const commCondition = commCentre?.comm_condition || comm_state.earth_comm_status || 'DELAYED';
  const oneWayMins = commCentre?.one_way_delay_minutes ?? comm_state.one_way_delay_minutes;
  const distMkmActual = commCentre?.distance_million_km ?? comm_state.distance_million_km;

  const applyPreset = async (scenarioId: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ state?: FullSystemState }>('/api/comm/simulator', {
        method: 'POST',
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      if (res.state) {
        onStateUpdated(res.state);
        if (res.state.comm_centre_state) {
          setDelayMins(res.state.comm_centre_state.one_way_delay_minutes);
          setDistMkm(res.state.comm_centre_state.distance_million_km);
        }
      }
      setNotice({ tone: 'ok', text: `Loaded communication preset: ${scenarioId}.` });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Unable to switch preset.' });
    } finally {
      setBusy(false);
    }
  };

  const applyCustomLink = async (conditionOverride?: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ state?: FullSystemState }>('/api/comm/simulator', {
        method: 'POST',
        body: JSON.stringify({
          comm_condition: conditionOverride || commCondition,
          one_way_delay_minutes: Number(delayMins),
          distance_million_km: Number(distMkm),
        }),
      });
      if (res.state) onStateUpdated(res.state);
      setNotice({
        tone: 'ok',
        text: `Updated link simulation: ${distMkm}M km · ${delayMins} min one-way light delay.`,
      });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Unable to configure link.' });
    } finally {
      setBusy(false);
    }
  };

  const handleQueueMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgForm.subject.trim() || !msgForm.body.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ message: any; state?: FullSystemState }>('/api/comm/messages', {
        method: 'POST',
        body: JSON.stringify({
          ...msgForm,
          save_as_draft: false,
          simulate_failure: false,
        }),
      });
      if (res.state) onStateUpdated(res.state);
      setMsgForm((p) => ({ ...p, subject: '', body: '' }));
      setNotice({ tone: 'ok', text: `Queued Earth message "${res.message.subject}" (${res.message.status}).` });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Unable to queue message.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSyncEarth = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<SyncResponse>('/api/comm/sync', { method: 'POST' });
      if (res.state) onStateUpdated(res.state);
      const sr = res.sync_result;
      setNotice({
        tone: sr.status === 'BLOCKED_OFFLINE' ? 'err' : 'ok',
        text: sr.message || `Synchronized ${sr.synchronized_count} queued item(s).`,
      });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Sync failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleRetryMsg = async (uid: string) => {
    setBusy(true);
    try {
      const res = await apiRequest<{ state?: FullSystemState }>(`/api/comm/messages/${uid}/retry`, {
        method: 'POST',
        body: JSON.stringify({ simulate_failure: false }),
      });
      if (res.state) onStateUpdated(res.state);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMsg = async (uid: string) => {
    setBusy(true);
    try {
      const res = await apiRequest<{ state?: FullSystemState }>(`/api/comm/messages/${uid}`, {
        method: 'DELETE',
      });
      if (res.state) onStateUpdated(res.state);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Tabs */}
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-[var(--tc-border)]">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusIndicator status={commCondition} />
            <span className="text-xs text-[var(--tc-text-muted)] tabular-data">
              Distance {distMkmActual}M km · One-way delay {oneWayMins} min
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
            Mission Environment &amp; Communication
          </h1>
          <p className="text-sm text-[var(--tc-text-secondary)]">
            Tracks Earth light-time delay, onboard spacecraft life-support atmosphere, and calibrated radiation exposure.
          </p>
        </div>

        <div
          className="inline-flex rounded-lg border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] p-1 self-start"
          role="tablist"
          aria-label="Mission Environment sections"
        >
          {[
            { id: 'habitat' as const, label: 'Habitat & Radiation' },
            { id: 'comms' as const, label: 'Distance & Comms' },
            { id: 'space_weather' as const, label: 'Space Weather Feeds' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-1.5 text-xs rounded-md transition-colors ${
                tab === item.id
                  ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                  : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
              }`}
            >
              {item.label}
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

      {/* Top Distance & Mission Timing Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="tc-panel p-5 space-y-1">
          <div className="text-xs text-[var(--tc-text-muted)]">Distance from Earth</div>
          <div className="tabular-data text-2xl font-semibold text-[var(--tc-text)]">
            {distMkmActual}M km
          </div>
          <div className="text-xs text-[var(--tc-text-muted)]">
            {commCentre?.distance_au ? `${commCentre.distance_au.toFixed(2)} AU` : 'Deep-space link'}
          </div>
        </div>

        <div className="tc-panel p-5 space-y-1">
          <div className="text-xs text-[var(--tc-text-muted)]">Signal Round-Trip Latency</div>
          <div className="tabular-data text-2xl font-semibold text-[var(--tc-text)]">
            {(oneWayMins * 2).toFixed(1)} min
          </div>
          <div className="text-xs text-[var(--tc-text-muted)]">
            {oneWayMins.toFixed(1)} min one-way
          </div>
        </div>

        <div className="tc-panel p-5 space-y-1">
          <div className="text-xs text-[var(--tc-text-muted)]">Mission Elapsed Time</div>
          <div className="tabular-data text-2xl font-semibold text-[var(--tc-text)]">
            Sol {latest.mission_day}
          </div>
          <div className="text-xs text-[var(--tc-text-muted)] tabular-data">
            MET {(latest.mission_day * 24).toLocaleString()} hours
          </div>
        </div>

        <div className="tc-panel p-5 space-y-1">
          <div className="text-xs text-[var(--tc-text-muted)]">Earth Sync Queue</div>
          <div className="tabular-data text-2xl font-semibold text-[var(--tc-text)]">
            {comm_state.pending_reports_count + (commCentre?.pending_messages_count || 0)}
          </div>
          <div className="text-xs text-[var(--tc-text-muted)]">Queued when delayed/offline</div>
        </div>
      </section>

      {tab === 'habitat' && (
        <div className="space-y-8">
          {(co2Status !== 'NORMAL' || radStatus !== 'NORMAL' || latest.env_warning_event !== 'NONE') && (
            <AlertBanner
              title="Environmental Threshold Advisory"
              severity={co2Status === 'CRITICAL' || radStatus === 'CRITICAL' ? 'CRITICAL' : 'WARNING'}
              description={`Cabin CO2 is ${latest.co2_mmhg.toFixed(2)} mmHg and daily equivalent radiation is ${latest.equivalent_dose_rate_msv_day.toFixed(2)} mSv/day (${latest.absorbed_dose_mgy.toFixed(2)} mGy/day absorbed).`}
              whyItMatters="Note: Thresholds shown reflect mission-configured operational demo limits. Absorbed physical dose (mGy) and biological effective equivalent dose (mSv) are tracked separately."
              timestamp={formatRecordedTime(latest.timestamp)}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <HealthMetricCard
              label="Cabin CO2 Partial Pressure"
              value={latest.co2_mmhg.toFixed(2)}
              unit="mmHg"
              status={co2Status}
              baselineNumeric={1.5}
              expectedRange={[0.5, envLim.co2_warn_mmhg]}
              domainRange={[0, 6]}
              baselineLabel={`Warn >= ${envLim.co2_warn_mmhg} mmHg`}
              timestamp={`Sol ${latest.mission_day}`}
              dataSource="Habitat ECLSS Trace Sensor"
              trendData={co2Trend}
            />

            <HealthMetricCard
              label="Equivalent Radiation Rate"
              value={latest.equivalent_dose_rate_msv_day.toFixed(2)}
              unit="mSv/day"
              status={radStatus}
              baselineNumeric={0.8}
              expectedRange={[0.2, radLim.daily_equivalent_warn_msv]}
              domainRange={[0, 4]}
              baselineLabel={`Absorbed ${latest.absorbed_dose_mgy.toFixed(2)} mGy · Cum. ${Math.round(latest.cumulative_effective_dose_msv)} mSv`}
              timestamp={`Sol ${latest.mission_day}`}
              dataSource={latest.radiation_source || 'Onboard Dosimeter Array'}
              trendData={radTrend}
            />

            <HealthMetricCard
              label="Cabin Oxygen (O2)"
              value={latest.oxygen_pct.toFixed(1)}
              unit="%"
              status={o2Status}
              baselineNumeric={20.9}
              expectedRange={[envLim.o2_min_pct, envLim.o2_max_pct]}
              domainRange={[17, 25]}
              baselineLabel={`Target ${envLim.o2_min_pct}–${envLim.o2_max_pct}%`}
              timestamp={`Sol ${latest.mission_day}`}
              dataSource={`Pressure ${latest.cabin_pressure_kpa.toFixed(1)} kPa`}
            />

            <HealthMetricCard
              label="Cabin Temperature & Humidity"
              value={latest.cabin_temp_c.toFixed(1)}
              unit="°C"
              status={tempStatus}
              baselineNumeric={21.5}
              expectedRange={[envLim.cabin_temp_min_c, envLim.cabin_temp_max_c]}
              domainRange={[14, 30]}
              baselineLabel={`Humidity ${Math.round(latest.humidity_pct)}% · AQI ${Math.round(latest.air_quality_index)}`}
              timestamp={`Sol ${latest.mission_day}`}
              dataSource="Habitat Thermal Loop"
              trendData={tempTrend}
            />
          </div>

          <section className="tc-panel p-6">
            <TrendChart
              title="Space Radiation Comparison: Equivalent Rate (mSv/day) vs Absorbed Dose (mGy/day)"
              unit="mSv/d"
              data={radTrend}
              primaryName="Equivalent (mSv/d)"
              secondaryName="Absorbed (mGy)"
              height={210}
            />
          </section>
        </div>
      )}

      {tab === 'comms' && (
        <div className="space-y-8">
          {/* Local Autonomy Guarantee */}
          <div className="tc-panel p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--tc-text)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--tc-ok-solid)]" aria-hidden="true" />
                <span>Always Available Onboard (Autonomous)</span>
              </h2>
              <ul className="space-y-1 text-xs text-[var(--tc-text-secondary)]">
                {(commCentre?.local_vs_earth_capabilities.available_locally_offline || [
                  'Physiological triage & 5-hazard baseline evaluation',
                  'Emergency medical protocols & offline clinical RAG Q&A',
                  'Food inventory, journal & personal AI companion',
                ]).map((item, i) => (
                  <li key={i}>· {item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--tc-text)] flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-[var(--tc-warn-solid)]" aria-hidden="true" />
                <span>Requires Earth Connectivity (Queued Automatically)</span>
              </h2>
              <ul className="space-y-1 text-xs text-[var(--tc-text-secondary)]">
                {(commCentre?.local_vs_earth_capabilities.requires_earth_connectivity || [
                  'Flight Surgeon asynchronous store-and-forward delivery',
                  'External NASA DONKI & Mars InSight weather synchronization',
                ]).map((item, i) => (
                  <li key={i}>· {item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Simulator Presets & Latency Adjuster */}
          <section className="tc-panel p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
                  <span>Communication Link Simulator</span>
                </h2>
                <p className="text-xs text-[var(--tc-text-muted)]">
                  Switch mission distance regimes or test blackout store-and-forward behavior.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleSyncEarth}
                className="tc-btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Flush Store-and-Forward Queue</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(commCentre?.scenario_presets || []).map((preset) => {
                const selected = commCentre?.scenario_id === preset.scenario_id;
                return (
                  <button
                    key={preset.scenario_id}
                    type="button"
                    onClick={() => applyPreset(preset.scenario_id)}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      selected
                        ? 'border-[var(--tc-accent)] bg-[var(--tc-accent-soft)]'
                        : 'border-[var(--tc-border)] bg-[var(--tc-bg)] hover:border-[var(--tc-border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[var(--tc-text)]">{preset.label}</span>
                      <StatusIndicator status={preset.comm_condition} />
                    </div>
                    <div className="text-xs text-[var(--tc-text-muted)] tabular-data">
                      {preset.distance_million_km}M km · {preset.one_way_delay_minutes}m one-way
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[var(--tc-border)] flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label htmlFor="comm-dist" className="block text-xs text-[var(--tc-text-muted)]">
                  Distance (Million km)
                </label>
                <input
                  id="comm-dist"
                  type="number"
                  step={5}
                  value={distMkm}
                  onChange={(e) => setDistMkm(Number(e.target.value) || 0)}
                  className="tc-input w-36 px-3 py-1.5 text-xs tabular-data"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="comm-delay" className="block text-xs text-[var(--tc-text-muted)]">
                  One-Way Delay (min)
                </label>
                <input
                  id="comm-delay"
                  type="number"
                  step={0.5}
                  value={delayMins}
                  onChange={(e) => setDelayMins(Number(e.target.value) || 0)}
                  className="tc-input w-36 px-3 py-1.5 text-xs tabular-data"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => applyCustomLink()}
                className="tc-btn-secondary px-4 py-1.5 text-xs"
              >
                Apply Custom Delay
              </button>
            </div>
          </section>

          {/* Message Composer & Outbox */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleQueueMessage} className="lg:col-span-5 tc-panel p-6 space-y-4">
              <h2 className="text-base font-semibold text-[var(--tc-text)]">Queue Earth Transmission</h2>
              <div className="space-y-1">
                <label htmlFor="msg-subject" className="block text-xs text-[var(--tc-text-muted)]">Subject</label>
                <input
                  id="msg-subject"
                  required
                  value={msgForm.subject}
                  onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })}
                  placeholder="Sol status & crew consult update"
                  className="tc-input w-full px-3 py-2 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="msg-priority" className="block text-xs text-[var(--tc-text-muted)]">Priority</label>
                <select
                  id="msg-priority"
                  value={msgForm.priority}
                  onChange={(e) => setMsgForm({ ...msgForm, priority: e.target.value as any })}
                  className="tc-input w-full px-3 py-2 text-xs"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="msg-body" className="block text-xs text-[var(--tc-text-muted)]">Message</label>
                <textarea
                  id="msg-body"
                  required
                  rows={4}
                  value={msgForm.body}
                  onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })}
                  placeholder="Write update for Mission Control or Flight Surgeon..."
                  className="tc-input w-full px-3 py-2 text-xs"
                />
              </div>
              <button type="submit" disabled={busy} className="tc-btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Send / Queue Packet</span>
              </button>
            </form>

            <div className="lg:col-span-7 tc-panel p-6 space-y-4">
              <h2 className="text-base font-semibold text-[var(--tc-text)]">
                Message Centre Outbox ({commCentre?.messages.length || 0})
              </h2>
              <div className="space-y-3 max-h-[360px] overflow-y-auto">
                {(commCentre?.messages || []).map((m) => (
                  <div key={m.message_uid} className="tc-panel-elevated p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--tc-text)]">{m.subject}</span>
                      <StatusIndicator status={m.status} label={m.status} />
                    </div>
                    <p className="text-xs text-[var(--tc-text-secondary)]">{m.body}</p>
                    <div className="flex items-center justify-between text-xs text-[var(--tc-text-muted)] pt-1">
                      <span className="tabular-data">
                        {m.priority} · Delay {m.one_way_delay_minutes}m · {formatRecordedTime(m.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        {m.status !== 'Sent' && (
                          <button
                            type="button"
                            onClick={() => handleRetryMsg(m.message_uid)}
                            className="text-[var(--tc-accent)] hover:underline"
                          >
                            Retry Send
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMsg(m.message_uid)}
                          aria-label={`Delete message ${m.subject}`}
                          className="text-[var(--tc-crit-fg)] hover:opacity-80"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === 'space_weather' && (
        <div className="space-y-8">
          <div className="tc-panel p-4 flex items-center gap-3 text-xs text-[var(--tc-text-secondary)]">
            <Globe className="w-4 h-4 text-[var(--tc-accent)] shrink-0" aria-hidden="true" />
            <span>
              External NASA DONKI solar events and InSight Mars weather caches remain clearly stamped with live network vs cached offline origin.
            </span>
          </div>
          <DonkiSpaceWeatherPanel state={state} onStateUpdated={onStateUpdated} />
          <InsightWeatherPanel state={state} onStateUpdated={onStateUpdated} />
        </div>
      )}
    </div>
  );
};
