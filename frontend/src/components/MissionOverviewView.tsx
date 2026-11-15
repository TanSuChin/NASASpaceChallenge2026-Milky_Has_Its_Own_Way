import React, { useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  Clock,
  HeartPulse,
  MessageSquare,
  Stethoscope,
  Utensils,
} from 'lucide-react';
import { FullSystemState } from '../types';
import { formatRecordedTime, gravityRegimeLabel, provenanceLabel } from './uiHelpers';
import { AlertBanner } from './ui/AlertBanner';
import { HealthMetricCard } from './ui/HealthMetricCard';
import { StatusIndicator } from './ui/StatusIndicator';
import { NavSectionId } from './ui/NavigationSidebar';

interface MissionOverviewViewProps {
  state: FullSystemState;
  onNavigate: (tab: NavSectionId) => void;
  onOpenEmergency: (hazard?: string) => void;
}

/**
 * Calm operational Mission Overview surfacing essential astronaut health condition,
 * mission timing, the 4 primary vitals (Heart Rate, SpO2, Sleep, Physical Activity),
 * and conditional alerts only when intervention is required.
 */
export const MissionOverviewView: React.FC<MissionOverviewViewProps> = ({
  state,
  onNavigate,
  onOpenEmergency,
}) => {
  const { astronaut, latest_telemetry: latest, telemetry_history: history, assessment } = state;

  const hrTrend = useMemo(
    () => history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.heart_rate_bpm })),
    [history],
  );
  const spo2Trend = useMemo(
    () => history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.spo2_pct })),
    [history],
  );
  const sleepTrend = useMemo(
    () => history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.sleep_duration_hrs })),
    [history],
  );
  const activityTrend = useMemo(
    () => history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.physical_activity_mins })),
    [history],
  );

  const hrStatus =
    Math.abs(latest.heart_rate_bpm - astronaut.baseline_hr_bpm) > 22
      ? 'CRITICAL'
      : Math.abs(latest.heart_rate_bpm - astronaut.baseline_hr_bpm) > 12
        ? 'WARNING'
        : 'NORMAL';

  const spo2Status =
    latest.spo2_pct < 92 ? 'CRITICAL' : latest.spo2_pct < 95 ? 'WARNING' : 'NORMAL';

  const sleepStatus =
    latest.sleep_duration_hrs < 5.5
      ? 'CRITICAL'
      : latest.sleep_duration_hrs < astronaut.baseline_sleep_hrs - 1.0
        ? 'WARNING'
        : 'NORMAL';

  const activityStatus = assessment.exercise_contraindicated
    ? 'HOLD'
    : latest.physical_activity_mins < 30
      ? 'WARNING'
      : 'NORMAL';

  const activeAlerts = assessment.active_alerts || [];
  const criticalFoodAlerts = (state.food_state?.food_alerts || []).filter(
    (a) => a.severity === 'CRITICAL' || a.severity === 'WARNING',
  );
  const hasAnyAttention = activeAlerts.length > 0 || criticalFoodAlerts.length > 0;

  return (
            <div className="space-y-10">
              {/* Top Mission Context & Overall Health Summary */}
              <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-8 border-b border-[var(--tc-border)]">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusIndicator status={assessment.overall_status} size="md" />
                    <span className="text-xs text-[var(--tc-text-muted)] tabular-data inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Last sync: {formatRecordedTime(latest.timestamp)}</span>
                    </span>
                    <span className="text-xs text-[var(--tc-text-muted)]">
                      · {provenanceLabel(latest.provenance)}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
                    {assessment.glance_summary?.how_am_i_doing ||
                      `Mission Sol ${latest.mission_day} · ${astronaut.name}`}
                  </h1>

                  <p className="text-sm sm:text-base text-[var(--tc-text-secondary)] leading-relaxed">
                    {assessment.glance_summary?.should_i_take_action ||
                      `${astronaut.role} · ${gravityRegimeLabel(latest.gravity_g)}. Core systems monitored against your personal flight baseline.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigate('monitoring')}
                    className="tc-btn-secondary px-4 py-2.5 text-sm"
                  >
                    Detailed Vitals
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('assessment')}
                    className="tc-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
                  >
                    <Stethoscope className="w-4 h-4" aria-hidden="true" />
                    <span>Run Health Assessment</span>
                  </button>
                </div>
              </section>

                  {/* Main 4 Essential Summary Metrics */}
                  <section aria-labelledby="overview-vitals-heading" className="space-y-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 id="overview-vitals-heading" className="text-lg font-semibold text-[var(--tc-text)]">
                        Core Health Summary
                      </h2>
                      <button
                        type="button"
                        onClick={() => onNavigate('monitoring')}
                        className="text-xs font-medium text-[var(--tc-accent)] hover:underline inline-flex items-center gap-1"
                      >
                        <span>All physiological systems</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
                      <HealthMetricCard
                        variant="flat"
                        label="Heart Rate"
                        value={Math.round(latest.heart_rate_bpm)}
                        unit="bpm"
                        status={hrStatus}
                        baselineNumeric={astronaut.baseline_hr_bpm}
                        expectedRange={[astronaut.baseline_hr_bpm - 10, astronaut.baseline_hr_bpm + 12]}
                        domainRange={[40, 140]}
                        baselineLabel={`Baseline ${astronaut.baseline_hr_bpm} bpm`}
                        timestamp={`Sol ${latest.mission_day}`}
                        dataSource="Wearable Biometric Harness"
                        trendData={hrTrend}
                        onActionLabel="Open Cardiovascular"
                        onAction={() => onNavigate('monitoring')}
                      />

                  <HealthMetricCard
                    variant="flat"
                    label="Blood Oxygen (SpO2)"
                    value={Number(latest.spo2_pct).toFixed(1)}
                    unit="%"
                    status={spo2Status}
                    baselineNumeric={astronaut.baseline_spo2_pct}
                    expectedRange={[95, 100]}
                    domainRange={[85, 100]}
                    baselineLabel={`Baseline ${astronaut.baseline_spo2_pct}%`}
                    timestamp={`Sol ${latest.mission_day}`}
                    dataSource="Pulse Oximetry Telemetry"
                    trendData={spo2Trend}
                    onActionLabel="Open Respiratory"
                    onAction={() => onNavigate('monitoring')}
                  />

                    <HealthMetricCard
                      variant="flat"
                      label="Sleep Status"
                      value={Number(latest.sleep_duration_hrs).toFixed(1)}
                      unit="hrs"
                      status={sleepStatus}
                      baselineNumeric={astronaut.baseline_sleep_hrs}
                      expectedRange={[astronaut.baseline_sleep_hrs - 0.8, 9.0]}
                      domainRange={[3, 10]}
                      baselineLabel={`Target ${astronaut.baseline_sleep_hrs} hrs · Quality ${Math.round(latest.sleep_quality_pct)}%`}
                      timestamp={`Sol ${latest.mission_day}`}
                      dataSource="Crew Quarter Sleep Actigraphy"
                      trendData={sleepTrend}
                      onActionLabel="Review Sleep & Wellbeing"
                      onAction={() => onNavigate('wellbeing')}
                    />

                      <HealthMetricCard
                        variant="flat"
                        label="Physical Activity"
                        value={Math.round(latest.physical_activity_mins)}
                        unit="min"
                        status={activityStatus}
                        baselineNumeric={60}
                        expectedRange={[45, 90]}
                        domainRange={[0, 120]}
                        baselineLabel={
                          assessment.exercise_contraindicated
                            ? 'Countermeasure Hold Active'
                            : `Adherence ${Math.round(latest.exercise_adherence_pct)}%`
                        }
                        timestamp={`Sol ${latest.mission_day}`}
                        dataSource="ARED & Cycle Countermeasures"
                        trendData={activityTrend}
                        onActionLabel="Open Physical Activity"
                        onAction={() => onNavigate('activity')}
                      />
                    </div>
                  </section>

                      {/* Conditional Attention Section — Only Expanded When Action Is Needed */}
                      {hasAnyAttention ? (
                        <section aria-labelledby="overview-attention-heading" className="space-y-4">
                          <h2 id="overview-attention-heading" className="text-lg font-semibold text-[var(--tc-text)]">
                            Requires Attention ({activeAlerts.length + criticalFoodAlerts.length})
                          </h2>
                          <div className="space-y-3">
                            {activeAlerts.slice(0, 3).map((alert) => (
                              <AlertBanner
                                key={alert.id}
                                title={alert.hazard}
                                severity={alert.severity}
                                description={alert.message}
                                whyItMatters={alert.action_required}
                                timestamp={`Sol ${latest.mission_day}`}
                                actionLabel="Assess Condition"
                                onAction={() => onNavigate('assessment')}
                                secondaryActionLabel={alert.severity === 'CRITICAL' ? 'Emergency Protocol' : undefined}
                                onSecondaryAction={
                                  alert.severity === 'CRITICAL' ? () => onOpenEmergency(alert.hazard) : undefined
                                }
                              />
                            ))}

            {
                                  criticalFoodAlerts.slice(0, 2).map((fa) => (
                                    <AlertBanner
                                      key={fa.alert_uid}
                                      title={`Galley Supply · ${fa.affected_item_name}`}
                                      severity={fa.severity}
                                      description={`${fa.alert_type.replace(/_/g, ' ')} — ${fa.current_quantity} ${fa.unit} remaining.`}
                                      whyItMatters={fa.recommended_action}
                                      timestamp={formatRecordedTime(fa.timestamp)}
                                      actionLabel="Review Supplies"
                                      onAction={() => onNavigate('food')}
                                    />
                                  ))
                                }
          </div>
                            </section>
                            ) : (
                            <section className="tc-panel px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <StatusIndicator status="NORMAL" label="No Active Alerts" />
                                <span className="text-sm text-[var(--tc-text-secondary)]">
                                  All core cardiovascular, respiratory, habitat, and galley supply thresholds are within mission parameters.
                                </span>
                              </div>
                        </section>
                      )}

                            {/* Calm Secondary Navigation Strip */}
                            <section aria-label="Quick Workflows" className="pt-2 border-t border-[var(--tc-border)]">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <button
                                  type="button"
                                  onClick={() => onNavigate('monitoring')}
                                  className="tc-panel p-4 text-left hover:border-[var(--tc-border-strong)] transition-colors flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <HeartPulse className="w-4 h-4 text-[var(--tc-accent)] shrink-0" aria-hidden="true" />
                                    <div>
                                      <div className="text-sm font-medium text-[var(--tc-text)]">Health Monitoring</div>
                                      <div className="text-xs text-[var(--tc-text-muted)]">Sensors &amp; trends</div>
                                    </div>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
                                </button>

                                    <button
                                      type="button"
                                      onClick={() => onNavigate('activity')}
                                      className="tc-panel p-4 text-left hover:border-[var(--tc-border-strong)] transition-colors flex items-center justify-between gap-3"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Activity className="w-4 h-4 text-[var(--tc-accent)] shrink-0" aria-hidden="true" />
                                        <div>
                                          <div className="text-sm font-medium text-[var(--tc-text)]">Physical Activity</div>
                                          <div className="text-xs text-[var(--tc-text-muted)]">
                                            {Math.round(latest.physical_activity_mins)} min today
                                          </div>
                                        </div>
                                      </div>
                                      <ArrowRight className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
                                    </button>

                                          <button
                                            type="button"
                                            onClick={() => onNavigate('food')}
                                            className="tc-panel p-4 text-left hover:border-[var(--tc-border-strong)] transition-colors flex items-center justify-between gap-3"
                                          >
                                            <div className="flex items-center gap-3">
                                              <Utensils className="w-4 h-4 text-[var(--tc-accent)] shrink-0" aria-hidden="true" />
                                              <div>
                                                <div className="text-sm font-medium text-[var(--tc-text)]">Food &amp; Supplies</div>
                                                <div className="text-xs text-[var(--tc-text-muted)]">
                                                  {state.food_state
                                                    ? `~${state.food_state.summary.estimated_meal_supply_days}d est. meals`
                                                    : 'Inventory'}
                                                </div>
                                              </div>
                                          </div>
                                      <ArrowRight className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
                                    </button>

                                          <button
                                            type="button"
                                            onClick={() => onNavigate('companion')}
                                            className="tc-panel p-4 text-left hover:border-[var(--tc-border-strong)] transition-colors flex items-center justify-between gap-3"
                                          >
                                            <div className="flex items-center gap-3">
                                              <MessageSquare className="w-4 h-4 text-[var(--tc-accent)] shrink-0" aria-hidden="true" />
                                              <div>
                                                <div className="text-sm font-medium text-[var(--tc-text)]">AI Companion</div>
                                                <div className="text-xs text-[var(--tc-text-muted)]">Private support</div>
                                              </div>
                                            </div>
                                        <ArrowRight className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
                                      </button>
                                    </div>
                                  </section>
    </div>
                              );
};
