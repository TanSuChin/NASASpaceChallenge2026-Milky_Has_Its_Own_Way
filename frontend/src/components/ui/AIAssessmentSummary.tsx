import React from 'react';
import { CheckCircle2, Clock, ShieldAlert, Stethoscope } from 'lucide-react';
import { FullSystemState } from '../../types';
import { formatRecordedTime, provenanceLabel } from '../uiHelpers';
import { StatusIndicator } from './StatusIndicator';

interface AIAssessmentSummaryProps {
  state: FullSystemState;
  dataConfidenceLabel: string;
  lastValidatedAt: string;
  onOpenEmergency: (hazard?: string) => void;
  onOpenHistory?: () => void;
}

/**
 * Plain-language clinical health assessment report showing validated sources, confidence,
 * baseline comparisons, prioritized non-diagnostic actions, and clinician escalation access.
 */
export const AIAssessmentSummary: React.FC<AIAssessmentSummaryProps> = ({
  state,
  dataConfidenceLabel,
  lastValidatedAt,
  onOpenEmergency,
  onOpenHistory,
}) => {
  const { assessment, latest_telemetry: latest } = state;
  const exp = assessment.structured_explanation;

  const detected = exp?.what_was_detected || [];
  const contributing = exp?.contributing_measurements || [];
  const nextSteps = exp?.next_steps || [];

  return (
    <section className="tc-panel p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pb-5 border-b border-[var(--tc-border)]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <StatusIndicator status={assessment.overall_status} size="md" />
            <span className="text-xs text-[var(--tc-text-muted)] tabular-data inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Assessment timestamp: {formatRecordedTime(lastValidatedAt)}</span>
            </span>
          </div>
          <h2 className="text-xl font-semibold text-[var(--tc-text)]">
            {assessment.glance_summary?.how_am_i_doing ||
              `Mission Sol ${latest.mission_day} Assessment Summary`}
          </h2>
          <p className="text-sm text-[var(--tc-text-secondary)] max-w-[52ch] leading-relaxed">
            {assessment.glance_summary?.what_has_changed ||
              'Compared connected telemetry and personal baseline deviations across core physiological systems.'}
          </p>
        </div>

        <div className="tc-panel-elevated px-4 py-3 text-xs space-y-1 shrink-0 min-w-[230px]">
          <div className="text-[var(--tc-text-muted)]">Data confidence &amp; origin</div>
          <div className="font-medium text-[var(--tc-text)]">{dataConfidenceLabel}</div>
          <div className="text-[var(--tc-text-muted)]">{provenanceLabel(latest.provenance)}</div>
        </div>
      </div>

      {/* Plain-Language Findings & Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--tc-text)]">
            What the analysis observed
          </h3>
          {detected.length > 0 ? (
            <ul className="space-y-2.5 text-sm text-[var(--tc-text-secondary)] leading-relaxed">
              {detected.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--tc-accent)] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--tc-text-secondary)]">
              No abnormal deviations detected outside personal baseline calibration tolerances.
            </p>
          )}

          {contributing.length > 0 && (
            <div className="pt-3 border-t border-[var(--tc-border)] space-y-2">
              <h4 className="text-xs font-medium text-[var(--tc-text-muted)]">
                Historical &amp; baseline evidence
              </h4>
              <ul className="space-y-1.5 text-xs text-[var(--tc-text-secondary)] tabular-data">
                {contributing.slice(0, 5).map((m, i) => (
                  <li key={i}>· {m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--tc-text)]">
            Recommended non-diagnostic next steps
          </h3>
          {nextSteps.length > 0 ? (
            <ol className="space-y-2.5 text-sm text-[var(--tc-text-secondary)] leading-relaxed list-decimal list-inside">
              {nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[var(--tc-text-secondary)]">
              Continue standard mission routine and log scheduled sleep, hydration, and activity check-ins.
            </p>
          )}

          {assessment.recommendations && assessment.recommendations.length > 0 && (
            <div className="pt-3 border-t border-[var(--tc-border)] space-y-2">
              <h4 className="text-xs font-medium text-[var(--tc-text-muted)]">
                Operational references
              </h4>
              <div className="space-y-2">
                {assessment.recommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="text-xs text-[var(--tc-text-secondary)]">
                    <span className="font-medium text-[var(--tc-text)]">{rec.procedure_code}: </span>
                    {rec.action}{' '}
                    <span className="text-[var(--tc-text-muted)]">({rec.citation})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Safeguard & Clinician Review Footer */}
      <div className="pt-5 border-t border-[var(--tc-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-xs text-[var(--tc-text-muted)] max-w-2xl leading-relaxed">
          {assessment.rule_disclaimer} Does not issue clinical diagnoses or prescribe medications.
        </p>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="tc-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Prepare Flight Surgeon Consult</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenEmergency(assessment.recommended_emergency_hazard || undefined)}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-[var(--tc-crit-border)] bg-[var(--tc-crit-bg)] text-[var(--tc-crit-fg)] hover:opacity-90 inline-flex items-center gap-1.5 transition-opacity"
          >
            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Emergency Protocol</span>
          </button>
        </div>
      </div>
    </section>
  );
};
