import React from 'react';
import {
  Activity,
  BookOpen,
  Compass,
  FileText,
  Globe,
  HeartPulse,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldAlert,
  Smile,
  Stethoscope,
  Sun,
  Utensils,
  X,
} from 'lucide-react';
import { FullSystemState } from '../../types';
import { StatusIndicator } from './StatusIndicator';

export type NavSectionId =
  | 'overview'
  | 'monitoring'
  | 'assessment'
  | 'activity'
  | 'food'
  | 'wellbeing'
  | 'companion'
  | 'environment'
  | 'journal'
  | 'history'
  | 'settings';

export interface NavItemConfig {
  id: NavSectionId;
  label: string;
  group: 'core' | 'support' | 'records';
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'overview', label: 'Mission Overview', group: 'core', icon: Compass },
  { id: 'monitoring', label: 'Health Monitoring', group: 'core', icon: HeartPulse },
  { id: 'assessment', label: 'AI Health Assessment', group: 'core', icon: Stethoscope },
  { id: 'activity', label: 'Physical Activity', group: 'core', icon: Activity },
  { id: 'food', label: 'Nutrition & Food Supplies', group: 'core', icon: Utensils },

  { id: 'wellbeing', label: 'Psychological Wellbeing', group: 'support', icon: Smile },
  { id: 'companion', label: 'AI Companion', group: 'support', icon: MessageSquare },
  { id: 'environment', label: 'Mission Environment', group: 'support', icon: Globe },
  { id: 'journal', label: 'Personal Journal', group: 'support', icon: BookOpen },

  { id: 'history', label: 'Reports & History', group: 'records', icon: FileText },
  { id: 'settings', label: 'Settings', group: 'records', icon: Settings },
];

interface NavigationSidebarProps {
  activeTab: NavSectionId;
  onSelectTab: (tab: NavSectionId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/**
 * Lightweight 11-section mission sidebar collapsing smoothly on desktop and rendering
 * as a clean slide-over drawer on tablet/mobile screens.
 */
export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const groups: { id: 'core' | 'support' | 'records'; label: string }[] = [
    { id: 'core', label: 'Health & Supplies' },
    { id: 'support', label: 'Wellbeing & Habitat' },
    { id: 'records', label: 'Records & System' },
  ];

  const handleSelect = (id: NavSectionId) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const renderLinks = (isCollapsed: boolean) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary Navigation">
      {groups.map((grp, idx) => (
        <div key={grp.id} className={idx > 0 ? 'pt-3 border-t border-[var(--tc-border)]' : ''}>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-xs font-medium text-[var(--tc-text-muted)]">
              {grp.label}
            </div>
          )}
          <div className="space-y-1">
            {NAV_ITEMS.filter((item) => item.group === grp.id).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg text-sm transition-colors ${
                    isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5 text-left'
                  } ${
                    isActive
                      ? 'bg-[var(--tc-elevated)] text-[var(--tc-text)] font-medium'
                      : 'text-[var(--tc-text-secondary)] hover:bg-[var(--tc-elevated)]/60 hover:text-[var(--tc-text)]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[var(--tc-accent)]' : 'text-[var(--tc-text-muted)]'
                    }`}
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-[var(--tc-border)] bg-[var(--tc-surface)] transition-all duration-200 ${
          collapsed ? 'w-[68px]' : 'w-[248px]'
        }`}
      >
        <div
          className={`h-16 border-b border-[var(--tc-border)] flex items-center ${
            collapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--tc-accent)]" aria-hidden="true" />
              <span className="text-base font-semibold tracking-wide text-[var(--tc-text)]">
                TARSCARE
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
            className="p-2 rounded-lg text-[var(--tc-text-muted)] hover:text-[var(--tc-text)] hover:bg-[var(--tc-elevated)] transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {renderLinks(collapsed)}
      </aside>

      {/* Mobile & Tablet Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[272px] max-w-[85vw] bg-[var(--tc-surface)] border-r border-[var(--tc-border)] flex flex-col h-full">
            <div className="h-16 px-5 border-b border-[var(--tc-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--tc-accent)]" aria-hidden="true" />
                <span className="text-base font-semibold tracking-wide text-[var(--tc-text)]">
                  TARSCARE
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-[var(--tc-text-muted)] hover:text-[var(--tc-text)]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {renderLinks(false)}
          </aside>
        </div>
      )}
    </>
  );
};

interface TopMissionHeaderProps {
  state: FullSystemState;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSelectCrew: (crewId: string) => void;
  onOpenMobileNav: () => void;
  onOpenEmergency: () => void;
  onOpenComm: () => void;
}

/**
 * Calm mission header strip surfacing essential spacecraft identity, astronaut switcher,
 * MET/Sol elapsed time, communication link state, lighting mode toggle, and emergency action.
 */
export const TopMissionHeader: React.FC<TopMissionHeaderProps> = ({
  state,
  theme,
  onToggleTheme,
  onSelectCrew,
  onOpenMobileNav,
  onOpenEmergency,
  onOpenComm,
}) => {
  const { astronaut, latest_telemetry: latest, comm_state, assessment } = state;
  const commMode = assessment.comm_mode?.mode || comm_state.earth_comm_status || 'DELAYED';
  const fleet = state.crew_fleet_matrix || [];

  return (
    <header className="min-h-16 border-b border-[var(--tc-border)] bg-[var(--tc-surface)]/95 px-4 sm:px-6 lg:px-10 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg border border-[var(--tc-border-strong)] text-[var(--tc-text-secondary)] hover:text-[var(--tc-text)]"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-baseline gap-2.5">
          <span className="text-xs font-medium text-[var(--tc-text-muted)]">Mission</span>
          <span className="text-sm font-semibold text-[var(--tc-text)]">
            {astronaut.mission_name}
          </span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-[var(--tc-border)]" aria-hidden="true" />

        {fleet.length > 0 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="header-crew-select" className="text-xs text-[var(--tc-text-muted)]">
              Crew
            </label>
            <select
              id="header-crew-select"
              value={state.active_crew_id || astronaut.astronaut_id}
              onChange={(e) => onSelectCrew(e.target.value)}
              className="tc-input px-2.5 py-1 text-xs font-medium"
            >
              {fleet.map((m) => (
                <option key={m.crew_id} value={m.crew_id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-sm font-medium text-[var(--tc-text)]">{astronaut.name}</span>
        )}

        <div className="hidden md:block h-4 w-px bg-[var(--tc-border)]" aria-hidden="true" />

        <div className="hidden sm:flex items-baseline gap-2 tabular-data text-xs">
          <span className="text-[var(--tc-text-muted)]">Elapsed</span>
          <span className="font-medium text-[var(--tc-text)]">
            Sol {latest.mission_day} · MET {(latest.mission_day * 24).toLocaleString()}h
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={onOpenComm}
          className="inline-flex items-center gap-1.5 hover:opacity-85 transition-opacity"
          title="Open Mission Environment & Communication Delay settings"
        >
          <StatusIndicator status={commMode} />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light operational mode' : 'Switch to dark operational mode'}
          className="tc-btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenEmergency}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--tc-crit-border)] bg-[var(--tc-crit-bg)] text-[var(--tc-crit-fg)] hover:opacity-90 inline-flex items-center gap-1.5 transition-opacity"
        >
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Emergency</span>
        </button>
      </div>
    </header>
  );
};
