import React, { useMemo, useState } from 'react';
import { BookOpen, Lock, Pencil, Search, Sparkles, Trash2 } from 'lucide-react';
import { FullSystemState, JournalEntryRecord } from '../types';
import { EmptyState } from './ui/StatePlaceholders';
import { StatusIndicator } from './ui/StatusIndicator';
import { formatRecordedTime } from './uiHelpers';
import { NavSectionId } from './ui/NavigationSidebar';

interface PersonalJournalViewProps {
  state: FullSystemState;
  apiBase: string;
  onStateUpdated: (next: FullSystemState) => void;
  onNavigate: (tab: NavSectionId) => void;
}

/**
 * Clean, calm, distraction-free Personal Journal kept 100% locally on spacecraft storage,
 * featuring optional reflection prompts, mood tags, and instant search filtering.
 */
export const PersonalJournalView: React.FC<PersonalJournalViewProps> = ({
  state,
  apiBase,
  onStateUpdated,
  onNavigate,
}) => {
  const compState = state.companion_state;
  const moodLevels = compState?.mood_levels || ['Great', 'Positive', 'Neutral', 'Stressed', 'Low'];
  const feelingTags = compState?.feeling_tags || ['Calm', 'Motivated', 'Tired', 'Isolated', 'Focused', 'Grateful'];
  const prompts = compState?.guided_reflection_prompts || [];
  const entries = compState?.journal_entries || [];

  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('Positive');
  const [feelings, setFeelings] = useState<string[]>(['Calm']);
  const [tagsText, setTagsText] = useState('Habitat Reflection');
  const [guidedPrompt, setGuidedPrompt] = useState('');

  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (moodFilter !== 'ALL' && entry.mood !== moodFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${entry.title} ${entry.content} ${entry.tags.join(' ')} ${entry.feelings.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, moodFilter, search]);

  const toggleFeeling = (tag: string) => {
    setFeelings((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  };

  const resetForm = () => {
    setEditingUid(null);
    setTitle('');
    setContent('');
    setMood('Positive');
    setFeelings(['Calm']);
    setTagsText('Habitat Reflection');
    setGuidedPrompt('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setNotice(null);
    const parsedTags = tagsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingUid) {
        const res = await fetch(`${apiBase}/api/journal/entries/${editingUid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim() || `Sol ${state.latest_telemetry.mission_day} Reflection`,
            content,
            mood,
            feelings,
            tags: parsedTags,
            guided_prompt: guidedPrompt,
            allow_ai_access: false,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Unable to update entry.');
        if (data.state) onStateUpdated(data.state);
        setNotice({ tone: 'ok', text: `Updated journal entry "${data.entry.title}".` });
      } else {
        const res = await fetch(`${apiBase}/api/journal/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim() || `Sol ${state.latest_telemetry.mission_day} Personal Reflection`,
            content,
            mood,
            feelings,
            tags: parsedTags,
            guided_prompt: guidedPrompt,
            is_private: true,
            allow_ai_access: false,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Unable to save journal entry.');
        if (data.state) onStateUpdated(data.state);
        setNotice({ tone: 'ok', text: `Saved "${data.entry.title}" privately onboard.` });
      }
      resetForm();
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to save journal entry.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (entry: JournalEntryRecord) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`${apiBase}/api/journal/entries/${entry.entry_uid}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Unable to delete entry.');
      if (data.state) onStateUpdated(data.state);
      setNotice({ tone: 'ok', text: `Removed entry "${entry.title}".` });
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to delete entry.',
      });
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (entry: JournalEntryRecord) => {
    setEditingUid(entry.entry_uid);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood);
    setFeelings(entry.feelings);
    setTagsText(entry.tags.join(', '));
    setGuidedPrompt(entry.guided_prompt || '');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-[var(--tc-border)]">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusIndicator status="NORMAL" label="Local Private Storage" />
            <span className="text-xs text-[var(--tc-text-muted)] inline-flex items-center gap-1">
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span>
                AI Companion access:{' '}
                {compState?.privacy_settings?.allow_ai_journal_context ? 'Opted In' : 'Excluded'}
              </span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
            Personal Journal
          </h1>
          <p className="text-sm text-[var(--tc-text-secondary)]">
            A calm private space for reflections during mission confinement. Entries stay exclusively on onboard storage unless you share them.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="tc-btn-secondary px-4 py-2 text-xs self-start lg:self-end"
        >
          Manage Privacy Settings
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Writing Editor */}
        <form onSubmit={handleSave} className="lg:col-span-6 tc-panel p-6 space-y-5 self-start">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--tc-text)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
              <span>{editingUid ? 'Edit Entry' : 'New Reflection'}</span>
            </h2>
            {editingUid && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-[var(--tc-text-muted)] hover:underline"
              >
                Cancel edit
              </button>
            )}
          </div>

          {prompts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-[var(--tc-text-muted)] inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--tc-accent)]" aria-hidden="true" />
                <span>Optional reflection prompt</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {prompts.slice(0, 3).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setGuidedPrompt(p)}
                    className={`px-2.5 py-1 rounded-md text-xs text-left border transition-colors ${
                      guidedPrompt === p
                        ? 'border-[var(--tc-accent)] bg-[var(--tc-accent-soft)] text-[var(--tc-text)]'
                        : 'border-[var(--tc-border)] bg-[var(--tc-bg)] text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="journal-title" className="block text-xs text-[var(--tc-text-muted)]">
              Title (optional)
            </label>
            <input
              id="journal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Sol ${state.latest_telemetry.mission_day} Notes`}
              className="tc-input w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="journal-content" className="block text-xs text-[var(--tc-text-muted)]">
              Your private thoughts
            </label>
            <textarea
              id="journal-content"
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={guidedPrompt || 'Write freely at your own pace...'}
              className="tc-input w-full px-3.5 py-2.5 text-sm leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="journal-mood" className="block text-xs text-[var(--tc-text-muted)]">
                Mood
              </label>
              <select
                id="journal-mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="tc-input w-full px-3 py-2 text-xs"
              >
                {moodLevels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="journal-tags" className="block text-xs text-[var(--tc-text-muted)]">
                Tags (comma separated)
              </label>
              <input
                id="journal-tags"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                className="tc-input w-full px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {feelingTags.map((tag) => {
              const active = feelings.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleFeeling(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    active
                      ? 'border-[var(--tc-accent)] bg-[var(--tc-accent-soft)] text-[var(--tc-text)] font-medium'
                      : 'border-[var(--tc-border)] bg-[var(--tc-bg)] text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={busy || !content.trim()} className="tc-btn-primary px-5 py-2.5 text-xs">
              {busy ? 'Saving...' : editingUid ? 'Update Entry' : 'Save Private Entry'}
            </button>
          </div>
        </form>

        {/* Entries Archive */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[var(--tc-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                aria-label="Search journal entries"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reflections or tags..."
                className="tc-input w-full pl-9 pr-3 py-2 text-xs"
              />
            </div>
            <select
              aria-label="Filter journal entries by mood"
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value)}
              className="tc-input px-3 py-2 text-xs"
            >
              <option value="ALL">All Moods</option>
              {moodLevels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {filteredEntries.length === 0 ? (
            <EmptyState
              title="No journal entries found"
              description="Write a reflection on the left or clear search filters to review past mission entries."
            />
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <article key={entry.entry_uid} className="tc-panel p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--tc-text)]">{entry.title}</h3>
                      <div className="text-xs text-[var(--tc-text-muted)] tabular-data mt-0.5">
                        Sol {entry.mission_day} · {entry.mood} · {formatRecordedTime(entry.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => beginEdit(entry)}
                        aria-label={`Edit ${entry.title}`}
                        className="p-1.5 rounded-md text-[var(--tc-text-muted)] hover:text-[var(--tc-text)] hover:bg-[var(--tc-elevated)]"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry)}
                        aria-label={`Delete ${entry.title}`}
                        className="p-1.5 rounded-md text-[var(--tc-text-muted)] hover:text-[var(--tc-crit-fg)] hover:bg-[var(--tc-elevated)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--tc-text-secondary)] leading-relaxed whitespace-pre-line">
                    {entry.content}
                  </p>
                  {entry.feelings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {entry.feelings.map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 rounded-full text-xs bg-[var(--tc-elevated)] text-[var(--tc-text-muted)]"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
