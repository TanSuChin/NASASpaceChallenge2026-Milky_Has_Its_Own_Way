import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Database,
  Scale,
} from 'lucide-react';
import { FullSystemState, RAGAnalysisResponse, RiskLevel } from '../types';

interface AnalysisAndRAGScreenProps {
  state: FullSystemState;
  onQueryRAG: (question: string, hazardFilter: string) => Promise<RAGAnalysisResponse>;
  onTriggerEmergency: (hazard: string, symptoms: string[]) => Promise<void>;
}

const PRESET_QUESTIONS = [
  'How do Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE) differ, and why separate Gy from Sv?',
  'Why does heart rate increase and blood pressure drop in 0.38g Martian gravity (CCISS / CARDIOBREATH)?',
  'How do spacecraft CO2 pockets correlate with headaches, sleep loss, and SANS ocular changes?',
  'What are the approved non-diagnostic countermeasures for circadian misalignment and confinement fatigue?',
  'How does autonomous medical triage work during a 22-minute Mars communication blackout?',
];

function badgeStyle(status: RiskLevel): string {
  if (status === 'CRITICAL') return 'bg-red-950/85 text-red-200 border border-red-500/50';
  if (status === 'WARNING') return 'bg-amber-950/85 text-amber-200 border border-amber-500/50';
  return 'bg-emerald-950/85 text-emerald-200 border border-emerald-500/50';
}

export const AnalysisAndRAGScreen: React.FC<AnalysisAndRAGScreenProps> = ({
  state,
  onQueryRAG,
  onTriggerEmergency,
}) => {
  const { astronaut, latest_telemetry: latest, assessment, knowledge_corpus } = state;

  const [question, setQuestion] = useState('');
  const [hazardFilter, setHazardFilter] = useState('ALL');
  const [customRagResult, setCustomRagResult] = useState<RAGAnalysisResponse | null>(null);
  const [loadingRag, setLoadingRag] = useState(false);

  const activeRag = customRagResult || assessment.rag_analysis;

  const handleRunQuery = async (qText: string) => {
    if (!qText.trim()) return;
    setLoadingRag(true);
    const res = await onQueryRAG(qText, hazardFilter);
    setCustomRagResult(res);
    setLoadingRag(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1e2d4a]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f8fafc]">
            AI Health Analysis, Baseline Comparison & Local NASA/CSA RAG
          </h1>
          <p className="text-sm text-[#a8b8d0] mt-1 prose-measure">
            Synthesizes personal baseline deviations across all five spaceflight hazards and retrieves verifiable
            scientific evidence from the onboard NASA Human Research Program (HRP) & Canadian Space Agency (CSA) corpus.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#a8b8d0]">Integrated Risk Classification:</span>
          <span className={`px-3 py-1 rounded text-xs font-semibold tabular-data ${badgeStyle(assessment.overall_status)}`}>
            {assessment.overall_status}
          </span>
        </div>
      </div>

      {/* Prototype & Safety Guardrail Banner */}
      <div className="p-4 rounded bg-[#131d33] border border-[#263859] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 text-xs text-[#cbd5e1] prose-measure">
          <div className="font-semibold text-[#f8fafc] flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#38bdf8]" />
            Clinical Safety & Prototype Rule Transparency
          </div>
          <p>
            {assessment.rule_disclaimer} The AI & RAG engine is strictly prohibited from diagnosing medical/psychiatric
            conditions, prescribing unsupported medications, or fabricating citations.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded text-xs font-mono bg-[#0d1424] border border-[#1e2d4a] text-[#38bdf8] shrink-0">
          ENGINE: {activeRag.engine_mode}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Detected Changes & Individual Baseline Comparison Table */}
        <div className="lg:col-span-6 space-y-6">
          {/* Detected Changes */}
          <div className="panel-surface rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#f8fafc]">
                Detected Physiological & Environmental Deviations (Sol {latest.mission_day})
              </h2>
              <span className="text-xs text-[#38bdf8] font-mono">{latest.provenance}</span>
            </div>

            {assessment.findings.length === 0 ? (
              <div className="p-4 rounded bg-[#131d33] border border-[#263859] text-xs text-[#10b981] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                No concerning baseline deviations detected. All five spaceflight hazards are NORMAL.
              </div>
            ) : (
              <div className="space-y-2.5">
                {assessment.findings.map((fd, idx) => (
                  <div key={idx} className="p-3.5 rounded bg-[#131d33] border border-[#263859] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#f8fafc]">{fd.title}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${badgeStyle(fd.severity)}`}>
                        {fd.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[#cbd5e1] leading-relaxed">{fd.detail}</p>
                    <div className="flex items-center justify-between text-[11px] text-[#a8b8d0] pt-1">
                      <span>Hazard: <strong className="text-[#f1f5f9]">{fd.hazard}</strong></span>
                      <span className="text-[#38bdf8] font-mono">Ref: {fd.ref_doc}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Individual Baseline Comparison Table */}
          <div className="panel-surface rounded-lg p-5 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-[#f8fafc]">
                Individual Astronaut Baseline Comparison ({astronaut.name})
              </h2>
              <p className="text-xs text-[#a8b8d0]">
                Evaluates current readings in {latest.mission_phase.replace(/_/g, ' ')} ({latest.gravity_g}g) against
                personal baseline rather than fixed 1g terrestrial clinical norms
              </p>
            </div>
            <div className="overflow-x-auto border border-[#1e2d4a] rounded">
              <table className="w-full text-left border-collapse text-xs tabular-data">
                <thead>
                  <tr className="bg-[#131d33] text-[#a8b8d0] border-b border-[#1e2d4a]">
                    <th className="py-2.5 px-3">Biometric Indicator</th>
                    <th className="py-2.5 px-3">Current</th>
                    <th className="py-2.5 px-3">Personal Baseline</th>
                    <th className="py-2.5 px-3">Delta (%)</th>
                    <th className="py-2.5 px-3">Hazard Domain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4a]">
                  {assessment.baseline_comparisons.map((bc) => {
                    const isNotable = Math.abs(bc.delta_pct) >= 12;
                    return (
                      <tr key={bc.key} className="hover:bg-[#111a2e]">
                        <td className="py-2 px-3 font-medium text-[#f1f5f9]">{bc.metric}</td>
                        <td className="py-2 px-3 font-semibold text-[#f8fafc]">
                          {bc.current} {bc.unit}
                        </td>
                        <td className="py-2 px-3 text-[#a8b8d0]">
                          {bc.baseline} {bc.unit}
                        </td>
                        <td
                          className={`py-2 px-3 font-semibold ${
                            isNotable ? 'text-[#f59e0b]' : 'text-[#10b981]'
                          }`}
                        >
                          {bc.delta > 0 ? `+${bc.delta}` : bc.delta} ({bc.delta_pct > 0 ? `+${bc.delta_pct}%` : `${bc.delta_pct}%`})
                        </td>
                        <td className="py-2 px-3 text-[#a8b8d0]">{bc.hazard}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive RAG Research Assistant & Supporting Citations */}
        <div className="lg:col-span-6 space-y-6">
          {/* Interactive RAG Query Box */}
          <div className="panel-surface rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#38bdf8]" />
                Local NASA / CSA Scientific RAG Knowledge Query
              </h2>
              <span className="text-xs text-[#10b981] font-mono">OFFLINE VECTOR INDEX READY</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={hazardFilter}
                onChange={(e) => setHazardFilter(e.target.value)}
                className="px-3 py-2 rounded bg-[#070b14] border border-[#263859] text-xs text-[#f8fafc]"
                aria-label="Filter by spaceflight hazard"
              >
                <option value="ALL">All 5 Spaceflight Hazards</option>
                <option value="Space Radiation">Space Radiation</option>
                <option value="Isolation and Confinement">Isolation & Confinement</option>
                <option value="Distance from Earth">Distance from Earth</option>
                <option value="Gravity Fields">Gravity Fields</option>
                <option value="Hostile and Closed Environments">Hostile Environments</option>
              </select>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a spaceflight medical question (e.g. SANS, SPE shielding, CCISS, CO2)..."
                className="flex-1 px-3 py-2 rounded bg-[#070b14] border border-[#263859] text-xs text-[#f8fafc]"
              />
              <button
                onClick={() => handleRunQuery(question)}
                disabled={loadingRag}
                className="px-4 py-2 rounded bg-[#38bdf8] hover:bg-[#0284c7] text-[#070b14] font-semibold text-xs flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                {loadingRag ? 'Retrieving...' : 'Retrieve'}
              </button>
            </div>

            {/* Preset Scientific Prompts */}
            <div className="space-y-1.5">
              <div className="text-xs text-[#a8b8d0]">Quick-Select Research Queries:</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_QUESTIONS.map((pq, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuestion(pq);
                      handleRunQuery(pq);
                    }}
                    className="text-left text-[11px] px-2.5 py-1 rounded bg-[#131d33] hover:bg-[#1a2947] text-[#cbd5e1] border border-[#263859] transition-colors"
                  >
                    {pq.slice(0, 66)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Evidence-Backed Explanation */}
            <div className="p-4 rounded bg-[#131d33] border border-[#263859] space-y-3">
              <div className="flex items-center justify-between border-b border-[#263859] pb-2">
                <span className="text-xs font-semibold text-[#38bdf8]">
                  RAG Evidence Synthesis (Query: "{activeRag.query.slice(0, 58)}")
                </span>
                <span className="text-[11px] font-mono text-[#a8b8d0]">
                  Evidence Sufficient: {activeRag.sufficient_evidence ? 'YES' : 'INSUFFICIENT'}
                </span>
              </div>
              <div className="text-xs text-[#f1f5f9] whitespace-pre-line leading-relaxed prose-measure">
                {activeRag.answer}
              </div>
              <div className="text-[11px] text-[#f59e0b] pt-2 border-t border-[#263859]">
                Safety Boundary: {activeRag.safety_notice}
              </div>
            </div>

            {/* Supporting Source Citations */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#38bdf8]" />
                Supporting NASA & CSA Scientific Citations ({activeRag.citations.length})
              </h3>
              {activeRag.citations.map((cit) => (
                <div key={cit.chunk_id} className="p-3.5 rounded bg-[#0b1221] border border-[#1e2d4a] space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#f8fafc]">
                      [{cit.doc_id}] {cit.title}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#131d33] text-[#38bdf8] tabular-data">
                      Score: {cit.relevance_score.toFixed(2)} · {cit.provenance}
                    </span>
                  </div>
                  <p className="text-xs text-[#cbd5e1] leading-relaxed">{cit.excerpt}</p>
                  <div className="flex items-center justify-between text-[11px] text-[#a8b8d0] pt-1">
                    <span>
                      {cit.agency} ({cit.year}) · Hazard: {cit.hazard_category}
                    </span>
                    <a
                      href={cit.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#38bdf8] hover:underline flex items-center gap-1"
                    >
                      Official Source <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full Local Knowledge Base Corpus Browser */}
      <div className="panel-surface rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#38bdf8]" />
            Locally Indexed Onboard Scientific Corpus ({knowledge_corpus.length} Documents)
          </h2>
          <span className="text-xs text-[#a8b8d0]">Provenance: REAL_RESEARCH_REF</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {knowledge_corpus.map((doc) => (
            <div key={doc.doc_id} className="p-3.5 rounded bg-[#131d33] border border-[#263859] flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#38bdf8]">
                  <span>{doc.doc_id}</span>
                  <span>{doc.year}</span>
                </div>
                <div className="text-xs font-semibold text-[#f8fafc]">{doc.title}</div>
                <div className="text-[11px] text-[#a8b8d0]">{doc.agency} · {doc.hazard_category}</div>
                <p className="text-xs text-[#cbd5e1] line-clamp-3 mt-1">{doc.content}</p>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#38bdf8] hover:underline flex items-center gap-1 pt-1"
              >
                Verify Reference URL <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

