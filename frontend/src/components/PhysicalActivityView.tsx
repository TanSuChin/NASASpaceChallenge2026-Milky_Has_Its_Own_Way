import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, Dumbbell } from 'lucide-react';
import { FullSystemState } from '../types';
import { AlertBanner } from './ui/AlertBanner';
import { DataColumn, DataTable } from './ui/DataTable';
import { HealthMetricCard } from './ui/HealthMetricCard';
import { StatusIndicator } from './ui/StatusIndicator';
import { TrendChart } from './ui/TrendChart';
import { apiRequest, formatRecordedTime } from './uiHelpers';
import { NavSectionId } from './ui/NavigationSidebar';

interface PhysicalActivityViewProps {
  state: FullSystemState;
  onStateUpdated: (next: FullSystemState) => void;
  onNavigate: (tab: NavSectionId) => void;
}

interface ActivitySessionRow {
  uid: string;
  day: number;
  title: string;
  durationMins: number;
  adherencePct: number;
  strengthIdx: number;
  recordedAt: string;
  source: string;
}

/**
 * Dedicated astronaut countermeasure & physical condition view covering daily exercise
 * duration, adherence goals, muscle strength preservation trends, and medical Exercise Hold
 * safeguards when cardiopulmonary symptoms are present.
 */
export const PhysicalActivityView: React.FC<PhysicalActivityViewProps> = ({
  state,
  onStateUpdated,
  onNavigate,
}) => {
  const { astronaut, latest_telemetry: latest, telemetry_history: history, assessment } = state;

  const [dailyGoalMins, setDailyGoalMins] = useState<number>(() => {
    const saved = window.localStorage.getItem('tarscare_activity_goal_mins');
    return saved ? Math.max(20, Math.min(180, Number(saved) || 60)) : 60;
  });
  const [sessionType, setSessionType] = useState<'ARED Resistive' | 'Cycle Ergometer' | 'Treadmill T2'>(
    'Cycle Ergometer',
  );
  const [sessionMins, setSessionMins] = useState<number>(45);
  const [rpeEffort, setRpeEffort] = useState<number>(6);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activityPct = Math.min(
    100,
    Math.round((latest.physical_activity_mins / Math.max(1, dailyGoalMins)) * 100),
  );

  const trends = useMemo(
    () => ({
      activity: history.map((r) => ({
        label: `Sol ${r.mission_day}`,
        value: r.physical_activity_mins,
      })),
      strength: history.map((r) => ({
        label: `Sol ${r.mission_day}`,
        value: r.muscle_strength_idx,
      })),
    }),
    [history],
  );

  const sessionHistory: ActivitySessionRow[] = useMemo(() => {
    const hwExams = (state.hardware_examinations || [])
      .filter((ex) => ex.device_id === 'CYCLE_ERGOMETER_ASTROFIT')
      .map((ex) => ({
        uid: ex.exam_uid,
        day: ex.mission_day,
        title: `${ex.device_name} · ${ex.summary_note || 'Countermeasure Session'}`,
        durationMins: Number((ex.findings?.duration_mins as number) || 45),
        adherencePct: Math.round(latest.exercise_adherence_pct),
        strengthIdx: Math.round(latest.muscle_strength_idx),
        recordedAt: ex.recorded_at,
        source: ex.data_source,
      }));

    const teleRows = history
      .slice(-10)
      .reverse()
      .map((t, idx) => ({
        uid: `sol-${t.mission_day}-${idx}`,
        day: t.mission_day,
        title: `Sol ${t.mission_day} Daily Countermeasure Log`,
        durationMins: Math.round(t.physical_activity_mins),
        adherencePct: Math.round(t.exercise_adherence_pct),
        strengthIdx: Math.round(t.muscle_strength_idx),
        recordedAt: t.timestamp,
        source: 'Daily Telemetry Summary',
      }));

    return [...hwExams, ...teleRows];
  }, [state.hardware_examinations, history, latest.exercise_adherence_pct, latest.muscle_strength_idx]);

  const handleSaveGoal = (val: number) => {
    setDailyGoalMins(val);
    window.localStorage.setItem('tarscare_activity_goal_mins', String(val));
  };

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assessment.exercise_contraindicated) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ state: FullSystemState }>(
        '/api/devices/CYCLE_ERGOMETER_ASTROFIT/examination',
        {
          method: 'POST',
          body: JSON.stringify({
            exam_type: 'COUNTERMEASURE_WORKOUT',
            summary_note: `${sessionType} · ${sessionMins} min (RPE ${rpeEffort}/10)`,
            findings: {
              modality: sessionType,
              duration_mins: sessionMins,
              perceived_exertion_rpe: rpeEffort,
              gravity_regime_g: latest.gravity_g,
            },
            abnormal_flag: false,
            abnormal_reason: '',
          }),
        },
      );
      if (res.state) onStateUpdated(res.state);
      setNotice(`Logged ${sessionMins}-minute ${sessionType} session for Sol ${latest.mission_day}.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to log countermeasure session.');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataColumn<ActivitySessionRow>[] = [
    {
      key: 'day',
      header: 'Mission Sol',
      sortValue: (r) => r.day,
      render: (r) => <span className="font-medium tabular-data">Sol {r.day}</span>,
    },
    {
      key: 'title',
      header: 'Session',
      render: (r) => <span className="text-[var(--tc-text)]">{r.title}</span>,
    },
    {
      key: 'durationMins',
      header: 'Duration',
      align: 'right',
      sortValue: (r) => r.durationMins,
      render: (r) => `${r.durationMins} min`,
    },
    {
      key: 'adherencePct',
      header: 'Adherence',
      align: 'right',
      sortValue: (r) => r.adherencePct,
      render: (r) => `${r.adherencePct}%`,
    },
    {
      key: 'source',
      header: 'Source & Sync',
      render: (r) => (
        <span className="text-xs text-[var(--tc-text-muted)]">
          {r.source} · {formatRecordedTime(r.recordedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-[var(--tc-border)]">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
            Physical Activity &amp; Countermeasures
          </h1>
          <p className="text-sm text-[var(--tc-text-secondary)]">
            Tracks bone-loading and aerobic countermeasures in low/zero gravity against {astronaut.name}&apos;s strength baseline.
          </p>
        </div>
        <StatusIndicator
          status={assessment.exercise_contraindicated ? 'HOLD' : activityPct >= 85 ? 'NORMAL' : 'WARNING'}
          label={
            assessment.exercise_contraindicated
              ? 'Exercise Hold Active'
              : activityPct >= 85
                ? 'On Daily Target'
                : 'Below Daily Goal'
          }
          size="md"
        />
      </section>

      {assessment.exercise_contraindicated && (
        <AlertBanner
          title="Countermeasure Exercise Hold Active"
          severity="CRITICAL"
          description="TARSCARE detected critical physiological or cardiopulmonary risk indicators. Standard resistive and cycle exercise logging is locked until active critical alerts clear."
          whyItMatters="Performing high-intensity exercise during orthostatic instability or acute cardiopulmonary symptoms increases syncope and decompensation risk."
          actionLabel="Open AI Health Assessment"
          onAction={() => onNavigate('assessment')}
        />
      )}

      {/* Key Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HealthMetricCard
          label="Daily Active Minutes"
          value={Math.round(latest.physical_activity_mins)}
          unit={`/ ${dailyGoalMins} min`}
          status={assessment.exercise_contraindicated ? 'HOLD' : activityPct >= 75 ? 'NORMAL' : 'WARNING'}
          baselineNumeric={dailyGoalMins}
          expectedRange={[dailyGoalMins * 0.8, dailyGoalMins * 1.4]}
          domainRange={[0, Math.max(120, dailyGoalMins + 30)]}
          baselineLabel={`${activityPct}% of daily goal`}
          timestamp={`Sol ${latest.mission_day}`}
          dataSource="Habitat Countermeasure Systems"
          trendData={trends.activity}
        />

        <HealthMetricCard
          label="Countermeasure Adherence"
          value={Math.round(latest.exercise_adherence_pct)}
          unit="%"
          status={latest.exercise_adherence_pct < 70 ? 'WARNING' : 'NORMAL'}
          baselineNumeric={85}
          expectedRange={[80, 100]}
          domainRange={[0, 100]}
          baselineLabel={`Performance index ${Math.round(latest.exercise_performance_pct)}%`}
          timestamp={`Sol ${latest.mission_day}`}
          dataSource="7-Sol Rolling Adherence"
        />

        <HealthMetricCard
          label="Muscle Strength Index"
          value={Math.round(latest.muscle_strength_idx)}
          unit="%"
          status={
            latest.muscle_strength_idx < astronaut.baseline_muscle_strength_idx - 12
              ? 'CRITICAL'
              : latest.muscle_strength_idx < astronaut.baseline_muscle_strength_idx - 6
                ? 'WARNING'
                : 'NORMAL'
          }
          baselineNumeric={astronaut.baseline_muscle_strength_idx}
          expectedRange={[astronaut.baseline_muscle_strength_idx - 6, 105]}
          domainRange={[60, 110]}
          baselineLabel={`Baseline ${astronaut.baseline_muscle_strength_idx}%`}
          timestamp={`Sol ${latest.mission_day}`}
          dataSource="ARED & Force Plate"
          trendData={trends.strength}
        />
      </section>

      {/* Personal Goal Progress + Quick Session Logger */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="tc-panel p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
              <span>Personal Training Goal</span>
            </h2>
            <span className="tabular-data text-sm font-medium text-[var(--tc-text)]">
              {activityPct}% Complete
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-[var(--tc-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${activityPct}%`,
                backgroundColor: assessment.exercise_contraindicated
                  ? 'var(--tc-crit-solid)'
                  : 'var(--tc-accent)',
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--tc-border)]">
            <label htmlFor="daily-goal-select" className="text-xs text-[var(--tc-text-secondary)]">
              Daily Target Duration (min/day)
            </label>
            <select
              id="daily-goal-select"
              value={dailyGoalMins}
              onChange={(e) => handleSaveGoal(Number(e.target.value))}
              className="tc-input px-3 py-1.5 text-xs tabular-data"
            >
              {[30, 45, 60, 75, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutes / sol
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleLogWorkout} className="tc-panel p-6 space-y-4">
          <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
            <span>Log Countermeasure Session</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="workout-modality" className="block text-xs text-[var(--tc-text-muted)]">
                Modality
              </label>
              <select
                id="workout-modality"
                value={sessionType}
                disabled={assessment.exercise_contraindicated}
                onChange={(e) => setSessionType(e.target.value as typeof sessionType)}
                className="tc-input w-full px-3 py-2 text-xs"
              >
                <option value="Cycle Ergometer">Cycle Ergometer</option>
                <option value="ARED Resistive">ARED Resistive</option>
                <option value="Treadmill T2">Treadmill T2</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="workout-mins" className="block text-xs text-[var(--tc-text-muted)]">
                Duration (min)
              </label>
              <input
                id="workout-mins"
                type="number"
                min={5}
                max={180}
                value={sessionMins}
                disabled={assessment.exercise_contraindicated}
                onChange={(e) => setSessionMins(Number(e.target.value) || 30)}
                className="tc-input w-full px-3 py-2 text-xs tabular-data"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="workout-rpe" className="block text-xs text-[var(--tc-text-muted)]">
                Exertion (1–10 RPE)
              </label>
              <input
                id="workout-rpe"
                type="number"
                min={1}
                max={10}
                value={rpeEffort}
                disabled={assessment.exercise_contraindicated}
                onChange={(e) => setRpeEffort(Number(e.target.value) || 5)}
                className="tc-input w-full px-3 py-2 text-xs tabular-data"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            {notice ? (
              <span className="text-xs text-[var(--tc-ok-fg)] inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{notice}</span>
              </span>
            ) : (
              <span className="text-xs text-[var(--tc-text-muted)]">
                Saved directly to local equipment &amp; activity logs.
              </span>
            )}
            <button
              type="submit"
              disabled={saving || Boolean(assessment.exercise_contraindicated)}
              className="tc-btn-primary px-4 py-2 text-xs shrink-0"
            >
              {saving ? 'Logging...' : 'Record Session'}
            </button>
          </div>
        </form>
      </section>

      {/* Trend & Exercise History */}
      <section className="tc-panel p-6">
        <TrendChart
          title="Activity Duration Trajectory"
          unit="min"
          data={trends.activity}
          baseline={dailyGoalMins}
          height={210}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--tc-text)]">Recent Exercise History</h2>
        <DataTable
          columns={columns}
          rows={sessionHistory}
          rowKey={(r) => r.uid}
          emptyTitle="No recorded countermeasure sessions yet"
        />
      </section>
    </div>
  );
};
