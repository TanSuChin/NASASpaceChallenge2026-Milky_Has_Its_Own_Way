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

const REGION_HOTSPOTS: Record<string, { x: number; y: number; num: number }> = {
  head_and_brain: { x: 140, y: 26, num: 1 },
  eyes: { x: 140, y: 50, num: 2 },
  heart: { x: 152, y: 122, num: 3 },
  lungs: { x: 120, y: 122, num: 4 },
  muscles: { x: 194, y: 155, num: 5 },
  bones: { x: 122, y: 274, num: 6 },
  whole_body: { x: 64, y: 318, num: 7 },
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

      {/* Center Stage: Interactive Human Body with Subtle Blue Glow */}
      <div className="mc-card-glow relative p-4 flex flex-col items-center justify-between overflow-hidden min-h-[345px]">
        {/* Ambient radial illumination behind key product feature */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[310px] h-[310px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(165,216,255,0.22) 0%, rgba(165,216,255,0.06) 52%, transparent 74%)',
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

        {/* SVG Anatomical Silhouette & Organ Layers */}
        <div className="relative z-10 my-1 flex items-center justify-center w-full max-w-[245px]">
          <svg
            viewBox="0 0 280 390"
            className="w-full max-h-[268px] select-none"
            role="img"
            aria-label={`Interactive human anatomy diagram highlighting ${activeRegion.name}`}
          >
            {/* Whole-body outline ring when Whole Body active */}
            {activeRegion.id === 'whole_body' && (
              <ellipse
                cx="140"
                cy="195"
                rx="108"
                ry="178"
                fill="rgba(165,216,255,0.06)"
                stroke="#A5D8FF"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            )}

            {/* Outer calm human silhouette */}
            <g
              fill="rgba(165,216,255,0.07)"
              stroke="rgba(165,216,255,0.42)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            >
              {/* Head & Neck */}
              <ellipse cx="140" cy="46" rx="26" ry="31" />
              <path d="M126 74 L126 88 L154 88 L154 74" />
              {/* Shoulders, Torso, Arms, Legs */}
              <path d="M90 94 Q140 80 190 94 L218 175 L200 182 L182 128 L178 210 L170 356 L148 356 L144 234 L136 234 L132 356 L110 356 L102 210 L98 128 L80 182 L62 175 Z" />
            </g>

            {/* Spine & Bones Layer */}
            <g
              onClick={() => onSelectRegion('bones')}
              className="cursor-pointer transition-opacity"
            >
              <line
                x1="140"
                y1="90"
                x2="140"
                y2="215"
                stroke={colorForRegion('bones', regions.find((r) => r.id === 'bones')?.status || 'NORMAL')}
                strokeWidth={activeRegion.id === 'bones' ? '4' : '2.2'}
                strokeDasharray="5 3"
              />
              <path
                d="M124 236 L120 342 M156 236 L160 342"
                stroke={colorForRegion('bones', regions.find((r) => r.id === 'bones')?.status || 'NORMAL')}
                strokeWidth={activeRegion.id === 'bones' ? '4.5' : '2.5'}
                strokeLinecap="round"
              />
            </g>

            {/* Muscles Layer (Deltoid + Quad overlays) */}
            <g onClick={() => onSelectRegion('muscles')} className="cursor-pointer">
              <ellipse
                cx="86"
                cy="142"
                rx="8"
                ry="22"
                transform="rotate(14 86 142)"
                fill={activeRegion.id === 'muscles' ? 'rgba(165,216,255,0.42)' : 'rgba(165,216,255,0.14)'}
                stroke={colorForRegion('muscles', regions.find((r) => r.id === 'muscles')?.status || 'NORMAL')}
                strokeWidth="1.6"
              />
              <ellipse
                cx="194"
                cy="142"
                rx="8"
                ry="22"
                transform="rotate(-14 194 142)"
                fill={activeRegion.id === 'muscles' ? 'rgba(165,216,255,0.42)' : 'rgba(165,216,255,0.14)'}
                stroke={colorForRegion('muscles', regions.find((r) => r.id === 'muscles')?.status || 'NORMAL')}
                strokeWidth="1.6"
              />
              <ellipse
                cx="121"
                cy="272"
                rx="10"
                ry="30"
                fill={activeRegion.id === 'muscles' ? 'rgba(165,216,255,0.34)' : 'rgba(165,216,255,0.08)'}
                stroke={colorForRegion('muscles', regions.find((r) => r.id === 'muscles')?.status || 'NORMAL')}
                strokeWidth="1.4"
              />
              <ellipse
                cx="159"
                cy="272"
                rx="10"
                ry="30"
                fill={activeRegion.id === 'muscles' ? 'rgba(165,216,255,0.34)' : 'rgba(165,216,255,0.08)'}
                stroke={colorForRegion('muscles', regions.find((r) => r.id === 'muscles')?.status || 'NORMAL')}
                strokeWidth="1.4"
              />
            </g>

            {/* Lungs Layer */}
            <g onClick={() => onSelectRegion('lungs')} className="cursor-pointer">
              <path
                d="M116 108 Q134 108 136 138 Q136 154 116 152 Q105 148 106 126 Q108 112 116 108 Z"
                fill={activeRegion.id === 'lungs' ? 'rgba(165,216,255,0.42)' : 'rgba(165,216,255,0.14)'}
                stroke={colorForRegion('lungs', regions.find((r) => r.id === 'lungs')?.status || 'NORMAL')}
                strokeWidth="1.8"
              />
              <path
                d="M164 108 Q146 108 144 138 Q144 154 164 152 Q175 148 174 126 Q172 112 164 108 Z"
                fill={activeRegion.id === 'lungs' ? 'rgba(165,216,255,0.42)' : 'rgba(165,216,255,0.14)'}
                stroke={colorForRegion('lungs', regions.find((r) => r.id === 'lungs')?.status || 'NORMAL')}
                strokeWidth="1.8"
              />
            </g>

            {/* Heart Layer */}
            <g onClick={() => onSelectRegion('heart')} className="cursor-pointer">
              <circle
                cx="148"
                cy="128"
                r="13"
                fill={activeRegion.id === 'heart' ? 'rgba(165,216,255,0.52)' : 'rgba(165,216,255,0.2)'}
                stroke={colorForRegion('heart', regions.find((r) => r.id === 'heart')?.status || 'NORMAL')}
                strokeWidth="2.2"
              />
            </g>

            {/* Head & Brain Layer */}
            <g onClick={() => onSelectRegion('head_and_brain')} className="cursor-pointer">
              <ellipse
                cx="140"
                cy="34"
                rx="18"
                ry="14"
                fill={activeRegion.id === 'head_and_brain' ? 'rgba(165,216,255,0.48)' : 'rgba(165,216,255,0.16)'}
                stroke={colorForRegion('head_and_brain', regions.find((r) => r.id === 'head_and_brain')?.status || 'NORMAL')}
                strokeWidth="1.8"
              />
            </g>

            {/* Eyes / Neuro-Ocular Layer */}
            <g onClick={() => onSelectRegion('eyes')} className="cursor-pointer">
              <circle
                cx="131"
                cy="48"
                r="4.5"
                fill={activeRegion.id === 'eyes' ? '#FAF9FA' : 'rgba(165,216,255,0.5)'}
                stroke={colorForRegion('eyes', regions.find((r) => r.id === 'eyes')?.status || 'NORMAL')}
                strokeWidth="1.6"
              />
              <circle
                cx="149"
                cy="48"
                r="4.5"
                fill={activeRegion.id === 'eyes' ? '#FAF9FA' : 'rgba(165,216,255,0.5)'}
                stroke={colorForRegion('eyes', regions.find((r) => r.id === 'eyes')?.status || 'NORMAL')}
                strokeWidth="1.6"
              />
            </g>

            {/* Numbered landmark buttons directly paired with Left Rail */}
            {Object.entries(REGION_HOTSPOTS).map(([id, pos]) => {
              const isSel = id === activeRegion.id;
              return (
                <g
                  key={id}
                  onClick={() => onSelectRegion(id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSel ? 11 : 9}
                    fill={isSel ? '#EEF0F6' : '#0B0D1A'}
                    stroke={isSel ? '#A5D8FF' : 'rgba(165,216,255,0.6)'}
                    strokeWidth="1.5"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 3.5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill={isSel ? '#040404' : '#FAF9FA'}
                  >
                    {pos.num}
                  </text>
                </g>
              );
            })}
          </svg>
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