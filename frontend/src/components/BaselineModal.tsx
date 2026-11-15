import React, { useEffect, useState } from 'react';
import { X, SlidersHorizontal, CheckCircle2, History } from 'lucide-react';
import { FullSystemState } from '../types';
import { apiRequest, formatRecordedTime } from './uiHelpers';

interface BaselineModalProps {
  state: FullSystemState;
  onClose: () => void;
  onSaved: (updated: FullSystemState) => void;
}

export const BaselineModal: React.FC<BaselineModalProps> = ({ state, onClose, onSaved }) => {
  const astro = state.astronaut;
  const [name, setName] = useState(astro.name);
  const [role, setRole] = useState(astro.role);
  const [hr, setHr] = useState(String(astro.baseline_hr_bpm));
  const [sysBp, setSysBp] = useState(String(astro.baseline_systolic_mmhg));
  const [diaBp, setDiaBp] = useState(String(astro.baseline_diastolic_mmhg));
  const [spo2, setSpo2] = useState(String(astro.baseline_spo2_pct));
  const [tempC, setTempC] = useState(String(astro.baseline_temp_c));
  const [sleepHrs, setSleepHrs] = useState(String(astro.baseline_sleep_hrs));
  const [strength, setStrength] = useState(String(astro.baseline_muscle_strength_idx));
  const [balance, setBalance] = useState(String(astro.baseline_balance_score));
  const [moodBase, setMoodBase] = useState(String(astro.baseline_mood_score));
  const [stressBase, setStressBase] = useState(String(astro.baseline_stress_score));
  const [reason, setReason] = useState('In-flight physiological baseline recalibration');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const updated = await apiRequest<FullSystemState>('/api/baseline', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim() || astro.name,
          role: role.trim() || astro.role,
          baseline_hr_bpm: Number(hr),
          baseline_systolic_mmhg: Number(sysBp),
          baseline_diastolic_mmhg: Number(diaBp),
          baseline_spo2_pct: Number(spo2),
          baseline_temp_c: Number(tempC),
          baseline_sleep_hrs: Number(sleepHrs),
          baseline_muscle_strength_idx: Number(strength),
          baseline_balance_score: Number(balance),
          baseline_mood_score: Number(moodBase),
          baseline_stress_score: Number(stressBase),
          reason: reason.trim() || 'Manual baseline calibration',
        }),
      });
      onSaved(updated);
      setSavedMsg('Personal baseline saved locally in SQLite and applied to live risk thresholds.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save baseline calibration.');
    } finally {
      setSaving(false);
    }
  };

  const history = state.baseline_history || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="baseline-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--tc-border)] bg-[var(--tc-surface)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--tc-border)] bg-[var(--tc-surface)] px-6 py-4">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-[var(--tc-accent)]" />
            <div>
              <h3 id="baseline-modal-title" className="text-lg font-medium text-[#EEF0F6]">
                Crew Profile &amp; Personal Baseline Calibration
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Adjust personal physiological baselines independently of logged telemetry records. Saved offline in local SQLite.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close baseline modal"
            className="rounded-lg border border-[var(--tc-border)] p-1.5 text-[#94A3B8] hover:text-[#EEF0F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A5D8FF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="base-name" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Astronaut Name
              </label>
              <input
                id="base-name"
                name="baseline_name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-role" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Mission Role
              </label>
              <input
                id="base-role"
                name="baseline_role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <label htmlFor="base-hr" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Resting HR (BPM)
              </label>
              <input
                id="base-hr"
                name="baseline_hr_bpm"
                type="number"
                step="1"
                min="35"
                max="120"
                value={hr}
                onChange={(e) => setHr(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-sbp" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Systolic BP (mmHg)
              </label>
              <input
                id="base-sbp"
                name="baseline_systolic_mmhg"
                type="number"
                step="1"
                min="80"
                max="170"
                value={sysBp}
                onChange={(e) => setSysBp(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-dbp" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Diastolic BP (mmHg)
              </label>
              <input
                id="base-dbp"
                name="baseline_diastolic_mmhg"
                type="number"
                step="1"
                min="45"
                max="110"
                value={diaBp}
                onChange={(e) => setDiaBp(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-spo2" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Baseline SpO2 (%)
              </label>
              <input
                id="base-spo2"
                name="baseline_spo2_pct"
                type="number"
                step="0.1"
                min="90"
                max="100"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-temp" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Body Temp (°C)
              </label>
              <input
                id="base-temp"
                name="baseline_temp_c"
                type="number"
                step="0.1"
                min="35.0"
                max="38.5"
                value={tempC}
                onChange={(e) => setTempC(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-sleep" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Sleep Target (hrs)
              </label>
              <input
                id="base-sleep"
                name="baseline_sleep_hrs"
                type="number"
                step="0.1"
                min="4"
                max="11"
                value={sleepHrs}
                onChange={(e) => setSleepHrs(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-strength" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Strength Index
              </label>
              <input
                id="base-strength"
                name="baseline_muscle_strength_idx"
                type="number"
                step="1"
                min="50"
                max="120"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-balance" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Balance (/100)
              </label>
              <input
                id="base-balance"
                name="baseline_balance_score"
                type="number"
                step="1"
                min="40"
                max="100"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-mood" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Baseline Mood (/10)
              </label>
              <input
                id="base-mood"
                name="baseline_mood_score"
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={moodBase}
                onChange={(e) => setMoodBase(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="base-stress" className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Baseline Stress (/10)
              </label>
              <input
                id="base-stress"
                name="baseline_stress_score"
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={stressBase}
                onChange={(e) => setStressBase(e.target.value)}
                className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="base-reason" className="mb-1 block text-xs font-medium text-[#94A3B8]">
              Calibration Log Note
            </label>
            <input
              id="base-reason"
              name="baseline_reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] px-3 py-2 text-sm text-[#EEF0F6] focus:border-[#A5D8FF] focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
              {error}
            </div>
          )}

          {savedMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {savedMsg}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--tc-border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--tc-border)] bg-[var(--tc-elevated)] px-4 py-2 text-sm text-[#EEF0F6] hover:bg-[var(--tc-elevated)]"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#A5D8FF] px-5 py-2 text-sm font-semibold text-[#0B0D1A] hover:bg-[#8ecbff] disabled:opacity-50"
            >
              {saving ? 'Saving Calibration...' : 'Save Personal Baseline'}
            </button>
          </div>
        </form>

        {history.length > 0 && (
          <div className="border-t border-[var(--tc-border)] px-6 py-4">
            <div className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
              <History className="h-3.5 w-3.5 text-[var(--tc-accent)]" />
              Calibration Audit Trail
            </div>
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg)] p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[#94A3B8]">
                    <span className="font-medium text-[#EEF0F6]">{item.reason}</span>
                    <span>{formatRecordedTime(item.timestamp)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[#94A3B8]">
                    {Object.entries(item.changed_fields || {}).map(([field, diff]) => (
                      <span key={field} className="rounded bg-[var(--tc-elevated)] px-2 py-0.5 text-[#EEF0F6]">
                        {field}: {String(diff.from)} → {String(diff.to)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

