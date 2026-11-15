import React, { useState } from 'react';
import {
  BookMarked,
  Lock,
  MessageSquare,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { FullSystemState, KnowledgeDocItem, RAGAnalysisResponse } from '../types';
import { OfflineDocModal } from './OfflineDocModal';
import { StatusIndicator } from './ui/StatusIndicator';
import { apiRequest, formatRecordedTime } from './uiHelpers';

interface AICompanionViewProps {
  state: FullSystemState;
  apiBase: string;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onStateUpdated: (next: FullSystemState) => void;
}

/**
 * Calm, spacious conversational workspace pairing supportive isolation dialogue
 * ("TARSCARE Companion — Always Here, Even Far from Earth") with a toggleable offline
 * Clinical Spaceflight Knowledge Q&A mode backed by NASA/CSA reference documents.
 */
export const AICompanionView: React.FC<AICompanionViewProps> = ({
  state,
  apiBase,
  initialPrompt,
  onClearInitialPrompt,
  onStateUpdated,
}) => {
  const compState = state.companion_state;
  const conversations = compState?.conversations || [];

  const [mode, setMode] = useState<'companion' | 'clinical_rag'>(
    initialPrompt ? 'clinical_rag' : 'companion',
  );
  const [selectedConvUid, setSelectedConvUid] = useState<string | null>(
    conversations[0]?.conversation_uid || null,
  );
  const [input, setInput] = useState(initialPrompt || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalationNotice, setEscalationNotice] = useState<string | null>(null);

  const [ragResponse, setRagResponse] = useState<RAGAnalysisResponse | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{
    doc: KnowledgeDocItem;
    excerpt?: string;
  } | null>(null);

  const activeConversation =
    selectedConvUid === '__NEW__'
      ? null
      : conversations.find((c) => c.conversation_uid === selectedConvUid) || conversations[0] || null;

  const handleSendCompanion = async (textOverride?: string) => {
    const messageText = (textOverride ?? input).trim();
    if (!messageText) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/companion/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversation_uid:
            selectedConvUid === '__NEW__' ? null : activeConversation?.conversation_uid || null,
          mode: 'COMPANION_CHAT',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Companion request failed.');
      if (data.state) onStateUpdated(data.state);
      if (data.conversation_uid) setSelectedConvUid(data.conversation_uid);
      if (data.escalation_info?.triggered) {
        setEscalationNotice(
          'Support safeguard noticed distress cues. Confidential human Crew Medical Officer outreach is available anytime below.',
        );
      }
      if (!textOverride) setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  const handleAskClinicalRag = async (queryOverride?: string) => {
    const q = (queryOverride ?? input).trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    if (onClearInitialPrompt) onClearInitialPrompt();
    try {
      const res = await apiRequest<RAGAnalysisResponse>('/api/rag/query', {
        method: 'POST',
        body: JSON.stringify({ query: q }),
      });
      setRagResponse(res);
      if (!queryOverride) setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clinical Q&A lookup failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEscalateSupport = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ contact_role: string; state: FullSystemState }>(
        '/api/companion/escalate-support',
        {
          method: 'POST',
          body: JSON.stringify({
            summary_note: 'Crew member activated support check-in from AI Companion.',
            queue_urgent_report: true,
          }),
        },
      );
      if (res.state) onStateUpdated(res.state);
      setEscalationNotice(`Support request queued for ${res.contact_role}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Support escalation failed.');
    } finally {
      setBusy(false);
    }
  };

  const engineLabel = state.local_ai_status?.ollama_available
    ? `Local AI (${state.local_ai_status.ollama_model})`
    : 'Offline Deterministic Engine';

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-[var(--tc-border)]">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusIndicator status="NORMAL" label={engineLabel} />
            <span className="text-xs text-[var(--tc-text-muted)] inline-flex items-center gap-1">
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span>Stored locally on habitat server</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
            AI Companion
          </h1>
          <p className="text-sm text-[var(--tc-text-secondary)]">
            TARSCARE Companion — Always Here, Even Far from Earth. Supportive non-clinical conversation plus grounded spaceflight reference Q&amp;A.
          </p>
        </div>

        <div
          className="inline-flex rounded-lg border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] p-1 self-start"
          role="tablist"
          aria-label="Assistant conversation mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'companion'}
            onClick={() => setMode('companion')}
            className={`px-3.5 py-1.5 text-xs rounded-md inline-flex items-center gap-1.5 transition-colors ${
              mode === 'companion'
                ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Personal Companion</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'clinical_rag'}
            onClick={() => setMode('clinical_rag')}
            className={`px-3.5 py-1.5 text-xs rounded-md inline-flex items-center gap-1.5 transition-colors ${
              mode === 'clinical_rag'
                ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clinical Knowledge Q&amp;A</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-[var(--tc-crit-border)] bg-[var(--tc-crit-bg)] px-4 py-3 text-sm text-[var(--tc-crit-fg)]">
          {error}
        </div>
      )}

      {escalationNotice && (
        <div className="rounded-xl border border-[var(--tc-warn-border)] bg-[var(--tc-warn-bg)] px-4 py-3 text-sm text-[var(--tc-warn-fg)] flex flex-wrap items-center justify-between gap-3">
          <span>{escalationNotice}</span>
          <button
            type="button"
            disabled={busy}
            onClick={handleEscalateSupport}
            className="tc-btn-secondary px-3 py-1.5 text-xs"
          >
            Notify Crew Medical Officer
          </button>
        </div>
      )}

      {mode === 'companion' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calm Conversation History Selector */}
          <aside className="lg:col-span-4 tc-panel p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--tc-text)]">Conversations</h2>
              <button
                type="button"
                onClick={() => setSelectedConvUid('__NEW__')}
                className="tc-btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>New Thread</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-[var(--tc-text-muted)] py-4">
                  Start a quiet conversation anytime — your thoughts stay onboard.
                </p>
              ) : (
                conversations.map((conv) => {
                  const active = activeConversation?.conversation_uid === conv.conversation_uid;
                  return (
                    <button
                      key={conv.conversation_uid}
                      type="button"
                      onClick={() => setSelectedConvUid(conv.conversation_uid)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                        active
                          ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                          : 'text-[var(--tc-text-secondary)] hover:bg-[var(--tc-elevated)]/50'
                      }`}
                    >
                      <div className="truncate">{conv.title}</div>
                      <div className="text-[var(--tc-text-muted)] mt-0.5 tabular-data">
                        {conv.messages.length} messages · {formatRecordedTime(conv.updated_at)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-[var(--tc-border)] flex items-center justify-between text-xs text-[var(--tc-text-muted)]">
              <span>AI context permissions adjustable in Settings</span>
              <button
                type="button"
                onClick={handleEscalateSupport}
                className="inline-flex items-center gap-1 text-[var(--tc-warn-fg)] hover:underline"
              >
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Support</span>
              </button>
            </div>
          </aside>

          {/* Main Chat Thread */}
          <div className="lg:col-span-8 tc-panel p-6 flex flex-col justify-between min-h-[460px] gap-5">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[420px]">
              {activeConversation && activeConversation.messages.length > 0 ? (
                activeConversation.messages.map((msg) => (
                  <div
                    key={msg.message_uid}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[var(--tc-accent-soft)] border border-[var(--tc-info-border)] text-[var(--tc-text)]'
                          : 'bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)]'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-xs text-[var(--tc-text-muted)] mt-1 tabular-data">
                      {msg.role === 'user' ? state.astronaut.name : 'TARSCARE Companion'} ·{' '}
                      {formatRecordedTime(msg.created_at)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center space-y-4">
                  <Sparkles className="w-6 h-6 text-[var(--tc-accent)] mx-auto" aria-hidden="true" />
                  <div className="space-y-1">
                    <h2 className="text-base font-medium text-[var(--tc-text)]">
                      Quiet Support Channel Ready
                    </h2>
                    <p className="text-xs text-[var(--tc-text-muted)] max-w-md mx-auto">
                      Non-clinical conversation designed to support crew morale during isolation and delayed Earth communications.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {[
                      'Help me wind down after an intense EVA prep day',
                      'I am feeling isolated with communication delays today',
                      'Give me a calm breathing & focus routine before sleep',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSendCompanion(prompt)}
                        className="tc-btn-secondary px-3 py-1.5 text-xs"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCompanion();
              }}
              className="pt-4 border-t border-[var(--tc-border)] flex gap-2.5"
            >
              <input
                aria-label="Message AI Companion"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write a message to TARSCARE Companion..."
                className="tc-input flex-1 px-4 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="tc-btn-primary px-4 py-2.5 text-sm inline-flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="tc-panel p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--tc-text)]">
              Offline Spaceflight Evidence Search
            </h2>
            <p className="text-xs text-[var(--tc-text-muted)]">
              Searches the onboard NASA HRP &amp; CSA clinical knowledge corpus without internet connectivity.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskClinicalRag();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              aria-label="Ask a spaceflight health or operational reference question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. How does microgravity affect SANS ocular pressure or CO2 thresholds?"
              className="tc-input flex-1 px-4 py-2.5 text-sm"
            />
            <button type="submit" disabled={busy || !input.trim()} className="tc-btn-primary px-5 py-2.5 text-sm shrink-0">
              {busy ? 'Searching...' : 'Search References'}
            </button>
          </form>

          {ragResponse && (
            <div className="space-y-5 pt-4 border-t border-[var(--tc-border)]">
              <div className="text-sm text-[var(--tc-text)] leading-relaxed whitespace-pre-line">
                {ragResponse.answer}
              </div>

              {ragResponse.citations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[var(--tc-text-muted)]">
                    Local Reference Citations ({ragResponse.citations.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ragResponse.citations.map((cit) => {
                      const docMatch = state.knowledge_corpus.find((d) => d.doc_id === cit.doc_id);
                      return (
                        <button
                          key={cit.chunk_id}
                          type="button"
                          onClick={() =>
                            docMatch && setSelectedDoc({ doc: docMatch, excerpt: cit.excerpt })
                          }
                          className="tc-btn-secondary px-3 py-1.5 text-xs"
                        >
                          {cit.agency} · {cit.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-xs text-[var(--tc-text-muted)]">{ragResponse.safety_notice}</p>
            </div>
          )}
        </div>
      )}

      {selectedDoc && (
        <OfflineDocModal
          doc={selectedDoc.doc}
          highlightedExcerpt={selectedDoc.excerpt}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
};
