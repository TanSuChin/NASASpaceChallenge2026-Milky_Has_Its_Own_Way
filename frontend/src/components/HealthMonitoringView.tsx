import React, { useMemo, useState } from 'react';
import { Eye, HeartPulse, Link2, Sparkles, Wind } from 'lucide-react';
import { FullSystemState } from '../types';
import { MedicalDevicesView } from './MedicalDevicesView';
import { InteractiveHumanBody } from './InteractiveHumanBody';
import { AlertBanner } from './ui/AlertBanner';
import { HealthMetricCard } from './ui/HealthMetricCard';
import { StatusIndicator } from './ui/StatusIndicator';
import { formatRecordedTime, provenanceLabel } from './uiHelpers';
import { NavSectionId } from './ui/NavigationSidebar';

interface HealthMonitoringViewProps {
  state: FullSystemState;
  selectedBodyRegionId: string;
  onSelectBodyRegion: (regionId: string) => void;
  onStateUpdated: (next: FullSystemState) => void;
  onNavigate: (tab: NavSectionId) => void;
  onOpenSansModal: () => void;
  onStartAssessmentForRegion: (regionId: string) => void;
  onAskCompanionClinical: (topic: string) => void;
}

/**
 * Structured physiological monitoring workspace separated into Cardiovascular, Respiratory,
 * and Physical Condition groups, with progressive-disclosure views for Connected Hardware
 * and Anatomical Body Exploration.
 */
export const HealthMonitoringView: React.FC<HealthMonitoringViewProps> = ({
  state,
  selectedBodyRegionId,
  onSelectBodyRegion,
  onStateUpdated,
  onNavigate,
  onOpenSansModal,
  onStartAssessmentForRegion,
  onAskCompanionClinical,
}) => {
  const [subView, setSubView] = useState<'systems' | 'hardware' | 'anatomy'>('systems');
  const { astronaut, latest_telemetry: latest, telemetry_history: history, assessment } = state;

  const connectedHardwareCount = useMemo(() => {
    const states = Object.values(state.device_states || {});
    return states.filter(
      (s) => s.connection_status === 'connected' || s.connection_status === 'simulation',
    ).length;
  }, [state.device_states]);

  const trends = useMemo(() => {
    return {
      hr: history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.heart_rate_bpm })),
      bp: history.map((r) => ({
        label: `Sol ${r.mission_day}`,
        value: r.systolic_bp_mmhg,
        secondaryValue: r.diastolic_bp_mmhg,
      })),
      spo2: history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.spo2_pct })),
      rr: history
        .filter((r) => typeof r.respiratory_rate_bpm === 'number')
        .map((r) => ({
          label: `Sol ${r.mission_day}`,
          value: r.respiratory_rate_bpm as number,
        })),
      temp: history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.body_temp_c })),
      activity: history.map((r) => ({
        label: `Sol ${r.mission_day}`,
        value: r.physical_activity_mins,
      })),
      sleep: history.map((r) => ({ label: `Sol ${r.mission_day}`, value: r.sleep_duration_hrs })),
    };
  }, [history]);

  const hrDelta = Number((latest.heart_rate_bpm - astronaut.baseline_hr_bpm).toFixed(1));
  const sysDelta = Number((latest.systolic_bp_mmhg - astronaut.baseline_systolic_mmhg).toFixed(1));
  const abnormalDetected = Math.abs(hrDelta) > 12 || latest.spo2_pct < 95 || latest.body_temp_c > 37.8;

  const hrStatus =
    Math.abs(hrDelta) > 22 ? 'CRITICAL' : Math.abs(hrDelta) > 12 ? 'WARNING' : 'NORMAL';
  const bpStatus =
    latest.systolic_bp_mmhg < 90 || latest.systolic_bp_mmhg > 150
      ? 'CRITICAL'
      : Math.abs(sysDelta) > 18
        ? 'WARNING'
        : 'NORMAL';
  const spo2Status =
    latest.spo2_pct < 92 ? 'CRITICAL' : latest.spo2_pct < 95 ? 'WARNING' : 'NORMAL';
  const rrSupported = typeof latest.respiratory_rate_bpm === 'number';
  const rrStatus = !rrSupported
    ? 'UNAVAILABLE'
    : (latest.respiratory_rate_bpm || 16) > 22 || (latest.respiratory_rate_bpm || 16) < 10
      ? 'WARNING'
      : 'NORMAL';
  const tempStatus =
    latest.body_temp_c >= 38.3
      ? 'CRITICAL'
      : latest.body_temp_c >= 37.7 || latest.body_temp_c < 35.8
        ? 'WARNING'
        : 'NORMAL';
  const sleepStatus =
    latest.sleep_duration_hrs < 5.5
      ? 'CRITICAL'
      : latest.sleep_duration_hrs < astronaut.baseline_sleep_hrs - 1.0
        ? 'WARNING'
        : 'NORMAL';

  return (
    <div className="space-y-8">
      {/* Page Header & Progressive View Switcher */}
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 pb-6 border-b border-[var(--tc-border)]">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
            Health Monitoring
          </h1>
          <p className="text-sm text-[var(--tc-text-secondary)]">
            Individual physiological trends calibrated to {astronaut.name}&apos;s mission baseline · Last updated{' '}
            <span className="tabular-data">{formatRecordedTime(latest.timestamp)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenSansModal}
            className="tc-btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-[var(--tc-accent)]" aria-hidden="true" />
            <span>SANS Amsler Grid Check</span>
          </button>

          <div
            className="inline-flex rounded-lg border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] p-1"
            role="tablist"
            aria-label="Monitoring view mode"
          >
            {[
              { id: 'systems' as const, label: 'Physiological Systems' },
              { id: 'hardware' as const, label: `Hardware (${connectedHardwareCount})` },
              { id: 'anatomy' as const, label: 'Anatomical Map' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={subView === tab.id}
                onClick={() => setSubView(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  subView === tab.id
                    ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                    : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {subView === 'systems' && (
        <div className="space-y-10">
          {abnormalDetected && (
            <AlertBanner
              title="Baseline Drift Detected"
              severity={assessment.overall_status}
              description={`Recorded readings show a deviation from personal flight calibration (Heart rate ${hrDelta >= 0 ? '+' : ''}${hrDelta} bpm from ${astronaut.baseline_hr_bpm} bpm baseline).`}
              whyItMatters="Microgravity and cabin stress alter autonomic regulation. Run an integrated AI Health Assessment to evaluate multi-factor context."
              timestamp={formatRecordedTime(latest.timestamp)}
              sourceLabel={provenanceLabel(latest.provenance)}
              actionLabel="Run Health Assessment"
              onAction={() => onNavigate('assessment')}
            />
          )}

          {/* Section 1: Cardiovascular */}
          <section aria-labelledby="cardio-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <HeartPulse className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
                <h2 id="cardio-heading" className="text-lg font-semibold text-[var(--tc-text)]">
                  Cardiovascular
                </h2>
              </div>
              <StatusIndicator
                status={hrStatus === 'CRITICAL' || bpStatus === 'CRITICAL' ? 'CRITICAL' : hrStatus === 'WARNING' || bpStatus === 'WARNING' ? 'WARNING' : 'NORMAL'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HealthMetricCard
                label="Heart Rate"
                value={Math.round(latest.heart_rate_bpm)}
                unit="bpm"
                status={hrStatus}
                baselineNumeric={astronaut.baseline_hr_bpm}
                expectedRange={[astronaut.baseline_hr_bpm - 10, astronaut.baseline_hr_bpm + 12]}
                domainRange={[40, 145]}
                baselineLabel={`Baseline ${astronaut.baseline_hr_bpm} bpm (${hrDelta >= 0 ? '+' : ''}${hrDelta})`}
                timestamp={`Sol ${latest.mission_day}`}
                dataSource={provenanceLabel(latest.provenance)}
                dataQuality="Verified"
                trendData={trends.hr}
              />

              <HealthMetricCard
                label="Resting Baseline Heart Rate"
                value={astronaut.baseline_hr_bpm}
                unit="bpm"
                status="INFO"
                baselineLabel="Calibrated in-flight personal norm"
                timestamp={formatRecordedTime(latest.timestamp)}
                dataSource="Astronaut Baseline Record"
                dataQuality="Calibrated"
                note="Individual reference used instead of generalized ground-based norms."
              />

              <HealthMetricCard
                label="Blood Pressure"
                value={`${Math.round(latest.systolic_bp_mmhg)}/${Math.round(latest.diastolic_bp_mmhg)}`}
                unit="mmHg"
                status={bpStatus}
                baselineNumeric={astronaut.baseline_systolic_mmhg}
                expectedRange={[astronaut.baseline_systolic_mmhg - 14, astronaut.baseline_systolic_mmhg + 16]}
                domainRange={[75, 175]}
                baselineLabel={`Baseline ${astronaut.baseline_systolic_mmhg}/${astronaut.baseline_diastolic_mmhg} mmHg`}
                timestamp={`Sol ${latest.mission_day}`}
                dataSource="Cuff / Bio-Monitor Telemetry"
                dataQuality="Verified"
                trendData={trends.bp}
              />
            </div>
          </section>

          {/* Section 2: Respiratory */}
          <section aria-labelledby="resp-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Wind className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
                <h2 id="resp-heading" className="text-lg font-semibold text-[var(--tc-text)]">
                  Respiratory
                </h2>
              </div>
              <StatusIndicator status={spo2Status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HealthMetricCard
                label="Blood Oxygen Saturation (SpO2)"
                value={Number(latest.spo2_pct).toFixed(1)}
                unit="%"
                status={spo2Status}
                baselineNumeric={astronaut.baseline_spo2_pct}
                expectedRange={[95, 100]}
                domainRange={[85, 100]}
                baselineLabel={`Baseline ${astronaut.baseline_spo2_pct}%`}
                timestamp={`Sol ${latest.mission_day}`}
                dataSource="Optical Pulse Oximeter"
                dataQuality="Verified"
                trendData={trends.spo2}
              />

              <HealthMetricCard
                label="Respiratory Rate"
                value={rrSupported ? Math.round(latest.respiratory_rate_bpm as number) : null}
                unit="breaths/min"
                status={rrStatus}
                expectedRange={[12, 20]}
                domainRange={[8, 30]}
                baselineLabel={
                  rrSupported
                    ? 'Expected cabin range 12–20 breaths/min'
                    : 'Connect Thoracic Strap or Bio-Monitor for live respiratory telemetry'
                }
                timestamp={rrSupported ? `Sol ${latest.mission_day}` : 'Sensor offline'}
                dataSource={rrSupported ? 'Chest Strap Telemetry' : 'No connected respiratory sensor'}
                dataQuality={rrSupported ? 'Verified' : 'Unavailable'}
                trendData={trends.rr}
                onActionLabel="Manage Hardware Sensors"
                onAction={() => setSubView('hardware')}
              />
            </div>
          </section>

          {/* Section 3: Physical Condition */}
          <section aria-labelledby="phys-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
                <h2 id="phys-heading" className="text-lg font-semibold text-[var(--tc-text)]">
                  Physical Condition
                </h2>
              </div>
              <StatusIndicator
                status={tempStatus === 'CRITICAL' || sleepStatus === 'CRITICAL' ? 'CRITICAL' : tempStatus === 'WARNING' || sleepStatus === 'WARNING' ? 'WARNING' : 'NORMAL'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HealthMetricCard
                label="Body Temperature"
                value={Number(latest.body_temp_c).toFixed(1)}
                unit="°C"
                status={tempStatus}
                baselineNumeric={astronaut.baseline_temp_c}
                expectedRange={[36.1, 37.5]}
                domainRange={[35.0, 39.5]}
                baselineLabel={`Baseline ${astronaut.baseline_temp_c.toFixed(1)} °C`}
                timestamp={`Sol ${latest.mission_day}`}
                dataSource="Core Skin Patch"
                dataQuality="Verified"
                trendData={trends.temp}
              />

              <HealthMetricCard
                label="Daily Physical Activity"
                value={Math.round(latest.physical_activity_mins)}
                unit="min"
                status={assessment.exercise_contraindicated ? 'HOLD' : latest.physical_activity_mins < 30 ? 'WARNING' : 'NORMAL'}
                baselineNumeric={60}
                expectedRange={[45, 90]}
                domainRange={[0, 120]}
                baselineLabel={`Countermeasure adherence ${Math.round(latest.exercise_adherence_pct)}%`}
                timestamp={`Sol ${latest.mission_day}`}
                dataSource="ARED / Cycle Countermeasure Log"
                dataQuality="Verified"
                trendData={trends.activity}
                onActionLabel="Open Physical Activity"
                onAction={() => onNavigate('activity')}
              />

              <HealthMetricCard
                label="Sleep Duration"
                value={Number(latest.sleep_duration_hrs).toFixed(1)}
                unit="hrs"
                status={sleepStatus}
                baselineNumeric={astronaut.baseline_sleep_hrs}
                expectedRange={[astronaut.baseline_sleep_hrs - 0.8, 9.0]}
                domainRange={[3, 10]}
                baselineLabel={`Baseline ${astronaut.baseline_sleep_hrs} hrs · Quality ${Math.round(latest.sleep_quality_pct)}%`}
                timestamp={`Sol ${latest.mission_day}`}
                dataSource="Crew Quarter Actigraphy"
                dataQuality="Verified"
                trendData={trends.sleep}
              />
            </div>
          </section>

          {/* Subtle Hardware Bridge Footer */}
          <section className="tc-panel p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link2 className="w-4 h-4 text-[var(--tc-accent)] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="text-sm font-medium text-[var(--tc-text)]">
                  Hardware &amp; Medical Instrumentation ({connectedHardwareCount} active)
                </div>
                <p className="text-xs text-[var(--tc-text-muted)] mt-0.5">
                  Pair spacecraft wearables, import sensor logs, or record guided device examinations without leaving Health Monitoring.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubView('hardware')}
              className="tc-btn-secondary px-4 py-2 text-xs shrink-0"
            >
              Manage Connected Devices
            </button>
          </section>
        </div>
      )}

      {subView === 'hardware' && (
        <MedicalDevicesView
          state={state}
          onStateUpdated={onStateUpdated}
          onOpenSansModal={onOpenSansModal}
          onNavigateTab={(tab) => {
            if (tab === 'assessment') onNavigate('assessment');
            else if (tab === 'overview') onNavigate('overview');
            else if (tab === 'history') onNavigate('history');
            else if (tab === 'comm') onNavigate('environment');
          }}
        />
      )}

      {subView === 'anatomy' && (
        <div className="space-y-4">
          <InteractiveHumanBody
            regions={assessment.marscare_body_regions || []}
            selectedRegionId={selectedBodyRegionId}
            onSelectRegion={onSelectBodyRegion}
            onStartAssessment={onStartAssessmentForRegion}
            onAskAssistant={onAskCompanionClinical}
          />
        </div>
      )}
    </div>
  );
};
