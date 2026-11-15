import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Globe,
  KeyRound,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { DonkiEventItem, DonkiStateSummary, FullSystemState } from '../types';
import { apiRequest, formatRecordedTime } from './uiHelpers';

interface DonkiSpaceWeatherPanelProps {
  state: FullSystemState;
  onStateUpdated: (next: FullSystemState) => void;
  compact?: boolean;
  onOpenSpaceRadiation?: () => void;
}

const DEFAULT_END = new Date().toISOString().slice(0, 10);
const DEFAULT_START = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

function deriveCommMode(state: FullSystemState): 'CONNECTED' | 'DELAYED' | 'OFFLINE' {
  const fromAssessment = state.assessment?.comm_mode?.mode;
  if (fromAssessment === 'CONNECTED' || fromAssessment === 'DELAYED' || fromAssessment === 'OFFLINE') {
    return fromAssessment;
  }
  const raw = String(state.comm_state?.earth_comm_status || '').toUpperCase();
  if (state.comm_state?.offline_mode_forced || raw.includes('BLACKOUT') || raw.includes('OFFLINE')) {
    return 'OFFLINE';
  }
  if (raw.includes('DIRECT') || raw.includes('CONNECTED') || (state.comm_state?.one_way_delay_minutes ?? 14.2) <= 0.1) {
    return 'CONNECTED';
  }
  return 'DELAYED';
}

function severityBadgeClass(sev: string): string {
  const s = sev.toUpperCase();
  if (s === 'CRITICAL') {
    return 'bg-red-500/15 text-red-300 border border-red-500/35';
  }
  if (s === 'WARNING') {
    return 'bg-amber-500/15 text-amber-300 border border-amber-500/35';
  }
  return 'bg-[var(--tc-elevated)] text-[var(--tc-accent)] border border-[var(--tc-border-strong)]';
}

function syncStatusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'SYNCED') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  if (s === 'PARTIAL' || s === 'BLOCKED_OFFLINE') return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  if (s === 'ERROR') return 'bg-red-500/15 text-red-300 border border-red-500/30';
  return 'bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)]';
}

export const DonkiSpaceWeatherPanel: React.FC<DonkiSpaceWeatherPanelProps> = ({
  state,
  onStateUpdated,
  compact = false,
  onOpenSpaceRadiation,
}) => {
  const donki: DonkiStateSummary | undefined = state.donki_state;
  const commMode = deriveCommMode(state);
  const isOffline = commMode === 'OFFLINE';

  const [startDate, setStartDate] = useState(
    donki?.sync_meta?.last_window?.start_date || DEFAULT_START,
  );
  const [endDate, setEndDate] = useState(
    donki?.sync_meta?.last_window?.end_date || DEFAULT_END,
  );
  const [syncScope, setSyncScope] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [mostAccurateOnly, setMostAccurateOnly] = useState(true);
  const [cmeSpeed, setCmeSpeed] = useState('500');
  const [cmeHalfAngle, setCmeHalfAngle] = useState('30');
  const [catalog, setCatalog] = useState('ALL');
  const [ipsLocation, setIpsLocation] = useState('ALL');
  const [notificationType, setNotificationType] = useState('all');

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [autoEvaWatch, setAutoEvaWatch] = useState(
    donki?.config?.auto_advisory_in_eva ?? true,
  );

  const [syncing, setSyncing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const services = donki?.services || [];
  const allEvents = donki?.events || [];
  const counts = donki?.service_counts || {};
  const syncMeta = donki?.sync_meta;
  const advisory = donki?.advisory_summary;

  useEffect(() => {
    const winStart = donki?.sync_meta?.last_window?.start_date;
    const winEnd = donki?.sync_meta?.last_window?.end_date;
    if (winStart) setStartDate(winStart);
    if (winEnd) setEndDate(winEnd);
  }, [donki?.sync_meta?.last_window?.start_date, donki?.sync_meta?.last_window?.end_date]);

  const filteredEvents = useMemo(() => {
    const list =
      activeFilter === 'ALL'
        ? allEvents
        : allEvents.filter((ev) => ev.service_type === activeFilter);
    return list.slice(0, 40);
  }, [activeFilter, allEvents]);

  const runSync = async (overrideStart?: string, overrideEnd?: string, overrideScope?: string) => {
    setSyncing(true);
    setNotice(null);
    setErrorMsg(null);
    const chosenScope = overrideScope ?? syncScope;
    try {
      const res = await apiRequest<{
        sync_result: {
          status: string;
          message: string;
          fetched_count: number;
          errors?: { service: string; error: string }[];
        };
        state: FullSystemState;
      }>('/api/donki/sync', {
        method: 'POST',
        body: JSON.stringify({
          start_date: overrideStart ?? startDate,
          end_date: overrideEnd ?? endDate,
          services: chosenScope === 'ALL' ? null : [chosenScope],
          most_accurate_only: mostAccurateOnly,
          cme_speed: Number(cmeSpeed) || 500,
          cme_half_angle: Number(cmeHalfAngle) || 30,
          catalog: catalog || 'ALL',
          ips_location: ipsLocation || 'ALL',
          notification_type: notificationType || 'all',
        }),
      });
      onStateUpdated(res.state);
      const sr = res.sync_result;
      if (sr.status === 'BLOCKED_OFFLINE') {
        setErrorMsg(sr.message);
      } else if (sr.status === 'ERROR') {
        setErrorMsg(sr.message);
      } else if (sr.status === 'PARTIAL') {
        const failedDetail = (sr.errors || []).map((e) => `${e.service}: ${e.error}`).join('; ');
        setNotice(`${sr.message}${failedDetail ? ` (${failedDetail})` : ''}`);
      } else {
        setNotice(sr.message);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sync NASA DONKI feeds.');
    } finally {
      setSyncing(false);
    }
  };

  const saveConfig = async (clearKey = false) => {
    setSavingConfig(true);
    setNotice(null);
    setErrorMsg(null);
    try {
      const payload: Record<string, unknown> = {
        auto_advisory_in_eva: autoEvaWatch,
        clear_api_key: clearKey,
      };
      if (!clearKey && apiKeyInput.trim()) {
        payload.api_key = apiKeyInput.trim();
      }
      const res = await apiRequest<{ state: FullSystemState }>('/api/donki/config', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onStateUpdated(res.state);
      setApiKeyInput('');
      setNotice(
        clearKey
          ? 'Custom SQLite NASA API key cleared; reverted to environment/.env key or DEMO_KEY.'
          : 'NASA DONKI backend configuration updated cleanly (secret never exposed to browser).',
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update DONKI configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  if (compact) {
    return (
      <section className="mc-card p-5 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Satellite className="w-5 h-5 text-[var(--tc-accent)]" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--tc-text)]">NASA DONKI Space Weather Sync</h2>
              <p className="text-xs text-[var(--tc-text-secondary)]">
                11-feed heliospheric &amp; solar storm telemetry with autonomous SQLite offline cache
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--tc-bg)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)]">
              {donki?.config?.key_status || 'Key Pending'}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${syncStatusBadgeClass(
                syncMeta?.last_sync_status || 'NEVER_SYNCED',
              )}`}
            >
              {syncMeta?.last_sync_status || 'NEVER_SYNCED'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-[var(--tc-bg)] p-3">
            <div className="text-[var(--tc-text-secondary)]">Cached Events</div>
            <div className="text-lg font-bold text-[var(--tc-text)] tabular-data mt-0.5">
              {advisory?.total_cached_events ?? 0}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--tc-bg)] p-3">
            <div className="text-[var(--tc-text-secondary)]">SEP Proton Alerts</div>
            <div className="text-lg font-bold text-[var(--tc-text)] tabular-data mt-0.5">
              {advisory?.sep_count ?? 0}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--tc-bg)] p-3">
            <div className="text-[var(--tc-text-secondary)]">Major Flares / Enlil</div>
            <div className="text-lg font-bold text-[var(--tc-text)] tabular-data mt-0.5">
              {(advisory?.critical_flare_count ?? 0) + (advisory?.enlil_alert_count ?? 0)}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--tc-bg)] p-3">
            <div className="text-[var(--tc-text-secondary)]">DONKI Polling Mode</div>
            <div className="text-sm font-semibold text-[var(--tc-accent)] mt-1">
              {isOffline ? 'Paused (Offline)' : 'Active via Earth Link'}
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--tc-text-secondary)] leading-relaxed">
          {syncMeta?.last_sync_message || 'Ready to synchronize NASA DONKI feeds.'}
        </p>

        {errorMsg && (
          <div className="rounded-xl bg-amber-500/15 px-3.5 py-2.5 text-xs text-amber-100 border border-amber-400/40">
            {errorMsg}
          </div>
        )}
        {notice && (
          <div className="rounded-xl bg-[var(--tc-bg)] px-3.5 py-2.5 text-xs text-[var(--tc-accent)] border border-[var(--tc-border-strong)]">
            {notice}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={syncing || isOffline}
            onClick={() => runSync()}
            className="mc-btn-primary px-4 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>
              {isOffline
                ? 'DONKI Sync Paused While Offline'
                : syncing
                  ? 'Syncing 11 Feeds...'
                  : 'Sync All 11 DONKI Feeds'}
            </span>
          </button>
          {onOpenSpaceRadiation && (
            <button
              type="button"
              onClick={onOpenSpaceRadiation}
              className="mc-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--tc-accent)]" />
              <span>Open DONKI Space Radiation Console</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mc-card p-5 lg:p-6 space-y-5" aria-label="NASA DONKI Space Weather Telemetry">
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-[var(--tc-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--tc-text)]">
              NASA DONKI Space Weather Feeds (11 SWRC Services)
            </h2>
          </div>
          <p className="text-xs text-[var(--tc-text-secondary)] leading-relaxed max-w-3xl">
            Live Space Weather Database Of Notifications, Knowledge, Information (GSFC SWRC) cached locally in SQLite so
            solar storms, SEP proton events, CMEs, and WSA+Enlil arrival windows stay inspectable during Earth blackouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs bg-[var(--tc-bg)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)] inline-flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[var(--tc-accent)]" />
            <span>{donki?.config?.key_status || 'Key Status Pending'}</span>
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${syncStatusBadgeClass(
              syncMeta?.last_sync_status || 'NEVER_SYNCED',
            )}`}
          >
            {syncMeta?.last_sync_status || 'NEVER_SYNCED'}
          </span>
          <button
            type="button"
            onClick={() => setShowConfigDrawer((v) => !v)}
            className="mc-btn-secondary px-3 py-1.5 text-xs"
          >
            {showConfigDrawer ? 'Hide Key Config' : 'Key & EVA Watch'}
          </button>
        </div>
      </div>

      {/* Backend Key & EVA Watch Config */}
      {showConfigDrawer && (
        <div className="rounded-2xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-3">
          <div className="text-xs font-semibold text-[var(--tc-accent)]">
            Backend NASA_API_KEY &amp; EVA Advisory Settings
          </div>
          <p className="text-xs text-[var(--tc-text-secondary)]">
            Active key source: <strong className="text-[var(--tc-text)]">{donki?.config?.key_source || 'ENV'}</strong>.
            Keys are stored strictly on the TARS Care backend and never serialized to frontend API payloads.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label htmlFor="donki-api-key-input" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
                Override NASA API Key (Backend Only)
              </label>
              <input
                id="donki-api-key-input"
                name="donki_api_key"
                type="password"
                autoComplete="off"
                placeholder="Paste NASA API key to store securely on backend"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] px-3 py-2 text-xs text-[var(--tc-text)] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <label
              htmlFor="donki-eva-watch-toggle"
              className="flex items-center gap-2.5 text-xs text-[var(--tc-text)] rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] px-3 py-2.5 cursor-pointer"
            >
              <input
                id="donki-eva-watch-toggle"
                name="auto_advisory_in_eva"
                type="checkbox"
                checked={autoEvaWatch}
                onChange={(e) => setAutoEvaWatch(e.target.checked)}
                className="rounded border-[var(--tc-border)] bg-[var(--tc-bg)] text-[var(--tc-accent)]"
              />
              <span>Surface cached SEP / Intense Flare / Enlil alerts in EVA Readiness</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingConfig}
              onClick={() => saveConfig(false)}
              className="mc-btn-primary px-3.5 py-1.5 text-xs"
            >
              {savingConfig ? 'Saving...' : 'Save Backend Config'}
            </button>
            <button
              type="button"
              disabled={savingConfig}
              onClick={() => saveConfig(true)}
              className="mc-btn-secondary px-3.5 py-1.5 text-xs"
            >
              Reset to .env / Default Key
            </button>
          </div>
        </div>
      )}

      {/* Offline Guard */}
      {isOffline && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-3 text-xs text-amber-100 flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            <strong>OFFLINE Blackout Active:</strong> External NASA DONKI polling is disabled while Earth communications are severed.
            Displaying {allEvents.length} cached local SQLite record(s). Switch to Delayed or Connected to fetch new space weather updates.
          </span>
        </div>
      )}

      {/* Active Heliospheric EVA Watch Banner */}
      {advisory?.has_heliospheric_watch && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/35 px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Cached DONKI Heliospheric Solar Weather Watch ({advisory.advisories.length})</span>
          </div>
          <ul className="space-y-1 text-xs text-[var(--tc-text)] list-disc pl-5">
            {advisory.advisories.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Query Window & Sync Controls */}
      <div className="rounded-2xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[var(--tc-accent)]">Query Window &amp; Live Synchronization</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncing || isOffline}
              onClick={() => {
                const e = new Date().toISOString().slice(0, 10);
                const s = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
                setStartDate(s);
                setEndDate(e);
                if (!isOffline) {
                  void runSync(s, e, 'ALL');
                }
              }}
              className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)] hover:border-[var(--tc-border-strong)] disabled:opacity-50"
            >
              Sync Last 30 Days
            </button>
            <button
              type="button"
              disabled={syncing || isOffline}
              onClick={() => {
                setStartDate('2024-05-08');
                setEndDate('2024-05-12');
                if (!isOffline) {
                  void runSync('2024-05-08', '2024-05-12', 'ALL');
                }
              }}
              className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--tc-elevated)] text-[var(--tc-accent)] border border-[var(--tc-border-strong)] hover:border-[#A5D8FF] inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              <span>Sync May 2024 Solar Storm Window (2024-05-08..12)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="donki-start-date" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
              Start Date (UTC)
            </label>
            <input
              id="donki-start-date"
              name="donki_start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] px-3 py-2 text-xs text-[var(--tc-text)] focus:border-[#A5D8FF] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="donki-end-date" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
              End Date (UTC)
            </label>
            <input
              id="donki-end-date"
              name="donki_end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] px-3 py-2 text-xs text-[var(--tc-text)] focus:border-[#A5D8FF] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="donki-service-scope" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
              Component Feed Scope
            </label>
            <select
              id="donki-service-scope"
              name="donki_service_scope"
              value={syncScope}
              onChange={(e) => setSyncScope(e.target.value)}
              className="w-full rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] px-3 py-2 text-xs text-[var(--tc-text)] focus:border-[#A5D8FF] focus:outline-none"
            >
              <option value="ALL">All 11 NASA DONKI Feeds</option>
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.id} — {svc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={syncing || isOffline}
              onClick={() => runSync()}
              className="mc-btn-primary w-full px-4 py-2 text-xs inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>
                {syncing
                  ? 'Syncing DONKI...'
                  : syncScope === 'ALL'
                    ? 'Sync All 11 Feeds'
                    : `Sync ${syncScope}`}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowAdvancedParams((v) => !v)}
            className="text-[11px] text-[var(--tc-accent)] hover:underline"
          >
            {showAdvancedParams
              ? 'Hide CMEAnalysis / IPS / Notification Parameters'
              : 'Configure CMEAnalysis / IPS / Notification Parameters'}
          </button>
          {syncMeta?.last_sync_at && (
            <span className="text-[11px] text-[var(--tc-text-secondary)]">
              Last Sync: {formatRecordedTime(syncMeta.last_sync_at)}
            </span>
          )}
        </div>

        {showAdvancedParams && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-[var(--tc-border)]">
            <div>
              <label htmlFor="donki-cme-speed" className="block text-[11px] text-[var(--tc-text-secondary)] mb-1">
                CME Min Speed (km/s)
              </label>
              <input
                id="donki-cme-speed"
                name="cme_speed"
                type="number"
                value={cmeSpeed}
                onChange={(e) => setCmeSpeed(e.target.value)}
                className="w-full rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] px-2.5 py-1.5 text-xs text-[var(--tc-text)]"
              />
            </div>
            <div>
              <label htmlFor="donki-cme-angle" className="block text-[11px] text-[var(--tc-text-secondary)] mb-1">
                CME Half Angle (°)
              </label>
              <input
                id="donki-cme-angle"
                name="cme_half_angle"
                type="number"
                value={cmeHalfAngle}
                onChange={(e) => setCmeHalfAngle(e.target.value)}
                className="w-full rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] px-2.5 py-1.5 text-xs text-[var(--tc-text)]"
              />
            </div>
            <div>
              <label htmlFor="donki-catalog" className="block text-[11px] text-[var(--tc-text-secondary)] mb-1">
                Catalog
              </label>
              <input
                id="donki-catalog"
                name="catalog"
                type="text"
                value={catalog}
                onChange={(e) => setCatalog(e.target.value)}
                className="w-full rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] px-2.5 py-1.5 text-xs text-[var(--tc-text)]"
              />
            </div>
            <div>
              <label htmlFor="donki-ips-loc" className="block text-[11px] text-[var(--tc-text-secondary)] mb-1">
                IPS Location
              </label>
              <input
                id="donki-ips-loc"
                name="ips_location"
                type="text"
                value={ipsLocation}
                onChange={(e) => setIpsLocation(e.target.value)}
                className="w-full rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] px-2.5 py-1.5 text-xs text-[var(--tc-text)]"
              />
            </div>
            <div>
              <label htmlFor="donki-notif-type" className="block text-[11px] text-[var(--tc-text-secondary)] mb-1">
                Notification Type
              </label>
              <select
                id="donki-notif-type"
                name="notification_type"
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className="w-full rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] px-2.5 py-1.5 text-xs text-[var(--tc-text)]"
              >
                <option value="all">all</option>
                <option value="FLR">FLR</option>
                <option value="SEP">SEP</option>
                <option value="CME">CME</option>
                <option value="IPS">IPS</option>
                <option value="MPC">MPC</option>
                <option value="GST">GST</option>
                <option value="RBE">RBE</option>
                <option value="report">report</option>
              </select>
            </div>
            <label
              htmlFor="donki-most-accurate"
              className="flex items-center gap-2 text-[11px] text-[var(--tc-text)] pt-4 cursor-pointer"
            >
              <input
                id="donki-most-accurate"
                name="most_accurate_only"
                type="checkbox"
                checked={mostAccurateOnly}
                onChange={(e) => setMostAccurateOnly(e.target.checked)}
              />
              <span>Most Accurate Only</span>
            </label>
          </div>
        )}
      </div>

      {/* Sync Status & Errors */}
      {errorMsg && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-3 text-xs text-amber-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border-strong)] px-4 py-3 text-xs text-[var(--tc-accent)]">
          {notice}
        </div>
      )}

      {/* Scientific Boundary Note */}
      <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] px-4 py-3 text-xs text-[var(--tc-text-secondary)] leading-relaxed">
        <strong className="text-[var(--tc-text)]">Dosimetry &amp; Regime Distinction: </strong>
        NASA DONKI provides external heliospheric solar-weather events and WSA+Enlil arrival forecasts — personal absorbed dose (mGy) and effective dose (mSv) still originate exclusively from onboard dosimeters (EVARM, Radi-N2, CANS). Services tagged{' '}
        <span className="text-[var(--tc-accent)]">Earth Magnetosphere</span> (GST, MPC, RBE) apply to Earth orbit/cislunar regimes &amp; ground-link context rather than Mars surface fields.
      </div>

      {/* All 11 Component Service Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            activeFilter === 'ALL'
              ? 'bg-[var(--tc-btn-bg)] text-[#0B0D1A] border-[#EEF0F6]'
              : 'bg-[var(--tc-bg)] text-[var(--tc-text-secondary)] border-[var(--tc-border)] hover:border-[var(--tc-border-strong)]'
          }`}
        >
          All Cached ({advisory?.total_cached_events ?? allEvents.length})
        </button>
        {services.map((svc) => {
          const count = counts[svc.id] ?? 0;
          const st = syncMeta?.service_statuses?.[svc.id];
          const isEarthOnly = svc.regime_scope === 'EARTH_MAGNETOSPHERE';
          const selected = activeFilter === svc.id;
          return (
            <button
              key={svc.id}
              type="button"
              title={st?.error ? `${svc.description} | Last sync notice: ${st.error}` : svc.description}
              onClick={() => setActiveFilter(svc.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border inline-flex items-center gap-1.5 ${
                selected
                  ? 'bg-[var(--tc-btn-bg)] text-[#0B0D1A] border-[#EEF0F6]'
                  : 'bg-[var(--tc-bg)] text-[var(--tc-text-secondary)] border-[var(--tc-border)] hover:border-[var(--tc-border-strong)]'
              }`}
            >
              {st && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    st.status === 'OK' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              )}
              <span>{svc.id}</span>
              <span className={selected ? 'text-[#0B0D1A]/75' : 'text-[var(--tc-accent)]'}>({count})</span>
              {isEarthOnly && (
                <span className={`text-[10px] ${selected ? 'text-[#0B0D1A]/70' : 'text-[var(--tc-text-secondary)]'}`}>
                  · Earth
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cached Events List */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-6 text-center space-y-2">
          <div className="text-sm font-medium text-[var(--tc-text)]">
            No cached NASA DONKI events for filter “{activeFilter}”
          </div>
          <p className="text-xs text-[var(--tc-text-secondary)] max-w-xl mx-auto">
            {syncMeta?.last_sync_status === 'NEVER_SYNCED'
              ? 'Click "Sync All 11 Feeds" or load the May 2024 Solar Storm window while Earth Link is Connected or Delayed to cache official NASA SWRC records offline.'
              : 'The selected date window or component service returned 0 matching records or had an upstream error.'}
          </p>
        </div>
      ) : (
        <div className="max-h-[540px] overflow-y-auto space-y-3 pr-1">
          {filteredEvents.map((ev: DonkiEventItem) => {
            const m = ev.metrics || {};
            const isEarthRegime = ev.regime_scope === 'EARTH_MAGNETOSPHERE';
            return (
              <article
                key={ev.event_uid}
                className="rounded-2xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${severityBadgeClass(ev.severity)}`}>
                      {ev.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--tc-elevated)] text-[var(--tc-text)] border border-[var(--tc-border)]">
                      {ev.service_type}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--tc-surface)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)]">
                      {isEarthRegime ? 'Earth Magnetosphere' : 'Heliospheric / Deep Space'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--tc-text-secondary)] tabular-data">
                    {formatRecordedTime(ev.start_time)}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-[var(--tc-text)]">{ev.title}</h3>
                <p className="text-xs text-[var(--tc-text-secondary)] leading-relaxed">{ev.summary}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {m.speed_km_s !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--tc-surface)] text-[var(--tc-accent)] border border-[var(--tc-border)]">
                        Speed: {String(m.speed_km_s)} km/s
                      </span>
                    )}
                    {m.class_type !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--tc-surface)] text-amber-300 border border-[var(--tc-border)]">
                        Class: {String(m.class_type)}
                      </span>
                    )}
                    {m.kp_max !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--tc-surface)] text-amber-300 border border-[var(--tc-border)]">
                        Max Kp: {String(m.kp_max)}
                      </span>
                    )}
                    {m.estimated_shock_arrival_time !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--tc-surface)] text-[var(--tc-accent)] border border-[var(--tc-border)]">
                        Shock ETA: {String(m.estimated_shock_arrival_time)}
                      </span>
                    )}
                    {ev.linked_ids.slice(0, 3).map((lid) => (
                      <span
                        key={lid}
                        className="px-2 py-0.5 rounded-full bg-[var(--tc-surface)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)]"
                      >
                        Linked: {lid}
                      </span>
                    ))}
                  </div>

                  {ev.source_url && (
                    <a
                      href={ev.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[var(--tc-accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>NASA SWRC Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
