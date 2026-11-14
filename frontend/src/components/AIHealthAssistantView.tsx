import React, { useEffect, useState } from 'react';
import { BookOpen, Cpu, ExternalLink, RefreshCw, Send, Sparkles } from 'lucide-react';
import { FullSystemState, RAGAnalysisResponse } from '../types';
import { apiRequest, updateLocalAIConfig, warmupLocalAI } from './uiHelpers';

interface AIHealthAssistantViewProps {
  state: FullSystemState;
  initialPrompt?: string;
  onStateUpdated?: (next: FullSystemState) => void;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  response?: RAGAnalysisResponse;
}

const SUGGESTED_PROMPTS = [
  'Why did my resting heart rate increase on Mars (0.38g) and what helps?',
  'Explain absorbed dose (Gy) vs equivalent dose (Sv) from NASA RadLab.',
  'Why might I experience mild dry cough and headache with CO₂ at 3.4 mmHg?',
  'Explain how CSA TBone & Vascular research inform bone and artery care.',
];

export const AIHealthAssistantView: React.FC<AIHealthAssistantViewProps> = ({
  state,
  initialPrompt,
  onStateUpdated,
}) => {
  const [question, setQuestion] = useState('');
  const [hazardFilter, setHazardFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      text: state.assessment.rag_analysis.answer,
      response: state.assessment.rag_analysis,
    },
  ]);

  const askQuestion = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const recentHistory = turns
      .slice(-4)
      .map((t) => ({ role: t.role, content: t.text }));
    setTurns((prev) => [...prev, { role: 'user', text: trimmed }]);
    setQuestion('');
    setLoading(true);
    try {
      const res = await apiRequest<RAGAnalysisResponse>('/api/rag/query', {
        method: 'POST',
        body: JSON.stringify({
          question: trimmed,
          hazard_filter: hazardFilter || null,
          include_astronaut_context: true,
          history: recentHistory,
        }),
      });
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer,
          response: res,
        },
      ]);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Local AI query failed.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPrompt) {
      askQuestion(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const aiStatus = state.local_ai_status;
  const chatModels = aiStatus?.installed_chat_models || (aiStatus?.ollama_model ? [aiStatus.ollama_model] : []);
  const llmEnabled = aiStatus?.llm_enabled ?? true;
  const llmActive = Boolean(aiStatus?.ollama_available && llmEnabled);

  const handleModelChange = async (modelName: string) => {
    setAiBusy(true);
    setAiNotice(null);
    try {
      await updateLocalAIConfig({ selected_model: modelName }, onStateUpdated);
      setAiNotice(`Active local Ollama model switched to ${modelName}.`);
    } catch (err) {
      setAiNotice(err instanceof Error ? err.message : 'Unable to switch Ollama model.');
    } finally {
      setAiBusy(false);
    }
  };

  const handleToggleLLM = async () => {
    setAiBusy(true);
    setAiNotice(null);
    try {
      const nextEnabled = !llmEnabled;
      await updateLocalAIConfig({ llm_enabled: nextEnabled }, onStateUpdated);
      setAiNotice(
        nextEnabled
          ? 'Local Ollama synthesis enabled alongside retrieved NASA/CSA evidence.'
          : 'Deterministic offline RAG mode enabled (local LLM synthesis paused).',
      );
    } catch (err) {
      setAiNotice(err instanceof Error ? err.message : 'Unable to update AI synthesis mode.');
    } finally {
      setAiBusy(false);
    }
  };

  const handleWarmup = async () => {
    setAiBusy(true);
    setAiNotice(null);
    try {
      const res = await warmupLocalAI(aiStatus?.ollama_model, onStateUpdated);
      setAiNotice(res.message);
    } catch (err) {
      setAiNotice(err instanceof Error ? err.message : 'Warmup request failed.');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6 items-start">
      {/* Left: Conversational TARSCARE Companion */}
      <div className="mc-card p-5 lg:p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#A5D8FF]" />
            <div>
              <h1 className="text-xl font-bold text-[#FAF9FA]">TARSCARE Health Assistant</h1>
              <p className="text-xs text-[#E5E5E4]/75">
                Offline-first companion backed by NASA HRP, OSDR, RadLab, NLSP, EDA &amp; CSA research
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {aiStatus?.ollama_available && chatModels.length > 0 && (
              <select
                value={aiStatus.ollama_model || chatModels[0]}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={aiBusy}
                aria-label="Select local Ollama model"
                className="rounded-full bg-[#0B0D1A] border border-white/15 px-3 py-1.5 text-xs text-[#FAF9FA] focus:border-[#A5D8FF] focus:outline-none"
              >
                {chatModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}

            {aiStatus?.ollama_available && (
              <>
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={handleToggleLLM}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    llmActive
                      ? 'bg-[#A5D8FF]/15 border-[#A5D8FF]/45 text-[#A5D8FF]'
                      : 'bg-[#0B0D1A] border-white/15 text-[#E5E5E4]/85 hover:border-[#A5D8FF]/40'
                  }`}
                >
                  {llmActive ? 'Local LLM: On' : 'Local LLM: Off'}
                </button>
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={handleWarmup}
                  className="px-3 py-1.5 rounded-full bg-[#0B0D1A] border border-white/15 text-xs text-[#E5E5E4] hover:border-[#A5D8FF]/45 inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${aiBusy ? 'animate-spin' : ''}`} />
                  <span>Warm Up</span>
                </button>
              </>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B0D1A] border border-[#A5D8FF]/30 text-xs text-[#A5D8FF]">
              <Cpu className="w-3.5 h-3.5" />
              <span>
                {llmActive
                  ? `Local Ollama (${aiStatus?.ollama_model})`
                  : aiStatus?.sentence_transformers_cached
                    ? 'Offline Semantic RAG'
                    : 'Deterministic Offline RAG'}
              </span>
            </div>
          </div>
        </div>

        {aiNotice && (
          <div className="rounded-xl bg-[#0B0D1A] px-3.5 py-2.5 text-xs text-[#A5D8FF] border border-[#A5D8FF]/30">
            {aiNotice}
          </div>
        )}

        {/* Quick Starter Prompts */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={loading}
              onClick={() => askQuestion(p)}
              className="px-3.5 py-1.5 rounded-full bg-[#0B0D1A] border border-white/10 text-xs text-[#E5E5E4] hover:border-[#A5D8FF]/50 hover:text-[#FAF9FA] text-left transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Conversation Feed */}
        <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
          {turns.map((turn, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-4 ${turn.role === 'user'
                  ? 'bg-[#181C2E] ml-8 border border-[#A5D8FF]/30'
                  : 'bg-[#0B0D1A] mr-4 border border-white/[0.08]'
                }`}
            >
              <div className="text-xs font-semibold text-[#A5D8FF] mb-1.5">
                {turn.role === 'user' ? 'You (Crew Member)' : 'TARSCARE Companion'}
              </div>
              <div className="text-sm text-[#FAF9FA] whitespace-pre-line leading-relaxed">
                {turn.text}
              </div>

              {turn.response && (
                <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[#E5E5E4]/75">
                      {turn.response.sufficient_evidence
                        ? 'Grounded in indexed NASA & CSA sources'
                        : 'Limited / Out-of-scope evidence'}
                    </span>
                    <span className="text-[#A5D8FF]/85">
                      {turn.response.engine_mode}
                      {turn.response.model_used ? ` · ${turn.response.model_used}` : ''}
                      {turn.response.latency_ms ? ` · ${turn.response.latency_ms} ms` : ''}
                    </span>
                  </div>

                  {turn.response.citations.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {turn.response.citations.slice(0, 4).map((c) => (
                        <a
                          key={c.chunk_id}
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-[#121522] p-2.5 border border-white/[0.07] hover:border-[#A5D8FF]/45 transition-colors block"
                        >
                          <div className="flex items-center justify-between gap-1 text-xs font-semibold text-[#FAF9FA]">
                            <span className="truncate">{c.doc_id} · {c.agency}</span>
                            <ExternalLink className="w-3 h-3 text-[#A5D8FF] shrink-0" />
                          </div>
                          <div className="text-xs text-[#E5E5E4]/85 line-clamp-2 mt-1">
                            {c.excerpt}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-[#E5E5E4]/65 leading-snug">
                    {turn.response.safety_notice}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            askQuestion(question);
          }}
          className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/[0.08]"
        >
          <select
            value={hazardFilter}
            onChange={(e) => setHazardFilter(e.target.value)}
            aria-label="Filter knowledge base by spaceflight hazard"
            className="rounded-full bg-[#0B0D1A] border border-white/15 px-3.5 py-2.5 text-xs text-[#FAF9FA]"
          >
            <option value="">All 5 Hazards</option>
            <option value="Space Radiation">Space Radiation</option>
            <option value="Isolation and Confinement">Isolation</option>
            <option value="Distance from Earth">Distance from Earth</option>
            <option value="Gravity Fields">Gravity Fields</option>
            <option value="Hostile and Closed Environments">Hostile Environments</option>
          </select>

          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about symptoms, baseline changes, radiation units, or protocols..."
            className="flex-1 min-w-[220px] rounded-full bg-[#0B0D1A] border border-white/15 px-4 py-2.5 text-sm text-[#FAF9FA] placeholder:text-[#E5E5E4]/45 focus:border-[#A5D8FF] focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="mc-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Thinking...' : 'Ask'}</span>
          </button>
        </form>
      </div>

      {/* Right: Offline Scientific Corpus Index */}
      <div className="mc-card p-5 lg:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#A5D8FF]" />
            <h2 className="text-lg font-semibold text-[#FAF9FA]">Indexed Scientific Sources</h2>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0B0D1A] text-[#A5D8FF] border border-[#A5D8FF]/30">
            {state.knowledge_corpus.length} Docs · Real Research Data
          </span>
        </div>

        <p className="text-xs text-[#E5E5E4]/80 leading-relaxed">
          All guidance retrieves from these pre-bundled NASA &amp; CSA references offline without cloud connectivity. Does not prescribe medications or override emergency procedures.
        </p>

        <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {state.knowledge_corpus.map((doc) => (
            <div key={doc.doc_id} className="rounded-xl bg-[#0B0D1A] p-3.5 border border-white/[0.06]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#A5D8FF]">
                  {doc.agency} · {doc.doc_id}
                </span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#E5E5E4]/75 hover:text-[#FAF9FA] inline-flex items-center gap-1"
                >
                  <span>Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-sm font-medium text-[#FAF9FA] mt-1">{doc.title}</div>
              <div className="text-xs text-[#E5E5E4]/75 mt-0.5">{doc.hazard_category}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

