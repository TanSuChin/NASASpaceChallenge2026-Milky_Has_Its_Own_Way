import React, { useEffect, useState } from 'react';
import {
  Contrast,
  Cpu,
  Lock,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  UserCheck,
} from 'lucide-react';
import { FullSystemState } from '../types';
import { StatusIndicator } from './ui/StatusIndicator';
import { apiRequest, updateLocalAIConfig, warmupLocalAI } from './uiHelpers';

interface SettingsViewProps {
  state: FullSystemState;
  theme: 'dark' | 'light';
  onSetTheme: (next: 'dark' | 'light') => void;
  evaContrast: boolean;
  onToggleEvaContrast: () => void;
  onSelectCrew: (crewId: string) => void;
  onOpenBaselineModal: () => void;
  onRequestResetDemo: () => void;
  onStateUpdated: (next: FullSystemState) => void;
}

/**
 * Unified system configuration workspace covering Cabin Lighting Mode (Dark / Light),
 * EVA accessibility contrast, Personal Astronaut Baseline Calibration, Mission Alert
 * Thresholds, Local AI Engine controls, Companion Privacy, and Demo Dataset Reset.
 */
export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  theme,
  onSetTheme,
  evaContrast,
  onToggleEvaContrast,
  onSelectCrew,
  onOpenBaselineModal,
  onRequestResetDemo,
  onStateUpdated,
}) => {
  const [warnMsv, setWarnMsv] = useState(state.radiation_limits.daily_equivalent_warn_msv);
  const [co2Warn, setCo2Warn] = useState(state.environmental_limits.co2_warn_mmhg);
  const [tempMax, setTempMax] = useState(state.environmental_limits.cabin_temp_max_c);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setWarnMsv(state.radiation_limits.daily_equivalent_warn_msv);
    setCo2Warn(state.environmental_limits.co2_warn_mmhg);
    setTempMax(state.environmental_limits.cabin_temp_max_c);
  }, [state.radiation_limits.daily_equivalent_warn_msv, state.environmental_limits.co2_warn_mmhg, state.environmental_limits.cabin_temp_max_c]);

  const privacy = state.companion_state?.privacy_settings;
  const aiStatus = state.local_ai_status;

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await apiRequest('/api/config/limits', {
        method: 'POST',
        body: JSON.stringify({
          radiation_limits: {
            ...state.radiation_limits,
            daily_equivalent_warn_msv: Number(warnMsv),
          },
          environmental_limits: {
            ...state.environmental_limits,
            co2_warn_mmhg: Number(co2Warn),
            cabin_temp_max_c: Number(tempMax),
          },
        }),
      });
      const fresh = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(fresh);
      setNotice({
        tone: 'ok',
        text: 'Mission-configured alert thresholds saved (operational settings, not NASA standard limits).',
      });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Unable to save thresholds.' });
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePrivacy = async (
    field:
      | 'allow_ai_journal_context'
      | 'allow_ai_mood_context'
      | 'allow_ai_mission_telemetry_context'
      | 'store_companion_history',
    value: boolean,
  ) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ state: FullSystemState }>('/api/companion/privacy', {
        method: 'POST',
        body: JSON.stringify({ [field]: value }),
      });
      if (res.state) onStateUpdated(res.state);
      setNotice({ tone: 'ok', text: 'Updated personal privacy and AI context permissions.' });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Unable to update privacy setting.' });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleLlm = async (enabled: boolean) => {
    setBusy(true);
    setNotice(null);
    try {
      await updateLocalAIConfig({
        llm_enabled: enabled,
        selected_model: aiStatus?.ollama_model || undefined,
      });
      const fresh = await apiRequest<FullSystemState>('/api/state');
      onStateUpdated(fresh);
      setNotice({
        tone: 'ok',
        text: enabled
          ? 'Enabled onboard Ollama LLM acceleration when available.'
          : 'Switched to guaranteed deterministic offline AI mode.',
      });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Unable to update AI config.' });
    } finally {
      setBusy(false);
    }
  };

  const handleWarmup = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await warmupLocalAI(aiStatus?.ollama_model || undefined);
      setNotice({ tone: 'ok', text: 'Local model warmup completed.' });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Warmup unavailable.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="pb-6 border-b border-[var(--tc-border)] space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--tc-text-secondary)]">
          Configure display lighting, astronaut personal baseline reference values, privacy permissions, and mission thresholds.
        </p>
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

      {/* 1. Cabin Display & Accessibility */}
      <section className="tc-panel p-6 space-y-5">
        <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
          <Contrast className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
          <span>Display &amp; Lighting Mode</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[var(--tc-text)]">Interface Theme</div>
            <div className="text-xs text-[var(--tc-text-muted)]">
              Dark Mode (#0B1120) minimizes cabin glare; Light Mode assists bright lab lighting.
            </div>
          </div>

          <div className="inline-flex rounded-lg border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] p-1 self-start">
            <button
              type="button"
              onClick={() => onSetTheme('dark')}
              className={`px-3.5 py-1.5 text-xs rounded-md inline-flex items-center gap-1.5 transition-colors ${
                theme === 'dark'
                  ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                  : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dark Operational</span>
            </button>
            <button
              type="button"
              onClick={() => onSetTheme('light')}
              className={`px-3.5 py-1.5 text-xs rounded-md inline-flex items-center gap-1.5 transition-colors ${
                theme === 'light'
                  ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                  : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Daylight Light</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--tc-border)] flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[var(--tc-text)]">High-Contrast Visual Boost</div>
            <div className="text-xs text-[var(--tc-text-muted)]">
              Increases global display contrast slightly for helmet visor legibility.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={evaContrast}
            onClick={onToggleEvaContrast}
            className="tc-btn-secondary px-4 py-1.5 text-xs"
          >
            {evaContrast ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </section>

      {/* 2. Astronaut Profile & Personal Baseline Calibration */}
      <section className="tc-panel p-6 space-y-5">
        <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
          <span>Astronaut Profile &amp; Individual Baseline</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <label htmlFor="settings-crew-select" className="block text-xs text-[var(--tc-text-muted)]">
              Active Crew Member
            </label>
            <select
              id="settings-crew-select"
              value={state.active_crew_id || state.astronaut.astronaut_id}
              onChange={(e) => onSelectCrew(e.target.value)}
              className="tc-input px-3.5 py-2 text-sm min-w-[260px]"
            >
              {(state.crew_fleet_matrix || []).map((c) => (
                <option key={c.crew_id} value={c.crew_id}>
                  {c.name} — {c.role}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenBaselineModal}
            className="tc-btn-primary px-4 py-2 text-xs self-start sm:self-end"
          >
            Recalibrate Personal Baseline
          </button>
        </div>

        <div className="tc-panel-elevated p-4 text-xs text-[var(--tc-text-secondary)] tabular-data grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>HR Baseline: {state.astronaut.baseline_hr_bpm} bpm</div>
          <div>BP Baseline: {state.astronaut.baseline_systolic_mmhg}/{state.astronaut.baseline_diastolic_mmhg} mmHg</div>
          <div>SpO2 Baseline: {state.astronaut.baseline_spo2_pct}%</div>
          <div>Sleep Target: {state.astronaut.baseline_sleep_hrs} hrs</div>
        </div>
      </section>

      {/* 3. Mission-Configured Alert Thresholds */}
      <form onSubmit={handleSaveThresholds} className="tc-panel p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
            <span>Mission-Configured Demo Alert Thresholds</span>
          </h2>
          <p className="text-xs text-[var(--tc-text-muted)]">
            Configurable spacecraft warning criteria (mission simulation parameters, distinct from formal NASA flight certification limits).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label htmlFor="lim-rad" className="block text-xs text-[var(--tc-text-muted)]">
              Daily Equiv. Warn (mSv/day)
            </label>
            <input
              id="lim-rad"
              type="number"
              step={0.1}
              value={warnMsv}
              onChange={(e) => setWarnMsv(parseFloat(e.target.value) || 1.2)}
              className="tc-input w-full px-3 py-2 text-sm tabular-data"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="lim-co2" className="block text-xs text-[var(--tc-text-muted)]">
              Cabin CO2 Warn (mmHg)
            </label>
            <input
              id="lim-co2"
              type="number"
              step={0.1}
              value={co2Warn}
              onChange={(e) => setCo2Warn(parseFloat(e.target.value) || 3.0)}
              className="tc-input w-full px-3 py-2 text-sm tabular-data"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="lim-temp" className="block text-xs text-[var(--tc-text-muted)]">
              Max Cabin Temp (°C)
            </label>
            <input
              id="lim-temp"
              type="number"
              step={0.5}
              value={tempMax}
              onChange={(e) => setTempMax(parseFloat(e.target.value) || 26)}
              className="tc-input w-full px-3 py-2 text-sm tabular-data"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="tc-btn-secondary px-4 py-2 text-xs">
            Save Configured Thresholds
          </button>
        </div>
      </form>

      {/* 4. Privacy & AI Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="tc-panel p-6 space-y-4">
          <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
            <span>Personal Privacy &amp; AI Consent</span>
          </h2>
          {privacy ? (
            <div className="space-y-3 text-sm">
              {[
                { key: 'allow_ai_journal_context' as const, label: 'Allow AI Companion to read recent private journal summaries', val: privacy.allow_ai_journal_context },
                { key: 'allow_ai_mood_context' as const, label: 'Allow AI Companion to reference daily mood check-ins', val: privacy.allow_ai_mood_context },
                { key: 'allow_ai_mission_telemetry_context' as const, label: 'Include mission light-delay context in companion responses', val: privacy.allow_ai_mission_telemetry_context },
                { key: 'store_companion_history' as const, label: 'Retain local companion conversation transcripts', val: privacy.store_companion_history },
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.val}
                    disabled={busy}
                    onChange={(e) => handleTogglePrivacy(item.key, e.target.checked)}
                    className="mt-0.5 accent-[var(--tc-accent)]"
                  />
                  <span className="text-xs text-[var(--tc-text-secondary)] leading-relaxed">{item.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--tc-text-muted)]">Privacy controls loading...</p>
          )}
        </section>

        <section className="tc-panel p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
              <span>Local AI Reasoning Engine</span>
            </h2>
            <StatusIndicator
              status={aiStatus?.ollama_available ? 'NORMAL' : 'INFO'}
              label={aiStatus?.ollama_available ? 'Ollama Ready' : 'Deterministic Offline'}
            />
          </div>
          <p className="text-xs text-[var(--tc-text-secondary)] leading-relaxed">
            Active Engine: {aiStatus?.active_engine_mode || 'OFFLINE_DETERMINISTIC'} · 100% autonomous onboard without internet access.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleToggleLlm(!(aiStatus?.llm_enabled ?? true))}
              className="tc-btn-secondary px-3.5 py-1.5 text-xs"
            >
              {aiStatus?.llm_enabled ? 'Switch to Deterministic Only' : 'Enable Local Ollama'}
            </button>
            {aiStatus?.ollama_available && (
              <button
                type="button"
                disabled={busy}
                onClick={handleWarmup}
                className="tc-btn-secondary px-3.5 py-1.5 text-xs"
              >
                Warmup Model
              </button>
            )}
          </div>
        </section>
      </div>

      {/* 5. Dataset Reset */}
      <section className="tc-panel p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--tc-text)]">Reset Demonstration Dataset</h2>
          <p className="text-xs text-[var(--tc-text-muted)]">
            Restores clean Sol 155–184 synthetic records, galley food inventory, and baseline calibration.
          </p>
        </div>
        <button
          type="button"
          onClick={onRequestResetDemo}
          className="tc-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Demo Data</span>
        </button>
      </section>
    </div>
  );
};
