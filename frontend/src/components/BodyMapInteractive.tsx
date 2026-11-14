import React from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  Compass,
  Dumbbell,
  Eye,
  Heart,
  ShieldAlert,
  Wind,
  Bone,
} from 'lucide-react';
import { BodyRegionAssessment, MissionPhase, RiskLevel } from '../types';

interface BodyMapInteractiveProps {
  regions: BodyRegionAssessment[];
  selectedRegionId: string;
  onSelectRegion: (regionId: string) => void;
  missionPhase: MissionPhase;
  gravityG: number;
  onNavigateToHazard: (hazardName: string) => void;
}

const REGION_COORDS: Record<
  string,
  { cx: number; cy: number; labelX: number; labelY: number; align: 'left' | 'right' }
> = {
  brain_head: { cx: 200, cy: 58, labelX: 52, labelY: 48, align: 'left' },
  eyes: { cx: 214, cy: 76, labelX: 348, labelY: 66, align: 'right' },
  vestibular_nervous: { cx: 184, cy: 86, labelX: 52, labelY: 98, align: 'left' },
  lungs: { cx: 182, cy: 162, labelX: 52, labelY: 162, align: 'left' },
  heart: { cx: 208, cy: 176, labelX: 348, labelY: 174, align: 'right' },
  muscles: { cx: 152, cy: 255, labelX: 52, labelY: 255, align: 'left' },
  bones: { cx: 222, cy: 335, labelX: 348, labelY: 335, align: 'right' },
};

function statusColorHex(status: RiskLevel): string {
  if (status === 'CRITICAL') return '#ef4444';
  if (status === 'WARNING') return '#f59e0b';
  return '#10b981';
}

function statusBadgeClass(status: RiskLevel): string {
  if (status === 'CRITICAL') {
    return 'bg-red-950/80 text-red-200 border border-red-500/50';
  }
  if (status === 'WARNING') {
    return 'bg-amber-950/80 text-amber-200 border border-amber-500/50';
  }
  return 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/50';
}

function getRegionIcon(regionId: string) {
  switch (regionId) {
    case 'brain_head':
      return <Brain className="w-4 h-4" strokeWidth={1.75} />;
    case 'eyes':
      return <Eye className="w-4 h-4" strokeWidth={1.75} />;
    case 'heart':
      return <Heart className="w-4 h-4" strokeWidth={1.75} />;
    case 'lungs':
      return <Wind className="w-4 h-4" strokeWidth={1.75} />;
    case 'muscles':
      return <Dumbbell className="w-4 h-4" strokeWidth={1.75} />;
    case 'bones':
      return <Bone className="w-4 h-4" strokeWidth={1.75} />;
    default:
      return <Compass className="w-4 h-4" strokeWidth={1.75} />;
  }
}

export const BodyMapInteractive: React.FC<BodyMapInteractiveProps> = ({
  regions,
  selectedRegionId,
  onSelectRegion,
  missionPhase,
  gravityG,
  onNavigateToHazard,
}) => {
  const activeRegion =
    regions.find((r) => r.region_id === selectedRegionId) || regions[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1e2d4a]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f8fafc]">
            Interactive Astronaut Bio-Telemetry Anatomy Map
          </h1>
          <p className="text-sm text-[#a8b8d0] mt-1 prose-measure">
            Select any physiological region on the anatomical projection or system selector to inspect
            organ-specific spaceflight adaptations, baseline deviations, and countermeasure protocols.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs tabular-data">
          <span className="px-3 py-1.5 rounded bg-[#131d33] border border-[#263859] text-[#cbd5e1]">
            Environment: <strong className="text-[#f8fafc]">{missionPhase.replace(/_/g, ' ')}</strong> ({gravityG}g)
          </span>
          <span className="px-3 py-1.5 rounded bg-[#131d33] border border-[#263859] text-[#cbd5e1]">
            Fluid Vector:{' '}
            <strong className="text-[#38bdf8]">
              {gravityG === 0 ? 'Cephalad Shift (0g)' : gravityG < 0.5 ? 'Partial Orthostatic Load (0.38g)' : '1.0g Terrestrial Load'}
            </strong>
          </span>
        </div>
      </div>

      {/* Region Selector Bar for Keyboard & Touch Accessibility */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2" role="tablist" aria-label="Anatomical Regions">
        {regions.map((reg) => {
          const isSelected = reg.region_id === activeRegion?.region_id;
          return (
            <button
              key={reg.region_id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectRegion(reg.region_id)}
              className={`flex flex-col justify-between p-3 rounded text-left transition-colors border ${
                isSelected
                  ? 'bg-[#162440] border-[#38bdf8] text-[#f8fafc]'
                  : 'bg-[#0d1424] border-[#1e2d4a] text-[#a8b8d0] hover:bg-[#131d33] hover:text-[#f1f5f9]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className={isSelected ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}>
                  {getRegionIcon(reg.region_id)}
                </span>
                <span
                  className={`text-[11px] font-medium px-1.5 py-0.5 rounded tabular-data ${statusBadgeClass(
                    reg.status
                  )}`}
                >
                  {reg.status}
                </span>
              </div>
              <span className="text-xs font-medium leading-snug text-[#f1f5f9]">
                {reg.label.split('&')[0].trim()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Split View: Anatomical SVG Projection (Left) + Selected System Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Anatomical Projection */}
        <div className="lg:col-span-5 panel-surface rounded-lg p-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs text-[#a8b8d0] pb-3 mb-2 border-b border-[#1e2d4a]">
            <span>ANTERIOR BIO-TELEMETRY PROJECTION</span>
            <span className="tabular-data text-[#38bdf8]">7 SYSTEMS MONITORED</span>
          </div>

          <svg
            viewBox="0 0 400 470"
            className="w-full max-w-[390px] h-auto select-none"
            role="img"
            aria-label="Interactive human body map with clickable organ systems"
          >
            <defs>
              <radialGradient id="bodyGlow" cx="50%" cy="42%" r="55%">
                <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#070b14" stopOpacity="0.0" />
              </radialGradient>
            </defs>

            {/* Subtle telemetry coordinate grid */}
            <circle cx="200" cy="220" r="175" fill="url(#bodyGlow)" />
            <line x1="200" y1="15" x2="200" y2="455" stroke="#1e2d4a" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="30" y1="176" x2="370" y2="176" stroke="#1e2d4a" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="30" y1="280" x2="370" y2="280" stroke="#1e2d4a" strokeWidth="1" strokeDasharray="3 3" />

            {/* Human Silhouette Outer Contour */}
            <g stroke="#334e7b" strokeWidth="1.6" fill="#0f1b31" fillOpacity="0.72">
              {/* Head & Neck */}
              <path d="M200 32 C180 32 170 48 170 68 C170 86 180 102 188 108 L188 118 L212 118 L212 108 C220 102 230 86 230 68 C230 48 220 32 200 32 Z" />
              {/* Torso & Arms */}
              <path d="M188 118 L152 126 C138 130 130 142 126 164 L116 254 C114 264 122 270 129 268 L142 186 L156 186 L158 268 L164 286 L236 286 L242 268 L244 186 L258 186 L271 268 C278 270 286 264 284 254 L274 164 C270 142 262 130 248 126 L212 118 Z" />
              {/* Pelvis & Legs */}
              <path d="M164 286 L160 368 L156 436 C156 444 166 448 174 446 L186 368 L194 316 L206 316 L214 368 L226 446 C234 448 244 444 244 436 L240 368 L236 286 Z" />
            </g>

            {/* Internal Anatomical Schematic Structures */}
            {/* Brain contour */}
            <path
              d="M182 56 C182 44 218 44 218 56 C222 64 214 72 200 72 C186 72 178 64 182 56 Z"
              fill="none"
              stroke="#476a9e"
              strokeWidth="1.2"
            />
            {/* Lungs contour */}
            <path
              d="M170 140 C164 152 164 182 172 192 C182 194 192 186 194 168 L194 140 Z M230 140 C236 152 236 182 228 192 C218 194 208 186 206 168 L206 140 Z"
              fill="#162847"
              stroke="#476a9e"
              strokeWidth="1.2"
            />
            {/* Spine & Femur skeletal lines */}
            <line x1="200" y1="118" x2="200" y2="286" stroke="#3b5987" strokeWidth="2.5" strokeDasharray="4 2" />
            <line x1="220" y1="295" x2="230" y2="425" stroke="#476a9e" strokeWidth="2.5" />
            <line x1="180" y1="295" x2="170" y2="425" stroke="#3b5987" strokeWidth="2" />

            {/* Interactive Hotspots & Callouts */}
            {regions.map((reg) => {
              const coord = REGION_COORDS[reg.region_id] || {
                cx: 200,
                cy: 200,
                labelX: 50,
                labelY: 200,
                align: 'left',
              };
              const isSelected = reg.region_id === activeRegion?.region_id;
              const hex = statusColorHex(reg.status);

              return (
                <g
                  key={reg.region_id}
                  onClick={() => onSelectRegion(reg.region_id)}
                  className="cursor-pointer"
                >
                  {/* Callout line */}
                  <line
                    x1={coord.cx}
                    y1={coord.cy}
                    x2={coord.labelX}
                    y2={coord.labelY}
                    stroke={isSelected ? '#38bdf8' : hex}
                    strokeWidth={isSelected ? '1.8' : '1'}
                    strokeOpacity={isSelected ? '1' : '0.65'}
                  />
                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle
                      cx={coord.cx}
                      cy={coord.cy}
                      r="14"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                    />
                  )}
                  {/* Organ node */}
                  <circle
                    cx={coord.cx}
                    cy={coord.cy}
                    r={isSelected ? '8' : '6.5'}
                    fill={hex}
                    stroke="#070b14"
                    strokeWidth="2"
                  />
                  {/* Callout Label Box */}
                  <rect
                    x={coord.align === 'left' ? 8 : 262}
                    y={coord.labelY - 13}
                    width="130"
                    height="24"
                    rx="4"
                    fill={isSelected ? '#162645' : '#0b1221'}
                    stroke={isSelected ? '#38bdf8' : '#233554'}
                    strokeWidth={isSelected ? '1.5' : '1'}
                  />
                  <text
                    x={coord.align === 'left' ? 15 : 269}
                    y={coord.labelY + 3}
                    fill={isSelected ? '#f8fafc' : '#cbd5e1'}
                    fontSize="10.5"
                    fontWeight={isSelected ? '600' : '500'}
                  >
                    {reg.label.split('&')[0].trim().slice(0, 18)}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="w-full flex items-center justify-center gap-5 pt-3 mt-2 border-t border-[#1e2d4a] text-xs text-[#a8b8d0]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> NORMAL
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> WARNING
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> CRITICAL
            </span>
          </div>
        </div>

        {/* Right: Detailed Physiological Region Inspection Panel */}
        {activeRegion && (
          <div className="lg:col-span-7 panel-surface rounded-lg p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1e2d4a]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded bg-[#131d33] border border-[#263859] text-[#38bdf8]">
                  {getRegionIcon(activeRegion.region_id)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#f8fafc]">
                    {activeRegion.label}
                  </h2>
                  <p className="text-xs text-[#a8b8d0] mt-0.5">
                    Region ID: <code className="text-[#cbd5e1]">{activeRegion.region_id}</code> · Citation:{' '}
                    <span className="text-[#38bdf8] font-medium">{activeRegion.citation}</span>
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded text-xs font-semibold tabular-data ${statusBadgeClass(
                  activeRegion.status
                )}`}
              >
                STATUS: {activeRegion.status}
              </span>
            </div>

            {/* Summary */}
            <div>
              <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1.5">
                Spaceflight Physiological Mechanism
              </h3>
              <p className="text-sm text-[#cbd5e1] prose-measure leading-relaxed">
                {activeRegion.summary}
              </p>
            </div>

            {/* Associated Hazards */}
            <div>
              <h3 className="text-sm font-semibold text-[#f1f5f9] mb-2">
                Linked NASA Human-Spaceflight Hazards
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeRegion.hazards.map((hz) => (
                  <button
                    key={hz}
                    onClick={() => onNavigateToHazard(hz)}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-[#131d33] hover:bg-[#1a2847] text-[#38bdf8] border border-[#263859] transition-colors"
                  >
                    Inspect {hz} Module →
                  </button>
                ))}
              </div>
            </div>

            {/* Region Telemetry Comparison Table */}
            <div>
              <h3 className="text-sm font-semibold text-[#f1f5f9] mb-2">
                Current Organ-System Telemetry vs. Astronaut Baseline
              </h3>
              <div className="overflow-x-auto border border-[#1e2d4a] rounded">
                <table className="w-full text-left border-collapse text-sm tabular-data">
                  <thead>
                    <tr className="bg-[#131d33] text-[#a8b8d0] text-xs border-b border-[#1e2d4a]">
                      <th className="py-2.5 px-3 font-medium">Physiological Parameter</th>
                      <th className="py-2.5 px-3 font-medium">Current Reading</th>
                      <th className="py-2.5 px-3 font-medium">Personal Baseline / Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2d4a]">
                    {activeRegion.metrics.map((m, idx) => (
                      <tr key={idx} className="hover:bg-[#111a2e]">
                        <td className="py-2.5 px-3 text-[#f1f5f9] font-medium">{m.name}</td>
                        <td className="py-2.5 px-3 text-[#38bdf8] font-semibold">{m.value}</td>
                        <td className="py-2.5 px-3 text-[#a8b8d0]">{m.baseline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Evidence-Informed Guidance */}
            <div className="p-4 rounded bg-[#131d33] border border-[#263859] space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#38bdf8]" />
                  Approved Operational Countermeasure & Guidance
                </h3>
                <span className="text-xs text-[#a8b8d0] tabular-data">{activeRegion.citation}</span>
              </div>
              <p className="text-sm text-[#cbd5e1] prose-measure leading-relaxed">
                {activeRegion.guidance}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

