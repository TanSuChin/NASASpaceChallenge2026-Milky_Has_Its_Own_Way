import React, { useMemo, useState } from 'react';
import { BookOpen, HeartHandshake, MessageSquare, Shield } from 'lucide-react';
import { FullSystemState } from '../types';
import { StatusIndicator } from './ui/StatusIndicator';
import { TrendChart } from './ui/TrendChart';
import { apiRequest, formatRecordedTime } from './uiHelpers';
import { NavSectionId } from './ui/NavigationSidebar';

interface PsychologicalWellbeingViewProps {
  state: FullSystemState;
  onStateUpdated: (next: FullSystemState) => void;
  onNavigate: (tab: NavSectionId) => void;
}

/**
 * Welcoming, non-diagnostic Psychological Wellbeing view for daily mood check-ins,
 * sleep and stress tracking, trend review, and calm access to private journaling or crew support.
 */
export const PsychologicalWellbeingView: React.FC<PsychologicalWellbeingViewProps> = ({
  state,
  onStateUpdated,
  onNavigate,
}) => {
  const { latest_telemetry: latest, telemetry_history: history, companion_state: compState } = state;

  const moodOptions = compState?.mood_levels || ['Great', 'Positive', 'Neutral', 'Stressed', 'Low'];
  const feelingOptions = compState?.feeling_tags || ['Calm', 'Motivated', 'Tired', 'Isolated', 'Focused', 'Restless'];

  const [mood, setMood] = useState('Positive');
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>(['Calm']);
  const [note, setNote] = useState('');
  const [stressRating, setStressRating] = useState<number>(Math.round(latest.stress_level));
  const [sleepDifficulty, setSleepDifficulty] = useState<number>(Math.round(latest.sleep_irregularities || 3));
  const [isolationRating, setIsolationRating] = useState<number>(latest.feeling_isolated ? 7 : 3);
  const [showDetailedCheckin, setShowDetailedCheckin] = useState(false);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const moodTrendData = useMemo(() => {
    if (compState?.mood_trend && compState.mood_trend.length > 0) {
      return compState.mood_trend.map((m) => ({ label: `Sol ${m.sol}`, value: m.mood_numeric }));
    }
    return history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.mood_score }));
  }, [compState?.mood_trend, history]);

  const sleepAndStressData = useMemo(
    () =>
      history.map((r) => ({
        label: `Sol ${r.mission_day}`,
        value: r.sleep_duration_hrs,
        secondaryValue: r.stress_level,
      })),
    [history],
  );

  const toggleFeeling = (tag: string) => {
    setSelectedFeelings((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
    );
  };

  const handleSubmitMood = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ state: FullSystemState }>('/api/companion/mood-checkin', {
        method: 'POST',
        body: JSON.stringify({
          mood,
          feelings: selectedFeelings,
          note: note.trim(),
        }),
      });
      if (res.state) onStateUpdated(res.state);
      setNote('');
      setNotice({
        tone: 'ok',
        text: `Daily mood check-in saved (${mood}) to local mission wellbeing log.`,
      });
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to save mood check-in.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitSelfCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const next = await apiRequest<FullSystemState>('/api/psych-questionnaire', {
        method: 'POST',
        body: JSON.stringify({
          mission_day: latest.mission_day,
          emotional_condition_rating: Math.max(1, Math.min(10, Math.round(latest.mood_score))),
          psychological_stress_rating: stressRating,
          motivation_rating: Math.round(latest.motivation_level),
          fatigue_rating: Math.round(latest.fatigue_level),
          sleep_difficulty_rating: sleepDifficulty,
          isolation_feeling_rating: isolationRating,
          concentration_workload_rating: Math.round(latest.workload_score),
          journal_reflection: '',
        }),
      });
      onStateUpdated(next);
      setShowDetailedCheckin(false);
      setNotice({
        tone: 'ok',
        text: `Saved sleep and stress self-check for Sol ${latest.mission_day}.`,
      });
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to save self-assessment.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleHumanSupportEscalation = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ contact_role: string; state: FullSystemState }>(
        '/api/companion/escalate-support',
        {
          method: 'POST',
          body: JSON.stringify({
            summary_note: 'Crew member requested confidential human wellbeing support check-in.',
            queue_urgent_report: true,
          }),
        },
      );
      if (res.state) onStateUpdated(res.state);
      setNotice({
        tone: 'ok',
        text: `Private human support notice queued for ${res.contact_role}.`,
      });
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to notify support officer.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-[var(--tc-border)]">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
            Psychological Wellbeing
          </h1>
          <p className="text-sm text-[var(--tc-text-secondary)] leading-relaxed">
            A calm personal check-in space to reflect on mood, sleep quality, and isolation stress without judgment or automated diagnosis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('journal')}
            className="tc-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open Personal Journal</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('companion')}
            className="tc-btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Talk to AI Companion</span>
          </button>
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

      {/* Daily Mood Check-In Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSubmitMood} className="lg:col-span-7 tc-panel p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--tc-text)]">Daily Mood Check-In</h2>
            <StatusIndicator status="NORMAL" label="Private Onboard Only" />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-[var(--tc-text-muted)]">How are you feeling overall today?</div>
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMood(opt)}
                  className={`px-3.5 py-2 rounded-lg text-xs border transition-colors ${
                    mood === opt
                      ? 'border-[var(--tc-accent)] bg-[var(--tc-accent-soft)] text-[var(--tc-text)] font-medium'
                      : 'border-[var(--tc-border-strong)] bg-[var(--tc-bg)] text-[var(--tc-text-secondary)] hover:text-[var(--tc-text)]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-[var(--tc-text-muted)]">Current experiences (optional)</div>
            <div className="flex flex-wrap gap-2">
              {feelingOptions.map((tag) => {
                const active = selectedFeelings.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFeeling(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      active
                        ? 'border-[var(--tc-accent)] bg-[var(--tc-accent-soft)] text-[var(--tc-text)] font-medium'
                        : 'border-[var(--tc-border)] bg-[var(--tc-elevated)]/50 text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mood-note" className="block text-xs text-[var(--tc-text-muted)]">
              Brief note (optional)
            </label>
            <textarea
              id="mood-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Share a thought from today's schedule or rest period..."
              className="tc-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowDetailedCheckin((p) => !p)}
              className="text-xs text-[var(--tc-accent)] hover:underline"
            >
              {showDetailedCheckin ? 'Hide detailed stress check' : 'Open sleep & stress self-check'}
            </button>
            <button type="submit" disabled={busy} className="tc-btn-primary px-5 py-2 text-xs">
              {busy ? 'Saving...' : 'Save Check-In'}
            </button>
          </div>
        </form>

        {/* Latest Status & Human Escalation Notice */}
        <div className="lg:col-span-5 tc-panel p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
              <span>Supportive Guidance &amp; Care Boundary</span>
            </h2>
            <p className="text-sm text-[var(--tc-text-secondary)] leading-relaxed">
              {compState?.non_diagnostic_disclaimer ||
                'Wellbeing tools offer supportive reflection and sleep-hygiene insights only. They never diagnose mental health conditions or replace human clinicians.'}
            </p>
            <div className="tc-panel-elevated p-4 space-y-1 text-xs">
              <div className="text-[var(--tc-text-muted)]">Recent check-ins recorded</div>
              <div className="font-medium text-[var(--tc-text)] tabular-data">
                {compState?.mood_checkins?.length || 0} mood logs · Last entry{' '}
                {compState?.mood_checkins?.[0]
                  ? formatRecordedTime(compState.mood_checkins[0].recorded_at)
                  : `Sol ${latest.mission_day}`}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--tc-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[var(--tc-text-muted)]">
              <Shield className="w-4 h-4 text-[var(--tc-accent)] shrink-0" aria-hidden="true" />
              <span>Need confidential crew or Flight Surgeon support?</span>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={handleHumanSupportEscalation}
              className="tc-btn-secondary px-3.5 py-2 text-xs shrink-0"
            >
              Request Human Check-In
            </button>
          </div>
        </div>
      </section>

      {showDetailedCheckin && (
        <form onSubmit={handleSubmitSelfCheck} className="tc-panel p-6 space-y-5">
          <h2 className="text-base font-semibold text-[var(--tc-text)]">
            Sleep, Stress &amp; Isolation Self-Assessment (1–10 Scale)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="stress-range" className="flex justify-between text-xs text-[var(--tc-text-secondary)]">
                <span>Psychological Stress</span>
                <span className="tabular-data font-medium">{stressRating}/10</span>
              </label>
              <input
                id="stress-range"
                type="range"
                min={1}
                max={10}
                value={stressRating}
                onChange={(e) => setStressRating(Number(e.target.value))}
                className="w-full accent-[var(--tc-accent)]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="sleep-diff-range" className="flex justify-between text-xs text-[var(--tc-text-secondary)]">
                <span>Sleep Difficulty</span>
                <span className="tabular-data font-medium">{sleepDifficulty}/10</span>
              </label>
              <input
                id="sleep-diff-range"
                type="range"
                min={1}
                max={10}
                value={sleepDifficulty}
                onChange={(e) => setSleepDifficulty(Number(e.target.value))}
                className="w-full accent-[var(--tc-accent)]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="isolation-range" className="flex justify-between text-xs text-[var(--tc-text-secondary)]">
                <span>Sense of Isolation</span>
                <span className="tabular-data font-medium">{isolationRating}/10</span>
              </label>
              <input
                id="isolation-range"
                type="range"
                min={1}
                max={10}
                value={isolationRating}
                onChange={(e) => setIsolationRating(Number(e.target.value))}
                className="w-full accent-[var(--tc-accent)]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="tc-btn-primary px-5 py-2 text-xs">
              Save Self-Assessment
            </button>
          </div>
        </form>
      )}

      {/* Calm Wellbeing Trends */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="tc-panel p-6">
          <TrendChart
            title="Emotional Wellbeing Trend"
            unit="/10"
            data={moodTrendData}
            height={200}
          />
        </div>
        <div className="tc-panel p-6">
          <TrendChart
            title="Sleep Duration vs. Stress Level"
            unit="hrs"
            data={sleepAndStressData}
            primaryName="Sleep (hrs)"
            secondaryName="Stress (/10)"
            height={200}
          />
        </div>
      </section>
    </div>
  );
};
