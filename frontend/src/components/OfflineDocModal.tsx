import React, { useEffect } from 'react';
import { BookOpen, ExternalLink, WifiOff, X } from 'lucide-react';
import { KnowledgeDocItem } from '../types';

interface OfflineDocModalProps {
  doc: KnowledgeDocItem | null;
  highlightedExcerpt?: string;
  onClose: () => void;
}

export const OfflineDocModal: React.FC<OfflineDocModalProps> = ({
  doc,
  highlightedExcerpt,
  onClose,
}) => {
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  if (!doc) return null;

  const isExternalHttp = doc.url.startsWith('http://') || doc.url.startsWith('https://');
  const isSpec = doc.provenance.toUpperCase() === 'SYSTEM_OPERATIONAL_SPEC';
  const paragraphs = doc.content.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-doc-title"
    >
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--tc-border)] bg-[var(--tc-surface)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--tc-border)] bg-[var(--tc-surface)] px-6 py-4">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 h-5 w-5 shrink-0 text-[var(--tc-accent)]" />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                <span className="font-mono font-semibold text-[var(--tc-accent)]">{doc.doc_id}</span>
                <span>·</span>
                <span>{doc.agency} ({doc.year})</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    isSpec
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  {isSpec ? 'TARS Care System Operational Spec' : 'Offline Scientific Reference'}
                </span>
              </div>
              <h3 id="offline-doc-title" className="mt-1 text-lg font-medium text-[#EEF0F6]">
                {doc.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document viewer"
            className="rounded-lg border border-[var(--tc-border)] p-1.5 text-[#94A3B8] hover:text-[#EEF0F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A5D8FF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-200">
            <WifiOff className="h-4 w-4 shrink-0 text-emerald-300" />
            Stored locally inside TARS Care&apos;s onboard knowledge repository — readable 100% offline with zero Earth or internet connectivity.
          </div>

          {highlightedExcerpt && (
            <div className="rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-accent-soft)] p-3.5 text-sm leading-relaxed text-[#EEF0F6]">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--tc-accent)]">
                Matched Passage Excerpt
              </div>
              {highlightedExcerpt}
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-[var(--tc-border)] bg-[var(--tc-bg)] p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
              Full Locally Cached Content · Hazard: {doc.hazard_category}
            </div>
            {paragraphs.map((para, idx) => (
              <p key={idx} className="text-sm leading-relaxed text-[#EEF0F6]">
                {para}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tc-border)] pt-3">
            {isExternalHttp ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[var(--tc-accent)]"
                title="External URL requires Earth internet access and is unavailable during conjunction blackouts"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                External NASA/CSA Portal URL (Internet Required)
              </a>
            ) : (
              <span className="text-xs text-[#94A3B8]">Local specification URI: {doc.url}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[#A5D8FF] px-4 py-1.5 text-sm font-medium text-[#0B0D1A] hover:bg-[#8ecbff]"
            >
              Done Reading
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

