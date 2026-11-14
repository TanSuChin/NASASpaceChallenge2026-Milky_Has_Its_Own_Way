import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { MarsCareBodyRegion } from '../types';
import { formatRecordedTime, statusMeta } from './uiHelpers';

interface InteractiveHumanBodyProps {
  regions: MarsCareBodyRegion[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  onStartAssessment: (regionId: string) => void;
  onAskAssistant: (topic: string) => void;
}

interface HotspotCoord {
  xPct: number;
  yPct: number;
  num: number;
}

const REGION_HOTSPOTS: Record<string, HotspotCoord> = {
  head_and_brain: { xPct: 48.0, yPct: 3.8, num: 1 },
  eyes: { xPct: 54.5, yPct: 7.4, num: 2 },
  heart: { xPct: 52.0, yPct: 24.8, num: 3 },
  lungs: { xPct: 41.8, yPct: 24.2, num: 4 },
  muscles: { xPct: 72.0, yPct: 25.5, num: 5 },
  bones: { xPct: 41.0, yPct: 57.5, num: 6 },
  whole_body: { xPct: 16.0, yPct: 84.0, num: 7 },
};

export const InteractiveHumanBody: React.FC<InteractiveHumanBodyProps> = ({
  regions,
  selectedRegionId,
  onSelectRegion,
  onStartAssessment,
  onAskAssistant,
}) => {
  const activeRegion = useMemo(
    () => regions.find((r) => r.id === selectedRegionId) || regions[0],
    [regions, selectedRegionId],
  );

  if (!activeRegion) return null;
  const activeMeta = statusMeta(activeRegion.status);

  const colorForRegion = (id: string, status: string) => {
    const isSel = id === activeRegion.id;
    if (isSel) return '#A5D8FF';
    if (status === 'CRITICAL') return '#F87171';
    if (status === 'WARNING') return '#FBBF24';
    return 'rgba(165, 216, 255, 0.35)';
  };

  return (
    <section
      aria-label="Interactive Human Body"
      className="grid grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)_390px] gap-5 items-stretch"
    >
      {/* Left Rail: Numbered Anatomical Wayfinding Selector */}
      <div className="mc-card p-4 flex flex-col justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#FAF9FA]">Body System Selector</h2>
          <p className="text-xs text-[#E5E5E4]/80 mt-0.5">
            Choose an anatomical region to inspect readings and risks.
          </p>
        </div>

        <div className="space-y-1.5" role="listbox" aria-label="Anatomical regions">
          {regions.map((region, idx) => {
            const isSelected = region.id === activeRegion.id;
            const meta = statusMeta(region.status);
            return (
              <button
                key={region.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelectRegion(region.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150 ${isSelected
                    ? 'bg-[#A5D8FF]/15 border border-[#A5D8FF] text-[#FAF9FA]'
                    : 'bg-[#0B0D1A]/85 border border-white/[0.06] text-[#E5E5E4] hover:border-[#A5D8FF]/40 hover:text-[#FAF9FA]'
                  }`}
              >
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  <span
                    className={`w-5 h-5 rounded-full text-xs font-semibold flex items-center justify-center tabular-data ${isSelected ? 'bg-[#A5D8FF] text-[#040404]' : 'bg-[#181C2E] text-[#E5E5E4]'
                      }`}
                  >
                    {idx + 1}
                  </span>
                  <span>{region.name}</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.badgeClass}`}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[#E5E5E4]/70 leading-snug">
          Measurements compare current state against your pre-flight personal baseline.
        </p>
      </div>

      {/* Center Stage: Realistic 3D Medical Anatomy Render + Precision Interactive Overlay */}
      <div className="mc-card-glow relative p-4 flex flex-col items-center justify-between overflow-hidden min-h-[345px]">
        {/* Ambient radial illumination behind key product feature */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(165,216,255,0.24) 0%, rgba(165,216,255,0.07) 52%, transparent 74%)',
          }}
        />

        <div className="relative z-10 w-full flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#FAF9FA]">Interactive Human Body</h2>
            <p className="text-xs text-[#E5E5E4]/80">Select any organ or bone target directly</p>
          </div>
          <span className="px-3.5 py-1 rounded-full bg-[#0B0D1A]/90 border border-[#A5D8FF]/40 text-xs font-medium text-[#A5D8FF]">
            {activeRegion.name}
          </span>
        </div>

        {/* Full-Height 3D Translucent Medical Anatomy Stage (Exact 622:1156 Ratio) */}
        <div className="relative z-10 flex-1 w-full flex items-center justify-center pt-2 pb-1">
          <div
            className="relative h-[400px] sm:h-[435px] max-w-full select-none"
            style={{ aspectRatio: '622 / 1156' }}
          >
            <img
              src="/mars-human-anatomy.png"
              alt={`3D medical anatomical scan highlighting ${activeRegion.name}`}
              className="w-full h-full object-contain pointer-events-none select-none"
              style={{ filter: 'drop-shadow(0 14px 28px rgba(4, 6, 16, 0.72))' }}
              draggable={false}
            />

            {/* Precision Anatomical Region Highlight Contours (Shown cleanly for selected & hoverable targets) */}
            <svg
              viewBox="0 0 622 1156"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              {activeRegion.id === 'whole_body' && (
                <ellipse
                  cx="311"
                  cy="578"
                  rx="286"
                  ry="550"
                  fill="rgba(165,216,255,0.05)"
                  stroke="#A5D8FF"
                  strokeWidth="3"
                  strokeDasharray="14 10"
                />
              )}

              {activeRegion.id === 'head_and_brain' && (
                <ellipse
                  cx="311"
                  cy="50"
                  rx="48"
                  ry="32"
                  fill="rgba(165,216,255,0.16)"
                  stroke="#A5D8FF"
                  strokeWidth="3"
                />
              )}

              {activeRegion.id === 'eyes' && (
                <g fill="rgba(165,216,255,0.18)" stroke="#A5D8FF" strokeWidth="2.5">
                  <circle cx="287" cy="84" r="14" />
                  <circle cx="335" cy="84" r="14" />
                </g>
              )}

              {activeRegion.id === 'heart' && (
                <ellipse
                  cx="322"
                  cy="286"
                  rx="36"
                  ry="42"
                  fill="rgba(165,216,255,0.18)"
                  stroke="#A5D8FF"
                  strokeWidth="3"
                />
              )}

              {activeRegion.id === 'lungs' && (
                <g fill="rgba(165,216,255,0.14)" stroke="#A5D8FF" strokeWidth="2.8">
                  <ellipse cx="262" cy="276" rx="44" ry="68" transform="rotate(8 262 276)" />
                  <ellipse cx="362" cy="276" rx="44" ry="68" transform="rotate(-8 362 276)" />
                </g>
              )}

              {activeRegion.id === 'muscles' && (
                <g fill="rgba(165,216,255,0.14)" stroke="#A5D8FF" strokeWidth="2.5">
                  <ellipse cx="176" cy="292" rx="22" ry="64" transform="rotate(14 176 292)" />
                  <ellipse cx="446" cy="292" rx="22" ry="64" transform="rotate(-14 446 292)" />
                  <ellipse cx="255" cy="635" rx="24" ry="86" />
                  <ellipse cx="367" cy="635" rx="24" ry="86" />
                </g>
              )}

              {activeRegion.id === 'bones' && (
                <g stroke="#A5D8FF" strokeLinecap="round" fill="none">
                  <line x1="311" y1="168" x2="311" y2="482" strokeWidth="4" strokeDasharray="12 8" />
                  <path d="M248 566 L254 810 M374 566 L368 810" strokeWidth="4.5" />
                </g>
              )}
            </svg>

            {/* Clickable Anatomical Hit Zones + Numbered Landmark Buttons (1-7) */}
            {regions.map((region) => {
              const pos = REGION_HOTSPOTS[region.id];
              if (!pos) return null;
              const isSel = region.id === activeRegion.id;
              const ringColor = colorForRegion(region.id, region.status);

              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onSelectRegion(region.id)}
                  aria-label={`Select ${region.name} (${region.status})`}
                  title={`${pos.num}. ${region.name}`}
                  style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A5D8FF] cursor-pointer"
                >
                  {isSel && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full animate-ping bg-[#A5D8FF]/35"
                    />
                  )}
                  <span
                    style={{
                      borderColor: isSel ? '#A5D8FF' : ringColor,
                      boxShadow: isSel ? '0 0 14px rgba(165, 216, 255, 0.55)' : undefined,
                    }}
                    className={`relative w-5 h-5 rounded-full border text-[11px] font-bold tabular-data flex items-center justify-center transition-all duration-150 ${
                      isSel
                        ? 'bg-[#EEF0F6] text-[#040404] scale-110'
                        : 'bg-[#0B0D1A]/90 text-[#FAF9FA] group-hover:scale-110 group-hover:border-[#A5D8FF]'
                    }`}
                  >
                    {pos.num}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Selected Region Metrics, 7-Day Trend, Spaceflight Risk & Primary CTA */}
      <div className="mc-card p-4 flex flex-col justify-between gap-2.5">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#FAF9FA]">{activeRegion.name}</h3>
              <p className="text-xs text-[#E5E5E4]/80 mt-0.5">{activeRegion.summary}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${activeMeta.badgeClass}`}>
              {activeMeta.label}
            </span>
          </div>

          {/* Relevant Measurements vs Personal Baseline */}
          <div className="space-y-1.5">
            {activeRegion.measurements.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-[#0B0D1A]"
              >
                <div>
                  <div className="text-xs text-[#E5E5E4] font-medium">{m.label}</div>
                  <div className="text-xs text-[#E5E5E4]/65">
                    Baseline: {m.baseline} · {formatRecordedTime(m.recorded_at)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-bold text-[#FAF9FA] tabular-data">{m.value}</span>
                  <span className="text-xs text-[#E5E5E4]/80 ml-1">{m.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mini 7-Sol Trend Visualization */}
          <div className="rounded-xl bg-[#0B0D1A] p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[#E5E5E4]">7-Sol Trend</span>
              <span className="text-xs text-[#A5D8FF]">{activeRegion.trend_label}</span>
            </div>
            <div className="h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeRegion.recent_trend}>
                  <defs>
                    <linearGradient id="bodySpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A5D8FF" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#A5D8FF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="sol" hide />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121522',
                      border: '1px solid rgba(165,216,255,0.35)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#FAF9FA',
                    }}
                    labelFormatter={(sol) => `Sol ${sol}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#A5D8FF"
                    strokeWidth={2}
                    fill="url(#bodySpark)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Possible Spaceflight Risk Explanation */}
          <div className="rounded-xl bg-[#0B0D1A] p-3">
            <div className="text-xs font-semibold text-[#A5D8FF] mb-0.5">
              Spaceflight Context
            </div>
            <p className="text-xs text-[#E5E5E4] leading-relaxed">
              {activeRegion.spaceflight_risk}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
          <button
            type="button"
            onClick={() => onStartAssessment(activeRegion.id)}
            className="mc-btn-primary flex-1 px-5 py-2.5 text-sm inline-flex items-center justify-center gap-2"
          >
            <span>Start Health Assessment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              onAskAssistant(
                `Explain my ${activeRegion.name} telemetry and spaceflight risks for ${activeRegion.summary.toLowerCase()}.`,
              )
            }
            className="mc-btn-secondary px-4 py-2.5 text-sm inline-flex items-center justify-center gap-1.5"
            title="Ask MarsCare AI Assistant about this body region"
          >
            <MessageSquare className="w-4 h-4 text-[#A5D8FF]" />
            <span>Ask AI</span>
          </button>
        </div>
      </div>
    </section>
  );
};