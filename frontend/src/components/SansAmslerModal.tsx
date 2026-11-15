import React, { useState } from 'react';
import { Eye, CheckCircle2, X } from 'lucide-react';
import { FullSystemState, SansAssessmentRecord } from '../types';
import { apiRequest } from './uiHelpers';

interface SansAmslerModalProps {
  missionDay: number;
  astronautName: string;
  history: SansAssessmentRecord[];
  onClose: () => void;
  onSaved: (nextState: FullSystemState) => void;
}

const GRID_ROWS = 10;
const GRID_COLS = 10;

export const SansAmslerModal: React.FC<SansAmslerModalProps> = ({
  missionDay,
  astronautName,
  history,
  onClose,
  onSaved,
}) => {
  const [eyeTested, setEyeTested] = useState<'BOTH' | 'LEFT' | 'RIGHT'>('BOTH');
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [wavyLines, setWavyLines] = useState(false);
  const [nearShift, setNearShift] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCell = (cellId: string) => {
    setSelectedCells((prev) =>
      prev.includes(cellId) ? prev.filter((c) => c !== cellId) : [...prev, cellId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiRequest<{ sans_record: SansAssessmentRecord; state: FullSystemState }>(
        '/api/sans/assessments',
        {
          method: 'POST',
          body: JSON.stringify({
            mission_day: missionDay,
            eye_tested: eyeTested,
            wavy_lines_detected: wavyLines,
            scotoma_cells: selectedCells,
            near_acuity_shift: nearShift,
            notes,
          }),
        },
      );
      onSaved(res.state);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save SANS Amsler screening.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sans-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="mc-card-glow w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--tc-border)] pb-3.5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--tc-accent)]">
              <Eye className="w-4 h-4" />
              <span>SPACEFLIGHT-ASSOCIATED NEURO-OCULAR SYNDROME (SANS)</span>
            </div>
            <h2 id="sans-modal-title" className="text-lg font-bold text-[var(--tc-text)] mt-1">
              Interactive Amsler Grid Self-Check · {astronautName} (Sol {missionDay})
            </h2>
            <p className="text-xs text-[var(--tc-text-secondary)] mt-0.5">
              Fixate on the white center dot (~30 cm away, wearing reading lenses if prescribed). Tap any grid squares that look wavy, blurred, dark, or missing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close SANS Amsler Grid modal"
            className="p-2 rounded-full bg-[var(--tc-bg)] text-[var(--tc-text-secondary)] hover:text-[var(--tc-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Interactive 10x10 Amsler Grid */}
            <div className="flex flex-col items-center gap-2.5 bg-[#070912] p-4 rounded-xl border border-[var(--tc-border)]">
              <div
                className="relative grid grid-cols-10 w-60 h-60 border border-[var(--tc-border-strong)] bg-[var(--tc-bg)]"
                role="group"
                aria-label="Amsler 10 by 10 ocular grid"
              >
                {Array.from({ length: GRID_ROWS }).map((_, rIdx) =>
                  Array.from({ length: GRID_COLS }).map((__, cIdx) => {
                    const cellId = `R${rIdx + 1}C${cIdx + 1}`;
                    const active = selectedCells.includes(cellId);
                    return (
                      <button
                        key={cellId}
                        type="button"
                        onClick={() => toggleCell(cellId)}
                        title={`Toggle grid square ${cellId}`}
                        aria-pressed={active}
                        className={`border border-[var(--tc-border-strong)] transition-colors ${
                          active ? 'bg-amber-400/55 border-amber-300' : 'hover:bg-[var(--tc-accent-soft)]'
                        }`}
                      />
                    );
                  }),
                )}
                {/* Central fixation dot */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#FAF9FA] ring-2 ring-[#0B0D1A]"
                />
              </div>
              <div className="flex items-center justify-between w-60 text-[11px] text-[var(--tc-text-secondary)]">
                <span>Marked cells: <strong className="text-[var(--tc-accent)]">{selectedCells.length}</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedCells([])}
                  className="text-[var(--tc-accent)] hover:underline"
                >
                  Clear Grid
                </button>
              </div>
            </div>

            {/* Eye Selection & Symptom Checkboxes */}
            <div className="space-y-3.5">
              <div>
                <div className="text-xs font-semibold text-[var(--tc-text-secondary)] mb-1.5">Eye Tested</div>
                <div className="flex gap-2">
                  {(['BOTH', 'LEFT', 'RIGHT'] as const).map((eye) => (
                    <button
                      key={eye}
                      type="button"
                      onClick={() => setEyeTested(eye)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        eyeTested === eye
                          ? 'bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)] font-semibold'
                          : 'bg-[var(--tc-bg)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)]'
                      }`}
                    >
                      {eye === 'BOTH' ? 'Both Eyes' : `${eye[0] + eye.slice(1).toLowerCase()} Eye`}
                    </button>
                  ))}
                </div>
              </div>

              <label htmlFor="sans-wavy-lines" className="flex items-start gap-2.5 rounded-xl bg-[var(--tc-bg)] p-3 text-xs text-[var(--tc-text)] cursor-pointer border border-[var(--tc-border)]">
                <input
                  id="sans-wavy-lines"
                  name="wavy_lines_detected"
                  type="checkbox"
                  checked={wavyLines}
                  onChange={(e) => setWavyLines(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <span>Wavy, curved, or pinched grid lines (metamorphopsia)</span>
              </label>

              <label htmlFor="sans-near-shift" className="flex items-start gap-2.5 rounded-xl bg-[var(--tc-bg)] p-3 text-xs text-[var(--tc-text)] cursor-pointer border border-[var(--tc-border)]">
                <input
                  id="sans-near-shift"
                  name="near_acuity_shift"
                  type="checkbox"
                  checked={nearShift}
                  onChange={(e) => setNearShift(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <span>Noticeable near-vision hyperopic focusing shift</span>
              </label>

              <div>
                <label htmlFor="sans-notes" className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Ocular Screening Notes
                </label>
                <input
                  id="sans-notes"
                  name="sans_notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional lighting, reading distance, or handheld OCT note..."
                  className="w-full rounded-lg bg-[var(--tc-bg)] border border-[var(--tc-border)] px-3 py-2 text-xs text-[var(--tc-text)] focus:border-[#A5D8FF] focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-accent-soft)] p-3 text-[11px] text-[var(--tc-text-secondary)]">
                Screening aid only: logs fluid-shift visual symptoms for Crew Medical Officer &amp; handheld OCT follow-up; does not diagnose retinal or optic nerve disease.
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          {history.length > 0 && (
            <div className="rounded-xl bg-[var(--tc-bg)] p-3 space-y-1.5 border border-[var(--tc-border)]">
              <div className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
                Recent Local SANS Screenings ({history.length})
              </div>
              {history.slice(0, 3).map((rec, idx) => (
                <div key={`${rec.timestamp}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--tc-text-secondary)]">
                  <span>
                    Sol {rec.mission_day} · {rec.eye_tested} · {rec.scotoma_cells.length} cell(s) ·{' '}
                    {rec.wavy_lines_detected || rec.near_acuity_shift ? 'Flagged for CMO OCT review' : 'Clear'}
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">{rec.notes || 'No note'}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="mc-btn-secondary px-4 py-2 text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="mc-btn-primary px-5 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving Check...' : 'Save SANS Screening Offline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
